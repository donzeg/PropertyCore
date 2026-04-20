# PropertyCore — UI Scope

> Version 0.3 — April 2026  
> Status: Concept / Pre-build  
> Covers all four PropertyCore UI surfaces: Web Config Dashboard, Mobile App, Wall Panel Kiosk, Smart Remote

---

## Overview

PropertyCore has three separate user interfaces, each serving a distinct audience:

| Surface | Audience | Tech | Access Method |
|---|---|---|---|
| Web Config Dashboard | Certified engineer / installer | React + TypeScript | Browser at `http://[hub-ip]/admin` |
| Mobile App | Owner, guest, tenant, hotel staff | Flutter (Android + iOS) | App store install |
| Wall Panel Kiosk | In-room guest / tenant | Flutter kiosk (full-screen) | Embedded touchscreen |
| Smart Remote | Guest / owner — handheld | LVGL (V1) / Flutter (V2) | On-device 3.5"–4.7" touchscreen |

The Hub itself is **headless** — it has no screen or physical UI. All interaction is through one of the four surfaces above.

---

## UI 1: Web Config Dashboard

**Audience:** Certified PropertyCore engineer (installer only — never shown to end customer)  
**Tech:** React + TypeScript, served by the Hub's local web server  
**Access:** Engineer login (PIN or password), local network only (or via WireGuard relay tunnel for remote support)

This is the equivalent of Control4 Composer Pro or HDL Buspro software — a professional configuration tool that requires training to use. It is the complete configuration environment for a PropertyCore installation.

---

### Dashboard Sections

#### 1. Login
- Engineer PIN / password entry
- Session timeout (auto-lock after inactivity)
- Failed attempt lockout

---

#### 2. System Overview
Home screen after login. At-a-glance hub health.

- Hub model, firmware version, uptime
- Connected device count (online / offline / error)
- Storage status (onboard NVMe used/free, NAS connected/disconnected)
- Network status (Ethernet, Wi-Fi, WireGuard tunnel)
- Active automation rules count
- Recent system alerts

---

#### 3. Setup Wizard
First-run guided flow for a new installation.

- Step 1: Network configuration (Ethernet / Wi-Fi)
- Step 2: Timezone and property type selection
- Step 3: Define floors and rooms
- Step 4: Pair first device
- Step 5: Create first scene
- Step 6: Add owner account and complete handover

---

#### 4. Property Configuration
Define the property structure that all devices and scenes attach to.

- Property name, address, type (hotel / home / apartment / office)
- Floor management (add, name, reorder)
- Room management (add, assign floor, set room type)
- Zone grouping (group rooms for bulk scene control)

---

#### 5. Devices
Central device management — all paired devices across all categories.

- Device list with filters: by room, by category, by status (online / offline / error)
- Pair new device (category-specific pairing flow)
- Per-device detail: name, room assignment, firmware version, last seen, signal strength
- Bulk firmware update per category
- Remove / unpair device
- Device-specific config panels (see sections 6–12 below)

---

#### 6. Relay Module Config
Per-device configuration for all relay modules (PC-RLY-*).

- Channel labels (e.g., "Ceiling Light", "Wall Socket", "Extractor Fan")
- Load type per channel (light / fan / socket / pump / other)
- Physical switch input mode (toggle / momentary / disabled)
- Power monitoring enable per channel (for variants with energy monitoring)
- Minimum on-time protection (prevent rapid switching on inductive loads)

---

#### 7. Dimmer Module Config
Per-device configuration for all dimmer modules (PC-DIM-*).

- Channel labels
- Minimum brightness level (prevents LED flicker at low dim)
- Maximum brightness limit
- Soft-start duration (ramp-up time in milliseconds)
- Soft-off duration
- LED compatibility mode (trailing edge / leading edge)
- Transition curve (linear / logarithmic)

---

#### 8. AC Gateway Config
Per-device configuration for AC gateway modules (PC-ACG-*).

- Brand and model selection from IR database (Hisense, LG, Samsung, Panasonic, Daikin, Midea, Gree, Haier, Aux, others)
- Custom IR code import (if brand not in database)
- Temperature sensor calibration offset
- Humidity sensor calibration offset
- Current clamp sensitivity (for power monitoring variant)
- IR feedback confirmation mode (enabled / disabled)
- Default AC state on hub boot (restore last state / fixed setpoint / leave unchanged)

