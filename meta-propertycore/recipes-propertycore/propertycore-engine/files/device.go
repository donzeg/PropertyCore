// PropertyCore Engine — Device Registry
// Persists device metadata (name, type, area assignment, etc.) to devices.json.
// Live state (power, temperature, etc.) is still managed by StateManager (in-memory).
// Devices are auto-registered on first MQTT message; can also be registered manually.
package main

import (
	"encoding/json"
	"sync"
	"time"
)

// DeviceInfo holds the persistent metadata for a registered device.
type DeviceInfo struct {
	ID              string          `json:"id"`
	Name            string          `json:"name"`
	Type            string          `json:"type"`             // relay, ac_gateway, sensor, etc.
	AreaID          string          `json:"area_id,omitempty"` // foreign key to Area
	Vendor          string          `json:"vendor,omitempty"`
	FirmwareVersion string          `json:"firmware_version,omitempty"`
	Metadata        json.RawMessage `json:"metadata,omitempty"` // device-type-specific config (arbitrary JSON)
	Online          bool            `json:"online"`
	LastSeen        time.Time       `json:"last_seen"`
	CreatedAt       time.Time       `json:"created_at"`
}

// DeviceRegistry manages the persistent catalog of known devices.
// It is kept separate from StateManager: StateManager holds live, ephemeral state
// (power on/off, temperature readings, etc.) while DeviceRegistry holds identity metadata.
type DeviceRegistry struct {
	mu      sync.RWMutex
	devices map[string]*DeviceInfo
	store   *Store
}

// NewDeviceRegistry creates an empty registry.
func NewDeviceRegistry(store *Store) *DeviceRegistry {
	return &DeviceRegistry{
		devices: make(map[string]*DeviceInfo),
		store:   store,
	}
}

// Load bulk-loads device records from the store at startup.
func (dr *DeviceRegistry) Load(items []*DeviceInfo) {
	dr.mu.Lock()
	defer dr.mu.Unlock()
	for _, d := range items {
		dr.devices[d.ID] = d
	}
}

// MarkSeen is called by StateManager.OnUpdate whenever a device publishes a state message.
// If the device is not yet in the registry it is auto-registered using the MQTT-reported type.
// Updates Online=true and LastSeen; persists only if a new record was created.
func (dr *DeviceRegistry) MarkSeen(id, deviceType string) {
	dr.mu.Lock()
	d, exists := dr.devices[id]
	if !exists {
		d = &DeviceInfo{
			ID:        id,
			Name:      id, // default name = ID until operator renames it
			Type:      deviceType,
			Online:    true,
			LastSeen:  time.Now().UTC(),
			CreatedAt: time.Now().UTC(),
		}
		dr.devices[id] = d
		dr.mu.Unlock()
		dr.persist() // only persist on first registration
		return
	}
	d.Online = true
	d.LastSeen = time.Now().UTC()
	if d.Type == "" && deviceType != "" {
		d.Type = deviceType
	}
	dr.mu.Unlock()
	// Don't persist on every state update — LastSeen is volatile.
	// The registry is re-persisted on clean shutdown or structural changes.
}

// Register adds or replaces a device record manually.
func (dr *DeviceRegistry) Register(d *DeviceInfo) {
	dr.mu.Lock()
	if _, exists := dr.devices[d.ID]; !exists {
		d.CreatedAt = time.Now().UTC()
	}
	d.LastSeen = time.Now().UTC()
	dr.devices[d.ID] = d
	dr.mu.Unlock()
	dr.persist()
}

// Get returns a device by ID.
func (dr *DeviceRegistry) Get(id string) (*DeviceInfo, bool) {
	dr.mu.RLock()
	defer dr.mu.RUnlock()
	d, ok := dr.devices[id]
	if !ok {
		return nil, false
	}
	cp := *d
	return &cp, true
}

// GetAll returns all registered devices as a slice.
func (dr *DeviceRegistry) GetAll() []*DeviceInfo {
	dr.mu.RLock()
	defer dr.mu.RUnlock()
	out := make([]*DeviceInfo, 0, len(dr.devices))
	for _, d := range dr.devices {
		cp := *d
		out = append(out, &cp)
	}
	return out
}

// Update patches mutable metadata fields. Fields with zero values are skipped unless
// the corresponding bool flag is set (for fields that can be intentionally cleared).
func (dr *DeviceRegistry) Update(id string, patch *DeviceInfo) bool {
	dr.mu.Lock()
	d, ok := dr.devices[id]
	if !ok {
		dr.mu.Unlock()
		return false
	}
	if patch.Name != "" {
		d.Name = patch.Name
	}
	if patch.Type != "" {
		d.Type = patch.Type
	}
	// AreaID can be intentionally cleared by sending ""
	d.AreaID = patch.AreaID
	if patch.Vendor != "" {
		d.Vendor = patch.Vendor
	}
	if patch.FirmwareVersion != "" {
		d.FirmwareVersion = patch.FirmwareVersion
	}
	if len(patch.Metadata) > 0 {
		d.Metadata = patch.Metadata
	}
	dr.mu.Unlock()
	dr.persist()
	return true
}

// MarkOffline sets a device's Online status to false and persists.
func (dr *DeviceRegistry) MarkOffline(id string) {
	dr.mu.Lock()
	if d, ok := dr.devices[id]; ok {
		d.Online = false
	}
	dr.mu.Unlock()
	dr.persist()
}

// Unregister removes a device from the registry.
func (dr *DeviceRegistry) Unregister(id string) bool {
	dr.mu.Lock()
	_, ok := dr.devices[id]
	if !ok {
		dr.mu.Unlock()
		return false
	}
	delete(dr.devices, id)
	dr.mu.Unlock()
	dr.persist()
	return true
}

// Count returns the number of registered devices.
func (dr *DeviceRegistry) Count() int {
	dr.mu.RLock()
	defer dr.mu.RUnlock()
	return len(dr.devices)
}

// PersistAll forces a full persist of current registry state (e.g. on graceful shutdown).
func (dr *DeviceRegistry) PersistAll() {
	dr.persist()
}

func (dr *DeviceRegistry) persist() {
	dr.store.SaveDevices(dr.GetAll())
}
