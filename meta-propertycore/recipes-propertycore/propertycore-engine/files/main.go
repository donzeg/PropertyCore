// PropertyCore Automation Engine — v0.1 stub
// Provides HTTP health/status API and validates MQTT broker connectivity.
// Real automation logic (scene engine, device handler, MQTT events) will be
// layered on top of this foundation in subsequent releases.

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

const (
	version     = "0.1.0"
	httpPort    = "8080"
	mqttDefault = "localhost:1883"
)

var startTime = time.Now()

type statusResponse struct {
	Version   string `json:"version"`
	Hostname  string `json:"hostname"`
	Uptime    string `json:"uptime"`
	MQTTAddr  string `json:"mqtt_broker"`
	MQTTAlive bool   `json:"mqtt_alive"`
}

// mqttPing does a TCP dial to check if the MQTT broker is reachable.
func mqttPing(addr string) bool {
	conn, err := net.DialTimeout("tcp", addr, 2*time.Second)
	if err != nil {
		return false
	}
	conn.Close()
	return true
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	fmt.Fprintln(w, "OK")
}

func statusHandler(w http.ResponseWriter, r *http.Request) {
	hostname, _ := os.Hostname()
	mqttAddr := os.Getenv("MQTT_BROKER")
	if mqttAddr == "" {
		mqttAddr = mqttDefault
	}

	resp := statusResponse{
		Version:   version,
		Hostname:  hostname,
		Uptime:    time.Since(startTime).Round(time.Second).String(),
		MQTTAddr:  mqttAddr,
		MQTTAlive: mqttPing(mqttAddr),
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		http.Error(w, "encoding error", http.StatusInternalServerError)
	}
}

func main() {
	hostname, _ := os.Hostname()
	log.Printf("PropertyCore Engine v%s starting on %s", version, hostname)

	mqttAddr := os.Getenv("MQTT_BROKER")
	if mqttAddr == "" {
		mqttAddr = mqttDefault
	}
	log.Printf("MQTT broker: %s", mqttAddr)

	mux := http.NewServeMux()
	mux.HandleFunc("/health", healthHandler)
	mux.HandleFunc("/status", statusHandler)

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
	log.Printf("Received signal %s — shutting down...", sig)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("Shutdown error: %v", err)
	}
	log.Println("PropertyCore Engine stopped")
}
