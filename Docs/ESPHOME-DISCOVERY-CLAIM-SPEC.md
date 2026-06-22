# ESPHome Discovery + Claim Specification

## Objective

Replace manual device ID entry with an installer-first commissioning flow, following the Home Assistant ESPHome integration model:

1. Engineer creates ESPHome firmware in Builder with `substitutions: devicename: "relay-lounge-01"`.
2. Flashes ESP board; device boots and publishes MQTT state with that device_id.
3. PropertyCore engine auto-detects device as **Unclaimed** on first MQTT message.
4. Installer opens Add Device and selects from discovered online nodes (e.g., "relay-lounge-01 — online, fw:pc-esphome-0.1.0").
5. Installer adds business metadata (display name, type, area) and claims node.
6. Device becomes a managed PropertyCore device with full command/state loop.

This matches Home Assistant's ESPHome discovery UX: firmware-first identity, then configuration assignment.

---

## Problem in Current Flow

Current Add Device wizard asks for `device_id` before firmware exists.

Issues:
- Installer does not yet know final device identity.
- Manual ID typing introduces mismatch risk.
- Workflow feels reversed from real commissioning.

---

## Target User Story

As an installer, I want to flash a blank ESP board first and then pick it from discovered online nodes in Add Device, so I can claim it with the correct metadata without manually guessing IDs.

Acceptance:
- Newly flashed node appears in an Unclaimed list within 5–15 seconds.
- Add Device shows a dropdown/list of unclaimed nodes.
- Selecting a node pre-fills immutable identity fields.
- Claiming creates/updates the device registry and removes node from unclaimed list.
- Claimed devices appear in Devices and support normal command/state flow.

---

## Identity Strategy (Critical)

Device identity is **embedded in firmware** via ESPHome YAML substitution, not assigned by PropertyCore.

Reference: Home Assistant ESPHome integration discovers devices by their configured `devicename` substitution.

Use this identity model:
- `device_id` (primary key): ESPHome `substitutions: devicename` value (e.g., "relay-lounge-01"). This becomes the MQTT client_id and topic prefix.
- `hardware_uid` (secondary fingerprint): MAC address, captured from MQTT payload if available.
- `source`: `esphome`.

Rules:
- `device_id` must be globally unique within a hub.
- If `hardware_uid` changes for same `device_id`, flag conflict (possible hardware swap).
- If `hardware_uid` matches an existing claimed device with different `device_id`, flag duplicate identity.
- Device identity is **immutable** once claimed; changing it requires reflashing firmware.

---

## Required ESPHome Template Contract

All PropertyCore-generated ESPHome templates must follow this structure:

```yaml
substitutions:
  devicename: "relay-lounge-01"        # Engineer configures this in Builder
  device_type: "relay"                 # PCfirmware type (relay, dimmer, ac_gateway, etc.)
  
esmhome:
  name: $devicename
  
mqtt:
  broker: ${broker_ip}                  # Hub IP set at flash time
  client_id: $devicename                # Becomes device_id in PropertyCore
  topic_prefix: propertycore/devices/$devicename
  birth_message:
    topic: propertycore/devices/$devicename/state
    payload: '{"type":"${device_type}","online":true}'
  will_message:
    topic: propertycore/devices/$devicename/state
    payload: '{"type":"${device_type}","online":false}'
```

State messages published to `propertycore/devices/{devicename}/state` must include:
- `type` — device type (relay, dimmer, ac_gateway, etc.)
- `online` — bool (true on boot, false on LWT)
- optional `ip` — IP address
- optional `mac` — MAC address (used as hardware_uid)
- optional `fw_version` — firmware version

Recommended payload minimum:
```json
{
  "type": "relay",
  "online": true,
  "ip": "192.168.31.50",
  "mac": "AA:BB:CC:DD:EE:FF",
  "fw_version": "pc-esphome-0.1.0"
}
```

---

## Data Model Additions

Add transient discovery store for unclaimed nodes.

### UnclaimedNode
- `device_id` string (required)
- `source` enum: `esphome`
- `hardware_uid` string nullable (MAC)
- `ip` string nullable
- `reported_type` string nullable
- `firmware_version` string nullable
- `first_seen` timestamp
- `last_seen` timestamp
- `online` bool
- `claim_status` enum: `unclaimed | claimed | conflict`
- `conflict_reason` string nullable

Retention:
- Keep unclaimed entries for 24h since last_seen.
- Auto-prune stale entries.

---

## Backend Behavior

On each MQTT state event:

1. Parse `device_id` from topic.
2. If device exists in registry:
   - normal `MarkSeen` path.
3. If device does not exist:
   - create/update `UnclaimedNode` entry.
   - emit websocket event `device_unclaimed`.
4. If conflict conditions met:
   - set `claim_status=conflict`.
   - emit websocket event `device_conflict`.

On claim action:

1. Validate node exists and is `unclaimed`.
2. Create/merge `DeviceInfo` with installer metadata.
3. Set metadata:
   - `firmware_type=esphome`
   - `claimed_at`
   - optional `hardware_uid`