---

#### 9. Curtain / Blind Config
Per-device configuration for curtain controllers (PC-CUR-*).

- Motor labels (e.g., "Living Room Curtain Left", "Master Bedroom Blackout")
- Travel time calibration (open duration and close duration in seconds)
- End-stop mode (time-based / limit switch input)
- Invert direction (if motor wired in reverse)
- Partial position presets (e.g., 50% for daytime, 100% for blackout)

---

#### 10. Keypad Config
Per-device configuration for keypads and scene controllers (PC-KPD-*).

- Per-button scene assignment
- Per-button label (shown on engineer reference only — button is physical)
- Per-button LED color (idle and active state)
- LED brightness
- Hold action (long-press secondary action per button)
- Lock mode (disable buttons when security system armed)

---

#### 11. Wall Panel Config
Per-device configuration for wall panels (PC-WPN-*).

- Profile selection: Hotel or Residential
- Room assignment
- Welcome message (hotel profile: "Welcome to [Property Name]")
- Room number display
- Services menu items (hotel profile: customise visible service options)
- Screensaver timeout
- Screensaver mode (clock / property branding / blank)
- Always-on display option
- Emergency button enable / disable
- Brightness schedule (daytime / night dimming)

---

#### 12. Smart Remote Config
Per-device configuration for smart remotes (PC-RMT-*).

- Button scene assignment (per physical button)
- IR blaster code library assignment (which IR codes does this remote send per TV/AV button)
- Shortcut scene buttons on touchscreen
- Wake-on-pickup sensitivity (accelerometer threshold)
- Vibration notification events
- Display brightness and timeout
- Charging dock assignment

---

#### 13. Scenes & Automation
The core logic configuration tool.

**Scene Builder**
- Scene name and icon
- Trigger type: manual / schedule / event / device state
- Actions: set device states, run other scenes, send notifications
- Delay and sequence control (actions can be staggered with delays)
- Room scope (single room or whole property)

**Rule Engine (If / Then)**
- Condition builder: device state, time of day, day of week, sensor value, calendar event
- Logical operators: AND / OR / NOT
- Action builder: same as scene actions
- Rule enable / disable toggle
- Rule testing (simulate trigger without executing)

**Schedule Builder**
- Time-based scene triggers
- Recurring schedules (daily, weekday, weekend, custom days)
- Sunrise / sunset offset support
- Holiday override mode

---

#### 14. Energy
Configuration and monitoring for all energy-related modules.

**Circuit Configuration**
- CT clamp channel labeling (assign to circuit/room)
- Alert thresholds (high consumption warning per circuit)
- Load type labeling per circuit

**Inverter Setup**
- Brand and model selection (DEYE, Growatt, Sofar, Goodwe, Sunsynk, Victron)
- RS485 port assignment and baud rate
- Modbus slave address
- Register map validation (test read)
- Poll interval

**Energy Dashboard**
- Real-time power flow diagram (solar → battery → load → grid)
- Per-circuit live wattage
- Daily / weekly / monthly kWh charts
- Battery SOC gauge
- Grid import / export totals
- Solar generation totals

**Alerts**
- Grid failure notification
- Battery low threshold alert
- High consumption alert
- Inverter fault code alert

---

#### 15. Water Management
Configuration for tank level and pump control.

- Ultrasonic sensor calibration (full level / empty level in cm)
- Tank capacity (litres)
- Pump start threshold (% level at which pump activates)
- Pump stop threshold (% level at which pump stops)
- Pump runtime limit (maximum continuous run time — overheat protection)
- Flow meter pulse rate calibration
- Abnormal flow alert threshold (leak detection)
- Pump schedule override (time-based fill windows)

---

#### 16. Generator Management
Configuration for generator interface and fuel monitoring.

- Generator start delay after grid failure (seconds)
- Generator stop delay after grid restore (cooldown)
- Battery SOC threshold for generator start (when inverter battery is used)
- Fuel level sensor calibration (full / empty levels)
- Runtime counter reset
- Oil pressure / temperature alert thresholds
- Maintenance reminder interval (hours)

---

#### 17. Access Control
Configuration for all access and entry devices.

**Door Locks**
- Lock name and room/door assignment
- Auto-lock timer (locks after N minutes)
- Access schedule (time windows per user or card)
- Unlock from app enable / disable per lock

