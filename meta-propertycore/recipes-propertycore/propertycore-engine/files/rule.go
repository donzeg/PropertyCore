// PropertyCore Engine — Rules Engine
// A rule fires when a device state update matches a condition, then executes an action.
// Conditions compare a field in the device's state JSON to a target value.
// Actions either execute a named scene or publish a direct MQTT message.
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"sort"
	"sync"
	"time"
)

// ---- data model ------------------------------------------------------------

// RuleCondition specifies when a rule should fire.
// DeviceID must match the updating device. Field is a top-level key in the
// device's State map. Operator is one of: eq ne gt lt gte lte.
type RuleCondition struct {
	DeviceID string      `json:"device_id"`
	Field    string      `json:"field"`
	Operator string      `json:"operator"` // eq | ne | gt | lt | gte | lte
	Value    interface{} `json:"value"`
}

// RuleAction describes what happens when the condition is met.
// Type "scene" executes a stored scene by SceneID.
// Type "mqtt" publishes Payload to Topic directly.
type RuleAction struct {
	Type    string `json:"type"`               // "scene" | "mqtt"
	SceneID string `json:"scene_id,omitempty"` // required when type=="scene"
	Topic   string `json:"topic,omitempty"`    // required when type=="mqtt"
	Payload string `json:"payload,omitempty"`  // required when type=="mqtt"
}

// Rule ties a condition to an action.
type Rule struct {
	ID        string        `json:"id"`
	Name      string        `json:"name"`
	Enabled   bool          `json:"enabled"`
	Condition RuleCondition `json:"condition"`
	Action    RuleAction    `json:"action"`
	CreatedAt time.Time     `json:"created_at"`
}

// ---- manager ---------------------------------------------------------------

// RulesEngine stores all rules and evaluates them on each device state update.
type RulesEngine struct {
	mu     sync.RWMutex
	rules  map[string]*Rule
	scenes *SceneManager
	mqtt   *MQTTClient
}

// NewRulesEngine creates an empty RulesEngine.
func NewRulesEngine(scenes *SceneManager, mqtt *MQTTClient) *RulesEngine {
	return &RulesEngine{
		rules:  make(map[string]*Rule),
		scenes: scenes,
		mqtt:   mqtt,
	}
}

// Add stores a new rule, generating an ID if one is not provided.
func (re *RulesEngine) Add(r *Rule) error {
	if r.ID == "" {
		id, err := randomID()
		if err != nil {
			return err
		}
		r.ID = id
	}
	if r.CreatedAt.IsZero() {
		r.CreatedAt = time.Now().UTC()
	}
	re.mu.Lock()
	re.rules[r.ID] = r
	re.mu.Unlock()
	return nil
}

// Get returns a rule by ID.
func (re *RulesEngine) Get(id string) (*Rule, bool) {
	re.mu.RLock()
	defer re.mu.RUnlock()
	r, ok := re.rules[id]
	return r, ok
}

// GetAll returns all rules sorted by creation time.
func (re *RulesEngine) GetAll() []*Rule {
	re.mu.RLock()
	defer re.mu.RUnlock()
	out := make([]*Rule, 0, len(re.rules))
	for _, r := range re.rules {
		out = append(out, r)
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].CreatedAt.Before(out[j].CreatedAt)
	})
	return out
}

// Delete removes a rule by ID. Returns false if not found.
func (re *RulesEngine) Delete(id string) bool {
	re.mu.Lock()
	defer re.mu.Unlock()
	_, ok := re.rules[id]
	if ok {
		delete(re.rules, id)
	}
	return ok
}

// SetEnabled enables or disables a rule. Returns false if not found.
func (re *RulesEngine) SetEnabled(id string, enabled bool) bool {
	re.mu.Lock()
	defer re.mu.Unlock()
	r, ok := re.rules[id]
	if ok {
		r.Enabled = enabled
	}
	return ok
}

// Count returns the total number of stored rules.
func (re *RulesEngine) Count() int {
	re.mu.RLock()
	defer re.mu.RUnlock()
	return len(re.rules)
}

// Evaluate checks all enabled rules against the updated device state and fires
// any whose condition matches. Called from the state OnUpdate callback.
func (re *RulesEngine) Evaluate(dev *DeviceState) {
	re.mu.RLock()
	candidates := make([]*Rule, 0)
	for _, r := range re.rules {
		if r.Enabled && r.Condition.DeviceID == dev.ID {
			candidates = append(candidates, r)
		}
	}
	re.mu.RUnlock()

	for _, r := range candidates {
		if matchCondition(r.Condition, dev) {
			log.Printf("Rule %q matched device %q — firing action", r.Name, dev.ID)
			if err := re.fire(r); err != nil {
				log.Printf("Rule %q action error: %v", r.Name, err)
			}
		}
	}
}

// fire executes the rule's action.
func (re *RulesEngine) fire(r *Rule) error {
	switch r.Action.Type {
	case "scene":
		if r.Action.SceneID == "" {
			return fmt.Errorf("scene action missing scene_id")
		}
		_, err := re.scenes.Execute(r.Action.SceneID, re.mqtt)
		return err
	case "mqtt":
		if r.Action.Topic == "" {
			return fmt.Errorf("mqtt action missing topic")
		}
		return re.mqtt.Publish(r.Action.Topic, []byte(r.Action.Payload))
	default:
		return fmt.Errorf("unknown action type %q", r.Action.Type)
	}
}

// ---- condition evaluation --------------------------------------------------

// matchCondition checks whether dev's state satisfies the condition.
func matchCondition(c RuleCondition, dev *DeviceState) bool {
	raw, ok := dev.State[c.Field]
	if !ok {
		return false
	}
	// Normalise to float64 for numeric comparisons (JSON numbers → float64)
	switch c.Operator {
	case "eq":
		return jsonEqual(raw, c.Value)
	case "ne":
		return !jsonEqual(raw, c.Value)
	case "gt", "lt", "gte", "lte":
		got, ok1 := toFloat(raw)
		want, ok2 := toFloat(c.Value)
		if !ok1 || !ok2 {
			return false
		}
		switch c.Operator {
		case "gt":
			return got > want
		case "lt":
			return got < want
		case "gte":
			return got >= want
		case "lte":
			return got <= want
		}
	}
	return false
}

// jsonEqual compares two values the way JSON would: numbers become float64,
// booleans stay bool, strings stay string.
func jsonEqual(a, b interface{}) bool {
	// Re-serialise both through JSON to normalise types (handles int vs float64)
	aj, _ := json.Marshal(a)
	bj, _ := json.Marshal(b)
	return string(aj) == string(bj)
}

// toFloat attempts to convert an interface value to float64.
func toFloat(v interface{}) (float64, bool) {
	switch n := v.(type) {
	case float64:
		return n, true
	case int:
		return float64(n), true
	case int64:
		return float64(n), true
	case json.Number:
		f, err := n.Float64()
		return f, err == nil
	}
	return 0, false
}
