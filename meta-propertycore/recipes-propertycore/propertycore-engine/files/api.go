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
	WSClients   int    `json:"ws_clients"`
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	fmt.Fprintln(w, "OK")
}

func makeStatusHandler(mqtt *MQTTClient, state *StateManager, ws *WSHub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		hostname, _ := os.Hostname()
		resp := statusResponse{
			Version:     version,
			Hostname:    hostname,
			Uptime:      time.Since(startTime).Round(time.Second).String(),
			MQTTBroker:  mqtt.addr,
			MQTTAlive:   mqtt.IsConnected(),
			DeviceCount: state.Count(),
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