**NFC / RFID Cards**
- Card enrollment (scan and assign to user)
- Card access level (which doors)
- Card validity period
- Card enable / disable

**Fingerprint**
- Fingerprint enrollment per user
- Access level assignment

**Gate Controller**
- Gate name
- Open / close timing
- Auto-close timer
- Vehicle sensor integration (hold gate open while vehicle in beam)

**Access Log**
- Entry/exit event log with timestamp and identity
- Export to CSV

---

#### 18. Security / Alarm
Configuration for security zones and alarm response.

- Arm / disarm modes (home armed / away armed / disarmed)
- Arm / disarm schedule (auto-arm at night, auto-disarm at sunrise)
- Zone definition (group sensors into zones)
- Per-zone entry delay (grace period before alarm triggers)
- Siren assignment (which siren responds to which zone)
- Panic button assignment
- Perimeter sensor sensitivity
- Alert escalation (push notification → SMS → relay server alert)

---

#### 19. AV / IR Control
Configuration for AV distribution and IR control.

- IR blaster room zone mapping (which PC-AV-IR covers which room)
- IR code library per room (TV brand, decoder brand, projector brand) — includes DStv, GOtv, StarTimes decoders
- Custom IR code learning (from PC-AV-IRL)
- HDMI matrix input / output routing config
- HDMI-CEC enable per room (smarter TV power/input/volume control over HDMI without IR)
- AV scene integration (e.g., "Movie Mode" sets HDMI routing + dims lights + closes curtains)

---

#### 20. Hospitality Profile
Hotel-specific configuration. Only visible when property type = Hotel.

- DND / Make Up Room logic (which relay / indicator light reflects DND state)
- Check-in flow config: AC preset, welcome message, access activation
- Check-out flow config: AC off, locks reset, housekeeping alert
- Housekeeping workflow: room status states (Clean / Dirty / In Progress / Inspected)
- Room status board (overview of all rooms with current housekeeping status)
- Hotel services menu items (what appears on wall panel and mobile app for guests)
- Front desk notification config

---

#### 21. Users & Permissions
All accounts that can access this property installation.

- Account types: Engineer / Owner / Guest / Housekeeping / Security Staff
- Per-account room access scope (which rooms they can control)
- Per-account feature access (cameras yes/no, energy yes/no, access control yes/no)
- Guest check-in / check-out dates (time-limited access)
- Guest PIN assignment
- Guest NFC card assignment
- Bulk guest import (for hotel operations)

---

#### 22. Notifications & Alerts
Configure what gets notified, and to whom.

- Push notification rules per event type (device offline, sensor triggered, security alert, energy alert, maintenance reminder)
- Alert recipient assignment (which user accounts receive which alerts)
- Notification quiet hours
- Maintenance alert thresholds (device offline for > N minutes, etc.)

---

#### 23. Network
Hub network and connectivity configuration.

- Ethernet settings (DHCP / static IP)
- Wi-Fi settings (SSID, password)
- Hub hostname
- WireGuard relay tunnel status and reconnect
- Local DNS hostname config
- Firewall / port config

---

#### 24. Storage
External storage and media configuration.

- NAS connection (SMB / NFS — IP, credentials, share path)
- Camera archive path on NAS
- Recording retention policy (days to keep)
- Jellyfin media library path config
- Onboard NVMe usage monitor
- External USB storage status (HC-1)

---

#### 25. OTA Updates
Firmware and software update management.

- Hub OS update: check for update, view changelog, install
- Per-device-category firmware update: push to all devices of a type
- Staged rollout option (update one device first, then all)
- Update log (history of all applied updates)
- Rollback to previous firmware version

---

#### 26. Logs
System diagnostics and audit trail.

- System log (hub OS level events)
- Device event log (MQTT messages, device state changes)
- Automation rule audit trail (which rules fired, when, result)
- Access log (entry/exit events)
- Error log with filtering by severity

---

#### 27. Backup & Restore
Configuration snapshot management.

- Export full config snapshot (JSON / encrypted archive)
- Schedule automatic config backup to NAS
- Restore from backup snapshot
- Factory reset with config wipe option

---

#### 28. Intercom Configuration
Configuration for video doorbell and intercom devices (PC-INT-*).

