# PropertyCore — AI Assistant Context

This workspace is the **PropertyCore** smart property automation platform project.

## What PropertyCore Is

PropertyCore is a **platform + hardware ecosystem** — the same model as Control4, HDL Buspro, and Loxone. It is NOT a Home Assistant clone or a consumer smart home app.

Two things working as one:
- **PropertyCore Platform** — software that runs on-site on a branded hub, managing all devices, automation logic, multimedia, and the guest/tenant/operations experience
- **PropertyCore Devices** — branded hardware modules (relay boards, AC gateways, wall panels, smart remotes, sensors) running PropertyCore firmware, sourced from OEM bare boards and reflashed

**Target markets:** Hotels, residential estates, luxury homes, apartments, offices — primarily Nigeria and Africa.  
**Deployment model:** Engineer-installed and configured. Not DIY. Comparable to a Control4 certified dealer installation.

---

## This Repository: `propertycore-os`

This specific repo is the **Yocto-based custom Linux OS** for the PropertyCore Hub.

### What we are building here
A production-grade embedded Linux image for the PropertyCore Hub using the **Yocto Project (Scarthgap / 5.0 LTS)**.

The OS image must:
- Boot in under 20 seconds
- Run as read-only rootfs (corruption-resistant for commercial deployment)
- Include all PropertyCore platform services pre-installed and auto-starting
- Support OTA (over-the-air) updates via Mender or RAUC
- Be reproducible — any engineer can rebuild the exact same image

### Build environment
- **Build machine:** ThinkPad P1 — Ubuntu 24.04 LTS, 12 cores, 32GB RAM, 233GB NVMe
- **Dev/CI target:** QEMU (`qemuarm64`, cortex-a57) — primary build target while no physical Pi 5 is available
- **Production target:** Raspberry Pi 5 (8GB) — `build/` config exists, will be used when hardware is available
- **Yocto release:** Scarthgap (5.0 LTS)

