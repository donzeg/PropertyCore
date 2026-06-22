# PropertyCore — Mobile App Build Plan

> Version 1.0 — April 2026  
> Source of truth: `Docs/UI-SCOPE.md` §UI-2 (Mobile App)  
> Tech: Flutter 3.41.7 + Dart 3.11.5  
> Audience: Property owner, guests, tenants, hotel staff  
> Access: Android + iOS app — connects to `http://[hub-ip]` on local network or WireGuard relay

---

## Current State (v0.1)

What exists today in `mobile/lib/`:

| File / Screen | What It Does |
|---|---|
| `ConnectScreen` | Hub IP entry + `GET /health` test |
| `LoginScreen` | User list from API + PIN pad → session token |
| `MainNav` | 4-tab `IndexedStack` (Home, Rooms, Scenes, More) + floating bottom nav |
| `HomeScreen` | Greeting + hub status pill + quick scenes row + area chip filter + device grid |
| `RoomsScreen` | Floor tabs → area list → `RoomDetailScreen` |
| `RoomDetailScreen` | Devices in area — toggle relay channels via MQTT/API |
| `ScenesScreen` | Scene list → one-tap execute |
| `MoreScreen` | Appearance (AppMode × AccentColor) + hub info + sign out |
| `AppState` | Single ChangeNotifier — areas, floors, devices, scenes, property, MQTT via WebSocket |
| `ApiClient` | Fetch wrappers for all engine REST endpoints |
| `Theme` | `AppMode` (dark/light/theme) × `AccentColor` × `PCColors`. `BlobBackground` animated. |
| `DeviceTile` | Animated on/off toggle tile per device |
| `GlassBox` | BackdropFilter container for theme mode |
| `BlobBackground` | CustomPainter animated blobs for theme mode |

**Current gaps vs. UI-SCOPE §UI-2:**
- No per-room climate (AC) control — the most important in-room action
- No per-room lighting dimmer sliders
- No curtain/blind controls
- No energy section (solar, battery, circuits)
- No cameras / live feed
- No access control (gate, door locks)
- No water / generator status
- No entertainment / media section (Spotify, TV, multi-room audio)
- No hotel services screen (DND, MUR, room service, checkout)
- No notifications / alert history
- No settings section (notification prefs, language)
- Room detail screen only toggles relay channels — no device-type-aware UI
- No biometric / Face ID login fallback
- No QR code check-in (hotel guest flow)
- No offline/cached state — goes blank when hub unreachable
- Models don't include AC state, sensor readings, or scene status

---

## Design Principles

1. **Consumption surface, not configuration.** No CRUD, no setup flows — that's the dashboard's job. This app is about control and awareness.
2. **Every screen is dynamic.** All areas, devices, scenes, and data come from the engine API. Zero hardcoded UI.
3. **Speed over polish.** Response to a toggle must feel instant — optimistic update first, API call second.
4. **Three audiences, one codebase.** Owner sees everything. Guest sees assigned area only. Hotel staff see operational views (room status, DND). Role is derived from the user's `role` field.
5. **Works on-site (local Wi-Fi) and off-site (WireGuard relay tunnel).** The `hub_ip` setting covers both — on-site: local IP, off-site: relay tunnel domain.
6. **Premium glass, not flat color fills.** Avoid single-tone green/blue/yellow full-screen backgrounds. Use blurred contextual imagery + layered glass surfaces for depth.
7. **Flutter Material 3** conventions where sensible, but override aggressively for the PropertyCore aesthetic — no default blue Material chrome.

---

## Visual Direction Reset (Premium Glass)

The app should move from a "color-fill" look to a "depth + material" look inspired by high-end control systems.

### A. Background System (context-aware imagery)

Use adaptive, blurred background images behind all app components.

- **Home**: premium lifestyle/interior image (soft focus)
- **Rooms / Lighting**: warm architectural interior scene
- **Climate**: cool-toned ambient scene (subtle blue-gray)
- **Scenes / Automation**: abstract cinematic texture
- **Energy**: modern technical/utility texture (low contrast)
- **Access / Cameras**: darker security-focused backdrop
- **More / Settings**: neutral luxury texture

