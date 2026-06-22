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
	Type            string          `json:"type"`              // relay, ac_gateway, sensor, etc.
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
// Returns (isNew, cameOnline):
//
//	isNew      — first time this device has been seen (auto-registration)
//	cameOnline — device was previously marked offline and is now back
func (dr *DeviceRegistry) MarkSeen(id, deviceType string) (isNew bool, cameOnline bool) {
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
		return true, false
	}
	wasOffline := !d.Online
	d.Online = true
	d.LastSeen = time.Now().UTC()
	if d.Type == "" && deviceType != "" {
		d.Type = deviceType
	}
	dr.mu.Unlock()
	// Don't persist on every state update — LastSeen is volatile.
	// The registry is re-persisted on clean shutdown or structural changes.
	return false, wasOffline
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

// ===== UnclaimedNode Manager (ESPHome Discovery) =====

// UnclaimedNode represents a device that has published MQTT state but is not yet claimed in the registry.
type UnclaimedNode struct {
	DeviceID    string    `json:"device_id"`
	HardwareUID string    `json:"hardware_uid,omitempty"` // MAC address from MQTT payload
	Type        string    `json:"type"`                   // device type from MQTT payload
	Online      bool      `json:"online"`
	FWVersion   string    `json:"fw_version,omitempty"`
	IP          string    `json:"ip,omitempty"`
	Source      string    `json:"source"` // "esphome" or other
	FirstSeen   time.Time `json:"first_seen"`
	LastSeen    time.Time `json:"last_seen"`
}

// UnclaimedNodeManager tracks devices seen via MQTT that haven't been registered yet.
type UnclaimedNodeManager struct {
	mu        sync.RWMutex
	unclaimed map[string]*UnclaimedNode
	store     *Store
	hub       *WSHub // for broadcasting events
}

// NewUnclaimedNodeManager creates an empty manager.
func NewUnclaimedNodeManager(store *Store, hub *WSHub) *UnclaimedNodeManager {
	return &UnclaimedNodeManager{
		unclaimed: make(map[string]*UnclaimedNode),
		store:     store,
		hub:       hub,
	}
}

// Load bulk-loads unclaimed node records from the store at startup.
func (unm *UnclaimedNodeManager) Load(items []*UnclaimedNode) {
	unm.mu.Lock()
	defer unm.mu.Unlock()
	for _, n := range items {
		unm.unclaimed[n.DeviceID] = n
	}
}

// Track adds or updates an unclaimed node. Called when a new MQTT device is seen.
// Returns true if this is the first time the node was seen.
func (unm *UnclaimedNodeManager) Track(deviceID, deviceType, source string, payload map[string]interface{}) bool {
	unm.mu.Lock()

	isNew := false
	node, exists := unm.unclaimed[deviceID]
	if !exists {
		node = &UnclaimedNode{
			DeviceID:  deviceID,
			Type:      deviceType,
			Source:    source,
			FirstSeen: time.Now().UTC(),
		}
		isNew = true
		unm.unclaimed[deviceID] = node
	}

	node.Online = true
	node.LastSeen = time.Now().UTC()

	// Extract optional fields from MQTT payload
	if hwUID, ok := payload["mac"].(string); ok {
		node.HardwareUID = hwUID
	}
	if ip, ok := payload["ip"].(string); ok {
		node.IP = ip
	}
	if fwVer, ok := payload["fw_version"].(string); ok {
		node.FWVersion = fwVer
	}
	unm.mu.Unlock()

	unm.persist()

	// Broadcast WebSocket event
	if unm.hub != nil {
		unm.hub.Broadcast("device_unclaimed", node)
	}

	return isNew
}

// Get returns an unclaimed node by ID.
func (unm *UnclaimedNodeManager) Get(deviceID string) (*UnclaimedNode, bool) {
	unm.mu.RLock()
	defer unm.mu.RUnlock()
	n, ok := unm.unclaimed[deviceID]
	if !ok {
		return nil, false
	}
	cp := *n
	return &cp, true
}

