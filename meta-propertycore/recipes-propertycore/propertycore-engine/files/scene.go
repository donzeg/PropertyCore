// PropertyCore Engine — Scene Manager
// A scene is a named collection of device actions executed together.
// Each action publishes a command payload to propertycore/devices/{id}/cmd.
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"sort"
	"sync"
	"time"
)

// Action is a single device command within a scene.
type Action struct {
	DeviceID string                 `json:"device_id"`
	Payload  map[string]interface{} `json:"payload"`
}

// Scene is a named set of device actions that can be executed together.
type Scene struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Actions   []Action  `json:"actions"`
	CreatedAt time.Time `json:"created_at"`
}

// SceneManager holds all scenes in memory.
type SceneManager struct {
	mu     sync.RWMutex
	scenes map[string]*Scene
	store  *Store
}

// NewSceneManager creates an empty SceneManager backed by the given store.
func NewSceneManager(store *Store) *SceneManager {
	return &SceneManager{
		scenes: make(map[string]*Scene),
		store:  store,
	}
}

// Add stores a new scene, generating an ID if one is not provided.
func (sm *SceneManager) Add(s *Scene) error {
	if s.ID == "" {
		id, err := randomID()
		if err != nil {
			return err
		}
		s.ID = id
	}
	if s.CreatedAt.IsZero() {
		s.CreatedAt = time.Now().UTC()
	}
	sm.mu.Lock()
	sm.scenes[s.ID] = s
	sm.mu.Unlock()
	sm.persist()
	return nil
}

// Get returns a scene by ID.
func (sm *SceneManager) Get(id string) (*Scene, bool) {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	s, ok := sm.scenes[id]
	return s, ok
}

// GetAll returns a snapshot of all scenes sorted by creation time.
func (sm *SceneManager) GetAll() []*Scene {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	out := make([]*Scene, 0, len(sm.scenes))
	for _, s := range sm.scenes {
		out = append(out, s)
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].CreatedAt.Before(out[j].CreatedAt)
	})
	return out
}

// Delete removes a scene by ID. Returns false if not found.
func (sm *SceneManager) Delete(id string) bool {
	sm.mu.Lock()
	_, ok := sm.scenes[id]
	if ok {
		delete(sm.scenes, id)
	}
	sm.mu.Unlock()
	if ok {
		sm.persist()
	}
	return ok
}

// Count returns the number of stored scenes.
func (sm *SceneManager) Count() int {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	return len(sm.scenes)
}

// Execute runs all actions in the scene, publishing each command via MQTT.
// Returns the executed scene so callers can broadcast it. Returns an error
// if the scene is not found or MQTT is not connected.
func (sm *SceneManager) Execute(id string, mqtt *MQTTClient) (*Scene, error) {
	s, ok := sm.Get(id)
	if !ok {
		return nil, fmt.Errorf("scene %q not found", id)
	}
	if !mqtt.IsConnected() {
		return nil, fmt.Errorf("MQTT not connected")
	}
	for _, action := range s.Actions {
		payload, err := json.Marshal(action.Payload)
		if err != nil {
			return nil, fmt.Errorf("encode error for device %q: %w", action.DeviceID, err)
		}
		topic := "propertycore/devices/" + action.DeviceID + "/cmd"
		if err := mqtt.Publish(topic, payload); err != nil {
			return nil, fmt.Errorf("publish error for device %q: %w", action.DeviceID, err)
		}
		log.Printf("Scene %q → MQTT %s: %s", s.Name, topic, payload)
	}
	return s, nil
}

// persist saves all current scenes to the store (called after any mutation).
func (sm *SceneManager) persist() {
	if sm.store == nil {
		return
	}
	sm.store.SaveScenes(sm.GetAll())
}