Rules:

- Apply strong blur + dark overlay to preserve readability
- Never allow raw photo detail to compete with text
- Background image selection can be automatic by screen context, with user override in settings

### B. Glass Surface Language

All cards, chips, nav bars, dialogs, and quick actions should use consistent glass styling:

- Frosted panel effect (`BackdropFilter`) with subtle tint
- Soft border highlight (`1px` translucent light border)
- Elevated shadow stack (small + ambient)
- Rounded corners tuned per component size (not one global radius)
- Disabled states use desaturated glass, not plain gray blocks

### C. Color Strategy (de-emphasize green)

Emerald remains the brand accent, but should no longer dominate the whole UI.

- **Primary base palette**: deep charcoal / slate / smoky blue
- **Accent usage**: only for active state, key CTA, progress highlights
- **Category colors**:
  - Lighting: warm amber
  - Climate: cool cyan/ice
  - Media: album-art driven dynamic accents
  - Security: red/rose for armed/alerts
  - Energy: lime/amber/red based on load/SOC state

### D. Media-first Components

Where media exists, UI should feel alive and premium:

- Album art thumbnails on now-playing cards
- Source badges (Spotify, Apple Music, TV, Radio)
- Color extraction from album art for subtle edge glows (never full-screen flood)
- Rich transport controls (play/pause/next/volume) with tactile glass buttons

### E. Motion + Depth

- Slow parallax drift on background layers
- Gentle card hover/tap elevation
- Smooth blur/fade transitions when switching tabs
- Keep motion tasteful and low-frequency (premium, not flashy)

### F. Appearance Settings Changes

Extend More > Appearance to include:

- `Background Mode`: Auto by screen | Single global image | Off
- `Background Pack`: Interior | Night Luxe | Minimal | Energy Tech
- `Glass Intensity`: Low | Medium | High
- `Color Intensity`: Subtle | Balanced | Vivid
- Keep existing `AppMode` and `AccentColor`, but treat them as secondary controls

### G. Asset Requirements

- Curate a licensed image pack per context (mobile + tablet crops)
- Provide fallback abstract textures for offline use
- Pre-cache selected backgrounds to avoid frame drops on navigation

### H. V2 Standards (Approved Baseline)

The following values/behaviors are now the implementation baseline based on V2 mock review.

#### H.1 Background image visibility + blur
- Background images must be visibly recognizable, not flattened into a dark wash.
- Apply blur to image layer itself, not only glass cards.
- Baseline blur by intensity:
  - Low: 8px
  - Medium: 12px
  - High: 16px
- Maintain readability with a lighter overlay than v0/v1 concepts (image remains legible behind glass).

#### H.2 Overlay and tint policy
- Avoid heavy full-screen dark gradients that hide photo detail.
- Use gentle top/bottom readability gradients and localized highlights.
- Per-screen color tints are allowed, but must remain translucent and secondary to image content.

#### H.3 Glass opacity policy
- Glass surfaces should be translucent enough for background depth to be perceived.
- Increase blur before increasing opacity; do not solve readability by making cards fully opaque.
- Chips and inactive controls should use lighter dark fills than the old green-dominant style.

#### H.4 Product icon treatment (media/services)
- Use actual product brand marks for source chips and media rows (Spotify, Apple Music, Apple TV, Radio provider).
- Default style: monochrome (white) logos on glass for premium consistency.
- Optional mode: colored logos only in high-emphasis media contexts.
- Generic icon fonts are fallback only when official mark is unavailable.

#### H.5 Appearance controls minimum set
- Background Mode: Dark | Light | Cinema (or equivalent naming)
- Background Pack: Interior | Night Luxe | Minimal (+ future packs)
- Accent selection: multi-palette, with non-green default allowed
- Glass Intensity: Low | Medium | High

#### H.6 Non-goals for premium look
- No single-color full-screen fills as default app identity.
- No all-green visual dominance across backgrounds, cards, and controls.
- No flat, borderless control chips for premium surfaces.