- Doorbell name and entry point assignment (front door, gate, lobby)
- Camera resolution and night vision settings
- Motion detection zone config
- Door release relay assignment (which relay unlocks the door)
- Two-way audio enable / disable
- Visitor snapshot retention period
- Ring notification recipients (which user accounts are notified)
- Intercom panel assignment to indoor monitors (PC-INT-MON) and wall panels

---

#### 29. Multi-Site Management
For property managers operating multiple PropertyCore installations.

- Site list (all properties linked to this engineer / management account)
- Per-site status overview (online / offline, alert count)
- Switch active site (all dashboard sections update to selected site)
- Cross-site user accounts (engineer accounts that span multiple sites)
- Cross-site reporting (energy, alerts, device health across all sites)
- Site grouping (e.g., group all rooms in a hotel chain)

---

#### 30. Reporting & Analytics
Exportable reports and trend views for property owners and management.

- Energy report: monthly kWh consumption, cost, solar savings — PDF export
- Device health report: uptime per device, offline incidents, firmware versions
- Hotel occupancy report: room utilisation, DND/MUR event frequency
- Automation activity report: which rules fired, frequency, anomalies
- Water consumption report: monthly usage, pump runtime
- Generator runtime report: hours run, fuel consumed (estimated)
- Scheduled report delivery (email PDF monthly to owner)

---

#### 31. Integrations
Certified third-party integrations — the equivalent of Control4 drivers or Alexa Skills, but only certified integrations are available. Not open to arbitrary community plugins.

**Integration Library**
- Browse available certified integrations by category
- Each integration shows: name, version, publisher, certification status, description
- Install / uninstall integration
- Installed integrations list with health status (connected / error / rate-limited)

**Device Brand Integrations**

| Integration | What It Unlocks |
|---|---|
| Tuya / Smart Life | Cloud-based control of existing Tuya devices — bridges customers who have Tuya hardware before switching to PropertyCore hardware |
| Sonoff / eWeLink | Popular in Nigeria — ESP32-based devices, cloud and LAN mode |
| Zigbee2MQTT | Exposes any Zigbee device to PropertyCore via MQTT — major device compatibility boost |
| Tasmota | Thousands of ESP devices already flashed with Tasmota speak MQTT natively |
| Philips Hue | Hue Bridge local API — premium residential lighting |
| Hikvision | Dominant commercial CCTV brand in Nigeria — RTSP + ISAPI integration |
| Dahua | Second major CCTV brand — RTSP + HTTP API |
| Reolink | Popular residential cameras — RTSP + Reolink API |
| ONVIF | Generic camera standard — covers most IP cameras in one integration |

**Energy & Infrastructure Integrations**

| Integration | What It Unlocks |
|---|---|
| DEYE / Sunsynk | RS485 Modbus RTU — validated register map |
| Victron | VE.Can / Modbus TCP — MultiPlus, Quattro, MPPT |
| Growatt | RS485 Modbus RTU |
| Sofar Solar | RS485 Modbus RTU |
| Goodwe | RS485 Modbus RTU |
| Solarman | Cloud API fallback for inverter data where RS485 not accessible |

**Voice & Ecosystem Integrations**

| Integration | What It Unlocks |
|---|---|
| Matter | Native Alexa / Google Home / Apple HomeKit device discovery |
| Amazon Alexa | Direct Alexa smart home skill |
| Google Home | Direct Google smart home action |
| IFTTT | Outbound webhook triggers from PropertyCore events |

**Media & Entertainment Integrations**

*Hub-native (PropertyCore runs these services directly on the hub):*

| Integration | Tier | What It Unlocks |
|---|---|---|
| Jellyfin | Hub-native | Local movies, TV shows, music library served from NAS — no subscription |
| Spotify Connect (librespot) | Hub-native | Hub appears as a Spotify Connect speaker in the Spotify app |
| Apple AirPlay 2 (shairport-sync) | Hub-native | iPhone / Mac casts audio directly to room speakers |
| Google Cast | Hub-native | Android / Chrome casts audio and video to room |
| Snapcast | Hub-native | Multi-room audio sync — same music across lobby, corridors, pool simultaneously |
| Internet Radio | Hub-native | Stream URL-based radio stations — no subscription, ideal for lobby background music |
| IPTV (Tvheadend) | Hub-native | Cable or satellite IPTV restreaming to any room or device on the network |

*External device control (PropertyCore controls the device via IR / HDMI-CEC — does not serve the content):*