### Project folder structure
```
~/projects/propertycore-os/
├── .github/
│   └── copilot-instructions.md      ← this file
├── Docs/
│   ├── CONCEPT.md                   ← Full platform concept (architecture, modules, phases)
│   ├── PRODUCT-LIBRARY.md           ← Hardware catalog (78 SKUs, 19 categories)
│   ├── UI-SCOPE.md                  ← All 4 UI surfaces fully scoped (v0.4)
│   └── inverter/
│       └── deye 16kw.yaml           ← DEYE inverter ESPHome YAML — Modbus register map source of truth
├── poky/                            ← Yocto Poky reference (gitignored)
├── meta-openembedded/               ← Community OE layer collection (gitignored)
├── meta-raspberrypi/                ← Raspberry Pi BSP layer (gitignored)
├── meta-propertycore/               ← PropertyCore custom layer (tracked in git)
│   ├── conf/
│   │   ├── layer.conf               ← LAYERDEPENDS="core" (works for both QEMU and RPi5)
│   │   └── distro/
│   │       └── propertycore.conf    ← DISTRO=propertycore, systemd, hostname=propertycore-hub
│   ├── recipes-images/
│   │   └── images/
│   │       └── propertycore-image-base.bb  ← Main image recipe (openssh, mosquitto, propertycore-engine)
│   └── recipes-propertycore/
│       └── propertycore-engine/     ← Go automation engine recipe
│           ├── files/
│           │   ├── main.go          ← Engine entry point — wires all components, v0.11.0
│           │   ├── state.go         ← StateManager — ephemeral in-memory device state
│           │   ├── device.go        ← DeviceRegistry — persistent device metadata
│           │   ├── mqtt.go          ← MQTTClient — subscribe/publish over Mosquitto
│           │   ├── ws.go            ← WSHub — RFC 6455 WebSocket server
│           │   ├── scene.go         ← SceneManager — CRUD + execute
│           │   ├── rule.go          ← RulesEngine — if/then automation rules
│           │   ├── area.go          ← AreaManager — area CRUD (also defines randomID())
│           │   ├── floor.go         ← FloorManager — floor CRUD with display order
│           │   ├── property.go      ← PropertyManager — property singleton (name, type, timezone)
│           │   ├── auth.go          ← SessionManager — in-memory PIN-based token auth
│           │   ├── user.go          ← UserManager — user CRUD with roles (owner/admin/guest)
│           │   ├── scheduler.go     ← ScheduleManager — time-based scene triggers
│           │   ├── store.go         ← Store — JSON persistence to /var/lib/propertycore/
│           │   ├── api.go           ← HTTP handlers for all REST endpoints
│           │   ├── go.mod           ← module github.com/propertycore/propertycore-engine
│           │   └── propertycore-engine.service  ← systemd unit (StateDirectory=propertycore)
│           ├── propertycore-engine_0.1.bb  ← v0.1 recipe (archived)
│           ├── ...                         ← v0.2 – v0.9 recipes (archived)
│           ├── propertycore-engine_0.10.bb ← v0.10 recipe (archived)
│           └── propertycore-engine_0.11.bb ← current active recipe
├── dashboard/                       ← React config dashboard (engineer install tool)
│   ├── package.json                 ← Vite + React + TypeScript + Tailwind CSS v3
│   ├── vite.config.ts               ← base=/admin/, dev proxy → :8080
│   ├── tsconfig.json
│   ├── tailwind.config.cjs
│   ├── postcss.config.cjs
│   ├── index.html
│   └── src/
│       ├── main.tsx / App.tsx       ← Entry + React Router (basename=/admin)
│       ├── types.ts                 ← All TypeScript interfaces (HubStatus, Device, Scene, etc.)
│       ├── api.ts                   ← Fetch wrappers for all engine REST endpoints + WebSocket URL
│       ├── index.css                ← Tailwind directives + .btn-primary component
│       ├── components/
│       │   ├── Layout.tsx           ← Sidebar nav + main content outlet
│       │   └── Modal.tsx            ← Reusable modal dialog
│       └── pages/
│           ├── Overview.tsx         ← Hub status + resource counts + live WebSocket
│           ├── Floors.tsx           ← Floor CRUD
│           ├── Areas.tsx            ← Area CRUD (also exports shared primitives: Table, Field, etc.)
│           ├── Devices.tsx          ← Device list, area assignment, live state preview
│           ├── Scenes.tsx           ← Scene CRUD + execute
│           ├── Rules.tsx            ← Rules CRUD + enable/disable toggle
│           ├── Schedules.tsx        ← Schedule CRUD + enable/disable toggle
│           └── Users.tsx            ← User CRUD (owner/admin/guest, PIN)
├── firmware/
│   └── pc-rly-wifi/                 ← ESP32 Wi-Fi relay firmware (PC-RLY-xCH-W)
│       ├── CMakeLists.txt           ← ESP-IDF project root
│       ├── sdkconfig.defaults       ← Build defaults (BT off, stack sizes)
│       ├── README.md                ← Flash guide, NVS config, GPIO table
│       └── main/
│           ├── CMakeLists.txt
│           ├── config.h             ← Channel count, GPIO pins, MQTT defaults
│           ├── relay.c/h            ← GPIO relay driver (active-low, N-channel)
│           ├── nvs_config.c/h       ← NVS: device_id, broker_ip, wifi creds
│           ├── mqtt_pc.c/h          ← MQTT: publish state, receive cmd, LWT
│           └── main.c               ← app_main: Wi-Fi → switches → MQTT
├── mockups/                         ← Interactive HTML UI previews (served by python3 -m http.server 8888)
│   ├── dashboard-mockup.html        ← Static dashboard preview (Zinc+Emerald, Phosphor Icons)
│   └── mobile-app-mockup.html       ← Interactive mobile app preview (3 modes × 5 accent colours)
├── build/                           ← RPi5 BitBake build dir (gitignored)
├── build-qemu/                      ← QEMU BitBake build dir (gitignored)
├── downloads/                       ← Shared fetch cache (gitignored)
├── sstate-cache/                    ← Shared sstate cache (gitignored)
└── README.md
```