#### H.7 Implementation Tokens (Flutter Mapping)

Use these token names (or close equivalents) in `theme.dart` / shared style helpers.

| Token | Type | Default | Notes |
|---|---|---|---|
| `bgBlurLow` | double | `8.0` | Background image blur for low intensity |
| `bgBlurMedium` | double | `12.0` | Background image blur for medium intensity |
| `bgBlurHigh` | double | `16.0` | Background image blur for high intensity |
| `overlayTopAlpha` | double | `0.22` | Readability gradient top darkness |
| `overlayMidAlpha` | double | `0.38` | Readability gradient mid darkness |
| `overlayBottomAlpha` | double | `0.56` | Readability gradient bottom darkness |
| `glassSurfaceAlphaDark` | double | `0.30` | Glass fill opacity in dark/cinema mode |
| `glassSurfaceAlphaLight` | double | `0.34` | Glass fill opacity in light mode |
| `glassBorderAlpha` | double | `0.16` | Main glass border opacity |
| `glassRimAlpha` | double | `0.22` | Inner highlight/rim opacity |
| `glassBlurLow` | double | `14.0` | Card blur for low glass intensity |
| `glassBlurMedium` | double | `26.0` | Card blur for medium glass intensity |
| `glassBlurHigh` | double | `34.0` | Card blur for high glass intensity |
| `noiseAlphaLow` | double | `0.03` | Optional texture layer alpha |
| `noiseAlphaMedium` | double | `0.06` | Optional texture layer alpha |
| `noiseAlphaHigh` | double | `0.08` | Optional texture layer alpha |
| `chipInactiveAlpha` | double | `0.16` | Dark inactive chip fill alpha |
| `brandLogoMonochromeDefault` | bool | `true` | Use monochrome white logos by default |
| `mediaLogoColorMode` | enum | `monochrome|brand` | Brand color mode only for emphasis contexts |
| `defaultAccent` | enum | `violet` | Non-green default accent is allowed |

State keys to persist in `SharedPreferences`:

- `pc-bg-mode` -> `dark|light|cinema`
- `pc-bg-pack` -> `interior|night-luxe|minimal|...`
- `pc-glass-intensity` -> `low|medium|high`
- `pc-color-intensity` -> `subtle|balanced|vivid`
- `pc-logo-mode` -> `monochrome|brand`

---

## Phases

---

### Phase 0 — Visual Foundation (In Progress)

**Goal:** Establish premium visual system before feature-heavy phases continue.

**Deliverables:**

#### 0.1 Global shell polish
- Replace flat blob-style backgrounds with contextual blurred image layer system
- Apply unified glass component tokens (blur, border opacity, tint, shadow, radius)
- Rework bottom nav and top chips to glass style
- Ensure image layer is visibly present behind components at all times

#### 0.2 Theming architecture update
- Introduce theme tokens for surface depth and category accent mapping
- Keep Emerald as brand accent, but reduce default global green usage
- Add support for per-screen background presets

#### 0.3 Appearance settings upgrade
- Add Background Mode / Pack / Glass Intensity / Color Intensity controls
- Persist in SharedPreferences
- Add toggle for monochrome brand icon mode (default ON)

#### 0.4 Performance and readability guards
- Ensure text contrast stays AA-compliant over all background packs
- Add fallback static texture when blur/performance budget is exceeded

#### 0.5 Acceptance criteria
- No screen appears as flat single-color fill by default
- All major cards render as glass components over blurred contextual backgrounds
- Home, Rooms, Climate, Scenes, More each has distinct visual mood while retaining one design language
- Background image remains recognizable in all modes/intensities while text remains readable
- Media source chips use actual product marks, not generic glyph substitutes

Progress update (2026-06-09): Media source chips for Spotify, YouTube, Jellyfin, and DStv are now implemented in Home, Scenes, and Settings with Logo Mode rendering (brand vs monochrome).

---

### Phase 1 — Device-Type-Aware Room Controls

Status: 🔄 In progress (2026-06-09)

**Goal:** The Room Detail screen becomes a real control surface. This is the core of the app — without it, the app is a toy.

