// PropertyCore Automation Engine — v0.14.0
// Adds auth middleware on all API routes, session TTL (24h), PIN hashing for users,
// InfluxDB field key sanitisation, rule operator alias (neq→ne), body size limit,
// and generic error responses.
// Architecture: mqtt.go + state.go + device.go + scene.go + rule.go + store.go + area.go + floor.go + property.go + user.go + scheduler.go + auth.go + admin.go + api.go + ws.go + influx.go
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
	version       = "0.14.0"
	httpPort      = "8080"
	mqttDefault   = "localhost:1883"
	influxDefault = "http://localhost:8086"
	influxDBName  = "propertycore"
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

	// InfluxDB writer — defaults to localhost:8086, override with INFLUXDB_URL env var
	influxURL := os.Getenv("INFLUXDB_URL")
	if influxURL == "" {
		influxURL = influxDefault
	}
	influxDB := os.Getenv("INFLUXDB_DB")
	if influxDB == "" {
		influxDB = influxDBName
	}
	influx := NewInfluxWriter(influxURL, influxDB)
	log.Printf("InfluxDB: writing to %s db=%s", influxURL, influxDB)

	// Device state manager
	state := NewStateManager()

	// Device registry — persistent metadata for all known devices
	registry := NewDeviceRegistry(store)
	if stored := store.LoadDevices(); len(stored) > 0 {
		registry.Load(stored)
		log.Printf("Loaded %d device(s) from registry", len(stored))
	}

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
		// Check for LWT offline notification: {"online":false,...}
		if onlineVal, ok := dev.State["online"]; ok {
			if isOnline, ok := onlineVal.(bool); ok && !isOnline {
				registry.MarkOffline(dev.ID)
				if info, ok2 := registry.Get(dev.ID); ok2 {
					wsHub.Broadcast("device_offline", info)
				}
				return
			}
		}
		isNew, cameOnline := registry.MarkSeen(dev.ID, dev.Type)
		wsHub.Broadcast("device_state", dev)
		if isNew {
			if info, ok := registry.Get(dev.ID); ok {
				wsHub.Broadcast("device_new", info)
			}
		} else if cameOnline {
			if info, ok := registry.Get(dev.ID); ok {
				wsHub.Broadcast("device_online", info)
			}
		}
		rulesEngine.Evaluate(dev)
		go influx.WriteDeviceState(dev)
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

	// Area manager
	areas := NewAreaManager(store)
	if stored := store.LoadAreas(); len(stored) > 0 {
		for _, a := range stored {
			areas.Add(a)
		}
		log.Printf("Loaded %d area(s) from store", len(stored))
	}

	// Floor manager
	floors := NewFloorManager(store)
	if stored := store.LoadFloors(); len(stored) > 0 {
		for _, f := range stored {
			floors.Add(f)
		}
		log.Printf("Loaded %d floor(s) from store", len(stored))
	}

	// Property singleton
	prop := NewPropertyManager(store)
	if stored := store.LoadProperty(); stored != nil {
		prop.Load(stored)
		log.Printf("Loaded property: %s (%s)", stored.Name, stored.Type)
	}

	// User manager
	users := NewUserManager(store)
	if stored := store.LoadUsers(); len(stored) > 0 {
		for _, u := range stored {
			users.Add(u)
		}
		log.Printf("Loaded %d user(s) from store", len(stored))
	}

	// Session manager — in-memory PIN auth tokens for the mobile app
	sessions := NewSessionManager()

	// Admin manager — dashboard login credentials (username + password)
	admins := NewAdminManager(store)
	if stored := store.LoadAdminAccounts(); len(stored) > 0 {
		admins.Load(stored)
		log.Printf("Loaded %d admin account(s) from store", len(stored))
	}
	admins.SeedDefault() // creates admin/propertycore if no accounts exist
	adminSessions := NewSessionManager()

	// Schedule manager — start ticker after all scenes are loaded
	scheduler := NewScheduleManager(scenes, mqttClient, store)
	if stored := store.LoadSchedules(); len(stored) > 0 {
		scheduler.Load(stored)
		log.Printf("Loaded %d schedule(s) from store", len(stored))
	}
	scheduler.Start()
	defer scheduler.Stop()
	defer registry.PersistAll() // flush Online/LastSeen on clean shutdown

	// Announce hub online once MQTT connects
	go announceOnline(mqttClient)

	// HTTP API
	// auth wraps a handler with both session validation and body size limit.
	// Use for all routes that require a valid admin dashboard token.
	auth := func(h http.HandlerFunc) http.HandlerFunc {
		return requireAdminAuth(adminSessions, withBodyLimit(h))
	}

	mux := http.NewServeMux()
	// Public routes (no auth required)
	mux.HandleFunc("/health", healthHandler)
	mux.HandleFunc("/status", makeStatusHandler(mqttClient, registry, state, scenes, rulesEngine, floors, areas, users, scheduler, wsHub))
	mux.HandleFunc("/ws", wsHub.ServeWS(state))
	// Mobile auth — PIN login/logout (no admin token needed)
	mux.HandleFunc("/api/v1/auth", withBodyLimit(makeAuthHandler(users, sessions)))
	mux.HandleFunc("/api/v1/auth/", withBodyLimit(makeAuthHandler(users, sessions)))
	// Admin auth — login/logout are public (they create/destroy the session)
	mux.HandleFunc("/api/v1/admin/login", withBodyLimit(makeAdminAuthHandler(admins, adminSessions)))
	mux.HandleFunc("/api/v1/admin/logout", withBodyLimit(makeAdminAuthHandler(admins, adminSessions)))
	// Protected routes — require valid admin session token
	mux.HandleFunc("/api/v1/devices", auth(makeDevicesHandler(registry, state, mqttClient)))
	mux.HandleFunc("/api/v1/devices/", auth(makeDevicesHandler(registry, state, mqttClient)))
	mux.HandleFunc("/api/v1/scenes", auth(makeScenesHandler(scenes, mqttClient, wsHub)))
	mux.HandleFunc("/api/v1/scenes/", auth(makeScenesHandler(scenes, mqttClient, wsHub)))
	mux.HandleFunc("/api/v1/rules", auth(makeRulesHandler(rulesEngine)))
	mux.HandleFunc("/api/v1/rules/", auth(makeRulesHandler(rulesEngine)))
	mux.HandleFunc("/api/v1/areas", auth(makeAreasHandler(areas)))
	mux.HandleFunc("/api/v1/areas/", auth(makeAreasHandler(areas)))
	mux.HandleFunc("/api/v1/floors", auth(makeFloorsHandler(floors)))
	mux.HandleFunc("/api/v1/floors/", auth(makeFloorsHandler(floors)))
	mux.HandleFunc("/api/v1/property", auth(makePropertyHandler(prop)))
	mux.HandleFunc("/api/v1/users", auth(makeUsersHandler(users)))
	mux.HandleFunc("/api/v1/users/", auth(makeUsersHandler(users)))
	mux.HandleFunc("/api/v1/admin/accounts", auth(makeAdminAccountsHandler(admins, adminSessions)))
	mux.HandleFunc("/api/v1/admin/accounts/", auth(makeAdminAccountsHandler(admins, adminSessions)))
	mux.HandleFunc("/api/v1/schedules", auth(makeSchedulesHandler(scheduler)))
	mux.HandleFunc("/api/v1/schedules/", auth(makeSchedulesHandler(scheduler)))

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
