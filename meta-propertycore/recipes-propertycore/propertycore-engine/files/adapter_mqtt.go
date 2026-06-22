package main

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
)

func parseOnOff(v string) (bool, bool) {
	switch strings.ToUpper(strings.TrimSpace(v)) {
	case "ON", "ONLINE", "1", "TRUE":
		return true, true
	case "OFF", "OFFLINE", "0", "FALSE":
		return false, true
	default:
		return false, false
	}
}

// normalizeInboundMQTT maps supported third-party service topics into the
// PropertyCore device-state topic envelope understood by StateManager.
func normalizeInboundMQTT(topic string, payload []byte) (string, []byte, bool) {
	if strings.HasPrefix(topic, "propertycore/devices/") {
		return topic, payload, true
	}

	// Zigbee2MQTT device state topics look like: zigbee2mqtt/<friendly_name>
	// Bridge/admin topics (zigbee2mqtt/bridge/*) are ignored here.
	if strings.HasPrefix(topic, "zigbee2mqtt/") {
		deviceID := strings.TrimPrefix(topic, "zigbee2mqtt/")
		if deviceID == "" || strings.Contains(deviceID, "/") {
			return "", nil, false
		}

		var raw map[string]interface{}
		if err := json.Unmarshal(payload, &raw); err != nil {
			return "", nil, false
		}
		if len(raw) == 0 {
			return "", nil, false
		}

		if _, ok := raw["type"]; !ok {
			raw["type"] = "zigbee"
		}
		if _, ok := raw["online"]; !ok {
			raw["online"] = true
		}
		raw["source"] = "zigbee2mqtt"

		normalized, err := json.Marshal(raw)
		if err != nil {
			return "", nil, false
		}
		return "propertycore/devices/" + deviceID + "/state", normalized, true
	}

	// Tasmota status topics:
	// - tele/<device>/STATE  (JSON state payload)
	// - tele/<device>/LWT    (Online/Offline)
	// - stat/<device>/POWER  (ON/OFF)
	if strings.HasPrefix(topic, "tele/") || strings.HasPrefix(topic, "stat/") {
		parts := strings.Split(topic, "/")
		if len(parts) < 3 {
			return "", nil, false
		}
		deviceID := parts[1]
		leaf := parts[2]
		if deviceID == "" {
			return "", nil, false
		}

		raw := map[string]interface{}{
			"type":   "relay",
			"source": "tasmota",
		}

		switch {
		case parts[0] == "tele" && leaf == "STATE":
			var state map[string]interface{}
			if err := json.Unmarshal(payload, &state); err != nil {
				return "", nil, false
			}
			for k, v := range state {
				raw[k] = v
			}
			raw["online"] = true
			if power, ok := state["POWER"].(string); ok {
				if b, ok := parseOnOff(power); ok {
					raw["ch1"] = b
				}
			}

		case parts[0] == "tele" && leaf == "LWT":
			if b, ok := parseOnOff(string(payload)); ok {
				raw["online"] = b
			} else {
				return "", nil, false
			}

		case parts[0] == "stat" && leaf == "POWER":
			if b, ok := parseOnOff(string(payload)); ok {
				raw["online"] = true
				raw["ch1"] = b
			} else {
				return "", nil, false
			}

		default:
			return "", nil, false
		}

		normalized, err := json.Marshal(raw)
		if err != nil {
			return "", nil, false
		}
		return "propertycore/devices/" + deviceID + "/state", normalized, true
	}

	// Shelly Gen1 MQTT topics:
	// - shellies/<device>/online            (true/false)
	// - shellies/<device>/relay/<index>     (on/off)
	if strings.HasPrefix(topic, "shellies/") {
		parts := strings.Split(topic, "/")
		if len(parts) < 3 {
			return "", nil, false
		}
		deviceID := parts[1]
		if deviceID == "" {
			return "", nil, false
		}

		raw := map[string]interface{}{
			"type":   "relay",
			"source": "shelly",
		}

		switch {
		case len(parts) == 3 && parts[2] == "online":
			if b, ok := parseOnOff(string(payload)); ok {
				raw["online"] = b
			} else {
				return "", nil, false
			}

		case len(parts) == 4 && parts[2] == "relay":
			idx, err := strconv.Atoi(parts[3])
			if err != nil || idx < 0 || idx > 15 {
				return "", nil, false
			}
			if b, ok := parseOnOff(string(payload)); ok {
				raw["online"] = true
				raw[fmt.Sprintf("ch%d", idx+1)] = b
			} else {
				return "", nil, false
			}

		default:
			return "", nil, false
		}

		normalized, err := json.Marshal(raw)
		if err != nil {
			return "", nil, false
		}
		return "propertycore/devices/" + deviceID + "/state", normalized, true
	}

	return "", nil, false
}