**Current state:** `RoomDetailScreen` shows a list of `DeviceTile` widgets that toggle a single boolean. Every device looks the same.

**Target:** Each device type renders a purpose-built control card:

#### 1.1 Relay Control Card
- Per-channel labeled on/off toggles (channel names come from device metadata `config.ch1_label` etc.)
- If all channels = 1 type (all lights) → show as a single "All Off / All On" control with individual overrides
- Online badge — gray out + show "Offline" if `device.online == false`
- MQTT publish on toggle: `propertycore/devices/{id}/cmd` → `{"ch1": true}`

Progress update (2026-06-09): Mobile Room Detail now renders a dedicated relay card for `device.type == relay` with per-channel toggles, batch All On/All Off actions, offline state treatment, and channel labels sourced from device metadata config when available.

Progress update (2026-06-09): Mobile Room Detail now also renders a dedicated AC card for `device.type == ac-gateway` with power toggle, mode selector (Cool/Fan/Dry/Auto), target temperature stepper (16-30 C), and fan speed selector.

#### 1.2 AC Control Card
- Current room temperature (from AC device state or ambient sensor)
- Power on/off (large button, color = on: accent, off: zinc)
- Mode selector: Cool / Fan / Dry / Auto (segmented, icon per mode)
- Target temperature: up/down arrows or swipe-to-adjust (16°C – 30°C)
- Fan speed: Auto / Low / Medium / High (icon row)
- State from `DeviceState.state` map — `{"power": true, "mode": "cool", "temp": 22, "fan": "auto"}`
- MQTT publish: `{"power": true, "mode": "cool", "temp": 22, "fan": "auto"}`

#### 1.3 Dimmer Control Card
- Per-channel label + brightness slider (0–100%)
- On/off toggle (tap the label)
- Long-press slider to set to preset (0 / 25 / 50 / 75 / 100)
- State from `DeviceState.state.ch1` (0–100 int)
- MQTT publish: `{"ch1": 75}`

#### 1.4 Curtain Control Card
- Per-motor: Open / Stop / Close buttons (3-button row, icon: expand / pause / compress)
- Position indicator (% open — horizontal progress bar)
- If `position == 0` → fully closed (close button disabled). If `position == 100` → fully open.
- Preset buttons (50% for day, 100% for open, 0% for blackout) — if presets configured on device

#### 1.5 Model additions (`models.dart`)
```dart
// Add to DeviceState
Map<String, dynamic> get config => ...; // device metadata.config blob

// Add helper getters per device type:
bool? get relayChannel(int n) => state['ch$n'] as bool?;
int? get dimmerChannel(int n) => state['ch$n'] as int?;
double? get acTemp => (state['temp'] as num?)?.toDouble();
String? get acMode => state['mode'] as String?;
bool? get acPower => state['power'] as bool?;
int? get curtainPosition => state['position'] as int?;
```

#### 1.6 Device type detection
The engine `device.type` field drives which card renders:
- `relay` → RelayCard
- `dimmer` → DimmerCard
- `ac-gateway` → AcCard
- `curtain` → CurtainCard
- Unknown type → generic `DeviceTile` (existing widget, keep as fallback)

---

### Phase 2 — Climate Tab + Lighting Tab

**Goal:** Two dedicated tabs with property-wide views — faster to reach than drilling room → device.

**Deliverables:**

#### 2.1 Climate Screen (`screens/climate_screen.dart`)
- List of all AC devices grouped by area (floor tabs at top)
- Each AC = a card (same AcCard widget from Phase 1, but list view)
- Quick action row at top: "All AC Off" (confirmation dialog)
- Temperature summary: number of rooms currently cooling / heating / off
- Schedule shortcut: tap AC → options include "Set schedule" → navigates to More > Schedules

#### 2.2 Lighting Screen (`screens/lighting_screen.dart`)
- All relay + dimmer devices across property, grouped by area
- "All Lights Off" button at top (confirmation dialog — owner only)
- Per-area section: expand/collapse
- Per-circuit: name + toggle or dimmer slider inline
- Active circuits highlighted (on: accent color, off: zinc)

