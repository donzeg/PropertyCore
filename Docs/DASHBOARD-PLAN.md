# PropertyCore — Config Dashboard Build Plan

> Version 1.0 — April 2026  
> Source of truth: `Docs/UI-SCOPE.md` §1–35  
> Tech: React 18 + TypeScript + Tailwind CSS v3 + Vite 5  
> Audience: Certified PropertyCore engineer / installer only  
> Access: `http://[hub-ip]/admin` — local network or WireGuard relay tunnel

---

## Current State (v0.1)

What exists today in `dashboard/src/`:

| File | What It Does |
|---|---|
| `Layout.tsx` | Sidebar with Unicode icon nav. Active pages + "Coming soon" stubs. Theme toggle in footer. |
| `Overview.tsx` | Hub status cards + live WebSocket device state feed |
| `Floors.tsx` | Floor CRUD with display order |
| `Areas.tsx` | Area CRUD with floor assignment and type |
| `Devices.tsx` | Device list, area assignment, online badge, live state preview |
| `Scenes.tsx` | Scene CRUD + execute button |
| `Rules.tsx` | Rule CRUD + enable/disable toggle |
| `Schedules.tsx` | Schedule CRUD + enable/disable toggle |
| `Users.tsx` | User CRUD (owner/admin/guest, PIN) |

**Gaps vs. the mockup and UI-SCOPE:**
- Sidebar uses Unicode characters as icons — the mockup uses proper SVG/Phosphor icons, grouped sections with section labels, visual hierarchy matching the Home Assistant style
- No sidebar collapse / mobile breakpoint
- No section grouping in sidebar (Config / Devices / Automation / Energy / System etc.)
- 26 of 35 UI-SCOPE sections are unstubbed "Coming soon" placeholders
- No login/auth screen (engineers hit `/admin` directly)
- No Setup Wizard for first-run installs
- No device-category config panels (relay, dimmer, AC, curtain, etc.)
- No energy/inverter section
- No notifications, logs, backup, OTA, network sections

---

## Design Principles

1. **Engineer tool, not consumer UI.** Dense, information-rich, keyboard-navigable. No animations for their own sake.
2. **Sidebar = the navigation spine.** Grouped sections, proper icons, collapse-to-icons at narrow viewport. Active state with brand color.
3. **All data from the engine API.** No hardcoded content. Zero mocked state.
4. **Progressive disclosure.** Device-category config panels appear only when that device category is present. Hotel sections appear only when `property.type == "hotel"`.
5. **Zinc + Emerald.** `bg-zinc-900/bg-white`, `text-brand` for active states. Consistent with the mockup.
6. **No page refreshes.** All CRUD via API + optimistic updates. WebSocket for live state.

---

## Sidebar Redesign (Phase 1 — Foundation Requirement)

The sidebar is the visual identity of the dashboard. It must be rebuilt before any new pages are added.

### Target structure

```
┌─────────────────────────────┐
│ [P] PropertyCore            │  ← branding + hub name from /status
│     Config Dashboard        │
├─────────────────────────────┤
│ OVERVIEW                    │
│  ⬡  Overview                │
├─────────────────────────────┤
│ PROPERTY                    │
│  🏢  Property               │
│  ⬜  Floors                 │
│  ⬛  Areas                  │
├─────────────────────────────┤
│ DEVICES                     │
│  ◉  All Devices             │
│  ⚡  Relay Modules          │  ← visible only if ≥1 relay device present
│  💡  Dimmers                │  ← visible only if ≥1 dimmer present
│  ❄️  AC Gateways            │  ← etc.
│  🪟  Curtains               │
│  🚪  Access Control         │
│  📹  Cameras                │
├─────────────────────────────┤
│ AUTOMATION                  │
│  ▷  Scenes                  │
│  ⚡  Rules                  │
│  ◷  Schedules               │
├─────────────────────────────┤
│ HOSPITALITY                 │  ← only if property.type == "hotel"
│  🏨  Hospitality Profile    │
│  👥  Users                  │
├─────────────────────────────┤
│ ENERGY                      │
│  ☀️  Energy                 │
│  💧  Water                  │
│  🔋  Generator              │
├─────────────────────────────┤
│ MEDIA                       │
│  🎵  Entertainment          │
│  📺  AV / IR                │
├─────────────────────────────┤
│ SYSTEM                      │
│  🌐  Network                │
│  💾  Storage                │
│  🔔  Notifications          │
│  🔄  OTA Updates            │
│  📋  Logs                   │
│  📦  Backup & Restore       │
│  🔌  Integrations           │
│  🎨  Branding               │
│  🔑  API & Webhooks         │
│  👋  Visitor Management     │
│  📊  Reporting              │
│  📝  Installer Notes        │
├─────────────────────────────┤
│ ● v0.13 · propertycore-hub  │  ← MQTT dot + version from /status
│   Up 4d 2h                  │
│ [☀/🌙 theme toggle]         │
└─────────────────────────────┘
```

