// PropertyCore Engine — Floor manager
// Floors represent physical levels within a property (Ground Floor, First Floor, Basement, etc.).
// Areas (rooms) belong to floors. Floors are ordered by the Order field.
// Persisted to /var/lib/propertycore/floors.json via the Store.
package main

import (
	"sync"
	"time"
)

// Floor represents a physical level within a property.
type Floor struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	// Order controls display order; lower numbers appear first.
	Order     int       `json:"order"`
	CreatedAt time.Time `json:"created_at"`
}

// FloorManager holds all floors in memory and persists mutations.
type FloorManager struct {
	mu     sync.RWMutex
	floors map[string]*Floor
	store  *Store
}

// NewFloorManager creates an empty FloorManager backed by the given store.
func NewFloorManager(store *Store) *FloorManager {
	return &FloorManager{
		floors: make(map[string]*Floor),
		store:  store,
	}
}

// Add stores a new floor, generating an ID if one is not provided.
func (fm *FloorManager) Add(f *Floor) error {
	if f.ID == "" {
		id, err := randomID()
		if err != nil {
			return err
		}
		f.ID = id
	}
	if f.CreatedAt.IsZero() {
		f.CreatedAt = time.Now().UTC()
	}
	fm.mu.Lock()
	fm.floors[f.ID] = f
	fm.mu.Unlock()
	fm.persist()
	return nil
}

// Get returns a floor by ID.
func (fm *FloorManager) Get(id string) (*Floor, bool) {
	fm.mu.RLock()
	defer fm.mu.RUnlock()
	f, ok := fm.floors[id]
	return f, ok
}

// GetAll returns all floors as a slice (unsorted).
func (fm *FloorManager) GetAll() []*Floor {
	fm.mu.RLock()
	defer fm.mu.RUnlock()
	out := make([]*Floor, 0, len(fm.floors))
	for _, f := range fm.floors {
		out = append(out, f)
	}
	return out
}

// Update replaces the mutable fields (name, order) of an existing floor.
// Returns false if the floor does not exist.
func (fm *FloorManager) Update(id string, patch *Floor) bool {
	fm.mu.Lock()
	f, ok := fm.floors[id]
	if ok {
		if patch.Name != "" {
			f.Name = patch.Name
		}
		if patch.Order != 0 {
			f.Order = patch.Order
		}
	}
	fm.mu.Unlock()
	if ok {
		fm.persist()
	}
	return ok
}

// Delete removes a floor by ID. Returns false if not found.
func (fm *FloorManager) Delete(id string) bool {
	fm.mu.Lock()
	_, ok := fm.floors[id]
	if ok {
		delete(fm.floors, id)
	}
	fm.mu.Unlock()
	if ok {
		fm.persist()
	}
	return ok
}

// Count returns the number of floors.
func (fm *FloorManager) Count() int {
	fm.mu.RLock()
	defer fm.mu.RUnlock()
	return len(fm.floors)
}

// persist saves all current floors to the store.
func (fm *FloorManager) persist() {
	if fm.store == nil {
		return
	}
	fm.store.SaveFloors(fm.GetAll())
}