#### 2.3 Update `MainNav` to 5 tabs
Add Climate as a 3rd tab:
```
Home | Rooms | Climate | Scenes | More
```

---

### Phase 3 — Energy Screen

**Goal:** Real-time energy awareness — solar, battery, grid, per-circuit consumption. Major differentiator for Nigerian market.

**Deliverables:**

#### 3.1 Energy Screen (`screens/energy_screen.dart`)
- **Power flow widget** — four nodes: Solar (⚡), Battery (🔋), Grid (⚡), Home (🏠) with live flow arrows. Values from inverter device state or `GET /api/v1/energy/live`. Animates flow direction based on import/export.
- **Battery SOC gauge** — circular arc progress. Color: green > 50%, amber 20–50%, red < 20%.
- **Solar generation today** — kWh figure + sparkline from InfluxDB proxy
- **Grid status** — On / Off (power cut detection). Shows "Grid: OFF" in red when grid absent.
- **Per-circuit section** — list of CT-clamp-enabled relay channels with live wattage
- **Charts** — tabbed: Today / This Week / This Month kWh bar charts

#### 3.2 Model additions
```dart
class EnergyLive {
  final double? solarW;       // watts from PV
  final double? batteryW;     // watts in/out of battery (positive = charging)
  final double? gridW;        // watts from/to grid (positive = import)
  final double? loadW;        // total consumption
  final double? batterySoc;   // 0–100%
  final bool gridPresent;
  ...
}
```

#### 3.3 API additions required
- `GET /api/v1/energy/live` — returns `EnergyLive` JSON
- `GET /api/v1/energy/history?from=&to=&interval=` — returns time-series for charts (proxied InfluxDB query)

---

### Phase 4 — Access Control Screen

**Goal:** Gate, door lock, and visitor log from the phone.

**Deliverables:**

#### 4.1 Access Screen (`screens/access_screen.dart`)
- **Gate card** — name, status (open/closed/unknown), large Open/Close button, confirmation required for Open
- **Door locks list** — name + room, lock/unlock toggle, status, auto-lock indicator
- **Visitor log** — recent entry events with timestamp, identity, door, camera snapshot thumbnail (if camera attached to door)
- **Answer doorbell** — banner appears when `event: doorbell_ring` arrives via WebSocket. Shows live camera thumbnail + Accept / Dismiss.

#### 4.2 Model additions
```dart
class Lock { String id, name, areaId; bool locked; DateTime? lastEvent; }
class VisitorEvent { String who, door; DateTime time; String? snapshotUrl; }
```

#### 4.3 People & Presence (`screens/access_screen.dart` — People tab or section)

Shows who is currently home or away. The mobile app itself reports presence as a device tracker for the linked user.

- **Who's home section** — horizontal scrolling row of person chips at the top of the Access screen
  - Each chip: circular avatar (initials or photo) + name + state badge (`home` green / `away` zinc / zone name amber)
  - Last seen time shown below name
  - Tap → person detail sheet: full state history (today), tracker list
- **Self-report presence** — "I'm home" / "I'm away" buttons for the current user (manual tracker)
- **App auto-tracking** — on login, the app registers itself as a `mobile_app` tracker for the linked user. Sends a `POST /api/v1/persons/{id}/trackers/{tracker_id}/heartbeat` every 5 minutes while the app is running (foreground or background via WorkManager / Background Fetch). Hub sets state to `away` if no heartbeat received for 15 minutes.
- Live updates via WebSocket `person_state_changed` event

#### 4.4 Model additions for presence
```dart
class Person {
  String id, name;
  String state; // "home" | "away" | zone name
  DateTime? lastSeen;
  String? photoUrl;
}
```

---

### Phase 5 — Cameras Screen

**Goal:** View all cameras on-site. Live feed, motion clips.

**Deliverables:**

#### 5.1 Cameras Screen (`screens/cameras_screen.dart`)
- Camera grid (2-column) — each cell shows last snapshot or MJPEG thumbnail
- Tap → full-screen live view (HLS or MJPEG stream from engine proxy)
- Camera name + room label
- Motion alert indicator (red dot if motion alert active)
- Filter by area

