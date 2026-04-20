// PropertyCore Engine — HTTP API handlers
package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"
)

type statusResponse struct {
	Version       string `json:"version"`
	Hostname      string `json:"hostname"`
	Uptime        string `json:"uptime"`
	MQTTBroker    string `json:"mqtt_broker"`
	MQTTAlive     bool   `json:"mqtt_connected"`
	DeviceCount   int    `json:"device_count"`
	SceneCount    int    `json:"scene_count"`
	RuleCount     int    `json:"rule_count"`
	RoomCount     int    `json:"room_count"`
	UserCount     int    `json:"user_count"`
	ScheduleCount int    `json:"schedule_count"`
	WSClients     int    `json:"ws_clients"`
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	fmt.Fprintln(w, "OK")
}

func makeStatusHandler(mqtt *MQTTClient, state *StateManager, scenes *SceneManager, rules *RulesEngine, rooms *RoomManager, users *UserManager, scheduler *ScheduleManager, ws *WSHub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		hostname, _ := os.Hostname()
		resp := statusResponse{
			Version:       version,
			Hostname:      hostname,
			Uptime:        time.Since(startTime).Round(time.Second).String(),
			MQTTBroker:    mqtt.addr,
			MQTTAlive:     mqtt.IsConnected(),
			DeviceCount:   state.Count(),
			SceneCount:    scenes.Count(),
			RuleCount:     rules.Count(),
			RoomCount:     rooms.Count(),
			UserCount:     users.Count(),
			ScheduleCount: scheduler.Count(),
			WSClients:     ws.ClientCount(),
		}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(resp); err != nil {
			http.Error(w, "encode error", http.StatusInternalServerError)
		}
	}
}

// makeDevicesHandler handles both:
//
//	GET /api/v1/devices      → list all devices
//	GET /api/v1/devices/{id} → single device state
func makeDevicesHandler(state *StateManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}
		id := strings.TrimPrefix(r.URL.Path, "/api/v1/devices")
		id = strings.Trim(id, "/")

		w.Header().Set("Content-Type", "application/json")

		if id == "" {
			devices := state.GetAll()
			if devices == nil {
				devices = []*DeviceState{}
			}
			if err := json.NewEncoder(w).Encode(devices); err != nil {
				http.Error(w, "encode error", http.StatusInternalServerError)
			}
			return
		}

		dev, ok := state.Get(id)
		if !ok {
			w.WriteHeader(http.StatusNotFound)
			fmt.Fprintf(w, `{"error":"device not found","id":%q}`, id)
			return
		}
		if err := json.NewEncoder(w).Encode(dev); err != nil {
			http.Error(w, "encode error", http.StatusInternalServerError)
		}
	}
}

// makeScenesHandler handles all scene CRUD and execution endpoints:
//
//	GET    /api/v1/scenes           → list all scenes
//	POST   /api/v1/scenes           → create a scene
//	GET    /api/v1/scenes/{id}      → get a scene
//	DELETE /api/v1/scenes/{id}      → delete a scene
//	POST   /api/v1/scenes/{id}/execute → execute a scene
func makeScenesHandler(sm *SceneManager, mqtt *MQTTClient, ws *WSHub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Parse path suffix after /api/v1/scenes
		suffix := strings.TrimPrefix(r.URL.Path, "/api/v1/scenes")
		suffix = strings.Trim(suffix, "/")

		w.Header().Set("Content-Type", "application/json")

		// POST /api/v1/scenes/{id}/execute
		if strings.HasSuffix(suffix, "/execute") {
			if r.Method != http.MethodPost {
				http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
				return
			}
			id := strings.TrimSuffix(suffix, "/execute")
			scene, err := sm.Execute(id, mqtt)
			if err != nil {
				if scene == nil {
					w.WriteHeader(http.StatusNotFound)
				}
				fmt.Fprintf(w, `{"error":%q}`, err.Error())
				return
			}
			ws.Broadcast("scene_executed", scene)
			if err := json.NewEncoder(w).Encode(scene); err != nil {
				http.Error(w, "encode error", http.StatusInternalServerError)
			}
			return
		}

		// Collection: GET /api/v1/scenes or POST /api/v1/scenes
		if suffix == "" {
			switch r.Method {
			case http.MethodGet:
				all := sm.GetAll()
				if all == nil {
					all = []*Scene{}
				}
				if err := json.NewEncoder(w).Encode(all); err != nil {
					http.Error(w, "encode error", http.StatusInternalServerError)
				}
			case http.MethodPost:
				var s Scene
				if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
					w.WriteHeader(http.StatusBadRequest)
					fmt.Fprintf(w, `{"error":"invalid JSON: %s"}`, err.Error())
					return
				}
				if s.Name == "" {
					w.WriteHeader(http.StatusBadRequest)
					fmt.Fprint(w, `{"error":"name is required"}`)
					return
				}
				if err := sm.Add(&s); err != nil {
					http.Error(w, `{"error":"could not create scene"}`, http.StatusInternalServerError)
					return
				}
				w.WriteHeader(http.StatusCreated)
				if err := json.NewEncoder(w).Encode(&s); err != nil {
					http.Error(w, "encode error", http.StatusInternalServerError)
				}
			default:
				http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
			}
			return
		}

		// Single scene: GET /api/v1/scenes/{id} or DELETE /api/v1/scenes/{id}
		id := suffix
		switch r.Method {
		case http.MethodGet:
			s, ok := sm.Get(id)
			if !ok {
				w.WriteHeader(http.StatusNotFound)
				fmt.Fprintf(w, `{"error":"scene not found","id":%q}`, id)
				return
			}
			if err := json.NewEncoder(w).Encode(s); err != nil {
				http.Error(w, "encode error", http.StatusInternalServerError)
			}
		case http.MethodDelete:
			if !sm.Delete(id) {
				w.WriteHeader(http.StatusNotFound)
				fmt.Fprintf(w, `{"error":"scene not found","id":%q}`, id)
				return
			}
			w.WriteHeader(http.StatusNoContent)
		default:
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		}
	}
}