---

## Full Platform Software Stack

| Component | Technology | Role |
|---|---|---|
| Automation engine | **Go (Golang)** | Core logic, MQTT handler, scene engine, API server |
| Config dashboard | **React + TypeScript** | Installer/engineer web UI at `http://[hub-ip]/admin` |
| Mobile app | **Flutter (Dart)** | Guest/owner/tenant control app (Android + iOS) |
| Wall panel kiosk | **Flutter (Dart)** | Full-screen kiosk on PC-WPN-* touchscreens |
| Smart remote UI | **LVGL (C)** | UI for ESP32-S3 Smart Remote V1 |
| Smart remote V2 UI | **Flutter (Dart)** | UI for ARM-based Smart Remote V2 |
| Device firmware | **ESP-IDF + FreeRTOS** | All ESP32-based modules (relays, AC gateways, etc.) |
| MQTT broker | **Mosquitto** | Embedded on hub — all ESP32 device communication |
| Database (config) | **SQLite** | Scenes, users, device config |
| Database (history) | **InfluxDB** | Time-series sensor and energy data |
| Surveillance | **FFmpeg + WebRTC** | RTSP ingestion, recording, live view |
| Media server | **Jellyfin** | Pre-installed on hub, reads from NAS |
| Multi-room audio | **Snapcast** | Synchronised audio across zones |
| Spotify Connect | **librespot** | Hub as Spotify Connect speaker |
| AirPlay 2 | **shairport-sync** | AirPlay receiver |
| IPTV | **Tvheadend** | Cable/satellite restreaming |
| Remote access | **WebSocket relay tunnel** | Hub dials outbound to relay server — no port forwarding |
| Voice | **Matter SDK** | Native Alexa/Google/HomeKit discovery |
| Inverter | **Modbus RTU (RS485)** | DEYE, Growatt, Sofar, Victron |
| Hub OS | **Yocto (this repo)** | Custom read-only embedded Linux |

---

## Hub Hardware Tiers

| SKU | Board | RAM | Storage | Target |
|---|---|---|---|---|
| PC-HUB-HC1 | Raspberry Pi 5 | 8GB | 256GB NVMe | Small home / apartment |
| PC-HUB-HC3 | Pi CM5 custom carrier | 8GB | 512GB NVMe | Large home / hotel |
| PC-HUB-HCPRO | RK3588 | 16GB | 512GB NVMe | Estate / commercial |

**Current Yocto build target: `qemuarm64` (dev). RPi5 build config exists in `build/` for when hardware is available.**

---

## Yocto Build Layers

| Layer | Source | Purpose |
|---|---|---|
| `poky` | https://git.yoctoproject.org/poky | Yocto reference distro (Scarthgap) |
| `meta-openembedded` | https://github.com/openembedded/meta-openembedded | Extended recipe collection |
| `meta-raspberrypi` | https://github.com/agherzan/meta-raspberrypi | Raspberry Pi BSP (RPi5 build only) |
| `meta-propertycore` | This repo | PropertyCore platform layer |

### Build configs
- **`build-qemu/`** — `MACHINE=qemuarm64`, `DISTRO=propertycore`, no meta-raspberrypi. Primary dev target.
- **`build/`** — `MACHINE=raspberrypi5`, `DISTRO=propertycore`, includes meta-raspberrypi. For physical hardware.
- **`meta-webserver` must be in BBLAYERS** — nginx lives in `meta-openembedded/meta-webserver`. Add to both `build-qemu/conf/bblayers.conf` and `build/conf/bblayers.conf` after `meta-networking`.

### Running the QEMU image
```bash
cd ~/projects/propertycore-os
source poky/oe-init-build-env build-qemu
bitbake propertycore-image-base
# Then boot:
runqemu qemuarm64 nographic slirp
# SSH: ssh root@localhost -p 2222
```