#### 5.2 Playback Modal
- Recent motion clips list (date/time, duration)
- Scrubber for recorded footage (if NAS recording enabled)
- Share clip button

---

### Phase 6 — Entertainment / Media Screen

**Goal:** Multi-room audio, TV control, Spotify, media library. The premium experience.

**Deliverables:**

#### 6.1 Entertainment Screen (`screens/entertainment_screen.dart`)
Tabbed: **Now Playing** | **Music** | **TV** | **Library**

**Now Playing tab:**
- Large album art (or source icon if no art)
- Track name, artist, source label (Spotify / Radio / Library)
- Playback controls: previous / play-pause / next
- Progress bar with time
- Volume slider for current room's audio zone
- Room selector (switch which room this is controlling)
- Source switcher: Spotify / AirPlay / Radio / TV / Library

**Music tab:**
- **Spotify Connect** — shows PropertyCore hub as Spotify Connect device. Open Spotify CTA (deeplink to Spotify app).
- **Internet Radio** — list of configured stations, tap to play on selected zone
- **Multi-room audio** — zone group builder: select zones → link → volume per zone slider
- **Local Music Library** (Jellyfin) — browse Artists / Albums / Playlists. Tap to play on zone.

**TV tab:**
- Per-room TV card: power on/off, input selector, volume up/down, mute
- Control method badge: IR / CEC / Media Box
- Channel shortcut buttons (DStv, GOtv, StarTimes, Canal+) — pre-configured IR macros
- IPTV channel list (if Tvheadend configured)

**Library tab:**
- Jellyfin movies + TV shows browse — poster grid
- Tap → play on: room TV (via PC-AV-BOX CEC) or audio zone (audio only)
- Recently added section

#### 6.2 Persistent mini-player widget
- Shown at bottom of screen above nav bar when something is playing
- Track/source name + play/pause button + room label
- Tap to expand to full Now Playing screen

---

### Phase 7 — Water & Generator Screen

**Goal:** Infrastructure status visibility. Particularly relevant in Nigerian deployments where water and generator are daily concerns.

**Deliverables:**

#### 7.1 Water & Generator Screen (`screens/infrastructure_screen.dart`)

**Water section:**
- Tank level gauge (animated fill arc, % label, litres remaining estimate)
- Pump status badge: Running / Idle / Fault
- Daily usage (litres) — from InfluxDB
- Monthly usage chart (bar)
- Leak alert banner (if active)

**Generator section:**
- Status badge: Running / Standby / Fault
- Runtime today (hours)
- Runtime this month
- Fuel level estimate (% from sensor)
- Next maintenance reminder countdown
- "Start generator" button (manual trigger — owner only, confirmation dialog)

---

### Phase 8 — Hotel Services Screen

**Goal:** Hotel guest experience. Only visible when `property.type == "hotel"` and user `role == "guest"`.

**Deliverables:**

#### 8.1 Hotel Services Screen (`screens/hotel_services_screen.dart`)
- **DND toggle** — large, prominent. "Do Not Disturb" on/off. Sends engine command → relay/indicator.
- **Make Up Room** — toggle. When on: sends housekeeping request. Status: Requested / In Progress / Done.
- **Room Service** — button → opens request form (text + submit). Sends notification to front desk user.
- **Call Front Desk** — initiates intercom audio call via hub (or falls back to tel: link to front desk number)
- **Checkout Request** — confirmation dialog → sends checkout event to engine
- **Concierge menu** — property-customised list of service items (from `GET /api/v1/hospitality/services`)
- Room number displayed prominently at top

#### 8.2 Tab visibility
When `property.type == "hotel"` and user role is guest/staff:
- Replace "More" tab with "Services" tab (hotel services screen)
- Move More settings to a top-right settings icon instead

---

### Phase 9 — Notifications & Alerts Screen

**Goal:** Alert history, push notification management.

**Deliverables:**