### Implementation notes
- Use **Phosphor Icons** (already in the mockup) — `npm install @phosphor-icons/react`
- Group sections with `<p>` section headers (uppercase, small, zinc-400)
- Collapse-to-icon mode at `w < 768px` (icon-only sidebar, tooltip on hover)
- Device-category nav items: derive from `GET /api/v1/devices` type field — show a category item if ≥1 device of that type exists
- "Coming soon" items: render as disabled (zinc-300/zinc-600) with a `·` bullet — keep them visible so engineers know what's coming

---

## Phases

---

### Phase 1 — Sidebar Redesign + Login Screen

**Goal:** The dashboard looks and feels like the mockup. Foundation for all future pages.

**Deliverables:**

#### 1.1 Login Screen (`pages/Login.tsx`)
- Full-screen centered card — PropertyCore logo, "Engineer Login", PIN pad (6-digit)
- `POST /api/v1/auth/login` → store token in `localStorage` + axios/fetch default header
- Redirect to `/admin/overview` after login
- Auto-redirect to login if token missing or 401 received
- Session timeout warning (idle > 30 min → show countdown → auto-logout)
- Failed attempt counter — lockout after 5 attempts (display "Too many attempts, wait 5 min")
- Route guard: `<RequireAuth>` wrapper on all protected routes

#### 1.2 Sidebar Rebuild (`components/Layout.tsx`)
- Phosphor Icons — replace all Unicode characters
- Grouped sections with section labels as described above
- Collapse mode: `<= md breakpoint` → icon-only (48px wide), tooltip on hover
- Expand toggle button (hamburger / chevron)
- Active state: `bg-brand/10 text-brand` (existing, keep)
- "Coming soon" items: disabled styling, keep visible
- Footer: MQTT dot (green/red), version, uptime, theme toggle (existing logic, keep)
- Property type context: fetch `GET /api/v1/property` on mount, expose via `PropertyContext` — used to show/hide Hospitality group
- Device type context: derive from `GET /api/v1/devices` — used for dynamic device-category nav items

#### 1.3 Property Page (`pages/Property.tsx`)
- Single-record edit form (name, type dropdown, timezone)
- `GET|PATCH /api/v1/property`
- Shows at the top of the PROPERTY section

---

### Phase 2 — Device Category Config Panels

**Goal:** Engineers can configure every device type they install. These are the most important screens for a commissioning workflow.

**Deliverables:**

#### 2.1 Relay Module Config (`pages/devices/RelayConfig.tsx`)
Per-device config panel. Opens as a side sheet or full page from the Devices list.

Fields per channel (up to 8):
- Label (text input, e.g. "Ceiling Light")
- Load type (select: light / fan / socket / pump / other)
- Switch input mode (select: toggle / momentary / disabled)
- Minimum on-time ms (number input — inductive load protection)
- Power monitoring enable (checkbox — only for PC-RLY variants with energy monitoring)

Engine-side storage: `PATCH /api/v1/devices/{id}` — save config as JSON blob in device metadata.

#### 2.2 Dimmer Module Config (`pages/devices/DimmerConfig.tsx`)
Per-device config panel.

Fields per channel:
- Label
- Min brightness % (number 0–30)
- Max brightness % (number 50–100)
- Soft-start duration ms
- Soft-off duration ms
- LED mode (select: trailing-edge / leading-edge)
- Transition curve (select: linear / logarithmic)

#### 2.3 AC Gateway Config (`pages/devices/AcConfig.tsx`)
Per-device config panel.

