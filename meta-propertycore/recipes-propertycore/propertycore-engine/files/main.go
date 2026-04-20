// PropertyCore Automation Engine — v0.2.0
// Provides real MQTT client, device state manager, and HTTP API.
// Architecture: mqtt.go (MQTT client) + state.go (state manager) + api.go (HTTP handlers)
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
	version     = "0.2.0"
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

	// Device state manager
	state := NewStateManager()

	// MQTT client — connects to Mosquitto, subscribes to device state topics
	mqttClient := NewMQTTClient(mqttAddr, "propertycore-engine", func(topic string, payload []byte) {
		log.Printf("MQTT ← %s: %s", topic, payload)
		state.HandleMessage(topic, payload)
	})
	mqttClient.Subscribe("propertycore/devices/+/state")
	mqttClient.Start()
	defer mqttClient.Stop()

	// Announce hub online once MQTT connects
	go announceOnline(mqttClient)

	// HTTP API
	mux := http.NewServeMux()
	mux.HandleFunc("/health", healthHandler)
	mux.HandleFunc("/status", makeStatusHandler(mqttClient, state))
	mux.HandleFunc("/api/v1/devices", makeDevicesHandler(state))
	mux.HandleFunc("/api/v1/devices/", makeDevicesHandler(state))

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