---

## Current Build Phase

> Phase 1 — Foundation: COMPLETE ✅
> Phase 2 — Go Automation Engine: COMPLETE ✅
> Phase 3 — UIs, Firmware & OS Hardening: IN PROGRESS 🔄

### Phase 1 — Completed
- [x] Install Yocto host dependencies on ThinkPad
- [x] Clone Poky, meta-openembedded, meta-raspberrypi (Scarthgap branch)
- [x] Create `meta-propertycore` layer skeleton
- [x] Configure `propertycore` distro (systemd, openssh, hostname, ipk packages)
- [x] QEMU build config (`build-qemu/`) — `qemuarm64`, no RPi dependency
- [x] Full image build — 4655 tasks succeeded
- [x] QEMU boots: Linux 6.6.123, systemd, Mosquitto active on :1883, SSH on :22
- [x] Hostname `propertycore-hub` confirmed
- [x] `propertycore-engine` v0.1 Go binary built and installed (`/usr/bin/propertycore-engine`)
- [x] `propertycore-engine.service` systemd unit auto-enabled
- [x] All changes committed and pushed to GitHub

### Phase 2 — Go Automation Engine: COMPLETE ✅

Engine reached v0.11.0. All components built, Yocto-packaged, and verified in QEMU.

| Version | Commit | Feature |
|---|---|---|
| v0.1 | — | HTTP `/health` + `/status`, TCP MQTT ping |
| v0.2 | `41e32e6` | MQTT client, device state manager, REST API skeleton |
| v0.3 | `ae6f38a` | RFC 6455 WebSocket server — push state to UIs |
| v0.4 | `b2047da` | Scene engine — CRUD + execute |
| v0.5 | `989fea1` | Rules engine — if/then, enable/disable, condition matching |
| v0.6 | `8aa0432` | JSON persistence — scenes/rules survive reboots |
| v0.7 | `ddec9e5` | Rooms + Users CRUD API with JSON persistence |
| v0.8 | `ac78845` | Scheduling engine — time-based scene triggers |
| v0.9 | `96f557a` | Device registry — persistent metadata, auto-registration via MQTT |
| v0.10 | — | PIN-based session auth (SessionManager, crypto/rand tokens, in-memory only) |
| v0.11 | — | Room→Area rename, Floor entity, Property singleton; Yocto recipes 0.10+0.11 |
| v0.12 | `d9ab7d7` | InfluxDB time-series pipeline — `influx.go` writes `device_state` measurements on every MQTT state event |

**Engine API surface (all on `:8080`):**
- `GET /health` — liveness probe
- `GET /status` — version, uptime, MQTT status, all resource counts
- `GET|POST /api/v1/devices` — device registry CRUD
- `GET|PATCH|DELETE /api/v1/devices/{id}` — single device
- `GET|POST /api/v1/scenes` — scene CRUD
- `GET|PATCH|DELETE /api/v1/scenes/{id}` — single scene
- `POST /api/v1/scenes/{id}/execute` — trigger scene
- `GET|POST /api/v1/rules` — rules engine CRUD
- `GET|PATCH|DELETE /api/v1/rules/{id}` — single rule
- `POST /api/v1/rules/{id}/enable|disable`
- `GET|POST /api/v1/areas` — area CRUD
- `GET|PATCH|DELETE /api/v1/areas/{id}` — single area
- `GET|POST /api/v1/floors` — floor CRUD
- `GET|PATCH|DELETE /api/v1/floors/{id}` — single floor
- `GET|PATCH /api/v1/property` — property singleton (name, type, timezone)
- `POST /api/v1/auth/login` — PIN login → returns session token
- `POST /api/v1/auth/logout` — invalidate token
- `GET|POST /api/v1/users` — user CRUD (roles: owner/admin/guest, PIN omitted from GET response)
- `GET|PATCH|DELETE /api/v1/users/{id}` — single user
- `GET|POST /api/v1/schedules` — schedule CRUD
- `GET|PATCH|DELETE /api/v1/schedules/{id}` — single schedule
- `POST /api/v1/schedules/{id}/enable|disable`
- `GET /ws` — WebSocket endpoint (broadcasts device state changes)

