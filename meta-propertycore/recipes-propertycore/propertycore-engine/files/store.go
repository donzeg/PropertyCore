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

// LoadAreas returns all persisted areas, or nil if none stored yet.
func (s *Store) LoadAreas() []*Area {
	var areas []*Area
	if err := s.loadJSON("areas.json", &areas); err != nil {
		log.Printf("store: load areas error: %v", err)
		return nil
	}
	return areas
}

// SaveAreas persists the full area list atomically.
func (s *Store) SaveAreas(areas []*Area) {
	if err := s.saveJSON("areas.json", areas); err != nil {
		log.Printf("store: save areas error: %v", err)
	}
}

// LoadFloors returns all persisted floors, or nil if none stored yet.
func (s *Store) LoadFloors() []*Floor {
	var floors []*Floor
	if err := s.loadJSON("floors.json", &floors); err != nil {
		log.Printf("store: load floors error: %v", err)
		return nil
	}
	return floors
}

// SaveFloors persists the full floor list atomically.
func (s *Store) SaveFloors(floors []*Floor) {
	if err := s.saveJSON("floors.json", floors); err != nil {
		log.Printf("store: save floors error: %v", err)
	}
}

// LoadProperty returns the persisted property singleton, or nil if not stored yet.
func (s *Store) LoadProperty() *Property {
	var p Property
	if err := s.loadJSON("property.json", &p); err != nil {
		log.Printf("store: load property error: %v", err)
		return nil
	}
	if p.Name == "" {
		return nil
	}
	return &p
}

// SaveProperty persists the property singleton atomically.
func (s *Store) SaveProperty(p *Property) {
	if err := s.saveJSON("property.json", p); err != nil {
		log.Printf("store: save property error: %v", err)
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

// LoadDevices returns all persisted device records, or nil if none stored yet.
func (s *Store) LoadDevices() []*DeviceInfo {
	var devices []*DeviceInfo
	if err := s.loadJSON("devices.json", &devices); err != nil {
		log.Printf("store: load devices error: %v", err)
		return nil
	}
	return devices
}

// SaveDevices persists the full device registry atomically.
func (s *Store) SaveDevices(devices []*DeviceInfo) {
	if err := s.saveJSON("devices.json", devices); err != nil {
		log.Printf("store: save devices error: %v", err)
	}
}

// LoadAdminAccounts returns all persisted dashboard admin accounts, or nil if none stored yet.
func (s *Store) LoadAdminAccounts() []*AdminAccount {
	var accounts []*AdminAccount
	if err := s.loadJSON("admin_accounts.json", &accounts); err != nil {
		log.Printf("store: load admin accounts error: %v", err)
		return nil
	}
	return accounts
}

// SaveAdminAccounts persists the full admin account list atomically.
func (s *Store) SaveAdminAccounts(accounts []*AdminAccount) {
	if err := s.saveJSON("admin_accounts.json", accounts); err != nil {
		log.Printf("store: save admin accounts error: %v", err)
	}
}