#### 9.1 Notifications Screen (`screens/notifications_screen.dart`)
- Alert feed: most recent at top. Each item: icon (category), title, detail, timestamp, room label.
- Categories: Security / Energy / Water / Device Offline / Doorbell / System
- Mark as read (swipe or tap)
- Dismiss all
- Filter by category (chip bar at top)
- Unread count badge on the tab/nav icon

#### 9.2 Push notification integration
- Engine sends push via FCM (Google) and APNs (Apple) when alerts fire
- On tap → deep-link to the relevant screen (e.g., security alert → Access screen)
- Quiet hours respect (respect the dashboard-configured quiet hours)

#### 9.3 Notification preferences
- Per-category toggle (in More/Settings screen)
- Quiet hours display (read from hub, navigate to dashboard to change)

---

### Phase 10 — Settings Screen (More tab rework)

**Goal:** More tab becomes a proper settings screen — currently only has appearance and sign out.

**Target More screen structure:**

#### 10.1 Account section
- User name, role badge (Owner / Guest / Staff)
- Change PIN
- Biometric login toggle (Face ID / fingerprint — use `local_auth` package)
- Sign out

#### 10.2 Connected Property
- Property name, type, hub IP
- QR scanner to switch property (hotel guest: scan QR from check-in email)
- Test connection (ping `/health`)

#### 10.3 Appearance
- AppMode: Dark / Light / Theme (existing — keep)
- AccentColor: Emerald / Sapphire / Amber / Rose / Violet (existing — keep)
- Background Mode: Auto by screen / Single global image / Off
- Background Pack: Interior / Night Luxe / Minimal / Energy Tech
- Glass Intensity: Low / Medium / High
- Color Intensity: Subtle / Balanced / Vivid
- Language preference (English default; future: Arabic, French, Hausa for West Africa)

#### 10.4 Notifications
- Per-category push notification toggles
- Quiet hours (read-only — link to dashboard to configure)

#### 10.5 About
- App version
- Engine version (from `/status`)
- Hub OS version
- Open source licenses
- PropertyCore website link

---

### Phase 11 — Offline Mode & Caching

**Goal:** The app doesn't go blank when the hub is temporarily unreachable (e.g., walking through a dead Wi-Fi spot). Shows last-known state with a "Last seen X min ago" banner.

**Deliverables:**

#### 11.1 State persistence
- Serialize `AppState.areas`, `AppState.devices`, `AppState.scenes`, `AppState.floors` to `SharedPreferences` on every successful API response
- Restore on app cold start from cache — show data immediately while reconnecting
- Show `OfflineBanner` widget (amber bar at top) when `mqttConnected == false`
- Disable toggle interactions when offline (gray out, show tooltip "Hub unreachable")

#### 11.2 Reconnect logic
- WebSocket auto-reconnects with exponential backoff (0.5s → 1s → 2s → 4s → 8s max)
- HTTP requests retry once on failure, then show stale-data indicator
- Background re-fetch when app comes to foreground (`AppLifecycleState.resumed`)

---

### Phase 12 — QR Check-In (Hotel Guest Flow)

**Goal:** A hotel guest receives a check-in email with a QR code. They scan it in the app → instant access to their room — no PIN required from the desk.

**Deliverables:**

#### 12.1 QR scan on ConnectScreen
- "Scan Check-In QR" button below the IP input field
- Uses `mobile_scanner` package
- QR payload: `pc://checkin?hub=192.168.1.50&token=abc123&user_id=xyz`
- On scan: store hub_ip + token + user_id → skip LoginScreen → go directly to MainNav
- Token is a pre-issued single-use session token generated by the dashboard during check-in

#### 12.2 Token validity
- If token is expired: show "Your check-in link has expired — contact reception" screen
- If token is valid but no room assigned: show "Room not yet assigned — contact reception"

---

## Model Additions Required Per Phase

