// PropertyCore Engine — Device state manager
// Maintains an in-memory map of device states, updated from MQTT PUBLISH events.
package main

import (
	"encoding/json"
	"strings"
	"sync"
	"time"
)

// DeviceState holds the last-known state of a device as reported over MQTT.
type DeviceState struct {
	ID       string                 `json:"id"`
	Type     string                 `json:"type,omitempty"`
	Zone     string                 `json:"zone,omitempty"`
	State    map[string]interface{} `json:"state"`
	LastSeen time.Time              `json:"last_seen"`
}

// StateManager maintains an in-memory map of all known device states.
type StateManager struct {
	mu      sync.RWMutex
	devices map[string]*DeviceState
}

// NewStateManager creates an empty StateManager.
func NewStateManager() *StateManager {
	return &StateManager{devices: make(map[string]*DeviceState)}
}

// HandleMessage processes an MQTT message and updates device state.
// Only processes topics matching: propertycore/devices/{id}/state
func (sm *StateManager) HandleMessage(topic string, payload []byte) {
	parts := strings.Split(topic, "/")
	if len(parts) != 4 ||
		parts[0] != "propertycore" ||
		parts[1] != "devices" ||
		parts[3] != "state" {
		return
	}
	id := parts[2]
	if id == "" {
		return
	}

	var raw map[string]interface{}
	if err := json.Unmarshal(payload, &raw); err != nil {
		return // ignore malformed payloads
	}

	sm.mu.Lock()
	defer sm.mu.Unlock()

	dev, ok := sm.devices[id]
	if !ok {
		dev = &DeviceState{ID: id}
		sm.devices[id] = dev
	}
	// Extract well-known top-level fields if present in payload
	if t, ok := raw["type"].(string); ok {
		dev.Type = t
	}
	if z, ok := raw["zone"].(string); ok {
		dev.Zone = z
	}
	dev.State = raw
	dev.LastSeen = time.Now().UTC()
}

// GetAll returns a snapshot of all device states.
func (sm *StateManager) GetAll() []*DeviceState {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	out := make([]*DeviceState, 0, len(sm.devices))
	for _, d := range sm.devices {
		cp := *d
		out = append(out, &cp)
	}
	return out
}

// Get returns a single device state by ID.
func (sm *StateManager) Get(id string) (*DeviceState, bool) {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	d, ok := sm.devices[id]
	if !ok {
		return nil, false
	}
	cp := *d
	return &cp, true
}

// Count returns the number of known devices.
func (sm *StateManager) Count() int {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	return len(sm.devices)
}
