// PropertyCore Engine — Property singleton
// Property describes the physical installation this hub manages.
// There is exactly one Property per hub. It is a singleton — not a list.
// Persisted to /var/lib/propertycore/property.json via the Store.
package main

import (
	"sync"
	"time"
)

// PropertyType categorises the installation for preset area types and UI hints.
type PropertyType string

const (
	PropertyHotel     PropertyType = "hotel"
	PropertyHome      PropertyType = "home"
	PropertyApartment PropertyType = "apartment"
	PropertyOffice    PropertyType = "office"
	PropertyEstate    PropertyType = "estate"
)

// Property is the singleton record describing this hub's physical installation.
type Property struct {
	Name      string       `json:"name"`
	Address   string       `json:"address,omitempty"`
	Type      PropertyType `json:"type"`
	// Timezone is an IANA timezone string used by the schedule engine.
	// Defaults to "Africa/Lagos" if not set.
	Timezone  string       `json:"timezone,omitempty"`
	UpdatedAt time.Time    `json:"updated_at"`
}

// PropertyManager holds the singleton Property record and persists mutations.
type PropertyManager struct {
	mu       sync.RWMutex
	property *Property
	store    *Store
}

// NewPropertyManager creates a PropertyManager with sensible defaults.
func NewPropertyManager(store *Store) *PropertyManager {
	return &PropertyManager{
		property: &Property{
			Name:     "My Property",
			Type:     PropertyHome,
			Timezone: "Africa/Lagos",
		},
		store: store,
	}
}

// Get returns a copy of the current Property record.
func (pm *PropertyManager) Get() *Property {
	pm.mu.RLock()
	defer pm.mu.RUnlock()
	// Return a copy so callers cannot mutate the internal record.
	copy := *pm.property
	return &copy
}

// Load replaces the internal record (used at startup from persisted JSON).
func (pm *PropertyManager) Load(p *Property) {
	pm.mu.Lock()
	pm.property = p
	pm.mu.Unlock()
}

// Update applies non-zero fields from patch to the property and persists.
func (pm *PropertyManager) Update(patch *Property) {
	pm.mu.Lock()
	if patch.Name != "" {
		pm.property.Name = patch.Name
	}
	if patch.Address != "" {
		pm.property.Address = patch.Address
	}
	if patch.Type != "" {
		pm.property.Type = patch.Type
	}
	if patch.Timezone != "" {
		pm.property.Timezone = patch.Timezone
	}
	pm.property.UpdatedAt = time.Now().UTC()
	pm.mu.Unlock()
	pm.persist()
}

// persist saves the property to the store.
func (pm *PropertyManager) persist() {
	if pm.store == nil {
		return
	}
	pm.store.SaveProperty(pm.Get())
}