// GetAll returns all unclaimed nodes.
func (unm *UnclaimedNodeManager) GetAll() []*UnclaimedNode {
	unm.mu.RLock()
	defer unm.mu.RUnlock()
	out := make([]*UnclaimedNode, 0, len(unm.unclaimed))
	for _, n := range unm.unclaimed {
		cp := *n
		out = append(out, &cp)
	}
	return out
}

// Claim moves a node from unclaimed to registered.
// Returns the new DeviceInfo to be registered.
func (unm *UnclaimedNodeManager) Claim(deviceID string) (*DeviceInfo, bool) {
	unm.mu.Lock()
	node, ok := unm.unclaimed[deviceID]
	if !ok {
		unm.mu.Unlock()
		return nil, false
	}
	delete(unm.unclaimed, deviceID)
	unm.mu.Unlock()

	unm.persist()

	// Create DeviceInfo from unclaimed node
	d := &DeviceInfo{
		ID:              node.DeviceID,
		Name:            node.DeviceID, // default name = ID until operator changes it
		Type:            node.Type,
		Online:          node.Online,
		LastSeen:        node.LastSeen,
		CreatedAt:       time.Now().UTC(),
		FirmwareVersion: node.FWVersion,
		Vendor:          "esphome",
	}

	// Broadcast WebSocket event
	if unm.hub != nil {
		unm.hub.Broadcast("device_claimed", map[string]string{"device_id": deviceID})
	}

	return d, true
}

// Remove deletes a single unclaimed node by ID.
func (unm *UnclaimedNodeManager) Remove(deviceID string) bool {
	unm.mu.Lock()
	_, ok := unm.unclaimed[deviceID]
	if ok {
		delete(unm.unclaimed, deviceID)
	}
	unm.mu.Unlock()
	if ok {
		unm.persist()
	}
	return ok
}

// PurgeByIDs removes all matching IDs and returns the number removed.
func (unm *UnclaimedNodeManager) PurgeByIDs(ids []string) int {
	if len(ids) == 0 {
		return 0
	}
	unm.mu.Lock()
	removed := 0
	for _, id := range ids {
		if _, ok := unm.unclaimed[id]; ok {
			delete(unm.unclaimed, id)
			removed++
		}
	}
	unm.mu.Unlock()
	if removed > 0 {
		unm.persist()
	}
	return removed
}

// PurgeOlderThan removes nodes whose LastSeen is older than maxAge.
// If offlineOnly is true, only offline nodes are removed.
func (unm *UnclaimedNodeManager) PurgeOlderThan(maxAge time.Duration, offlineOnly bool) int {
	if maxAge <= 0 {
		return 0
	}
	cutoff := time.Now().UTC().Add(-maxAge)
	unm.mu.Lock()
	removed := 0
	for id, node := range unm.unclaimed {
		if node.LastSeen.Before(cutoff) {
			if !offlineOnly || !node.Online {
				delete(unm.unclaimed, id)
				removed++
			}
		}
	}
	unm.mu.Unlock()
	if removed > 0 {
		unm.persist()
	}
	return removed
}

// MarkOffline marks an unclaimed node as offline.
func (unm *UnclaimedNodeManager) MarkOffline(deviceID string) {
	unm.mu.Lock()
	if n, ok := unm.unclaimed[deviceID]; ok {
		n.Online = false
	}
	unm.mu.Unlock()
	unm.persist()
}

// Cleanup removes unclaimed nodes that have been offline for more than 24 hours.
func (unm *UnclaimedNodeManager) Cleanup() {
	_ = unm.PurgeOlderThan(24*time.Hour, true)
}

// PersistAll forces a full persist of current unclaimed state (e.g. on graceful shutdown).
func (unm *UnclaimedNodeManager) PersistAll() {
	unm.persist()
}

func (unm *UnclaimedNodeManager) persist() {
	unm.store.SaveUnclaimedNodes(unm.GetAll())
}