// makeRulesHandler handles all rule CRUD and enable/disable endpoints:
//
//	GET    /api/v1/rules              → list all rules
//	POST   /api/v1/rules              → create rule
//	GET    /api/v1/rules/{id}         → get rule
//	DELETE /api/v1/rules/{id}         → delete rule
//	POST   /api/v1/rules/{id}/enable  → enable rule
//	POST   /api/v1/rules/{id}/disable → disable rule
func makeRulesHandler(re *RulesEngine) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		suffix := strings.TrimPrefix(r.URL.Path, "/api/v1/rules")
		suffix = strings.Trim(suffix, "/")

		w.Header().Set("Content-Type", "application/json")

		// POST /api/v1/rules/{id}/enable  or  /disable
		if strings.HasSuffix(suffix, "/enable") || strings.HasSuffix(suffix, "/disable") {
			if r.Method != http.MethodPost {
				http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
				return
			}
			enable := strings.HasSuffix(suffix, "/enable")
			id := strings.TrimSuffix(suffix, "/enable")
			id = strings.TrimSuffix(id, "/disable")
			if !re.SetEnabled(id, enable) {
				w.WriteHeader(http.StatusNotFound)
				fmt.Fprintf(w, `{"error":"rule not found","id":%q}`, id)
				return
			}
			rule, _ := re.Get(id)
			if err := json.NewEncoder(w).Encode(rule); err != nil {
				http.Error(w, "encode error", http.StatusInternalServerError)
			}
			return
		}

		// Collection: GET or POST /api/v1/rules
		if suffix == "" {
			switch r.Method {
			case http.MethodGet:
				all := re.GetAll()
				if all == nil {
					all = []*Rule{}
				}
				if err := json.NewEncoder(w).Encode(all); err != nil {
					http.Error(w, "encode error", http.StatusInternalServerError)
				}
			case http.MethodPost:
				var rule Rule
				if err := json.NewDecoder(r.Body).Decode(&rule); err != nil {
					w.WriteHeader(http.StatusBadRequest)
					fmt.Fprintf(w, `{"error":"invalid JSON: %s"}`, err.Error())
					return
				}
				if rule.Name == "" {
					w.WriteHeader(http.StatusBadRequest)
					fmt.Fprint(w, `{"error":"name is required"}`)
					return
				}
				if rule.Condition.DeviceID == "" || rule.Condition.Field == "" || rule.Condition.Operator == "" {
					w.WriteHeader(http.StatusBadRequest)
					fmt.Fprint(w, `{"error":"condition.device_id, condition.field, and condition.operator are required"}`)
					return
				}
				if rule.Action.Type != "scene" && rule.Action.Type != "mqtt" {
					w.WriteHeader(http.StatusBadRequest)
					fmt.Fprint(w, `{"error":"action.type must be \"scene\" or \"mqtt\""}`)
					return
				}
				rule.Enabled = true // new rules are enabled by default
				if err := re.Add(&rule); err != nil {
					http.Error(w, `{"error":"could not create rule"}`, http.StatusInternalServerError)
					return
				}
				w.WriteHeader(http.StatusCreated)
				if err := json.NewEncoder(w).Encode(&rule); err != nil {
					http.Error(w, "encode error", http.StatusInternalServerError)
				}
			default:
				http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
			}
			return
		}

		// Single rule: GET or DELETE /api/v1/rules/{id}
		id := suffix
		switch r.Method {
		case http.MethodGet:
			rule, ok := re.Get(id)
			if !ok {
				w.WriteHeader(http.StatusNotFound)
				fmt.Fprintf(w, `{"error":"rule not found","id":%q}`, id)
				return
			}
			if err := json.NewEncoder(w).Encode(rule); err != nil {
				http.Error(w, "encode error", http.StatusInternalServerError)
			}
		case http.MethodDelete:
			if !re.Delete(id) {
				w.WriteHeader(http.StatusNotFound)
				fmt.Fprintf(w, `{"error":"rule not found","id":%q}`, id)
				return
			}
			w.WriteHeader(http.StatusNoContent)
		default:
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		}
	}
}

