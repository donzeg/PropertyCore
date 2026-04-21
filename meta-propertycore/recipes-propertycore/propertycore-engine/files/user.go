// PropertyCore Engine — User manager
// Users represent people who can interact with the PropertyCore platform.
// Roles: owner (full access), admin (configuration), guest (control only).
// Each user is persisted to /var/lib/propertycore/users.json via the Store.
// PINs are stored as plain text — this is a LAN-only embedded system, not a web service.
package main

import (
	"sync"
	"time"
)

// UserRole defines the access level for a user.
type UserRole string

const (
	RoleOwner UserRole = "owner"
	RoleAdmin UserRole = "admin"
	RoleGuest UserRole = "guest"
)

// User represents a person who interacts with the platform.
type User struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Role      UserRole  `json:"role"`
	PIN       string    `json:"pin,omitempty"` // 4-8 digit PIN, omitted when listing
	// AreaIDs lists the areas this user may access.
	// Empty/nil means unrestricted (owner and admin default).
	// Guests should have an explicit list of assigned area IDs.
	AreaIDs   []string  `json:"area_ids,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

// userPublic is User with PIN omitted for list/get responses.
type userPublic struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Role      UserRole  `json:"role"`
	// AreaIDs is included in the public profile so the mobile app can filter
	// its UI to only show areas this user is allowed to access.
	// nil/empty means the user has access to all areas.
	AreaIDs   []string  `json:"area_ids,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

func toPublic(u *User) *userPublic {
	return &userPublic{ID: u.ID, Name: u.Name, Role: u.Role, AreaIDs: u.AreaIDs, CreatedAt: u.CreatedAt}
}

// UserManager holds all users in memory and persists mutations.
type UserManager struct {
	mu    sync.RWMutex
	users map[string]*User
	store *Store
}

// NewUserManager creates an empty UserManager backed by the given store.
func NewUserManager(store *Store) *UserManager {
	return &UserManager{
		users: make(map[string]*User),
		store: store,
	}
}

// Add stores a new user, generating an ID if one is not provided.
// Defaults to RoleGuest if Role is empty.
func (um *UserManager) Add(u *User) error {
	if u.ID == "" {
		id, err := randomID()
		if err != nil {
			return err
		}
		u.ID = id
	}
	if u.Role == "" {
		u.Role = RoleGuest
	}
	if u.CreatedAt.IsZero() {
		u.CreatedAt = time.Now().UTC()
	}
	um.mu.Lock()
	um.users[u.ID] = u
	um.mu.Unlock()
	um.persist()
	return nil
}

// Get returns a user by ID.
func (um *UserManager) Get(id string) (*User, bool) {
	um.mu.RLock()
	defer um.mu.RUnlock()
	u, ok := um.users[id]
	return u, ok
}

// GetAll returns all users as a slice (unsorted).
func (um *UserManager) GetAll() []*User {
	um.mu.RLock()
	defer um.mu.RUnlock()
	out := make([]*User, 0, len(um.users))
	for _, u := range um.users {
		out = append(out, u)
	}
	return out
}

// Update replaces the mutable fields (name, role, pin) of an existing user.
// Returns false if the user does not exist.
func (um *UserManager) Update(id string, patch *User) bool {
	um.mu.Lock()
	u, ok := um.users[id]
	if ok {
		if patch.Name != "" {
			u.Name = patch.Name
		}
		if patch.Role != "" {
			u.Role = patch.Role
		}
		if patch.PIN != "" {
			u.PIN = patch.PIN
		}
		if patch.AreaIDs != nil {
			u.AreaIDs = patch.AreaIDs
		}
	}
	um.mu.Unlock()
	if ok {
		um.persist()
	}
	return ok
}

// Delete removes a user by ID. Returns false if not found.
func (um *UserManager) Delete(id string) bool {
	um.mu.Lock()
	_, ok := um.users[id]
	if ok {
		delete(um.users, id)
	}
	um.mu.Unlock()
	if ok {
		um.persist()
	}
	return ok
}

// Count returns the number of users.
func (um *UserManager) Count() int {
	um.mu.RLock()
	defer um.mu.RUnlock()
	return len(um.users)
}

// FindByPIN searches all users for one whose PIN matches the given string.
// Returns (nil, false) if no match. Owner/admin users without a PIN set
// cannot authenticate via PIN (empty string never matches).
func (um *UserManager) FindByPIN(pin string) (*User, bool) {
	if pin == "" {
		return nil, false
	}
	um.mu.RLock()
	defer um.mu.RUnlock()
	for _, u := range um.users {
		if u.PIN == pin {
			return u, true
		}
	}
	return nil, false
}

// persist saves all current users to the store.
func (um *UserManager) persist() {
	if um.store == nil {
		return
	}
	um.store.SaveUsers(um.GetAll())
}
