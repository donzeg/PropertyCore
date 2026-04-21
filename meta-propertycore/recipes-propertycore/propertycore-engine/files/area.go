// PropertyCore Engine — Area manager
// Areas are named spaces within a property (e.g. "Living Room", "Suite 201").
// Each area belongs to a Floor and has a type that drives icon/preset selection.
// Areas are persisted to /var/lib/propertycore/areas.json via the Store.
package main

import (
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"
)

// randomID generates a 12-hex-character random ID (6 bytes). Used by all managers.
func randomID() (string, error) {
	b := make([]byte, 6)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// Area represents a named space within a property (HA calls this an "area").
type Area struct {
	ID         string    `json:"id"`
	Name       string    `json:"name"`
	// FloorID is the ID of the Floor this area belongs to. Empty = unassigned.
	FloorID    string    `json:"floor_id,omitempty"`
	// AreaType is a semantic hint for icon and preset selection.
	// Examples: bedroom, bathroom, kitchen, living_room, lobby, office, gym, garage.
	AreaType   string    `json:"area_type,omitempty"`
	// Icon overrides the default icon for this area type (optional).
	Icon       string    `json:"icon,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
}

// AreaManager holds all areas in memory and persists mutations.
type AreaManager struct {
	mu    sync.RWMutex
	areas map[string]*Area
	store *Store
}

// NewAreaManager creates an empty AreaManager backed by the given store.
func NewAreaManager(store *Store) *AreaManager {
	return &AreaManager{
		areas: make(map[string]*Area),
		store: store,
	}
}

// Add stores a new area, generating an ID if one is not provided.
func (am *AreaManager) Add(a *Area) error {
	if a.ID == "" {
		id, err := randomID()
		if err != nil {
			return err
		}
		a.ID = id
	}
	if a.CreatedAt.IsZero() {
		a.CreatedAt = time.Now().UTC()
	}
	am.mu.Lock()
	am.areas[a.ID] = a
	am.mu.Unlock()
	am.persist()
	return nil
}

// Get returns an area by ID.
func (am *AreaManager) Get(id string) (*Area, bool) {
	am.mu.RLock()
	defer am.mu.RUnlock()
	a, ok := am.areas[id]
	return a, ok
}

// GetAll returns all areas as a slice (unsorted).
func (am *AreaManager) GetAll() []*Area {
	am.mu.RLock()
	defer am.mu.RUnlock()
	out := make([]*Area, 0, len(am.areas))
	for _, a := range am.areas {
		out = append(out, a)
	}
	return out
}

// Update replaces the mutable fields of an existing area.
// Returns false if the area does not exist.
func (am *AreaManager) Update(id string, patch *Area) bool {
	am.mu.Lock()
	a, ok := am.areas[id]
	if ok {
		if patch.Name != "" {
			a.Name = patch.Name
		}
		if patch.FloorID != "" {
			a.FloorID = patch.FloorID
		}
		if patch.AreaType != "" {
			a.AreaType = patch.AreaType
		}
		if patch.Icon != "" {
			a.Icon = patch.Icon
		}
	}
	am.mu.Unlock()
	if ok {
		am.persist()
	}
	return ok
}

// Delete removes an area by ID. Returns false if not found.
func (am *AreaManager) Delete(id string) bool {
	am.mu.Lock()
	_, ok := am.areas[id]
	if ok {
		delete(am.areas, id)
	}
	am.mu.Unlock()
	if ok {
		am.persist()
	}
	return ok
}

// Count returns the number of areas.
func (am *AreaManager) Count() int {
	am.mu.RLock()
	defer am.mu.RUnlock()
	return len(am.areas)
}

// persist saves all current areas to the store.
func (am *AreaManager) persist() {
	if am.store == nil {
		return
	}
	am.store.SaveAreas(am.GetAll())
}