**Persistence** — JSON files in `/var/lib/propertycore/`:
`scenes.json`, `rules.json`, `areas.json`, `floors.json`, `property.json`, `users.json`, `schedules.json`, `devices.json`

**Time-series** — InfluxDB 1.8 on `:8086`, database `propertycore`, retention 90 days.
The engine writes a `device_state` measurement on every MQTT state update.
Tags: `device_id`, `device_type`. Fields: all numeric/bool/string keys from the device state payload.
Query example: `SELECT * FROM device_state WHERE device_id='abc123' AND time > now() - 1h`
Configurable via env vars `INFLUXDB_URL` (default `http://localhost:8086`) and `INFLUXDB_DB` (default `propertycore`).

### Phase 3 — UIs, Firmware & OS Hardening (current focus)
- [x] ESP32 relay firmware — `firmware/pc-rly-wifi/` (PC-RLY-1/2/4/6CH-W)
- [x] React config dashboard v0.1 — `dashboard/` (Vite + React + TypeScript + Tailwind)
- [x] Yocto recipe — nginx + `propertycore-dashboard` recipe serves dashboard at `/admin`
- [x] QEMU verified: nginx active, `/admin/` 200 OK, `/status` + `/health` proxied, engine MQTT connected (commit `89a6411`)
- [x] UI mockups (HTML interactive previews) — `mockups/dashboard-mockup.html`, `mockups/mobile-app-mockup.html`
- [x] Engine v0.10: PIN-based session auth (SessionManager, crypto/rand tokens)
- [x] Engine v0.11: Room→Area rename, Floor entity, Property singleton; Yocto recipes updated
- [x] Dashboard: Zinc+Emerald light/dark mode redesign — theme toggle in sidebar, persisted in localStorage (commit `4c39b3e`)
- [x] Engine v0.10/v0.11 + dark mode dashboard committed (commit `0f0d43e`, `90b4b80`)
- [x] QEMU rebuilt and verified: engine v0.11.0, all new endpoints (`/api/v1/areas`, `/api/v1/floors`, `/api/v1/property`, auth), nginx `/admin/` 200 OK
- [x] Flutter mobile app v0.1 — `mobile/` (Flutter 3.41.7, Dart 3.11.5, `flutter analyze` clean, commit `d5029e6`)
- [x] pm2 process manager — engine + dashboard running persistently on ThinkPad; auto-starts on boot via `pm2-syeed` systemd service
- [x] InfluxDB recipe + time-series data pipeline — `influx.go` in engine, `meta-propertycore/recipes-propertycore/influxdb/` Yocto recipe (commit `d9ab7d7`)
- [x] Read-only rootfs + persistent data layer — `IMAGE_FEATURES+=read-only-rootfs`, `propertycore-persist` recipe, bind-mounts `/var/lib/propertycore` + `/var/lib/influxdb` from data partition (commit `177ff60`)
- [ ] OTA update mechanism (Mender or RAUC)
- [ ] RPi5 image verification on physical hardware

**UI Mockups (`mockups/`):**
- `dashboard-mockup.html` — Static HTML preview of config dashboard (Zinc + Emerald theme, Phosphor Icons).
- `mobile-app-mockup.html` — Interactive HTML preview of Flutter mobile app. 3 phone frames: Home, Rooms, Appearance Settings. Fully interactive: 3 background modes (Dark / Light / Theme) × 5 accent colours (Emerald / Sapphire / Amber / Rose / Violet). Served by `python3 -m http.server 8888` from `mockups/`.
- Approved design: Zinc + Emerald. Brand colour is **Emerald (`#10b981`)** — Nigerian market positioning.

