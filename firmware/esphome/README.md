# PropertyCore ESPHome Templates (MQTT-native)

Use these YAML templates in ESPHome Builder for relay boards.

## Files

- `pc-rly-1ch-w.yaml`
- `pc-rly-2ch-w.yaml`
- `pc-rly-4ch-w.yaml`
- `pc-rly-6ch-w.yaml`

## Quick start

1. Open a template and edit `substitutions`:
   - `devicename` (this becomes PropertyCore `device_id`)
   - `friendly_name`
   - `wifi_ssid`
   - `wifi_password`
   - `broker_ip` (PropertyCore hub IP)
2. Install from ESPHome Builder.
3. Power the board.
4. Device publishes to `propertycore/devices/${devicename}/state`.
5. In dashboard, go to Devices and claim from Unclaimed Nodes.

## Notes

- Keep `devicename` immutable after deployment.
- Topic model matches PropertyCore engine:
  - state: `propertycore/devices/{id}/state`
  - cmd: `propertycore/devices/{id}/cmd`
- Payload includes: `type`, `online`, `fw_version`, `mac`, `ip`, and channel states.