| Integration | Tier | What It Unlocks |
|---|---|---|
| Netflix | External device | Scene/IR control of Smart TV or streaming stick running Netflix |
| YouTube / YouTube Premium | External device | IR / HDMI-CEC control of Smart TV YouTube app |
| Apple TV+ | External device | IR / HDMI-CEC control of Apple TV box |
| Amazon Prime Video | External device | IR control of Fire TV Stick or Smart TV |
| Disney+ | External device | IR / HDMI-CEC control of Smart TV |
| Showmax | External device | African streaming service — IR / HDMI-CEC control |
| DStv / MultiChoice | External device | IR control of DStv decoder — full channel navigation, guide, power |
| GOtv | External device | IR control of GOtv decoder |
| StarTimes | External device | IR control of StarTimes decoder |
| Canal+ | External device | IR control of Canal+ decoder |
| Sonos | External device | Sonos local HTTP API — for properties with existing Sonos hardware |

*Guest device casting (PropertyCore provides the endpoint, guest brings the content):*

| Integration | Tier | What It Unlocks |
|---|---|---|
| Guest Spotify | Guest device | Guest opens Spotify, sees room as a Spotify Connect speaker |
| Guest AirPlay | Guest device | Guest AirPlays from iPhone to room speakers |
| Guest Chromecast | Guest device | Guest casts from Android / Chrome to room display |

**Hospitality & Commercial Integrations**

| Integration | What It Unlocks |
|---|---|
| Opera PMS | Hotel property management — check-in/out syncs to PropertyCore room access + AC presets |
| Cloudbeds | Cloud-based PMS popular with boutique hotels |
| Mews | Modern hotel PMS with open API |
| Paystack | Nigerian payment gateway — payment confirmation triggers short-let access |
| Stripe | International payment gateway |

**Per-integration config screen includes:**
- Authentication (API key, OAuth, local IP + credentials)
- Device discovery and mapping (map integration devices to PropertyCore rooms)
- Sync interval / poll rate
- Integration health log
- Test connection button

---

#### 32. API & Webhook Config
For custom third-party integrations and outbound event triggers.

- Outbound webhook URLs (send PropertyCore events to external HTTP endpoints)
- Event filter (which event types trigger webhooks: device state change, alert, scene trigger)
- Webhook authentication (HMAC signature, Bearer token)
- Incoming REST API token management (generate / revoke API keys for external access)
- API access log

---

#### 33. Branding
For hotel chains or property groups that want their own brand on the UI surfaces.

- Property / brand name
- Logo upload (appears on wall panel welcome screen and mobile app)
- Primary colour (applied to mobile app accent and wall panel theme)
- Mobile app display name (shown on app home screen header)
- Wall panel welcome message template
- Custom hotel services menu items

---

#### 34. Visitor Management
Pre-register visitors and issue temporary access.

- Create visitor entry: name, expected arrival, access scope (gate only / gate + door)
- Validity period (date/time window)
- Issue access: temporary PIN, NFC card, or SMS access link
- Visitor log (arrival time, entry events)
- One-tap revoke access

---

#### 35. Installer Notes
Engineer site documentation attached to the installation.

- Free-text notes per installation (wiring notes, device locations, known issues)
- Photo attachments (panel photos, device placement photos)
- Device location notes per device (e.g., "Relay 4 — in ceiling void above master bedroom")
- Commissioning checklist (mark off each step as complete during installation)
- Handover record (date, engineer name, owner signature)

---

#### 36. Entertainment & Media
Configuration for all media services, audio zones, and content sources.

**Media Architecture Overview**
PropertyCore treats media sources in three tiers:
- **Hub-native:** Services that run directly on the PropertyCore Hub (Jellyfin, Spotify Connect, AirPlay 2, Internet Radio, IPTV, Snapcast)
- **External device control:** PropertyCore controls a third-party device via IR or HDMI-CEC (Smart TV, DStv decoder, Apple TV box, Fire TV Stick)
- **Guest device casting:** Guest brings their own content, PropertyCore provides the speaker/display endpoint (Spotify Connect, AirPlay 2, Chromecast)

**Jellyfin Management**
- Media library status (movie count, music count, TV show count)
- Library rescan trigger
- Transcoding quality settings (max resolution, bitrate)
- Active streams monitor (who is watching what)
- Jellyfin user accounts (link to PropertyCore user accounts)
- NAS library path (links to Section 24 Storage)

