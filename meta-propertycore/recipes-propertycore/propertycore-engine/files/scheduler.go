// PropertyCore Engine — Scheduling Engine
// Fires scenes at configured times. Schedules persist to /var/lib/propertycore/schedules.json.
// Supported time format: Hour (0-23) + Minute (0-59) + optional Days list (mon/tue/wed/thu/fri/sat/sun).
// Empty Days means every day. The ticker aligns to minute boundaries so triggers never drift.
package main

import (
	"log"
	"sync"
	"time"
)

// dayAbbrev maps time.Weekday to the lowercase 3-letter abbreviation used in schedule Days fields.
var dayAbbrev = map[time.Weekday]string{
	time.Sunday:    "sun",
	time.Monday:    "mon",
	time.Tuesday:   "tue",
	time.Wednesday: "wed",
	time.Thursday:  "thu",
	time.Friday:    "fri",
	time.Saturday:  "sat",
}

// Schedule defines a time-based trigger that executes a scene.
type Schedule struct {
	ID        string    `json:"id"`
	Label     string    `json:"label"`
	SceneID   string    `json:"scene_id"`
	Hour      int       `json:"hour"`   // 0-23
	Minute    int       `json:"minute"` // 0-59
	Days      []string  `json:"days"`   // ["mon","tue",...] — empty means every day
	Enabled   bool      `json:"enabled"`
	CreatedAt time.Time `json:"created_at"`
}

// ScheduleManager manages the collection of schedules and drives the ticker loop.
type ScheduleManager struct {
	mu        sync.RWMutex
	schedules map[string]*Schedule
	scenes    *SceneManager
	mqtt      *MQTTClient
	store     *Store
	quit      chan struct{}
}

// NewScheduleManager creates a ScheduleManager. Call Start() to begin firing triggers.
func NewScheduleManager(scenes *SceneManager, mqtt *MQTTClient, store *Store) *ScheduleManager {
	return &ScheduleManager{
		schedules: make(map[string]*Schedule),
		scenes:    scenes,
		mqtt:      mqtt,
		store:     store,
		quit:      make(chan struct{}),
	}
}

// Load bulk-loads schedules from the store at startup (bypasses ID generation).
func (sm *ScheduleManager) Load(items []*Schedule) {
	sm.mu.Lock()
	defer sm.mu.Unlock()
	for _, s := range items {
		if s.Days == nil {
			s.Days = []string{}
		}
		sm.schedules[s.ID] = s
	}
}

// Add creates and stores a new schedule. The ID and CreatedAt are set here.
func (sm *ScheduleManager) Add(s *Schedule) {
	sm.mu.Lock()
	if s.ID == "" {
		id, err := randomID()
		if err == nil {
			s.ID = id
		}
	}
	s.CreatedAt = time.Now().UTC()
	if s.Days == nil {
		s.Days = []string{}
	}
	sm.schedules[s.ID] = s
	sm.mu.Unlock()
	sm.persist()
}

// Get returns a schedule by ID.
func (sm *ScheduleManager) Get(id string) (*Schedule, bool) {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	s, ok := sm.schedules[id]
	return s, ok
}

// GetAll returns all schedules as a slice.
func (sm *ScheduleManager) GetAll() []*Schedule {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	out := make([]*Schedule, 0, len(sm.schedules))
	for _, s := range sm.schedules {
		out = append(out, s)
	}
	return out
}

// Update patches mutable fields of an existing schedule. Nil pointer fields are left unchanged.
// days == nil means "don't change"; pass an empty slice to clear all day restrictions.
func (sm *ScheduleManager) Update(id string, label *string, hour, minute *int, days []string, daysSet bool, enabled *bool) bool {
	sm.mu.Lock()
	s, ok := sm.schedules[id]
	if !ok {
		sm.mu.Unlock()
		return false
	}
	if label != nil {
		s.Label = *label
	}
	if hour != nil {
		s.Hour = *hour
	}
	if minute != nil {
		s.Minute = *minute
	}
	if daysSet {
		if days == nil {
			s.Days = []string{}
		} else {
			s.Days = days
		}
	}
	if enabled != nil {
		s.Enabled = *enabled
	}
	sm.mu.Unlock()
	sm.persist()
	return true
}

// SetEnabled enables or disables a schedule by ID.
func (sm *ScheduleManager) SetEnabled(id string, enabled bool) bool {
	sm.mu.Lock()
	s, ok := sm.schedules[id]
	if !ok {
		sm.mu.Unlock()
		return false
	}
	s.Enabled = enabled
	sm.mu.Unlock()
	sm.persist()
	return true
}

// Delete removes a schedule by ID.
func (sm *ScheduleManager) Delete(id string) bool {
	sm.mu.Lock()
	_, ok := sm.schedules[id]
	if !ok {
		sm.mu.Unlock()
		return false
	}
	delete(sm.schedules, id)
	sm.mu.Unlock()
	sm.persist()
	return true
}

// Count returns the number of schedules.
func (sm *ScheduleManager) Count() int {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	return len(sm.schedules)
}

func (sm *ScheduleManager) persist() {
	sm.store.SaveSchedules(sm.GetAll())
}

// Start launches the scheduler goroutine. It aligns to the next minute boundary
// so that check() fires at :00 seconds of every minute rather than drifting.
func (sm *ScheduleManager) Start() {
	go sm.run()
}

// Stop shuts down the scheduler goroutine.
func (sm *ScheduleManager) Stop() {
	close(sm.quit)
}

func (sm *ScheduleManager) run() {
	// Wait until the next minute boundary before starting the ticker.
	now := time.Now()
	nextMinute := now.Truncate(time.Minute).Add(time.Minute)
	align := time.NewTimer(time.Until(nextMinute))
	defer align.Stop()

	select {
	case <-sm.quit:
		return
	case <-align.C:
	}

	// Fire once immediately at the aligned boundary, then every minute.
	sm.check()

	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-sm.quit:
			return
		case <-ticker.C:
			sm.check()
		}
	}
}

// check inspects all enabled schedules against the current local time and fires matching ones.
func (sm *ScheduleManager) check() {
	now := time.Now().Local()
	h, m := now.Hour(), now.Minute()
	day := dayAbbrev[now.Weekday()]

	sm.mu.RLock()
	var toFire []string
	for _, s := range sm.schedules {
		if !s.Enabled {
			continue
		}
		if s.Hour != h || s.Minute != m {
			continue
		}
		if len(s.Days) > 0 {
			matched := false
			for _, d := range s.Days {
				if d == day {
					matched = true
					break
				}
			}
			if !matched {
				continue
			}
		}
		toFire = append(toFire, s.ID+":"+s.SceneID)
	}
	sm.mu.RUnlock()

	for _, entry := range toFire {
		// entry is "scheduleID:sceneID" — split on first colon
		colonIdx := 0
		for i, c := range entry {
			if c == ':' {
				colonIdx = i
				break
			}
		}
		schedID := entry[:colonIdx]
		sceneID := entry[colonIdx+1:]
		if _, err := sm.scenes.Execute(sceneID, sm.mqtt); err != nil {
			log.Printf("scheduler: fired schedule %s → scene %s (error: %v)", schedID, sceneID, err)
		} else {
			log.Printf("scheduler: fired schedule %s → scene %s OK", schedID, sceneID)
		}
	}
}


