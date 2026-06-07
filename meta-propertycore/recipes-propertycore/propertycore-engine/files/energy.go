// PropertyCore Engine — Energy, Water & Generator management
// Stores inverter setup, water system config, and generator config as JSON
// singletons. The engine does not read Modbus registers directly — that is
// handled by a separate bridge process (pc-bridge-modbus). This module stores
// the configuration and exposes a live energy snapshot built from device state
// pushed by the Modbus bridge via MQTT.
package main

import (
	"encoding/json"
	"sync"
	"time"
)

// ─── Inverter ────────────────────────────────────────────────────────────────

// InverterBrand is the supported inverter manufacturer.
type InverterBrand string

const (
	InverterDEYE    InverterBrand = "deye"
	InverterGrowatt InverterBrand = "growatt"
	InverterSofar   InverterBrand = "sofar"
	InverterGoodwe  InverterBrand = "goodwe"
	InverterSunsynk InverterBrand = "sunsynk"
	InverterVictron InverterBrand = "victron"
	InverterOther   InverterBrand = "other"
)

// InverterConfig holds the RS485/Modbus setup for the inverter interface.
type InverterConfig struct {
	Enabled      bool          `json:"enabled"`
	Brand        InverterBrand `json:"brand"`
	Model        string        `json:"model,omitempty"`
	Port         string        `json:"port"`                // e.g. "/dev/ttyUSB0"
	BaudRate     int           `json:"baud_rate"`           // e.g. 9600
	SlaveAddr    int           `json:"slave_addr"`          // Modbus slave address
	PollInterval int           `json:"poll_interval"`       // seconds
	DeviceID     string        `json:"device_id,omitempty"` // linked MQTT device ID
	UpdatedAt    time.Time     `json:"updated_at"`
}

func defaultInverterConfig() *InverterConfig {
	return &InverterConfig{
		Enabled:      false,
		Brand:        InverterDEYE,
		Port:         "/dev/ttyUSB0",
		BaudRate:     9600,
		SlaveAddr:    1,
		PollInterval: 10,
	}
}

// InverterManager holds and persists the inverter configuration.
type InverterManager struct {
	mu     sync.RWMutex
	config *InverterConfig
	store  *Store
}

func NewInverterManager(store *Store) *InverterManager {
	return &InverterManager{config: defaultInverterConfig(), store: store}
}

func (m *InverterManager) Get() *InverterConfig {
	m.mu.RLock()
	c := *m.config
	m.mu.RUnlock()
	return &c
}

func (m *InverterManager) Update(patch json.RawMessage) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if err := json.Unmarshal(patch, m.config); err != nil {
		return err
	}
	m.config.UpdatedAt = time.Now().UTC()
	m.store.SaveInverter(m.config)
	return nil
}

func (m *InverterManager) Load(c *InverterConfig) {
	m.mu.Lock()
	m.config = c
	m.mu.Unlock()
}

// ─── Water ───────────────────────────────────────────────────────────────────

// WaterConfig holds tank and pump configuration.
type WaterConfig struct {
	Enabled        bool      `json:"enabled"`
	TankCapacityL  float64   `json:"tank_capacity_l"`    // litres
	SensorFullCm   float64   `json:"sensor_full_cm"`     // distance at full (cm)
	SensorEmptyCm  float64   `json:"sensor_empty_cm"`    // distance at empty (cm)
	PumpStartPct   float64   `json:"pump_start_pct"`     // pump on below this %
	PumpStopPct    float64   `json:"pump_stop_pct"`      // pump off above this %
	PumpMaxRunMin  int       `json:"pump_max_run_min"`   // overheat protection (minutes)
	FlowPulsePerL  float64   `json:"flow_pulse_per_l"`   // flow meter calibration
	LeakAlertLPerH float64   `json:"leak_alert_l_per_h"` // abnormal flow threshold
	TankDeviceID   string    `json:"tank_device_id,omitempty"`
	PumpDeviceID   string    `json:"pump_device_id,omitempty"`
	FlowDeviceID   string    `json:"flow_device_id,omitempty"`
	UpdatedAt      time.Time `json:"updated_at"`
}

func defaultWaterConfig() *WaterConfig {
	return &WaterConfig{
		Enabled:        false,
		TankCapacityL:  5000,
		SensorFullCm:   20,
		SensorEmptyCm:  200,
		PumpStartPct:   20,
		PumpStopPct:    90,
		PumpMaxRunMin:  60,
		FlowPulsePerL:  450,
		LeakAlertLPerH: 50,
	}
}

// WaterManager holds and persists the water config.
type WaterManager struct {
	mu     sync.RWMutex
	config *WaterConfig
	store  *Store
}

func NewWaterManager(store *Store) *WaterManager {
	return &WaterManager{config: defaultWaterConfig(), store: store}
}

func (m *WaterManager) Get() *WaterConfig {
	m.mu.RLock()
	c := *m.config
	m.mu.RUnlock()
	return &c
}