// makeRoomsHandler handles all room CRUD endpoints:
//
//	GET    /api/v1/rooms        → list all rooms
//	POST   /api/v1/rooms        → create a room
//	GET    /api/v1/rooms/{id}   → get a room
//	PATCH  /api/v1/rooms/{id}   → update room (name, floor)
//	DELETE /api/v1/rooms/{id}   → delete a room
func makeRoomsHandler(rm *RoomManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		suffix := strings.TrimPrefix(r.URL.Path, "/api/v1/rooms")
		suffix = strings.Trim(suffix, "/")
		w.Header().Set("Content-Type", "application/json")

		if suffix == "" {
			switch r.Method {
			case http.MethodGet:
				all := rm.GetAll()
				if all == nil {
					all = []*Room{}
				}
				if err := json.NewEncoder(w).Encode(all); err != nil {
					http.Error(w, "encode error", http.StatusInternalServerError)
				}
			case http.MethodPost:
				var room Room
				if err := json.NewDecoder(r.Body).Decode(&room); err != nil {
					w.WriteHeader(http.StatusBadRequest)
					fmt.Fprintf(w, `{"error":"invalid JSON: %s"}`, err.Error())
					return
				}
				if room.Name == "" {
					w.WriteHeader(http.StatusBadRequest)
					fmt.Fprint(w, `{"error":"name is required"}`)
					return
				}
				if err := rm.Add(&room); err != nil {
					http.Error(w, `{"error":"could not create room"}`, http.StatusInternalServerError)
					return
				}
				w.WriteHeader(http.StatusCreated)
				if err := json.NewEncoder(w).Encode(&room); err != nil {
					http.Error(w, "encode error", http.StatusInternalServerError)
				}
			default:
				http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
			}
			return
		}

		id := suffix
		switch r.Method {
		case http.MethodGet:
			room, ok := rm.Get(id)
			if !ok {
				w.WriteHeader(http.StatusNotFound)
				fmt.Fprintf(w, `{"error":"room not found","id":%q}`, id)
				return
			}
			if err := json.NewEncoder(w).Encode(room); err != nil {
				http.Error(w, "encode error", http.StatusInternalServerError)
			}
		case http.MethodPatch:
			var patch Room
			if err := json.NewDecoder(r.Body).Decode(&patch); err != nil {
				w.WriteHeader(http.StatusBadRequest)
				fmt.Fprintf(w, `{"error":"invalid JSON: %s"}`, err.Error())
				return
			}
			if !rm.Update(id, &patch) {
				w.WriteHeader(http.StatusNotFound)
				fmt.Fprintf(w, `{"error":"room not found","id":%q}`, id)
				return
			}
			room, _ := rm.Get(id)
			if err := json.NewEncoder(w).Encode(room); err != nil {
				http.Error(w, "encode error", http.StatusInternalServerError)
			}
		case http.MethodDelete:
			if !rm.Delete(id) {
				w.WriteHeader(http.StatusNotFound)
				fmt.Fprintf(w, `{"error":"room not found","id":%q}`, id)
				return
			}
			w.WriteHeader(http.StatusNoContent)
		default:
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		}
	}
}

