# PC-RLY-xCH-W — PropertyCore Relay Firmware

ESP-IDF + FreeRTOS firmware for the PropertyCore Wi-Fi relay module family.  
Runs on OEM ESP32 relay boards reflashed with PropertyCore firmware.

| SKU | Channels | Load |
|---|---|---|
| PC-RLY-1CH-W | 1 | 10A / 2400W |
| PC-RLY-2CH-W | 2 | 10A per ch |
| PC-RLY-4CH-W | 4 | 10A per ch |
| PC-RLY-6CH-W | 6 | 10A per ch |

---

## What it does

- Connects to the property Wi-Fi network
- Connects to the PropertyCore Hub's Mosquitto MQTT broker
- Subscribes to its command topic and drives relay GPIO outputs
- Publishes state on boot, on every command, and on every physical switch press
- Auto-registers with the hub's device registry on first MQTT message
- Last-will message marks the device offline if it disconnects unexpectedly
- Physical wall switch inputs toggle relay state without hub involvement

---

## Build Requirements

- **ESP-IDF v5.x** installed and sourced (`idf.py` on PATH)
- Target: `esp32` (set `RELAY_CHANNEL_COUNT` in `main/config.h` before building)

```bash
cd firmware/pc-rly-wifi
idf.py set-target esp32
idf.py build
```

---

## Configure before flashing

Open `main/config.h` and set:

| Define | Default | Description |
|---|---|---|
| `RELAY_CHANNEL_COUNT` | `4` | Match your OEM board variant |
| `PC_DEVICE_ID_DEFAULT` | `relay-01` | Unique ID for this unit |
| `PC_MQTT_BROKER_DEFAULT` | `192.168.1.100` | Hub IP on the local network |
| `PC_WIFI_SSID_DEFAULT` | `PropertyCore` | Property Wi-Fi SSID |
| `PC_WIFI_PASS_DEFAULT` | `changeme` | Property Wi-Fi password |
| `RELAY_CH1_GPIO` … | `16, 17, 18, 19` | Relay GPIO pins — verify with your board |
| `SWITCH_CH1_GPIO` … | `34, 35, 36, 39` | Wall switch input pins |
| `RELAY_ACTIVE_LOW` | `1` | `1` for optocoupler boards (common), `0` for active-high |

Compile-time defaults are fallbacks. For deployed units, use NVS (see below).

---

## Flash

```bash
idf.py -p /dev/ttyUSB0 flash monitor
```

---

## Configure via NVS (production deployment)

Each installed unit gets a unique device ID and the correct broker IP written to NVS. This avoids rebuilding firmware per unit.

```bash
# Install the NVS partition generator
pip install esp-idf-nvs-partition-gen

# Create a CSV with the unit's config
cat > unit_config.csv << EOF
key,type,encoding,value
pc_cfg,namespace,,
device_id,data,string,relay-01
broker_ip,data,string,192.168.1.50
wifi_ssid,data,string,MyPropertyWifi
wifi_pass,data,string,wifipassword
EOF

# Generate binary
python $IDF_PATH/components/nvs_flash/nvs_partition_generator/nvs_partition_gen.py \
    generate unit_config.csv nvs.bin 0x6000

# Flash to NVS partition
esptool.py -p /dev/ttyUSB0 write_flash 0x9000 nvs.bin
```

The device ID format is `relay-XX` (e.g. `relay-01`, `relay-02`). Use sequential numbers per property installation.

---

## MQTT Protocol

### State (published by device → hub)

Topic: `propertycore/devices/{device_id}/state`  
QoS: 1, Retain: true

```json
{"type":"relay","ch1":false,"ch2":false,"ch3":false,"ch4":false}
```

Published on:
- MQTT connect
- Any command received
- Any physical switch press

### Command (published by hub → device)

Topic: `propertycore/devices/{device_id}/cmd`  
QoS: 1

```json
{"ch1":true}
```

Any subset of channels may be included. Channels not present in the payload are unchanged.

```json
{"ch1":true,"ch3":false}
```

### Last Will (published by broker if device disconnects)

```json
{"type":"relay","online":false}
```

---

## GPIO Wiring

Default pin assignments (LC Technology ESP32 relay boards):

| Signal | GPIO |
|---|---|
| Relay CH1 | 16 |
| Relay CH2 | 17 |
| Relay CH3 | 18 |
| Relay CH4 | 19 |
| Switch CH1 | 34 |
| Switch CH2 | 35 |
| Switch CH3 | 36 |
| Switch CH4 | 39 |

> GPIO 34, 35, 36, 39 are input-only on ESP32 with no internal pull resistors.  
> The board must provide external 10kΩ pull-ups on these pins.

Relay outputs are active-low (common for optocoupler relay boards):
- GPIO HIGH → relay OFF (coil de-energised)
- GPIO LOW  → relay ON  (coil energised)

To use active-high boards: set `RELAY_ACTIVE_LOW 0` in `config.h`.

---

## Physical Switch Wiring

```
Wall switch (momentary or latching)
  ┌──── GPIO_SWITCH_CHx (with external 10k pull-up to 3.3V)
  └──── GND
```

The switch task debounces at 50ms and publishes updated state to MQTT after every toggle.  
Switches work fully offline — the relay toggles even if Wi-Fi or MQTT is down.

---

## Adapting to Other OEM Boards

1. Identify relay GPIO pins from the board schematic or by probing
2. Check if relays are active-low or active-high
3. Update `RELAY_CH*_GPIO` and `RELAY_ACTIVE_LOW` in `main/config.h`
4. Build and flash

Common OEM boards tested / known GPIO assignments are documented in  
`Docs/PRODUCT-LIBRARY.md` under *Category 2 — Relay Modules*.