**Flutter Mobile App v0.1 (`mobile/`):**
- Flutter 3.41.7 + Dart 3.11.5. `flutter analyze`: No issues found.
- **Dashboard = Configuration surface** (engineer/owner via browser). **Mobile app = Consumption surface** (owner/guests via phone).
- **Zero hardcoded UI** — every screen dynamically rendered from engine API:
  - Areas list → `GET /api/v1/areas`; Devices per area → `GET /api/v1/devices` (filter by area_id)
  - Scenes → `GET /api/v1/scenes`; Live state → `GET /ws` WebSocket
- Flow: engineer configures in dashboard → immediately visible in mobile app. No YAML, no card builder.
- Target: Android + iOS. Connects to `http://[hub-ip]/api/v1/` + `ws://[hub-ip]/ws`.
- **Dependencies:** `http ^1.2.1`, `web_socket_channel ^3.0.1`, `provider ^6.1.2`, `shared_preferences ^2.3.3`
- **State:** Single `AppState` ChangeNotifier. Persists: hub_ip, token, user_id, user_name, app_mode, accent via `SharedPreferences`.
- **Theme:** `AppMode` (dark/light/theme) × `AccentColor` (emerald/sapphire/amber/rose/violet). `PCColors` derives all surface/text colors. `BlobBackground` animated blobs in theme mode.
- **Screens:** ConnectScreen → LoginScreen (user list + PIN pad) → MainNav (4-tab IndexedStack).
- **Tabs:** Home (greeting + quick scenes + area chips + device tiles), Rooms (floor tabs + area list → RoomDetail), Scenes (execute), More (appearance + hub info + sign out).
- **Widgets:** `GlassBox` (BackdropFilter), `BlobBackground` (CustomPainter animated), `DeviceTile` (animated toggle), `areaIcon()`/`deviceIcon()` helpers.
- **Build:** `cd mobile && ~/flutter/bin/flutter pub get && ~/flutter/bin/flutter build apk --release`
- `AppMode.theme` (index=2) is default; `AccentColor.emerald` (index=0) is default.
- Use `.withValues(alpha:)` NOT `.withOpacity()` (Flutter 3.x API).

**Dashboard v0.1 (`dashboard/`):**
- Vite 5 + React 18 + TypeScript + Tailwind CSS v3.
- Served at `http://[hub-ip]/admin` (base path `/admin/`).
- Dev: `cd dashboard && npm install && npm run dev` (proxy → engine :8080).
- Build: `npm run build` → `dist/` (static files for nginx or engine to serve).
- Implements UI-SCOPE sections backed by current engine API:
  - Overview (§2): /status, WS live updates, resource counts
  - Floors (§3): CRUD with display order
  - Areas (§4): CRUD with floor assignment and type
  - Devices (§5): list, area assignment, online badge, live state preview
  - Scenes (§13a): CRUD + execute button
  - Rules (§13b): CRUD + enable/disable toggle
  - Schedules (§13c): CRUD + enable/disable toggle
  - Users (§21): CRUD (owner/admin/guest, PIN)
  - All other sections show as "Coming soon" stubs in sidebar.
- **Dark mode:** `darkMode: 'class'` in tailwind.config.cjs. `ThemeContext` + `useTheme()` exported from `App.tsx`. Toggle button in sidebar footer. Theme persisted as `'pc-theme'` in `localStorage`. OS preference respected on first load.
- **CSS utilities in `index.css`:** `.btn-primary` (Emerald), `.btn-ghost` (zinc), `.input` (full dark-aware), `.card` (white/zinc-900 with border).
- **Brand color:** `brand` in tailwind config = Emerald (`#10b981`). Use `bg-brand`, `text-brand`, `dark:text-brand-400`, `ring-brand-400` etc.