// makeUsersHandler handles all user CRUD endpoints:
//
//	GET    /api/v1/users        → list all users (PIN omitted)
//	POST   /api/v1/users        → create a user
//	GET    /api/v1/users/{id}   → get a user (PIN omitted)
//	PATCH  /api/v1/users/{id}   → update user (name, role, pin)
//	DELETE /api/v1/users/{id}   → delete a user
func makeUsersHandler(um *UserManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		suffix := strings.TrimPrefix(r.URL.Path, "/api/v1/users")
		suffix = strings.Trim(suffix, "/")
		w.Header().Set("Content-Type", "application/json")

		if suffix == "" {
			switch r.Method {
			case http.MethodGet:
				all := um.GetAll()
				pub := make([]*userPublic, 0, len(all))
				for _, u := range all {
					pub = append(pub, toPublic(u))
				}
				if err := json.NewEncoder(w).Encode(pub); err != nil {
					http.Error(w, "encode error", http.StatusInternalServerError)
				}
			case http.MethodPost:
				var user User
				if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
					w.WriteHeader(http.StatusBadRequest)
					fmt.Fprintf(w, `{"error":"invalid JSON: %s"}`, err.Error())
					return
				}
				if user.Name == "" {
					w.WriteHeader(http.StatusBadRequest)
					fmt.Fprint(w, `{"error":"name is required"}`)
					return
				}
				if err := um.Add(&user); err != nil {
					http.Error(w, `{"error":"could not create user"}`, http.StatusInternalServerError)
					return
				}
				w.WriteHeader(http.StatusCreated)
				if err := json.NewEncoder(w).Encode(toPublic(&user)); err != nil {
					http.Error(w, "encode error", http.StatusInternalServerError)
				}
			default:
				http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
			}
			return
		}

		id := suffix
		switch r.Method {
		case http.MethodGet:
			user, ok := um.Get(id)
			if !ok {
				w.WriteHeader(http.StatusNotFound)
				fmt.Fprintf(w, `{"error":"user not found","id":%q}`, id)
				return
			}
			if err := json.NewEncoder(w).Encode(toPublic(user)); err != nil {
				http.Error(w, "encode error", http.StatusInternalServerError)
			}
		case http.MethodPatch:
			var patch User
			if err := json.NewDecoder(r.Body).Decode(&patch); err != nil {
				w.WriteHeader(http.StatusBadRequest)
				fmt.Fprintf(w, `{"error":"invalid JSON: %s"}`, err.Error())
				return
			}
			if !um.Update(id, &patch) {
				w.WriteHeader(http.StatusNotFound)
				fmt.Fprintf(w, `{"error":"user not found","id":%q}`, id)
				return
			}
			user, _ := um.Get(id)
			if err := json.NewEncoder(w).Encode(toPublic(user)); err != nil {
				http.Error(w, "encode error", http.StatusInternalServerError)
			}
		case http.MethodDelete:
			if !um.Delete(id) {
				w.WriteHeader(http.StatusNotFound)
				fmt.Fprintf(w, `{"error":"user not found","id":%q}`, id)
				return
			}
			w.WriteHeader(http.StatusNoContent)
		default:
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		}
	}
}