| Phase | New Models / Fields |
|---|---|
| 1 | Device card type routing. `DeviceState` typed getters for relay/dimmer/AC/curtain. |
| 2 | No new models — reuse Phase 1 cards in list view. Add `AppState.loadClimate()`. |
| 3 | `EnergyLive`, `EnergyHistory`, `CircuitReading`. |
| 4 | `Lock`, `VisitorEvent`, `Gate`, `Person`. |
| 5 | `Camera`, `MotionClip`. |
| 6 | `AudioZone`, `MediaTrack`, `TvRoom`, `JellyfinItem`. |
| 7 | `WaterStatus`, `GeneratorStatus`. |
| 8 | `HotelService`, `HousekeepingStatus`. |
| 9 | `AppAlert` with category enum. |
| 10 | No new models. |
| 11 | Persist/restore existing models via SharedPreferences JSON. |
| 12 | QR payload parser. `CheckInToken`. |

---

## API Additions Required Per Phase

| Phase | New Engine Endpoints Needed |
|---|---|
| 1 | None — uses existing `PATCH /api/v1/devices/{id}` + MQTT publish |
| 2 | None — derives from existing device list |
| 3 | `GET /api/v1/energy/live`, `GET /api/v1/energy/history` |
| 4 | `GET /api/v1/access/locks`, `POST /api/v1/access/locks/{id}/toggle`, `GET /api/v1/access/log`, `POST /api/v1/access/gate/{id}/open`, `GET /api/v1/persons`, `POST /api/v1/persons/{id}/trackers/{tracker_id}/heartbeat` |
| 5 | `GET /api/v1/cameras`, `GET /api/v1/cameras/{id}/stream` (proxy URL) |
| 6 | `GET /api/v1/audio/zones`, `PATCH /api/v1/audio/zones/{id}`, `GET /api/v1/media/now-playing`, `POST /api/v1/media/control` |
| 7 | `GET /api/v1/water/status`, `GET /api/v1/generator/status` |
| 8 | `GET /api/v1/hospitality/services`, `POST /api/v1/hospitality/requests`, `PATCH /api/v1/hospitality/rooms/{id}/dnd` |
| 9 | `GET /api/v1/alerts?limit=&since=`, `PATCH /api/v1/alerts/{id}/read`, `POST /api/v1/fcm/register` |
| 10 | `PATCH /api/v1/users/{id}/pin` |
| 11 | None — pure client-side |
| 12 | Token validation already covered by existing auth — no new endpoints |

---

## New Flutter Packages Required

| Phase | Package | Purpose |
|---|---|---|
| 5 | `video_player` | RTSP/HLS camera stream playback |
| 6 | `audio_service` | Background audio playback + system media controls |
| 9 | `firebase_messaging` | FCM push notifications |
| 10 | `local_auth` | Biometric (Face ID / fingerprint) |
| 12 | `mobile_scanner` | QR code scanner |

---

## Phase Summary

| Phase | Feature Area | Core Deliverable | Status |
|---|---|---|---|
| 0 | Visual Foundation | Premium glass shell + contextual blurred backgrounds + appearance controls | 🔄 In progress |
| 1 | Room Controls | Device-type-aware cards: relay, AC, dimmer, curtain | 🔄 In progress |
| 2 | Climate + Lighting | Dedicated property-wide tabs | ⬜ Not started |
| 3 | Energy | Power flow, battery, solar, per-circuit — InfluxDB charts | ⬜ Not started |
| 4 | Access Control | Gate, locks, visitor log, doorbell answer, people presence | ⬜ Not started |
| 5 | Cameras | Live feed grid, motion clips, full-screen view | ⬜ Not started |
| 6 | Entertainment | Multi-room audio, TV control, Spotify, Jellyfin | ⬜ Not started |
| 7 | Infrastructure | Water tank, pump, generator status | ⬜ Not started |
| 8 | Hotel Services | DND, MUR, room service, concierge — hotel profile only | ⬜ Not started |
| 9 | Notifications | Alert feed, push notifications (FCM/APNs) | ⬜ Not started |
| 10 | Settings | More screen rework — PIN change, biometric, prefs | ⬜ Not started |
| 11 | Offline Mode | Last-known-state cache, reconnect, stale banner | ⬜ Not started |
| 12 | QR Check-In | Hotel guest QR scan → instant room access | ⬜ Not started |