**Audio Zone Configuration**
- Define audio zones (e.g., Living Room, Master Bedroom, Pool Area, Lobby)
- Assign amplifier outputs to zones (PC-AUD-AMP4 / PC-AUD-AMP8 channel assignment)
- Zone volume limits (max volume per zone — prevents disturbance)
- Zone grouping for Snapcast sync (define which zones play together)
- Default source per zone at property startup
- Background music schedule per zone (e.g., lobby plays internet radio 8am–10pm)

**Streaming Service Setup**
- Spotify Connect: enable/disable, device name visible in Spotify app per room
- AirPlay 2: enable/disable, room display name
- Google Cast: enable/disable
- Internet radio: add/manage stream URLs with station names
- IPTV: Tvheadend setup (source URL, channel list import)

**External Device IR/CEC Library**
- TV brand per room (for IR code selection)
- Decoder brand per room (DStv, GOtv, StarTimes, Canal+, StarTimes)
- Streaming stick per room (Apple TV, Fire TV, Chromecast — for HDMI-CEC control)
- HDMI-CEC device map (which HDMI input = which source per room)
- IR code database update (pull latest from PropertyCore cloud library)

---

## UI 2: Mobile App

**Audience:** Property owner, guests, tenants, hotel staff  
**Tech:** Flutter (Android + iOS)  
**Access:** Role-based — owner sees all rooms and features; guest sees their assigned room only; hotel staff see operational views

---

### Mobile App Screens

#### 1. Login / Welcome
- PIN entry, biometric (Face ID / fingerprint)
- QR code check-in (hotel guest — scans QR from check-in email, activates room access)
- App remembers device after first login

#### 2. Home Dashboard
- Summary cards: active scenes, current room temperatures, energy today
- Quick-access buttons: most-used scenes
- Alert banner (security, water, energy alerts if active)
- Navigation to all major sections

#### 3. Room Control
- Per-room view: lights, AC, curtains — all in one screen
- Grouped control (all lights off, all AC off)
- Scene shortcut buttons

#### 4. Scenes
- All scenes list with icons
- One-tap scene activation
- Scene status (active / inactive where applicable)
- Create quick scene (owner only)

#### 5. Climate
- Per-room AC card: current temp, target temp, mode, fan speed
- Temperature slider
- Mode selector (cool, fan, dry, auto)
- Schedule per AC unit

#### 6. Lighting
- Per-circuit on/off and dimmer slider
- Room grouping
- Colour temperature (where applicable)
- Scene-based lighting shortcuts

#### 7. Cameras
- Live feed grid (all cameras or filtered by zone)
- Full-screen single camera view
- Playback (motion clips, timeline scrub)
- Motion alert clips
- Camera labels and room assignment visible

#### 8. Access
- Gate: open / close / status
- Door locks: lock / unlock per door, status
- Visitor log with camera snapshots
- Answer video doorbell call (if PC-INT-DB installed)

#### 9. Energy
- Live power draw (kW total and per circuit)
- Solar generation, battery SOC, grid status
- Daily and monthly kWh charts
- Cost estimate (if tariff configured)
- Per-circuit breakdown

#### 10. Water
- Tank level gauge (%)
- Pump status (running / idle / fault)
- Daily and monthly consumption
- Leak alert status

#### 11. Generator
- Generator status (running / standby / fault)
- Runtime today and this month
- Fuel level estimate
- Next maintenance reminder

#### 12. Notifications
- Alert history feed
- Push notification preference settings per alert type
- Mark alerts as read / dismiss

#### 13. Entertainment
- **Now Playing** — persistent mini-player widget showing current track/source across all screens
- **Jellyfin** — browse Movies, TV Shows, Music; cast to room TV or room speakers
- **Music** — Spotify (via Spotify Connect), Apple Music (via AirPlay), local Jellyfin music library
- **Multi-room Audio** — group rooms, sync playback, per-room volume slider
- **Source selector per room** — Spotify / Jellyfin / TV / Internet Radio / Guest AirPlay
- **TV Control** — input selector, power, volume (HDMI-CEC or IR)
- **IPTV / DStv** — channel guide and channel switching for IPTV or IR-controlled decoder

