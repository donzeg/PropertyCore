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
	Version     string `json:"version"`
	Hostname    string `json:"hostname"`
	Uptime      string `json:"uptime"`
	MQTTBroker  string `json:"mqtt_broker"`
	MQTTAlive   bool   `json:"mqtt_connected"`
	DeviceCount int    `json:"device_count"`
	SceneCount  int    `json:"scene_count"`
	WSClients   int    `json:"ws_clients"`
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	fmt.Fprintln(w, "OK")
}

func makeStatusHandler(mqtt *MQTTClient, state *StateManager, scenes *SceneManager, ws *WSHub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		hostname, _ := os.Hostname()
		resp := statusResponse{
			Version:     version,
			Hostname:    hostname,
			Uptime:      time.Since(startTime).Round(time.Second).String(),
			MQTTBroker:  mqtt.addr,
			MQTTAlive:   mqtt.IsConnected(),
			DeviceCount: state.Count(),
			SceneCount:  scenes.Count(),
			WSClients:   ws.ClientCount(),
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
