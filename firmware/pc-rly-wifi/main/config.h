#pragma once

// ─── MQTT ─────────────────────────────────────────────────────────────────────
// Default broker IP — must match the PropertyCore Hub on the local network.
// Each deployed unit should have this set correctly in NVS.
#define PC_MQTT_BROKER_DEFAULT  "192.168.31.223"
#define PC_MQTT_PORT            1883

// ─── Device Identity ──────────────────────────────────────────────────────────
// Unique device ID for this unit. Must be unique across the installation.
// Set the correct value in NVS before deployment (key: "device_id").
// Format: relay-XX where XX is a zero-padded number, e.g. "relay-01".
#define PC_DEVICE_ID_DEFAULT    "devkit-01"

// ─── Wi-Fi ────────────────────────────────────────────────────────────────────
// Leave both blank to enable provisioning mode on first boot.
// The provisioning AP (PC-RLY-XXXXXX) lets the technician set these via
// a browser form at 192.168.4.1 — no code changes required per deployment.
// Only set these here for development/testing with a known network.
#define PC_WIFI_SSID_DEFAULT    ""
#define PC_WIFI_PASS_DEFAULT    ""

// ─── MQTT Topic Templates ─────────────────────────────────────────────────────
// Must match the PropertyCore engine subscription pattern.
// Engine subscribes to: propertycore/devices/+/state
// Engine publishes to:  propertycore/devices/{id}/cmd
#define PC_TOPIC_STATE_FMT  "propertycore/devices/%s/state"
#define PC_TOPIC_CMD_FMT    "propertycore/devices/%s/cmd"

// ─── Channel Count ────────────────────────────────────────────────────────────
// Set to 1, 2, 4, or 6 depending on the OEM board variant:
//   PC-RLY-1CH-W = 1
//   PC-RLY-2CH-W = 2
//   PC-RLY-4CH-W = 4  (default)
//   PC-RLY-6CH-W = 6
#define RELAY_CHANNEL_COUNT  1  // bare DevKit — use GPIO2 (onboard LED) as relay output

// ─── Relay GPIO Assignments ───────────────────────────────────────────────────
// Adjust to match your OEM board. The values below are typical for
// LC Technology ESP32 relay boards. Verify with your board's schematic.
//
// Active-low: relay coil energises when GPIO is driven LOW (common for
// optocoupler-isolated relay boards). Set RELAY_ACTIVE_LOW to 0 for
// active-high boards.
#define RELAY_ACTIVE_LOW  0  // DevKit LED is active-high

#define RELAY_CH1_GPIO   2   // onboard LED on most ESP32 DevKits
#define RELAY_CH2_GPIO   17
#define RELAY_CH3_GPIO   18
#define RELAY_CH4_GPIO   19
#define RELAY_CH5_GPIO   21
#define RELAY_CH6_GPIO   22

// ─── Physical Switch Inputs ───────────────────────────────────────────────────
// Wall switch inputs for manual override. Normally high (pulled up),
// switch connects GPIO to GND. Triggers relay toggle + MQTT state publish.
//
// Set SWITCH_ENABLED to 0 to disable all switch inputs.
//
// NOTE: GPIO 34, 35, 36, 39 on ESP32 are input-only and have no internal
// pull resistors. The board must provide external 10k pull-ups on these pins.
#define SWITCH_ENABLED    0  // no physical switches on bare DevKit

#define SWITCH_CH1_GPIO   34
#define SWITCH_CH2_GPIO   35
#define SWITCH_CH3_GPIO   36
#define SWITCH_CH4_GPIO   39
#define SWITCH_CH5_GPIO   32
#define SWITCH_CH6_GPIO   33

// Minimum ms between switch events for the same channel (debounce).
#define SWITCH_DEBOUNCE_MS  50
