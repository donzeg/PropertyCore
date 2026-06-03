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

// RuleCondition specifies when a rule should fire (legacy single-condition model).
// DeviceID must match the updating device. Field is a top-level key in the
// device's State map. Operator is one of: eq ne gt lt gte lte.
type RuleCondition struct {
	DeviceID string      `json:"device_id"`
	Field    string      `json:"field"`
	Operator string      `json:"operator"` // eq | ne | gt | lt | gte | lte
	Value    interface{} `json:"value"`
}

// ConditionClause is one clause in a multi-condition rule (v0.15).
// Type determines which fields are used:
//   - "device_state" — DeviceID, Field, Operator, Value
//   - "time_of_day"  — TimeOp ("before"|"after"|"between"), TimeFrom, TimeTo
//   - "day_of_week"  — Days (slice of "mon"…"sun")
type ConditionClause struct {
	Type     string      `json:"type"`                // "device_state" | "time_of_day" | "day_of_week"
	DeviceID string      `json:"device_id,omitempty"` // device_state
	Field    string      `json:"field,omitempty"`     // device_state
	Operator string      `json:"operator,omitempty"`  // device_state
	Value    interface{} `json:"value,omitempty"`     // device_state
	TimeOp   string      `json:"time_op,omitempty"`   // time_of_day: "before"|"after"|"between"
	TimeFrom string      `json:"time_from,omitempty"` // time_of_day: "HH:MM"
	TimeTo   string      `json:"time_to,omitempty"`   // time_of_day: "HH:MM" (between only)
	Days     []string    `json:"days,omitempty"`      // day_of_week: ["mon","tue",...]
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
// Conditions (v0.15) takes priority over the legacy Condition field when non-empty.
// ConditionLogic is "and" (default) or "or".
type Rule struct {
	ID             string            `json:"id"`
	Name           string            `json:"name"`
	Enabled        bool              `json:"enabled"`
	Condition      RuleCondition     `json:"condition"`                  // legacy
	Conditions     []ConditionClause `json:"conditions,omitempty"`       // v0.15
	ConditionLogic string            `json:"condition_logic,omitempty"`  // "and"|"or" (v0.15)
	Action         RuleAction        `json:"action"`
	CreatedAt      time.Time         `json:"created_at"`
}

// ---- manager ---------------------------------------------------------------

// RulesEngine stores all rules and evaluates them on each device state update.
type RulesEngine struct {
	mu     sync.RWMutex
	rules  map[string]*Rule
	scenes *SceneManager
	mqtt   *MQTTClient
	store  *Store
}

// NewRulesEngine creates an empty RulesEngine.
func NewRulesEngine(scenes *SceneManager, mqtt *MQTTClient, store *Store) *RulesEngine {
	return &RulesEngine{
		rules:  make(map[string]*Rule),
		scenes: scenes,
		mqtt:   mqtt,
		store:  store,
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
	re.persist()
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
	_, ok := re.rules[id]
	if ok {
		delete(re.rules, id)
	}
	re.mu.Unlock()
	if ok {
		re.persist()
	}
	return ok
}

// SetEnabled enables or disables a rule. Returns false if not found.
func (re *RulesEngine) SetEnabled(id string, enabled bool) bool {
	re.mu.Lock()
	r, ok := re.rules[id]
	if ok {
		r.Enabled = enabled
	}
	re.mu.Unlock()
	if ok {
		re.persist()
	}
	return ok
}

// Update replaces the name, conditions, and action of an existing rule.
func (re *RulesEngine) Update(id string, updated *Rule) bool {
	re.mu.Lock()
	r, ok := re.rules[id]
	if ok {
		r.Name = updated.Name
		r.Condition = updated.Condition
		r.Conditions = updated.Conditions
		r.ConditionLogic = updated.ConditionLogic
		r.Action = updated.Action
	}
	re.mu.Unlock()
	if ok {
		re.persist()
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
		if !r.Enabled {
			continue
		}
		if len(r.Conditions) == 0 {
			// Legacy single-condition: only relevant if it targets this device.
			if r.Condition.DeviceID == dev.ID {
				candidates = append(candidates, r)
			}
		} else {
			// New multi-condition: candidate if any device_state clause targets this device.
			for _, c := range r.Conditions {
				if c.Type == "device_state" && c.DeviceID == dev.ID {
					candidates = append(candidates, r)
					break
				}
			}
		}
	}
	re.mu.RUnlock()

	now := time.Now()
	for _, r := range candidates {
		var matched bool
		if len(r.Conditions) == 0 {
			matched = matchCondition(r.Condition, dev)
		} else {
			matched = re.matchClauses(r.Conditions, r.ConditionLogic, dev, now)
		}
		if matched {
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

// matchClauses evaluates a slice of ConditionClause with AND or OR logic.
// dev may be nil when evaluating time/day-only rules.
func (re *RulesEngine) matchClauses(clauses []ConditionClause, logic string, dev *DeviceState, now time.Time) bool {
	if len(clauses) == 0 {
		return false
	}
	useOr := logic == "or"
	for _, c := range clauses {
		result := re.matchClause(c, dev, now)
		if useOr && result {
			return true
		}
		if !useOr && !result {
			return false
		}
	}
	return !useOr // AND: all passed; OR: none matched
}

// matchClause evaluates a single ConditionClause.
func (re *RulesEngine) matchClause(c ConditionClause, dev *DeviceState, now time.Time) bool {
	switch c.Type {
	case "device_state", "":
		if dev == nil {
			return false
		}
		return matchCondition(RuleCondition{
			DeviceID: c.DeviceID,
			Field:    c.Field,
			Operator: c.Operator,
			Value:    c.Value,
		}, dev)
	case "time_of_day":
		return matchTimeCond(c, now)
	case "day_of_week":
		return matchDayCond(c, now)
	}
	return false
}

// matchTimeCond checks a time_of_day clause against the current time.
// TimeFrom and TimeTo are "HH:MM" strings.
func matchTimeCond(c ConditionClause, now time.Time) bool {
	parse := func(s string) (int, int, bool) {
		var h, m int
		_, err := fmt.Sscanf(s, "%d:%d", &h, &m)
		return h, m, err == nil
	}
	toMins := func(h, m int) int { return h*60 + m }
	nowMins := toMins(now.Hour(), now.Minute())

	fromH, fromM, okFrom := parse(c.TimeFrom)
	if !okFrom {
		return false
	}
	fromMins := toMins(fromH, fromM)

	switch c.TimeOp {
	case "before":
		return nowMins < fromMins
	case "after":
		return nowMins >= fromMins
	case "between":
		toH, toM, okTo := parse(c.TimeTo)
		if !okTo {
			return false
		}
		toMins := toMins(toH, toM)
		if fromMins <= toMins {
			return nowMins >= fromMins && nowMins < toMins
		}
		// Overnight range (e.g. 22:00–06:00)
		return nowMins >= fromMins || nowMins < toMins
	}
	return false
}

// matchDayCond checks a day_of_week clause against the current weekday.
func matchDayCond(c ConditionClause, now time.Time) bool {
	abbrev := dayAbbrev[now.Weekday()]
	for _, d := range c.Days {
		if d == abbrev {
			return true
		}
	}
	return false
}

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
	case "ne", "neq": // accept both spellings
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

// persist saves all current rules to the store (called after any mutation).
func (re *RulesEngine) persist() {
	if re.store == nil {
		return
	}
	re.store.SaveRules(re.GetAll())
}