#### 14. Hotel Services *(hotel profile only)*
- DND toggle
- Make Up Room request
- Room service request
- Call front desk
- Checkout request
- Concierge menu (property-customised)

#### 15. Settings
- Account info
- Linked property (QR scan to change property)
- Active integrations (view and re-authenticate linked accounts e.g. Hue, Tuya)
- Language preference
- App theme (dark / light)
- Notification preferences
- Logout

---

## UI 3: Wall Panel Kiosk

**Audience:** In-room guest or tenant  
**Tech:** Flutter kiosk app (full-screen, no status bar, no system navigation)  
**Hardware:** PC-WPN-4, PC-WPN-7, or PC-WPN-10 (4", 7", or 10" IPS capacitive touchscreen)  
**Access:** No login — always-on, room-specific, controls only the room it is installed in

---

### Wall Panel Screens

#### 1. Screensaver / Welcome
- Displayed when idle (configurable timeout)
- Clock (large, prominent) and date
- Property name and room number (hotel profile)
- Property branding / logo
- Tap anywhere to wake

#### 2. Room Control Home
- Primary screen after wake
- Quick-access tiles: Lights, AC, Curtains, Scenes
- One-tap control for most common actions
- Active scene indicator

#### 3. AC Control
- Current room temperature (from sensor)
- Target temperature up/down
- Mode selector (cool / fan / dry / auto)
- Fan speed selector
- On / off

#### 4. Lighting
- Per-circuit tiles with on/off toggle
- Dimmer slider per dimmable circuit
- All off button

#### 5. Curtains
- Per-motor open / close / stop buttons
- Position indicator (% open)
- All open / all close buttons

#### 6. Scenes
- Scene shortcut buttons with icons
- Common defaults: Good Morning, Good Night, Movie, Do Not Disturb, Bright, Romantic
- Property-customised scenes visible here

#### 7. Hotel Services *(hotel profile only)*
- DND toggle (large, prominent — lights indicator on door outside)
- Make Up Room toggle
- Call Front Desk button
- Room Service button
- Checkout button

#### 8. Doorbell / Intercom
- Auto-launches when visitor presses doorbell (PC-INT-DB)
- Shows live camera feed from doorbell camera
- Two-way audio
- Door unlock button
- Dismiss / ignore

#### 9. Media
- Now Playing display (album art, track name, artist, source)
- Playback controls: play / pause / skip / previous
- Volume slider for room audio zone
- Source shortcuts: Spotify / Jellyfin / TV / Radio
- Cast to room speakers or TV toggle

#### 10. Emergency
- Emergency alert button (prominent, requires hold to confirm — prevents accidental trigger)
- Triggers security alert to owner + security staff
- Displays emergency contact info for property

---

## UI 4: Smart Remote

**Audience:** Guest or owner — handheld use, replaces TV remote + AC remote + scene controller  
**Hardware:** PC-RMT-V1 (ESP32-S3, 3.5" IPS) and PC-RMT-V2 (ARM SoC, 4.7" display)  
**Tech:** V1 — LVGL running on FreeRTOS (C). V2 — Flutter on embedded Linux  
**Access:** No login — remote is pre-paired to a specific room/property by the engineer. Picks up its room assignment from the Hub.

The Smart Remote is the **flagship hardware product** of PropertyCore. It is the premium in-room experience — a single device that replaces the TV remote, the AC remote, and the bedside scene controller. The UI must feel premium, fast, and dead-simple to use.

---

### Smart Remote Screens (V1 — LVGL, 3.5" 320×480)

Constraints: 320×480px display, touch only, no physical keyboard. LVGL widgets. Performance-critical — must feel instant.

#### 1. Idle / Wake Screen
- Wakes on pickup (accelerometer) or button press
- Displays: time (large), room name, current AC temperature
- Swipe up or tap to enter main menu
- Returns to idle after configurable timeout
- Dim backlight when idle — full brightness on wake

#### 2. Main Menu
- Large icon grid: AC, Lights, Scenes, TV/AV, Curtains
- Active state indicators (e.g., AC on badge, lights on badge)
- Room name shown at top
- Battery level indicator

#### 3. AC Control
- Current room temperature (large)
- Target temperature: up / down buttons (large touch targets)
- Mode bar: Cool / Fan / Dry / Auto
- Fan speed: Low / Mid / High / Auto
- On / Off button (prominent)
- Back to main menu

#### 4. Lighting Control
- Per-circuit row: name + on/off toggle + brightness slider
- All Off button at bottom
- Max 6 circuits visible (scroll if more)

#### 5. Scenes
- Scene buttons in a 2-column grid with icons
- Scene names: Good Morning, Good Night, Movie, Bright, Relax, DND
- Property-customised scenes loaded from Hub
- Active scene highlighted

#### 6. TV / AV Control
- Channel up / down (IR — works for DStv, GOtv, StarTimes, Smart TV)
- Volume up / down / mute
- Input select (HDMI 1 / 2 / 3 / AV)
- Power on / off
- Source shortcut buttons: DStv / Netflix (switch TV input) / Jellyfin
- IR blasted from remote hardware — same codes as PC-AV-IR

**Audio section within TV/AV screen:**
- Now Playing info (pulls from hub — shows if Spotify/Jellyfin active)
- Room speaker volume slider (controls amp zone — separate from TV IR volume)
- Audio source toggle: TV audio out / room speakers / both
- Play / pause / skip for hub-native sources (Spotify Connect, Jellyfin)

#### 7. Curtains
- Per-motor: Open / Stop / Close (large buttons)
- Position indicator (% open)
- All Open / All Close shortcuts

#### 8. Notifications / Alerts
- Vibration + screen flash on alert
- Shows: alert type, room, timestamp
- Dismiss button
- Types: doorbell ring, security alert, scene trigger confirmation

---

### Smart Remote Screens (V2 — Flutter, 4.7")

V2 has a larger display, Linux OS, Flutter UI — same screens as V1 but with more visual richness, smoother animations, and additional capability:

- All V1 screens above, with larger layout and richer widgets
- **Camera Doorbell** — live video feed from PC-INT-DB, two-way audio, door unlock (V2 has SIP intercom capability)
- **Camera Preview** — thumbnail view of room/entrance cameras
- **Multi-room control** — owner mode: switch between rooms (V1 is locked to one room)
- **Energy snapshot** — battery SOC, solar generation summary card

---

## MVP Build Priority

The following subset is sufficient for a first pilot installation:

### Dashboard MVP (Phase 1)
| Priority | Section |
|---|---|
| Must have | System Overview, Property Config, Devices, Relay Config, AC Gateway Config, Scenes & Automation, Users, Network |
| Should have | Dimmer Config, Curtain Config, Energy (inverter + dashboard), Hospitality Profile, Intercom Config, Entertainment & Media (Jellyfin + audio zones) |
| Phase 2 | Integrations, Reporting, Multi-site, Visitor Management, API/Webhook, Branding, Installer Notes |

### Mobile App MVP (Phase 1)
| Priority | Screens |
|---|---|
| Must have | Login, Home Dashboard, Room Control, Scenes, Climate, Lighting, Cameras, Access |
| Should have | Energy, Notifications, Hotel Services, Entertainment (Jellyfin + Spotify Connect) |
| Phase 2 | Water, Generator, Settings (integrations), Multi-room Audio |

### Wall Panel MVP (Phase 1)
| Priority | Screens |
|---|---|
| Must have | Screensaver/Welcome, Room Control Home, AC Control, Lighting, Scenes |
| Should have | Curtains, Hotel Services, Media (Now Playing + volume) |
| Phase 2 | Doorbell/Intercom, Emergency |

### Smart Remote MVP (Phase 1 — V1 only)
| Priority | Screens |
|---|---|
| Must have | Idle/Wake, Main Menu, AC Control, Lighting Control, Scenes |
| Should have | TV/AV Control (with audio section), Curtains |
| Phase 2 | Notifications/Alerts, V2 screens |

---

## Design Principles

- **Dark theme** as default — appropriate for dimly lit hotel rooms and home evening use
- **Large touch targets** — wall panels must be usable without glasses or precise tapping
- **Minimal text** — icon-led UI wherever possible, especially on wall panel
- **Instant feedback** — UI must reflect device state change within 500ms (local MQTT)
- **Offline graceful** — if hub is unreachable, show last known state, not a crash screen
- **Engineer dashboard** is functional / density-focused — not a consumer product, does not need to be beautiful
- **Mobile app and wall panel** represent the PropertyCore brand — must feel premium

---

*UI Scope v0.3 — April 2026. Concept stage.*  
*All screens represent planned functionality. None are built yet.*
