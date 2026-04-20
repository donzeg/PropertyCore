// PropertyCore Engine — JSON Persistence Store
// Persists scenes and rules to /var/lib/propertycore/ as atomic JSON files.
// Uses write-to-temp + rename for crash-safe atomic updates.
package main

import (
	"encoding/json"
	"log"
	"os"
	"path/filepath"
)

const storeDir = "/var/lib/propertycore"

// Store manages on-disk persistence for scenes and rules.
type Store struct {
	dir string
}

// NewStore creates a Store rooted at dir, creating the directory if needed.
func NewStore(dir string) (*Store, error) {
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, err
	}
	return &Store{dir: dir}, nil
}

// loadJSON reads a JSON file from the store directory into v.
// Returns nil (not an error) if the file does not exist yet.
func (s *Store) loadJSON(name string, v interface{}) error {
	path := filepath.Join(s.dir, name)
	f, err := os.Open(path)
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return err
	}
	defer f.Close()
	return json.NewDecoder(f).Decode(v)
}

// saveJSON writes v as JSON to a temp file then atomically renames it into place.
func (s *Store) saveJSON(name string, v interface{}) error {
	path := filepath.Join(s.dir, name)
	tmp := path + ".tmp"
	f, err := os.OpenFile(tmp, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0644)
	if err != nil {
		return err
	}
	enc := json.NewEncoder(f)
	enc.SetIndent("", "  ")
	if err := enc.Encode(v); err != nil {
		f.Close()
		os.Remove(tmp)
		return err
	}
	if err := f.Close(); err != nil {
		os.Remove(tmp)
		return err
	}
	return os.Rename(tmp, path) // atomic on Linux (same filesystem)
}

// LoadScenes returns all persisted scenes, or nil if none stored yet.
func (s *Store) LoadScenes() []*Scene {
	var scenes []*Scene
	if err := s.loadJSON("scenes.json", &scenes); err != nil {
		log.Printf("store: load scenes error: %v", err)
		return nil
	}
	return scenes
}

// SaveScenes persists the full scene list atomically.
func (s *Store) SaveScenes(scenes []*Scene) {
	if err := s.saveJSON("scenes.json", scenes); err != nil {
		log.Printf("store: save scenes error: %v", err)
	}
}

// LoadRules returns all persisted rules, or nil if none stored yet.
func (s *Store) LoadRules() []*Rule {
	var rules []*Rule
	if err := s.loadJSON("rules.json", &rules); err != nil {
		log.Printf("store: load rules error: %v", err)
		return nil
	}
	return rules
}

// SaveRules persists the full rule list atomically.
func (s *Store) SaveRules(rules []*Rule) {
	if err := s.saveJSON("rules.json", rules); err != nil {
		log.Printf("store: save rules error: %v", err)
	}
}

// LoadRooms returns all persisted rooms, or nil if none stored yet.
func (s *Store) LoadRooms() []*Room {
	var rooms []*Room
	if err := s.loadJSON("rooms.json", &rooms); err != nil {
		log.Printf("store: load rooms error: %v", err)
		return nil
	}
	return rooms
}

// SaveRooms persists the full room list atomically.
func (s *Store) SaveRooms(rooms []*Room) {
	if err := s.saveJSON("rooms.json", rooms); err != nil {
		log.Printf("store: save rooms error: %v", err)
	}
}

// LoadUsers returns all persisted users, or nil if none stored yet.
func (s *Store) LoadUsers() []*User {
	var users []*User
	if err := s.loadJSON("users.json", &users); err != nil {
		log.Printf("store: load users error: %v", err)
		return nil
	}
	return users
}

// SaveUsers persists the full user list atomically.
func (s *Store) SaveUsers(users []*User) {
	if err := s.saveJSON("users.json", users); err != nil {
		log.Printf("store: save users error: %v", err)
	}
}

// LoadSchedules returns all persisted schedules, or nil if none stored yet.
func (s *Store) LoadSchedules() []*Schedule {
	var schedules []*Schedule
	if err := s.loadJSON("schedules.json", &schedules); err != nil {
		log.Printf("store: load schedules error: %v", err)
		return nil
	}
	return schedules
}

// SaveSchedules persists the full schedule list atomically.
func (s *Store) SaveSchedules(schedules []*Schedule) {
	if err := s.saveJSON("schedules.json", schedules); err != nil {
		log.Printf("store: save schedules error: %v", err)
	}
}