4. Mark unclaimed entry as `claimed` and hide from default list.
5. Emit websocket event `device_claimed`.

---

## API Additions

### Discovery
- `GET /api/v1/discovery/unclaimed?source=esphome`
  - returns list of unclaimed nodes sorted by `last_seen desc`.

### Claim
- `POST /api/v1/discovery/claim`

Request:
```json
{
  "device_id": "relay-lounge-01",
  "display_name": "Lounge Relay",
  "device_type": "relay",
  "area_id": "area_abc123",
  "vendor": "PropertyCore",
  "firmware_version": "pc-esphome-0.1.0"
}
```

Response:
```json
{
  "device": { "id": "relay-lounge-01", "name": "Lounge Relay" },
  "claimed": true
}
```

### Optional
- `POST /api/v1/discovery/ignore`
- `GET /api/v1/discovery/conflicts`

---

## WebSocket Events

Add event types:
- `device_unclaimed`
- `device_claimed`
- `device_conflict`

Payload includes `device_id`, `last_seen`, `ip`, `hardware_uid`, `reported_type`.

---

## Dashboard UX Changes

### Devices page
- Add new section/card: **Unclaimed ESPHome Nodes**.
- Show online count and recent nodes.

### Add Device modal

Step order update:
1. Firmware selection
2. **Select discovered node** (new)
3. Metadata (display name, type, area)
4. Confirm + claim

Behavior:
- If firmware = `esphome`, show discovered dropdown instead of manual device_id input.
- Manual fallback remains as advanced toggle: "Enter ID manually".

---

## Migration Plan

1. Delete old test/manual devices (already done by operator).
2. Flash one ESPHome node from PropertyCore template.
3. Verify it appears in unclaimed list.
4. Claim via Add Device.
5. Validate command/state loop in Devices.
6. Roll out to all new ESP devices.

---

## Edge Cases

- Node online but not in unclaimed list:
  - topic mismatch, wrong broker, wrong auth, wrong base topic.
- Node appears with empty type:
  - allow claim but require installer selects type.
- Duplicate IDs:
  - block claim and show conflict action.
- Node stale offline:
  - keep visible with offline badge until retention expiry.

---

## Security

- Discovery and claim endpoints require admin auth.
- Claim actions are auditable (user ID + timestamp).
- Do not auto-claim without operator confirmation.

---

## Example Flow

**Engineer action:**
1. Opens ESPHome Builder (System → ESPHome Builder).
2. Creates new device, sets:
   - Device name: "relay-lounge-01"
   - Device type: "relay"
   - Hub IP: 192.168.31.223 (auto-detected from builder context)
3. Builder generates YAML with:
   ```yaml
   substitutions:
     devicename: "relay-lounge-01"
     device_type: "relay"
   mqtt:
     broker: 192.168.31.223
     topic_prefix: propertycore/devices/relay-lounge-01
   ```
4. Flashes ESP32 via web UI.
5. Device boots, connects to Wi-Fi, publishes to `propertycore/devices/relay-lounge-01/state`.

**PropertyCore engine:**
1. Receives MQTT on `propertycore/devices/+/state`.
2. Extracts `device_id` = "relay-lounge-01" from topic.
3. Checks DeviceRegistry: not found.
4. Creates UnclaimedNode entry with status="unclaimed", source="esphome", online=true.
5. Broadcasts WebSocket event `device_unclaimed`.

**Installer action:**
1. Opens Add Device → Firmware selection → ESPHome.
2. Sees dropdown: "Discovered Online Nodes" with entry "relay-lounge-01 (online, type: relay, fw: pc-esphome-0.1.0)".
3. Selects it.
4. Immutable fields auto-filled: Device ID = "relay-lounge-01".
5. Adds mutable fields: Display Name = "Lounge Relay", Area = "Living Room".
6. Clicks Claim.
7. Device moves from unclaimed list to Devices, marked online, ready for commands.

---

## Rollout Phases

### Phase A (minimal)
- Unclaimed store (in-memory + persistent JSON)
- `GET /api/v1/discovery/unclaimed` endpoint
- `POST /api/v1/discovery/claim` endpoint
- Add Device modal: discover dropdown for ESPHome firmware type
- WebSocket events: device_unclaimed, device_claimed

### Phase B (hardening)
- Conflict detection and resolution UI
- Ignore list (`POST /api/v1/discovery/ignore`)
- Audit trail (claim events logged)
- `GET /api/v1/discovery/conflicts` endpoint

### Phase C (advanced)
- PropertyCore ESPHome template generator in Builder
- One-click create + flash profiles (relay, dimmer, curtain, etc.)
- Pre-fill substitutions from form fields
- Direct flash integration (no manual YAML editing)

---

## Definition of Done

- Installer can flash blank ESP board first.
- Device appears in Add Device discovered list without manual ID typing.
- Installer claims node with metadata in <30 seconds.
- Claimed device appears in Devices with online state and working commands.
