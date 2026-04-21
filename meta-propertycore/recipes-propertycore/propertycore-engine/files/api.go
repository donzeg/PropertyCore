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
	FloorCount    int    `json:"floor_count"`
	AreaCount     int    `json:"area_count"`
	UserCount     int    `json:"user_count"`
	ScheduleCount int    `json:"schedule_count"`
	WSClients     int    `json:"ws_clients"`
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	fmt.Fprintln(w, "OK")
}

func makeStatusHandler(mqtt *MQTTClient, registry *DeviceRegistry, state *StateManager, scenes *SceneManager, rules *RulesEngine, floors *FloorManager, areas *AreaManager, users *UserManager, scheduler *ScheduleManager, ws *WSHub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		hostname, _ := os.Hostname()
		resp := statusResponse{
			Version:       version,
			Hostname:      hostname,
			Uptime:        time.Since(startTime).Round(time.Second).String(),
			MQTTBroker:    mqtt.addr,
			MQTTAlive:     mqtt.IsConnected(),
			DeviceCount:   registry.Count(),
			SceneCount:    scenes.Count(),
			RuleCount:     rules.Count(),
			FloorCount:    floors.Count(),
			AreaCount:     areas.Count(),
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
//
// makeDevicesHandler handles all device CRUD endpoints plus live state merging:
//
//	GET    /api/v1/devices      → list all devices (registry + live state)
//	POST   /api/v1/devices      → register a device manually
//	GET    /api/v1/devices/{id} → get device (registry + live state)
//	PATCH  /api/v1/devices/{id} → update device metadata (name, area_id, etc.)
//	DELETE /api/v1/devices/{id} → unregister device
func makeDevicesHandler(registry *DeviceRegistry, state *StateManager) http.HandlerFunc {
	// deviceResponse merges registry metadata with live state for the HTTP response.
	type deviceResponse struct {
		ID              string                 `json:"id"`
		Name            string                 `json:"name"`
		Type            string                 `json:"type"`
		AreaID          string                 `json:"area_id,omitempty"`
		Vendor          string                 `json:"vendor,omitempty"`
		FirmwareVersion string                 `json:"firmware_version,omitempty"`
		Online          bool                   `json:"online"`
		LastSeen        time.Time              `json:"last_seen"`
		CreatedAt       time.Time              `json:"created_at"`
		State           map[string]interface{} `json:"state,omitempty"`
	}

	merge := func(d *DeviceInfo) *deviceResponse {
		resp := &deviceResponse{
			ID:              d.ID,
			Name:            d.Name,
			Type:            d.Type,
			AreaID:          d.AreaID,
			Vendor:          d.Vendor,
			FirmwareVersion: d.FirmwareVersion,
			Online:          d.Online,
			LastSeen:        d.LastSeen,
			CreatedAt:       d.CreatedAt,
		}
		if s, ok := state.Get(d.ID); ok {
			resp.State = s.State
		}
		return resp
	}

	return func(w http.ResponseWriter, r *http.Request) {
		id := strings.TrimPrefix(r.URL.Path, "/api/v1/devices")
		id = strings.Trim(id, "/")

		w.Header().Set("Content-Type", "application/json")

		// Collection: GET or POST /api/v1/devices
		if id == "" {
			switch r.Method {
			case http.MethodGet:
				all := registry.GetAll()
				out := make([]*deviceResponse, 0, len(all))
				for _, d := range all {
					out = append(out, merge(d))
				}
				if err := json.NewEncoder(w).Encode(out); err != nil {
					http.Error(w, "encode error", http.StatusInternalServerError)
				}
			case http.MethodPost:
				var d DeviceInfo
				if err := json.NewDecoder(r.Body).Decode(&d); err != nil {
					w.WriteHeader(http.StatusBadRequest)
					fmt.Fprintf(w, `{"error":"invalid JSON: %s"}`, err.Error())
					return
				}
				if d.ID == "" {
					w.WriteHeader(http.StatusBadRequest)
					fmt.Fprint(w, `{"error":"id is required"}`)
					return
				}
				registry.Register(&d)
				w.WriteHeader(http.StatusCreated)
				if err := json.NewEncoder(w).Encode(merge(&d)); err != nil {
					http.Error(w, "encode error", http.StatusInternalServerError)
				}
			default:
				http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
			}
			return
		}

		// Single device: GET, PATCH, or DELETE /api/v1/devices/{id}
		switch r.Method {
		case http.MethodGet:
			d, ok := registry.Get(id)
			if !ok {
				w.WriteHeader(http.StatusNotFound)
				fmt.Fprintf(w, `{"error":"device not found","id":%q}`, id)
				return
			}
			if err := json.NewEncoder(w).Encode(merge(d)); err != nil {
				http.Error(w, "encode error", http.StatusInternalServerError)
			}
		case http.MethodPatch:
			var patch DeviceInfo
			if err := json.NewDecoder(r.Body).Decode(&patch); err != nil {
				w.WriteHeader(http.StatusBadRequest)
				fmt.Fprintf(w, `{"error":"invalid JSON: %s"}`, err.Error())
				return
			}
			if !registry.Update(id, &patch) {
				w.WriteHeader(http.StatusNotFound)
				fmt.Fprintf(w, `{"error":"device not found","id":%q}`, id)
				return
			}
			d, _ := registry.Get(id)
			if err := json.NewEncoder(w).Encode(merge(d)); err != nil {
				http.Error(w, "encode error", http.StatusInternalServerError)
			}
		case http.MethodDelete:
			if !registry.Unregister(id) {
				w.WriteHeader(http.StatusNotFound)
				fmt.Fprintf(w, `{"error":"device not found","id":%q}`, id)
				return
			}
			w.WriteHeader(http.StatusNoContent)
		default:
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
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

// makeAreasHandler handles all area CRUD endpoints:
//
//	GET    /api/v1/areas        → list all areas
//	POST   /api/v1/areas        → create an area
//	GET    /api/v1/areas/{id}   → get an area
//	PATCH  /api/v1/areas/{id}   → update area (name, floor_id, area_type, icon)
//	DELETE /api/v1/areas/{id}   → delete an area
func makeAreasHandler(am *AreaManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		suffix := strings.TrimPrefix(r.URL.Path, "/api/v1/areas")
		suffix = strings.Trim(suffix, "/")
		w.Header().Set("Content-Type", "application/json")

		if suffix == "" {
			switch r.Method {
			case http.MethodGet:
				all := am.GetAll()
				if all == nil {
					all = []*Area{}
				}
				if err := json.NewEncoder(w).Encode(all); err != nil {
					http.Error(w, "encode error", http.StatusInternalServerError)
				}
			case http.MethodPost:
				var area Area
				if err := json.NewDecoder(r.Body).Decode(&area); err != nil {
					w.WriteHeader(http.StatusBadRequest)
					fmt.Fprintf(w, `{"error":"invalid JSON: %s"}`, err.Error())
					return
				}
				if area.Name == "" {
					w.WriteHeader(http.StatusBadRequest)
					fmt.Fprint(w, `{"error":"name is required"}`)
					return
				}
				if err := am.Add(&area); err != nil {
					http.Error(w, `{"error":"could not create area"}`, http.StatusInternalServerError)
					return
				}
				w.WriteHeader(http.StatusCreated)
				if err := json.NewEncoder(w).Encode(&area); err != nil {
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
			area, ok := am.Get(id)
			if !ok {
				w.WriteHeader(http.StatusNotFound)
				fmt.Fprintf(w, `{"error":"area not found","id":%q}`, id)
				return
			}
			if err := json.NewEncoder(w).Encode(area); err != nil {
				http.Error(w, "encode error", http.StatusInternalServerError)
			}
		case http.MethodPatch:
			var patch Area
			if err := json.NewDecoder(r.Body).Decode(&patch); err != nil {
				w.WriteHeader(http.StatusBadRequest)
				fmt.Fprintf(w, `{"error":"invalid JSON: %s"}`, err.Error())
				return
			}
			if !am.Update(id, &patch) {
				w.WriteHeader(http.StatusNotFound)
				fmt.Fprintf(w, `{"error":"area not found","id":%q}`, id)
				return
			}
			area, _ := am.Get(id)
			if err := json.NewEncoder(w).Encode(area); err != nil {
				http.Error(w, "encode error", http.StatusInternalServerError)
			}
		case http.MethodDelete:
			if !am.Delete(id) {
				w.WriteHeader(http.StatusNotFound)
				fmt.Fprintf(w, `{"error":"area not found","id":%q}`, id)
				return
			}
			w.WriteHeader(http.StatusNoContent)
		default:
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		}
	}
}

// makeFloorsHandler handles all floor CRUD endpoints:
//
//	GET    /api/v1/floors        → list all floors
//	POST   /api/v1/floors        → create a floor
//	GET    /api/v1/floors/{id}   → get a floor
//	PATCH  /api/v1/floors/{id}   → update floor (name, order)
//	DELETE /api/v1/floors/{id}   → delete a floor
func makeFloorsHandler(fm *FloorManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		suffix := strings.TrimPrefix(r.URL.Path, "/api/v1/floors")
		suffix = strings.Trim(suffix, "/")
		w.Header().Set("Content-Type", "application/json")

		if suffix == "" {
			switch r.Method {
			case http.MethodGet:
				all := fm.GetAll()
				if all == nil {
					all = []*Floor{}
				}
				if err := json.NewEncoder(w).Encode(all); err != nil {
					http.Error(w, "encode error", http.StatusInternalServerError)
				}
			case http.MethodPost:
				var floor Floor
				if err := json.NewDecoder(r.Body).Decode(&floor); err != nil {
					w.WriteHeader(http.StatusBadRequest)
					fmt.Fprintf(w, `{"error":"invalid JSON: %s"}`, err.Error())
					return
				}
				if floor.Name == "" {
					w.WriteHeader(http.StatusBadRequest)
					fmt.Fprint(w, `{"error":"name is required"}`)
					return
				}
				if err := fm.Add(&floor); err != nil {
					http.Error(w, `{"error":"could not create floor"}`, http.StatusInternalServerError)
					return
				}
				w.WriteHeader(http.StatusCreated)
				if err := json.NewEncoder(w).Encode(&floor); err != nil {
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
			floor, ok := fm.Get(id)
			if !ok {
				w.WriteHeader(http.StatusNotFound)
				fmt.Fprintf(w, `{"error":"floor not found","id":%q}`, id)
				return
			}
			if err := json.NewEncoder(w).Encode(floor); err != nil {
				http.Error(w, "encode error", http.StatusInternalServerError)
			}
		case http.MethodPatch:
			var patch Floor
			if err := json.NewDecoder(r.Body).Decode(&patch); err != nil {
				w.WriteHeader(http.StatusBadRequest)
				fmt.Fprintf(w, `{"error":"invalid JSON: %s"}`, err.Error())
				return
			}
			if !fm.Update(id, &patch) {
				w.WriteHeader(http.StatusNotFound)
				fmt.Fprintf(w, `{"error":"floor not found","id":%q}`, id)
				return
			}
			floor, _ := fm.Get(id)
			if err := json.NewEncoder(w).Encode(floor); err != nil {
				http.Error(w, "encode error", http.StatusInternalServerError)
			}
		case http.MethodDelete:
			if !fm.Delete(id) {
				w.WriteHeader(http.StatusNotFound)
				fmt.Fprintf(w, `{"error":"floor not found","id":%q}`, id)
				return
			}
			w.WriteHeader(http.StatusNoContent)
		default:
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		}
	}
}

// makePropertyHandler handles the property singleton endpoints:
//
//	GET   /api/v1/property  → get current property details
//	PATCH /api/v1/property  → update property (name, address, type, timezone)
func makePropertyHandler(pm *PropertyManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.Method {
		case http.MethodGet:
			if err := json.NewEncoder(w).Encode(pm.Get()); err != nil {
				http.Error(w, "encode error", http.StatusInternalServerError)
			}
		case http.MethodPatch:
			var patch Property
			if err := json.NewDecoder(r.Body).Decode(&patch); err != nil {
				w.WriteHeader(http.StatusBadRequest)
				fmt.Fprintf(w, `{"error":"invalid JSON: %s"}`, err.Error())
				return
			}
			pm.Update(&patch)
			if err := json.NewEncoder(w).Encode(pm.Get()); err != nil {
				http.Error(w, "encode error", http.StatusInternalServerError)
			}
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

// makeAuthHandler handles PIN-based authentication for the mobile app:
//
//	POST /api/v1/auth         → {"pin":"1234"} → {"token":"...","user":{...with room_ids}}
//	POST /api/v1/auth/logout  → {"token":"..."} → 204 No Content
//
// On success the client receives a session token and the full user profile
// (including role and room_ids). The mobile app uses role + room_ids to
// decide which rooms and devices to display without a server round-trip.
// Owner/admin receive room_ids=null which the app treats as "all rooms".
func makeAuthHandler(um *UserManager, sm *SessionManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		suffix := strings.TrimPrefix(r.URL.Path, "/api/v1/auth")
		suffix = strings.Trim(suffix, "/")
		w.Header().Set("Content-Type", "application/json")

		if suffix == "logout" {
			if r.Method != http.MethodPost {
				http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
				return
			}
			var body struct {
				Token string `json:"token"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Token == "" {
				w.WriteHeader(http.StatusBadRequest)
				fmt.Fprint(w, `{"error":"token is required"}`)
				return
			}
			sm.Invalidate(body.Token)
			w.WriteHeader(http.StatusNoContent)
			return
		}

		// POST /api/v1/auth — PIN login
		if suffix != "" {
			http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
			return
		}
		if r.Method != http.MethodPost {
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}
		var body struct {
			PIN string `json:"pin"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.PIN == "" {
			w.WriteHeader(http.StatusBadRequest)
			fmt.Fprint(w, `{"error":"pin is required"}`)
			return
		}
		user, ok := um.FindByPIN(body.PIN)
		if !ok {
			w.WriteHeader(http.StatusUnauthorized)
			fmt.Fprint(w, `{"error":"invalid PIN"}`)
			return
		}
		token, err := sm.NewSession(user.ID)
		if err != nil {
			http.Error(w, `{"error":"could not create session"}`, http.StatusInternalServerError)
			return
		}
		type authResponse struct {
			Token string      `json:"token"`
			User  *userPublic `json:"user"`
		}
		if err := json.NewEncoder(w).Encode(authResponse{Token: token, User: toPublic(user)}); err != nil {
			http.Error(w, "encode error", http.StatusInternalServerError)
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

// adminTokenFromRequest extracts the Bearer token from the Authorization header.
// Returns empty string if not present.
func adminTokenFromRequest(r *http.Request) string {
	hdr := r.Header.Get("Authorization")
	if strings.HasPrefix(hdr, "Bearer ") {
		return strings.TrimPrefix(hdr, "Bearer ")
	}
	return ""
}

// makeAdminAuthHandler handles dashboard admin login and logout.
//
//	POST /api/v1/admin/login   → {"username":"...","password":"..."} → {"token":"...","account":{...}}
//	POST /api/v1/admin/logout  → Authorization: Bearer <token>       → 204
func makeAdminAuthHandler(am *AdminManager, sm *SessionManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		suffix := strings.TrimPrefix(r.URL.Path, "/api/v1/admin")

		if suffix == "/logout" {
			if r.Method != http.MethodPost {
				http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
				return
			}
			token := adminTokenFromRequest(r)
			if token != "" {
				sm.Invalidate(token)
			}
			w.WriteHeader(http.StatusNoContent)
			return
		}

		if suffix != "/login" {
			http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
			return
		}
		if r.Method != http.MethodPost {
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}

		var body struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Username == "" || body.Password == "" {
			w.WriteHeader(http.StatusBadRequest)
			fmt.Fprint(w, `{"error":"username and password are required"}`)
			return
		}

		account, ok := am.Authenticate(body.Username, body.Password)
		if !ok {
			w.WriteHeader(http.StatusUnauthorized)
			fmt.Fprint(w, `{"error":"invalid username or password"}`)
			return
		}

		token, err := sm.NewSession(account.ID)
		if err != nil {
			http.Error(w, `{"error":"could not create session"}`, http.StatusInternalServerError)
			return
		}

		type loginResponse struct {
			Token   string       `json:"token"`
			Account *adminPublic `json:"account"`
		}
		if err := json.NewEncoder(w).Encode(loginResponse{Token: token, Account: toAdminPublic(account)}); err != nil {
			http.Error(w, "encode error", http.StatusInternalServerError)
		}
	}
}

// makeAdminAccountsHandler handles CRUD for dashboard admin accounts.
// All operations require a valid admin session token in the Authorization header.
//
//	GET    /api/v1/admin/accounts                            → list accounts
//	POST   /api/v1/admin/accounts                            → create account
//	DELETE /api/v1/admin/accounts/{id}                       → delete account
//	POST   /api/v1/admin/accounts/{id}/change-password       → change password
func makeAdminAccountsHandler(am *AdminManager, sm *SessionManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		// All endpoints require a valid admin session.
		token := adminTokenFromRequest(r)
		if _, ok := sm.ValidateToken(token); !ok {
			w.WriteHeader(http.StatusUnauthorized)
			fmt.Fprint(w, `{"error":"unauthorized"}`)
			return
		}

		suffix := strings.TrimPrefix(r.URL.Path, "/api/v1/admin/accounts")

		// Collection: GET or POST /api/v1/admin/accounts
		if suffix == "" || suffix == "/" {
			switch r.Method {
			case http.MethodGet:
				if err := json.NewEncoder(w).Encode(am.GetAll()); err != nil {
					http.Error(w, "encode error", http.StatusInternalServerError)
				}
			case http.MethodPost:
				var body struct {
					Username string `json:"username"`
					Password string `json:"password"`
				}
				if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
					w.WriteHeader(http.StatusBadRequest)
					fmt.Fprint(w, `{"error":"invalid JSON"}`)
					return
				}
				a, err := am.Create(body.Username, body.Password)
				if err != nil {
					w.WriteHeader(http.StatusBadRequest)
					fmt.Fprintf(w, `{"error":%q}`, err.Error())
					return
				}
				w.WriteHeader(http.StatusCreated)
				if err := json.NewEncoder(w).Encode(toAdminPublic(a)); err != nil {
					http.Error(w, "encode error", http.StatusInternalServerError)
				}
			default:
				http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
			}
			return
		}

		// Strip leading slash
		if strings.HasPrefix(suffix, "/") {
			suffix = suffix[1:]
		}

		// Change-password: POST /api/v1/admin/accounts/{id}/change-password
		if idx := strings.LastIndex(suffix, "/change-password"); idx != -1 {
			id := suffix[:idx]
			if r.Method != http.MethodPost {
				http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
				return
			}
			var body struct {
				Password string `json:"password"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Password == "" {
				w.WriteHeader(http.StatusBadRequest)
				fmt.Fprint(w, `{"error":"password is required"}`)
				return
			}
			if err := am.ChangePassword(id, body.Password); err != nil {
				w.WriteHeader(http.StatusNotFound)
				fmt.Fprintf(w, `{"error":%q}`, err.Error())
				return
			}
			w.WriteHeader(http.StatusNoContent)
			return
		}

		// Single account: DELETE /api/v1/admin/accounts/{id}
		id := suffix
		if r.Method != http.MethodDelete {
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}
		if !am.Delete(id) {
			w.WriteHeader(http.StatusNotFound)
			fmt.Fprintf(w, `{"error":"account not found","id":%q}`, id)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}