Fields:
- Brand selection (searchable dropdown — Hisense, LG, Samsung, Panasonic, Daikin, Midea, Gree, Haier, Aux, Other)
- Model (text or select from brand's model list)
- Temp sensor offset (±°C)
- Humidity sensor offset (±%)
- IR feedback mode (toggle)
- Boot state (select: restore-last / fixed-setpoint / unchanged)
- Fixed setpoint (°C — shown only when boot-state = fixed-setpoint)
- Custom IR code import (file upload — future)

#### 2.4 Curtain / Blind Config (`pages/devices/CurtainConfig.tsx`)
Per-device config panel.

Fields per motor:
- Label
- Travel time open (seconds)
- Travel time close (seconds)
- End-stop mode (select: time-based / limit-switch)
- Invert direction (checkbox)
- Partial position presets (add/remove preset % values with label)

#### 2.5 Keypad Config (`pages/devices/KeypadConfig.tsx`)
Per-device config panel.

Fields per button (up to 8):
- Scene assignment (select from scenes list)
- LED color idle (color picker — preset: white / amber / red / green / off)
- LED color active (color picker)
- LED brightness 0–100%
- Hold action scene (select — long-press secondary)
- Lock-mode behavior (select: disabled / unchanged)

#### 2.6 Wall Panel Config (`pages/devices/WallPanelConfig.tsx`)
Per-device config panel.

Fields:
- Profile (select: hotel / residential)
- Room assignment (select from areas)
- Welcome message (text — hotel only)
- Room number (text — hotel only)
- Screensaver timeout (number, seconds)
- Screensaver mode (select: clock / branding / blank)
- Always-on display (checkbox)
- Emergency button enable (checkbox)
- Brightness schedule: daytime level %, night level %, night-start time

#### 2.7 Smart Remote Config (`pages/devices/SmartRemoteConfig.tsx`)
Per-device config panel.

Fields:
- Button scene assignments (per button — select from scenes)
- IR blaster library assignment (select which IR profile)
- Wake-on-pickup sensitivity (select: low / medium / high / off)
- Vibration notification events (multi-select: doorbell / security / scene)
- Display brightness 0–100%
- Display timeout seconds
- Charging dock assignment (select from intercom/dock devices)

---

### Phase 3 — Automation Enhancement

**Goal:** Scenes, Rules, and Schedules become fully production-grade with the complete action/condition model from UI-SCOPE §13.

**Deliverables:**

#### 3.1 Scene Builder — full action model (`pages/Scenes.tsx` rework)
Current: name, list of `{device_id, key, value}` actions.  
Target:

- Scene name + icon picker (Phosphor icon grid)
- Action list with types:
  - **Device state action** — device picker, key/value builder per device type (relay → channel on/off, AC → temp/mode/fan/power, curtain → position %)
  - **Run scene** — pick another scene (chain)
  - **Delay** — seconds between actions in a sequence
  - **Send notification** — message + recipient user(s)
- Reorderable action list (drag or up/down arrows)
- Room scope selector (single area / whole property)
- Test execute button (runs scene without saving)

#### 3.2 Rule Builder — full condition model (`pages/Rules.tsx` rework)
Current: single condition `{device_id, key, operator, value}`.  
Target:

- Condition builder: AND / OR grouping
- Condition types:
  - Device state (device + key + operator + value)
  - Time of day (before / after / between HH:MM)
  - Day of week (multi-select: Mon–Sun)
  - Sensor value threshold
- Action builder: same as Scene Builder actions above
- Rule testing: simulate trigger, show what would execute (dry-run mode)
- Priority / ordering for conflicting rules

#### 3.3 Schedule Builder — sunrise/sunset support (`pages/Schedules.tsx` rework)
Current: fixed HH:MM, days-of-week, scene.  
Target:

- Sunrise / sunset trigger (offset ±minutes)
- Holiday override toggle
- Preview: next 5 trigger times shown

---

### Phase 4 — Energy & Infrastructure

**Goal:** Full energy monitoring, inverter setup, and water/generator management. This is a major differentiator for the Nigerian market (solar + generator + water tank are near-universal in premium installations).

**Deliverables:**

#### 4.1 Energy Dashboard (`pages/energy/EnergyDashboard.tsx`)
- Real-time power flow diagram: solar → battery → loads → grid (SVG animated diagram)
- Per-circuit live wattage (from CT clamp relay devices with power monitoring)
- Battery SOC gauge (arc/radial progress)
- Daily / weekly / monthly kWh charts — pull from InfluxDB via engine proxy endpoint
- Grid import/export totals
- Solar generation totals

#### 4.2 Inverter Setup (`pages/energy/InverterSetup.tsx`)
- Brand selection: DEYE, Growatt, Sofar, Goodwe, Sunsynk, Victron
- RS485 port and baud rate
- Modbus slave address
- Register map validation (test read — shows raw register values)
- Poll interval (seconds)

#### 4.3 Circuit Configuration (`pages/energy/CircuitConfig.tsx`)
- CT clamp channel labelling (assign to circuit/room)
- Alert threshold per circuit (kW)
- Load type label per circuit

#### 4.4 Water Management (`pages/water/WaterConfig.tsx`)
- Ultrasonic sensor calibration (full/empty cm)
- Tank capacity (litres)
- Pump start/stop thresholds (%)
- Pump runtime limit (minutes)
- Flow meter pulse rate calibration
- Abnormal flow alert threshold
- Pump schedule windows

#### 4.5 Generator Management (`pages/generator/GeneratorConfig.tsx`)
- Start delay after grid failure (seconds)
- Stop delay (cooldown)
- Battery SOC start threshold
- Fuel sensor calibration
- Runtime counter + reset
- Maintenance interval (hours)

---

### Phase 5 — Security, Access & Cameras

**Goal:** Access control, security alarm zones, camera feeds, and intercom.

**Deliverables:**

#### 5.1 Access Control (`pages/access/AccessControl.tsx`)
- Door lock list: name, room assignment, auto-lock timer, schedule
- NFC/RFID card enrollment: scan card → assign user + access scope + validity
- Fingerprint enrollment
- Gate controller: open/close timing, auto-close, vehicle sensor
- Access log table (timestamp, identity, door, event)
- Export to CSV

#### 5.2 Security / Alarm (`pages/security/SecurityConfig.tsx`)
- Arm/disarm mode selector (home-armed / away-armed / disarmed) — live status top of page
- Auto-arm/disarm schedule
- Zone builder (group sensors — name, sensors, entry delay seconds)
- Siren assignment (zone → siren device)
- Panic button assignment
- Perimeter sensor sensitivity
- Alert escalation: push → SMS → relay server

#### 5.3 Cameras (`pages/cameras/Cameras.tsx`)
- Camera list: name, room, RTSP URL, online status
- Add camera (RTSP URL, name, room, resolution)
- Per-camera: live thumbnail preview (MJPEG or HLS proxy from engine)
- Motion detection zone config
- Recording retention (days)

#### 5.4 Intercom / Doorbell (`pages/intercom/IntercomConfig.tsx`)
- Doorbell name + entry point
- Camera resolution + night vision
- Motion zone config
- Door release relay assignment
- Ring notification recipients
- Monitor assignment (PC-INT-MON + wall panels)

---

### Phase 6 — Media & Entertainment

**Goal:** Full AV/media setup matching UI-SCOPE §19, §36.

**Deliverables:**

#### 6.1 Audio Zones (`pages/media/AudioZones.tsx`)
- Define audio zones (name, amplifier source: HC-AV built-in / PC-AUD-AMP unit)
- Channel assignment per amp
- Volume limits per zone
- Snapcast group config
- Background music schedule per zone (source + time window)

#### 6.2 AV / IR (`pages/media/AvConfig.tsx`)
- TV control method per room (IR only / CEC adapter / Media Box)
- IR blaster zone mapping
- IR code library per room (TV brand, decoder brand)
- HDMI matrix routing table (input → output per room)
- PC-AV-BOX room assignment

#### 6.3 Streaming Services (`pages/media/StreamingConfig.tsx`)
- Spotify Connect: enable/device name per room
- AirPlay 2: enable/room display name
- Google Cast: enable
- Internet radio: add/manage stream URLs with station names
- IPTV (Tvheadend): source URL, channel list

#### 6.4 Jellyfin Management (`pages/media/JellyfinStatus.tsx`)
- Library status (counts)
- Rescan trigger
- Transcoding quality
- Active streams monitor
- User account links

---

### Phase 7 — System & Administration

**Goal:** Network, storage, OTA, logs, backup — the ops layer every deployment needs.

**Deliverables:**

#### 7.1 Network (`pages/system/Network.tsx`)
- Ethernet: DHCP / static IP, status
- Wi-Fi: SSID, password, signal strength
- Hostname (read from `/api/v1/property`)
- WireGuard tunnel: status (connected / disconnected), reconnect button, relay server endpoint
- Local DNS config

#### 7.2 Storage (`pages/system/Storage.tsx`)
- NVMe usage bar (used / free GB)
- NAS connection: protocol (SMB/NFS), host, share, credentials, mount status, test button
- Camera archive path
- Recording retention days
- Jellyfin library path
- USB storage status (HC-1)

#### 7.3 OTA Updates (`pages/system/OtaUpdates.tsx`)
- Hub OS: current version, check for update, changelog modal, install button
- Per-device-category firmware: version matrix, bulk update button
- Update log table
- Rollback button (previous version)

#### 7.4 Logs (`pages/system/Logs.tsx`)
- Tabbed: System / Device Events / Automation / Access / Errors
- Live tail toggle (WebSocket)
- Severity filter (debug / info / warn / error)
- Search / filter by device ID or keyword
- Export to TXT / CSV

#### 7.5 Backup & Restore (`pages/system/Backup.tsx`)
- Export config snapshot: JSON download + encrypted ZIP option
- Scheduled backup to NAS: toggle + path + frequency
- Restore: file upload → diff preview → confirm
- Factory reset: multi-step confirm with config-wipe option

#### 7.6 Notifications (`pages/system/Notifications.tsx`)
- Push notification rules: per event type on/off
- Alert recipient assignment (user → event types)
- Quiet hours window
- Maintenance alert thresholds

---

### Phase 8 — Hospitality Profile

**Goal:** Hotel-specific UI. Only visible/accessible when `property.type == "hotel"`.

**Deliverables:**

#### 8.1 Hospitality Config (`pages/hospitality/HospitalityConfig.tsx`)
- DND / MUR logic: assign relay/indicator to DND state
- Check-in flow: AC preset, welcome message, access activation
- Check-out flow: AC off, locks reset, housekeeping alert
- Housekeeping workflow states: Clean / Dirty / In Progress / Inspected
- Hotel services menu customisation (visible items on wall panel + mobile app)
- Front desk notification routing

#### 8.2 Room Status Board (`pages/hospitality/RoomStatusBoard.tsx`)
- Grid of all hotel rooms with current housekeeping status
- Color-coded: Clean (green), Dirty (red), In Progress (amber), Inspected (blue)
- DND / MUR indicator per room
- Guest check-in status per room
- Bulk actions: set all to Dirty, trigger housekeeping alert

---

### Phase 9 — Integrations, Reporting, Branding

**Goal:** Third-party integrations, analytics exports, multi-site, and branding for hotel chains.

**Deliverables:**

#### 9.1 Integrations (`pages/integrations/Integrations.tsx`)
- Browse certified integrations by category (Device Brands / Energy / Voice / Hospitality / Media)
- Per-integration card: name, version, certification badge, install/uninstall
- Installed integrations: health status, config form (API key / OAuth / local IP)
- Test connection button
- Integration health log

#### 9.2 API & Webhooks (`pages/system/ApiWebhooks.tsx`)
- Outbound webhook list: URL, event filter, auth method
- Add/edit/delete webhooks
- API key management: generate, label, copy, revoke
- API access log table

#### 9.3 Reporting (`pages/reporting/Reporting.tsx`)
- Energy report: date range selector, kWh chart, cost, solar savings, PDF export
- Device health report: uptime per device, offline incidents, firmware versions
- Hotel occupancy (hotel profile only)
- Automation activity
- Water + generator runtime
- Scheduled delivery config (email monthly)

#### 9.4 Branding (`pages/system/Branding.tsx`)
- Property/brand name
- Logo upload (PNG/SVG)
- Primary colour picker (hex) — applies to mobile app accent + wall panel theme
- Mobile app display name
- Wall panel welcome message template

#### 9.5 Multi-Site (`pages/multisite/MultiSite.tsx`)
- Site list with online/offline status and alert counts
- Switch active site (all dashboard sections update)
- Cross-site user accounts
- Cross-site energy/alert reporting

#### 9.6 Visitor Management (`pages/visitors/VisitorManagement.tsx`)
- Create visitor: name, arrival, access scope, validity window
- Issue access: PIN / NFC card / SMS link
- Visitor log with timestamps and camera snapshots
- One-tap revoke

#### 9.7 Installer Notes (`pages/system/InstallerNotes.tsx`)
- Free-text notes per installation (rich text or markdown)
- Photo attachments (JPEG/PNG upload)
- Per-device location notes
- Commissioning checklist (checkboxes)
- Handover record (date, engineer name, signature capture)

---

### Phase 10 — Setup Wizard

**Goal:** First-run guided flow for new installations. Triggered automatically when no floors/devices configured yet.

**Deliverables:**

#### 10.1 Setup Wizard (`pages/wizard/SetupWizard.tsx`)
Multi-step stepper component:

- **Step 1 — Network:** Ethernet / Wi-Fi config, test connection
- **Step 2 — Property:** Name, type, timezone, address
- **Step 3 — Floors & Areas:** Add floors + rooms (can bulk-add with templates: "2-bed apartment", "Hotel Floor")
- **Step 4 — First Device:** Pair a relay or AC module, verify MQTT connection
- **Step 5 — First Scene:** Create a "Good Night" or "All Off" scene
- **Step 6 — Owner Account:** Add first owner user, set PIN
- **Step 7 — Handover:** Summary of what was configured, print/PDF commissioning sheet, mark complete

Auto-trigger: if `/api/v1/floors` returns empty list → redirect to wizard on login.  
Can be re-entered from Installer Notes page (re-run wizard button).

---

## Component Library (shared across all phases)

Build these first — they underpin every page:

| Component | Purpose |
|---|---|
| `<PageHeader title subtitle>` | Consistent H1 + subtitle + optional action button slot |
| `<Table columns rows>` | Sortable, filterable data table (reuse `Areas.tsx` primitives) |
| `<Modal>` | Already exists — keep as-is |
| `<SideSheet>` | Slide-in panel from right — for device config panels |
| `<StatusBadge>` | `online` (green dot), `offline` (red), `error` (amber) |
| `<DeviceTypeBadge>` | Colored chip: relay / dimmer / ac-gateway / curtain |
| `<FormField label hint error>` | Consistent form field wrapper |
| `<ConfirmDialog>` | Destructive action confirmation (delete, factory reset) |
| `<EmptyState icon message action>` | Consistent empty list state |
| `<SparklineChart>` | Inline time-series mini chart (for energy + device history) |
| `<PowerFlowDiagram>` | SVG animated solar/battery/load/grid diagram (Phase 4) |

---

## API Additions Required (engine-side, per phase)

| Phase | New Engine Endpoints Needed |
|---|---|
| 1 | Auth already exists. Add `GET /api/v1/property` (exists), property singleton PATCH (exists). No new endpoints. |
| 2 | Device config stored in existing device metadata (`PATCH /api/v1/devices/{id}` metadata field). No new endpoints. |
| 3 | Scene actions model needs richer `actions` field — backwards-compatible JSON extension. Rule conditions need AND/OR groups. |
| 4 | `GET /api/v1/energy/live` (inverter + CT clamp live data), `GET /api/v1/energy/history?from=&to=&interval=` (InfluxDB proxy), `GET|PATCH /api/v1/inverter`, `GET|PATCH /api/v1/water`, `GET|PATCH /api/v1/generator` |
| 5 | `GET|POST|DELETE /api/v1/cameras`, `GET|POST|DELETE /api/v1/access/locks`, `GET /api/v1/access/log`, `GET|PATCH /api/v1/security/config` |
| 6 | `GET|PATCH /api/v1/audio/zones`, `GET|PATCH /api/v1/av/rooms` |
| 7 | `GET|PATCH /api/v1/system/network`, `GET /api/v1/system/storage`, `GET /api/v1/logs?type=&level=`, `POST /api/v1/system/backup`, `POST /api/v1/system/restore` |
| 8 | `GET|PATCH /api/v1/hospitality/config`, `GET /api/v1/hospitality/rooms/status` |
| 9 | `GET|POST|DELETE /api/v1/integrations`, `GET|POST|DELETE /api/v1/webhooks`, `GET /api/v1/reports/{type}?from=&to=` |
| 10 | No new endpoints — wizard uses existing property/floors/areas/devices/scenes/users endpoints |

---

## Phase Summary

| Phase | Section | Key Deliverable | Status |
|---|---|---|---|
| 1 | Foundation | Sidebar redesign (Phosphor icons, groups, collapse) + Login screen + Property page | ⬜ Not started |
| 2 | Devices | 7 device-category config panels (relay, dimmer, AC, curtain, keypad, wall panel, remote) | ⬜ Not started |
| 3 | Automation | Full scene/rule/schedule builder with complete action + condition model | ⬜ Not started |
| 4 | Energy | Power flow diagram, inverter setup, water, generator | ⬜ Not started |
| 5 | Security | Cameras, access control, alarm zones, intercom | ⬜ Not started |
| 6 | Media | Audio zones, AV/IR config, streaming services, Jellyfin | ⬜ Not started |
| 7 | System | Network, OTA, logs, backup, notifications | ⬜ Not started |
| 8 | Hospitality | Hotel profile, room status board | ⬜ Not started |
| 9 | Advanced | Integrations, reporting, branding, multi-site, visitor management | ⬜ Not started |
| 10 | Wizard | First-run setup wizard — ties all phases together | ⬜ Not started |