**Firmware — ESP32 relay (`firmware/pc-rly-wifi/`):**
- ESP-IDF v5.x + FreeRTOS. Pure C, zero external deps beyond ESP-IDF.
- Covers all Wi-Fi relay SKUs: set `RELAY_CHANNEL_COUNT` in `config.h`.
- Wi-Fi STA → MQTT connect → subscribe cmd → publish state on boot/cmd/switch.
- NVS config: `device_id`, `broker_ip`, `wifi_ssid`, `wifi_pass` (compile-time defaults if absent).
- Physical switch inputs: GPIO interrupt → debounce → toggle relay → publish MQTT.
- Last-will: broker publishes `{"type":"relay","online":false}` on unexpected disconnect.
- State payload: `{"type":"relay","ch1":false,...,"chN":false}` — engine auto-registers device.
- Cmd payload: `{"ch1":true}` — any subset of channels, others unchanged.
- GPIO defaults (LC Technology boards): relays=16/17/18/19, switches=34/35/36/39, active-low.

---

## Key Technical Notes (lessons learned)

- **`go.bbclass` is GOPATH-mode only** — incompatible with Go 1.22+ which removed GOPATH mode. The `propertycore-engine` recipe uses `DEPENDS=go-native` and drives `go build` directly with `GOOS=linux GOARCH=arm64 CGO_ENABLED=0`. Do NOT use `inherit go` for new recipes.
- **`LAYERDEPENDS`** — must be `"core"` only (not `"core raspberrypi"`) so the layer works for both QEMU and RPi5 builds.
- **Hostname** — must be set in `propertycore.conf` as `hostname:pn-base-files`, not in the image recipe.
- **`INHIBIT_PACKAGE_STRIP=1`** — always set for Go binaries; stripping corrupts them.
- **git HTTP/2 failures** — if `git clone` fails with curl 92, run `git config --global http.version HTTP/1.1`.
- **QEMU SSH** — `runqemu qemuarm64 nographic slirp` → `ssh root@localhost -p 2222`
- **Go build in recipes** — always set `GOPROXY=off GOFLAGS="-mod=mod"`. The go-native binary path: `build-qemu/tmp/sysroots-components/x86_64/go-binary-native/usr/bin/go` (Go 1.22.12).
- **Pure stdlib only** — the engine uses zero external Go dependencies (`CGO_ENABLED=0`). Never add third-party imports.
- **BusyBox wget in QEMU** — no `--method=PATCH/DELETE`, no `python3` on image. Use `nc` for raw DELETE. Use hardcoded IDs in verification scripts.
- **`randomID()` not `newID()`** — ID generator is defined in `area.go` as `randomID()`. All managers call this function. Do not rename it.
- **Mutex + persist deadlock** — in `DeviceRegistry` (and any future manager), always release the write mutex BEFORE calling `persist()`. The `persist()` method calls `GetAll()` which takes an `RLock` — holding the write lock first will deadlock.
- **Atomic JSON writes** — `store.go` writes to a temp file then renames. Never write JSON directly to the target file.
- **QEMU restart race** — `systemctl restart && wget` will fail (connection refused). Always send restart and the subsequent request as separate SSH commands.
- **MQTT topic pattern** — devices publish to `propertycore/devices/{id}/state`. The engine subscribes to `propertycore/devices/+/state`. The engine publishes commands to `propertycore/devices/{id}/cmd`.
- **nginx PID path** — the upstream nginx systemd unit uses `PIDFile=/run/nginx/nginx.pid`. Our `nginx.conf` must use `pid /run/nginx/nginx.pid;` (not `/run/nginx.pid`). Add `RuntimeDirectory=nginx` via a systemd drop-in at `nginx.service.d/override.conf` so `/run/nginx/` exists before nginx starts. Declare `FILES:${PN} += "${systemd_system_unitdir}/nginx.service.d"` to avoid QA packaging errors.
- **QEMU background launch** — always use `runqemu qemuarm64 nographic slirp < /dev/null > /tmp/qemu.log 2>&1 &`. Without `< /dev/null`, the process gets `SIGTTIN` (stopped state `Tl`) when backgrounded because `-serial mon:stdio` tries to read stdin.
- **Local host dev (engine)** — build for amd64: `GOOS=linux GOARCH=amd64 CGO_ENABLED=0 GOPROXY=off GOFLAGS=-mod=mod GOCACHE=/tmp/go-cache HOME=/tmp $GO build -o /tmp/propertycore-engine .` (where `$GO` = Yocto's go-binary-native). Requires `/var/lib/propertycore/` owned by current user: `sudo mkdir -p /var/lib/propertycore && sudo chown $USER /var/lib/propertycore`. Mosquitto must be running on host: `sudo apt install mosquitto`.
- **pm2 on ThinkPad** — engine binary lives at `~/.local/bin/propertycore-engine` (not `/tmp/` — survives reboots). Dashboard Vite dev server runs from `dashboard/`. Both managed by pm2: `pm2 list` to check status. `pm2-syeed` systemd service auto-starts both on boot. After rebuilding the engine: `cp /tmp/propertycore-engine ~/.local/bin/propertycore-engine && pm2 restart propertycore-engine`. Dashboard runs on `:5173` (falls back to `:5174+` if port in use). Engine on `:8080`. Tailscale IP: `100.124.233.18`.
- **`area_id` not `room_id`** — the device metadata field was renamed from `room_id` to `area_id` in v0.11. All API payloads and engine structs use `area_id`.
- **Flutter `late` fields** — class fields initialized in a constructor body (not inline) must be declared `late`. Analyzer error `not_initialized_non_nullable_instance_field` means you need `late AppMode _appMode;` not `AppMode _appMode;`.
- **Flutter `.withValues(alpha:)` not `.withOpacity()`** — `.withOpacity()` is deprecated in Flutter 3.x. Always use `.withValues(alpha: 0.5)`.
- **Flutter `unawaited()`** — requires `import 'dart:async';`. Alternatively use `.ignore()` (Dart 3 API, no import needed).
- **Flutter path on this machine** — `~/flutter/bin/flutter` (extracted to `/home/syeed/flutter/`). Flutter 3.41.7 / Dart 3.11.5.
- **`flutter create` on existing dir** — `flutter create --project-name name --org com.org .` inside an existing dir generates platform scaffolding without overwriting `lib/` files. Run this once after writing Dart sources, then `flutter pub get`.
- **Read-only rootfs design** — `IMAGE_FEATURES+=read-only-rootfs` makes the rootfs immutable at build time. Writable data lives on a separate ext4 data partition mounted at `/data`. The `propertycore-persist` recipe provides `propertycore-data-init.service` — an early-boot oneshot that: (1) mounts the data partition (`/dev/nvme0n1p3` → `/dev/mmcblk0p3` → fallback tmpfs), (2) bind-mounts `/data/propertycore` over `/var/lib/propertycore`, (3) bind-mounts `/data/influxdb` over `/var/lib/influxdb`. In QEMU there is no data partition so tmpfs is used (data is volatile). Engine and influxdb systemd units `Requires=propertycore-data-init.service`.
- **InfluxDB arm64 SHA256** — correct verified hash: `a6e10c02d02db1a34cf662672004c0e42d6021a33cd16666b69d205736ee7f3c` (influxdb-1.8.10_linux_arm64.tar.gz). The recipe was initially created with a wrong hash because the download was cancelled at 36%.

---

## Key Reference Files

- `Docs/CONCEPT.md` — Full platform concept: architecture, software stack, relay server, inverter integration, 12 feature modules, 4 deployment profiles
- `Docs/PRODUCT-LIBRARY.md` — Full hardware catalog: 78 SKUs across 19 categories with sourcing strategy
- `Docs/UI-SCOPE.md` — All 4 UI surfaces fully scoped: Web Config Dashboard (35 sections), Mobile App, Wall Panel Kiosk, Smart Remote (v0.4)
- `Docs/inverter/deye 16kw.yaml` — DEYE inverter ESPHome YAML — source of truth for Modbus register map

---

## Team

Currently two people: the founder (Syeed) and GitHub Copilot (AI assistant). This is a concept-to-product project being built from the ground up — no external team yet.