func (m *WaterManager) Update(patch json.RawMessage) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if err := json.Unmarshal(patch, m.config); err != nil {
		return err
	}
	m.config.UpdatedAt = time.Now().UTC()
	m.store.SaveWater(m.config)
	return nil
}

func (m *WaterManager) Load(c *WaterConfig) {
	m.mu.Lock()
	m.config = c
	m.mu.Unlock()
}

// ─── Generator ───────────────────────────────────────────────────────────────

// GeneratorConfig holds generator interface and monitoring configuration.
type GeneratorConfig struct {
	Enabled          bool      `json:"enabled"`
	StartDelayS      int       `json:"start_delay_s"`       // seconds after grid failure
	StopDelayS       int       `json:"stop_delay_s"`        // cooldown after grid restore
	BatteryStartPct  float64   `json:"battery_start_pct"`   // start if battery below %
	FuelSensorFullV  float64   `json:"fuel_sensor_full_v"`  // voltage at full tank
	FuelSensorEmptyV float64   `json:"fuel_sensor_empty_v"` // voltage at empty
	MaintenanceHours int       `json:"maintenance_hours"`   // service interval
	RuntimeHours     float64   `json:"runtime_hours"`       // cumulative runtime counter
	GenDeviceID      string    `json:"gen_device_id,omitempty"`
	FuelDeviceID     string    `json:"fuel_device_id,omitempty"`
	UpdatedAt        time.Time `json:"updated_at"`
}

func defaultGeneratorConfig() *GeneratorConfig {
	return &GeneratorConfig{
		Enabled:          false,
		StartDelayS:      30,
		StopDelayS:       60,
		BatteryStartPct:  20,
		FuelSensorFullV:  4.5,
		FuelSensorEmptyV: 0.5,
		MaintenanceHours: 250,
		RuntimeHours:     0,
	}
}

// GeneratorManager holds and persists the generator config.
type GeneratorManager struct {
	mu     sync.RWMutex
	config *GeneratorConfig
	store  *Store
}

func NewGeneratorManager(store *Store) *GeneratorManager {
	return &GeneratorManager{config: defaultGeneratorConfig(), store: store}
}

func (m *GeneratorManager) Get() *GeneratorConfig {
	m.mu.RLock()
	c := *m.config
	m.mu.RUnlock()
	return &c
}

func (m *GeneratorManager) Update(patch json.RawMessage) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if err := json.Unmarshal(patch, m.config); err != nil {
		return err
	}
	m.config.UpdatedAt = time.Now().UTC()
	m.store.SaveGenerator(m.config)
	return nil
}

func (m *GeneratorManager) Load(c *GeneratorConfig) {
	m.mu.Lock()
	m.config = c
	m.mu.Unlock()
}

// ─── Energy Live ─────────────────────────────────────────────────────────────

// EnergyLive is a point-in-time snapshot of energy system state.
// Values are read from the StateManager (populated by Modbus bridge via MQTT).
// All power fields are in watts. nil means not available.
type EnergyLive struct {
	SolarW      *float64 `json:"solar_w"`      // PV generation
	BatteryW    *float64 `json:"battery_w"`    // positive = charging, negative = discharging
	GridW       *float64 `json:"grid_w"`       // positive = importing, negative = exporting
	LoadW       *float64 `json:"load_w"`       // total consumption
	BatterySoC  *float64 `json:"battery_soc"`  // 0–100 %
	GridPresent *bool    `json:"grid_present"` // grid voltage detected
	Timestamp   string   `json:"timestamp"`
}

// BuildEnergyLive reads the inverter device state from StateManager and
// extracts standard energy fields. Field names follow the DEYE ESPHome YAML
// mapping in Docs/inverter/deye 16kw.yaml.
func BuildEnergyLive(state *StateManager, inv *InverterManager) *EnergyLive {
	live := &EnergyLive{
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}

	cfg := inv.Get()
	if cfg.DeviceID == "" {
		return live
	}

	dev, ok := state.Get(cfg.DeviceID)
	if !ok {
		return live
	}
	s := dev.State

	extractFloat := func(keys ...string) *float64 {
		for _, k := range keys {
			if v, ok := s[k]; ok {
				switch val := v.(type) {
				case float64:
					f := val
					return &f
				}
			}
		}
		return nil
	}

	extractBool := func(keys ...string) *bool {
		for _, k := range keys {
			if v, ok := s[k]; ok {
				if b, ok := v.(bool); ok {
					return &b
				}
			}
		}
		return nil
	}

	live.SolarW = extractFloat("pv_power", "solar_power", "pv1_power", "total_pv_power")
	live.BatteryW = extractFloat("battery_power", "bat_power")
	live.GridW = extractFloat("grid_power", "grid_active_power", "total_grid_power")
	live.LoadW = extractFloat("load_power", "total_load_power", "consumption_power")
	live.BatterySoC = extractFloat("battery_soc", "bat_soc")
	live.GridPresent = extractBool("grid_connected", "grid_present", "grid_active")

	return live
}
