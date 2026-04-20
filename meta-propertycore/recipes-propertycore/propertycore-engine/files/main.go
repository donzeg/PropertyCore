// PropertyCore Automation Engine — v0.7.0
// Adds Rooms and Users CRUD REST API with JSON persistence.
// Architecture: mqtt.go + state.go + scene.go + rule.go + store.go + room.go + user.go + api.go + ws.go
package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

const (
	version     = "0.7.0"
	httpPort    = "8080"
	mqttDefault = "localhost:1883"
)

var startTime = time.Now()

func main() {
	hostname, _ := os.Hostname()
	log.Printf("PropertyCore Engine v%s starting on %s", version, hostname)

	mqttAddr := os.Getenv("MQTT_BROKER")
	if mqttAddr == "" {
		mqttAddr = mqttDefault
	}

	// Persistence store — /var/lib/propertycore/
	store, err := NewStore(storeDir)
	if err != nil {
		log.Fatalf("store init: %v", err)
	}
	log.Printf("Persistence store: %s", storeDir)

	// Device state manager
	state := NewStateManager()

	// Scene manager
	scenes := NewSceneManager(store)
	if stored := store.LoadScenes(); len(stored) > 0 {
		for _, s := range stored {
			scenes.Add(s)
		}
		log.Printf("Loaded %d scene(s) from store", len(stored))
	}

	// Rules engine — evaluates rules on every device state change
	rulesEngine := NewRulesEngine(scenes, nil, store) // mqtt injected after client is created

	// WebSocket hub — broadcasts device_state, scene_executed, and rule_fired events
	wsHub := NewWSHub()
	state.OnUpdate = func(dev *DeviceState) {
		wsHub.Broadcast("device_state", dev)
		rulesEngine.Evaluate(dev)
	}

	// MQTT client — connects to Mosquitto, subscribes to device state topics
	mqttClient := NewMQTTClient(mqttAddr, "propertycore-engine", func(topic string, payload []byte) {
		log.Printf("MQTT ← %s: %s", topic, payload)
		state.HandleMessage(topic, payload)
	})
	mqttClient.Subscribe("propertycore/devices/+/state")
	mqttClient.Start()
	defer mqttClient.Stop()

	// Inject the live MQTT client into the rules engine now that it exists
	rulesEngine.mqtt = mqttClient

	// Load persisted rules (after MQTT client exists so scene execution works)
	if stored := store.LoadRules(); len(stored) > 0 {
		for _, r := range stored {
			rulesEngine.Add(r)
		}
		log.Printf("Loaded %d rule(s) from store", len(stored))
	}

	// Room manager
	rooms := NewRoomManager(store)
	if stored := store.LoadRooms(); len(stored) > 0 {
		for _, r := range stored {
			rooms.Add(r)
		}
		log.Printf("Loaded %d room(s) from store", len(stored))
	}

	// User manager
	users := NewUserManager(store)
	if stored := store.LoadUsers(); len(stored) > 0 {
		for _, u := range stored {
			users.Add(u)
		}
		log.Printf("Loaded %d user(s) from store", len(stored))
	}

	// Announce hub online once MQTT connects
	go announceOnline(mqttClient)

	// HTTP API
	mux := http.NewServeMux()
	mux.HandleFunc("/health", healthHandler)
	mux.HandleFunc("/status", makeStatusHandler(mqttClient, state, scenes, rulesEngine, rooms, users, wsHub))
	mux.HandleFunc("/api/v1/devices", makeDevicesHandler(state))
	mux.HandleFunc("/api/v1/devices/", makeDevicesHandler(state))
	mux.HandleFunc("/api/v1/scenes", makeScenesHandler(scenes, mqttClient, wsHub))
	mux.HandleFunc("/api/v1/scenes/", makeScenesHandler(scenes, mqttClient, wsHub))
	mux.HandleFunc("/api/v1/rules", makeRulesHandler(rulesEngine))
	mux.HandleFunc("/api/v1/rules/", makeRulesHandler(rulesEngine))
	mux.HandleFunc("/api/v1/rooms", makeRoomsHandler(rooms))
	mux.HandleFunc("/api/v1/rooms/", makeRoomsHandler(rooms))
	mux.HandleFunc("/api/v1/users", makeUsersHandler(users))
	mux.HandleFunc("/api/v1/users/", makeUsersHandler(users))
	mux.HandleFunc("/ws", wsHub.ServeWS(state))

	srv := &http.Server{
		Addr:         ":" + httpPort,
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("HTTP API listening on :%s", httpPort)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("HTTP server error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	sig := <-quit
	log.Printf("Signal %s received — shutting down", sig)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("HTTP shutdown error: %v", err)
	}
	log.Println("PropertyCore Engine stopped")
}

// announceOnline waits for MQTT to connect, then publishes the hub's online status.
func announceOnline(c *MQTTClient) {
	for i := 0; i < 15; i++ {
		if c.IsConnected() {
			payload := fmt.Sprintf(`{"status":"online","version":"%s"}`, version)
			if err := c.Publish("propertycore/hub/online", []byte(payload)); err == nil {
				log.Printf("MQTT → propertycore/hub/online: online v%s", version)
			}
			return
		}
		time.Sleep(time.Second)
	}
}
