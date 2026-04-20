// PropertyCore Engine — Room manager
// Rooms group devices into named zones (e.g. "Living Room", "Master Bedroom").
// Each room is persisted to /var/lib/propertycore/rooms.json via the Store.
package main

import (
	"sync"
	"time"
)

// Room represents a named zone within a property.
type Room struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Floor     string    `json:"floor,omitempty"` // e.g. "Ground", "First", "Basement"
	CreatedAt time.Time `json:"created_at"`
}

// RoomManager holds all rooms in memory and persists mutations.
type RoomManager struct {
	mu    sync.RWMutex
	rooms map[string]*Room
	store *Store
}

// NewRoomManager creates an empty RoomManager backed by the given store.
func NewRoomManager(store *Store) *RoomManager {
	return &RoomManager{
		rooms: make(map[string]*Room),
		store: store,
	}
}

// Add stores a new room, generating an ID if one is not provided.
func (rm *RoomManager) Add(r *Room) error {
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
	rm.mu.Lock()
	rm.rooms[r.ID] = r
	rm.mu.Unlock()
	rm.persist()
	return nil
}

// Get returns a room by ID.
func (rm *RoomManager) Get(id string) (*Room, bool) {
	rm.mu.RLock()
	defer rm.mu.RUnlock()
	r, ok := rm.rooms[id]
	return r, ok
}

// GetAll returns all rooms as a slice (unsorted).
func (rm *RoomManager) GetAll() []*Room {
	rm.mu.RLock()
	defer rm.mu.RUnlock()
	out := make([]*Room, 0, len(rm.rooms))
	for _, r := range rm.rooms {
		out = append(out, r)
	}
	return out
}

// Update replaces the mutable fields (name, floor) of an existing room.
// Returns false if the room does not exist.
func (rm *RoomManager) Update(id string, patch *Room) bool {
	rm.mu.Lock()
	r, ok := rm.rooms[id]
	if ok {
		if patch.Name != "" {
			r.Name = patch.Name
		}
		if patch.Floor != "" {
			r.Floor = patch.Floor
		}
	}
	rm.mu.Unlock()
	if ok {
		rm.persist()
	}
	return ok
}

// Delete removes a room by ID. Returns false if not found.
func (rm *RoomManager) Delete(id string) bool {
	rm.mu.Lock()
	_, ok := rm.rooms[id]
	if ok {
		delete(rm.rooms, id)
	}
	rm.mu.Unlock()
	if ok {
		rm.persist()
	}
	return ok
}

// Count returns the number of rooms.
func (rm *RoomManager) Count() int {
	rm.mu.RLock()
	defer rm.mu.RUnlock()
	return len(rm.rooms)
}

// persist saves all current rooms to the store.
func (rm *RoomManager) persist() {
	if rm.store == nil {
		return
	}
	rm.store.SaveRooms(rm.GetAll())
}