// makeSchedulesHandler handles all schedule CRUD and enable/disable endpoints:
//
//	GET    /api/v1/schedules                → list all schedules
//	POST   /api/v1/schedules                → create schedule
//	GET    /api/v1/schedules/{id}           → get schedule
//	PATCH  /api/v1/schedules/{id}           → update schedule
//	DELETE /api/v1/schedules/{id}           → delete schedule
//	POST   /api/v1/schedules/{id}/enable    → enable schedule
//	POST   /api/v1/schedules/{id}/disable   → disable schedule
func makeSchedulesHandler(sm *ScheduleManager) http.HandlerFunc {
	type patchBody struct {
		Label   *string
		Hour    *int
		Minute  *int
		Days    []string
		DaysSet bool
		Enabled *bool
	}

	return func(w http.ResponseWriter, r *http.Request) {
		suffix := strings.TrimPrefix(r.URL.Path, "/api/v1/schedules")
		suffix = strings.Trim(suffix, "/")

		w.Header().Set("Content-Type", "application/json")

		// POST /api/v1/schedules/{id}/enable  or  /disable
		if strings.HasSuffix(suffix, "/enable") || strings.HasSuffix(suffix, "/disable") {
			if r.Method != http.MethodPost {
				http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
				return
			}
			enable := strings.HasSuffix(suffix, "/enable")
			id := strings.TrimSuffix(suffix, "/enable")
			id = strings.TrimSuffix(id, "/disable")
			if !sm.SetEnabled(id, enable) {
				w.WriteHeader(http.StatusNotFound)
				fmt.Fprintf(w, `{"error":"schedule not found","id":%q}`, id)
				return
			}
			s, _ := sm.Get(id)
			if err := json.NewEncoder(w).Encode(s); err != nil {
				http.Error(w, "encode error", http.StatusInternalServerError)
			}
			return
		}

		// Collection: GET or POST /api/v1/schedules
		if suffix == "" {
			switch r.Method {
			case http.MethodGet:
				all := sm.GetAll()
				if all == nil {
					all = []*Schedule{}
				}
				if err := json.NewEncoder(w).Encode(all); err != nil {
					http.Error(w, "encode error", http.StatusInternalServerError)
				}
			case http.MethodPost:
				var s Schedule
				if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
					w.WriteHeader(http.StatusBadRequest)
					fmt.Fprintf(w, `{"error":"invalid JSON: %s"}`, err.Error())
					return
				}
				if s.SceneID == "" {
					w.WriteHeader(http.StatusBadRequest)
					fmt.Fprint(w, `{"error":"scene_id is required"}`)
					return
				}
				if s.Hour < 0 || s.Hour > 23 || s.Minute < 0 || s.Minute > 59 {
					w.WriteHeader(http.StatusBadRequest)
					fmt.Fprint(w, `{"error":"hour must be 0-23, minute must be 0-59"}`)
					return
				}
				s.Enabled = true // new schedules are enabled by default
				sm.Add(&s)
				w.WriteHeader(http.StatusCreated)
				if err := json.NewEncoder(w).Encode(&s); err != nil {
					http.Error(w, "encode error", http.StatusInternalServerError)
				}
			default:
				http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
			}
			return
		}

		// Single schedule: GET, PATCH, or DELETE /api/v1/schedules/{id}
		id := suffix
		switch r.Method {
		case http.MethodGet:
			s, ok := sm.Get(id)
			if !ok {
				w.WriteHeader(http.StatusNotFound)
				fmt.Fprintf(w, `{"error":"schedule not found","id":%q}`, id)
				return
			}
			if err := json.NewEncoder(w).Encode(s); err != nil {
				http.Error(w, "encode error", http.StatusInternalServerError)
			}
		case http.MethodPatch:
			// Decode into a raw map first so we detect which fields were provided vs omitted
			var raw map[string]json.RawMessage
			if err := json.NewDecoder(r.Body).Decode(&raw); err != nil {
				w.WriteHeader(http.StatusBadRequest)
				fmt.Fprintf(w, `{"error":"invalid JSON: %s"}`, err.Error())
				return
			}
			var patch patchBody
			if v, ok := raw["label"]; ok {
				var s string
				_ = json.Unmarshal(v, &s)
				patch.Label = &s
			}
			if v, ok := raw["hour"]; ok {
				var n int
				_ = json.Unmarshal(v, &n)
				patch.Hour = &n
			}
			if v, ok := raw["minute"]; ok {
				var n int
				_ = json.Unmarshal(v, &n)
				patch.Minute = &n
			}
			if v, ok := raw["days"]; ok {
				patch.DaysSet = true
				_ = json.Unmarshal(v, &patch.Days)
			}
			if v, ok := raw["enabled"]; ok {
				var b bool
				_ = json.Unmarshal(v, &b)
				patch.Enabled = &b
			}
			if !sm.Update(id, patch.Label, patch.Hour, patch.Minute, patch.Days, patch.DaysSet, patch.Enabled) {
				w.WriteHeader(http.StatusNotFound)
				fmt.Fprintf(w, `{"error":"schedule not found","id":%q}`, id)
				return
			}
			s, _ := sm.Get(id)
			if err := json.NewEncoder(w).Encode(s); err != nil {
				http.Error(w, "encode error", http.StatusInternalServerError)
			}
		case http.MethodDelete:
			if !sm.Delete(id) {
				w.WriteHeader(http.StatusNotFound)
				fmt.Fprintf(w, `{"error":"schedule not found","id":%q}`, id)
				return
			}
			w.WriteHeader(http.StatusNoContent)
		default:
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		}
	}
}
