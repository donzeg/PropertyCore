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
│           │   ├── main.go          ← Engine entry point — wires all components, v0.9.0
│           │   ├── state.go         ← StateManager — ephemeral in-memory device state
│           │   ├── device.go        ← DeviceRegistry — persistent device metadata
│           │   ├── mqtt.go          ← MQTTClient — subscribe/publish over Mosquitto
│           │   ├── ws.go            ← WSHub — RFC 6455 WebSocket server
│           │   ├── scene.go         ← SceneManager — CRUD + execute
│           │   ├── rule.go          ← RulesEngine — if/then automation rules
│           │   ├── room.go          ← RoomManager — room CRUD (also defines randomID())
│           │   ├── user.go          ← UserManager — user CRUD with roles (owner/admin/guest)
│           │   ├── scheduler.go     ← ScheduleManager — time-based scene triggers
│           │   ├── store.go         ← Store — JSON persistence to /var/lib/propertycore/
│           │   ├── api.go           ← HTTP handlers for all REST endpoints
│           │   ├── go.mod           ← module github.com/propertycore/propertycore-engine
│           │   └── propertycore-engine.service  ← systemd unit (StateDirectory=propertycore)
│           ├── propertycore-engine_0.1.bb  ← v0.1 recipe (archived)
│           ├── ...                         ← v0.2 – v0.8 recipes (archived)
│           └── propertycore-engine_0.9.bb  ← current active recipe
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
│           ├── Rooms.tsx            ← Room CRUD (also exports shared primitives: Table, Field, etc.)
│           ├── Devices.tsx          ← Device list, room assignment, live state preview
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

Engine reached v0.9.0 (commit `96f557a`). All components built, Yocto-packaged, and verified in QEMU.

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
- `GET|POST /api/v1/rooms` — room CRUD
- `GET|PATCH|DELETE /api/v1/rooms/{id}` — single room
- `GET|POST /api/v1/users` — user CRUD (roles: owner/admin/guest, PIN omitted from API)
- `GET|PATCH|DELETE /api/v1/users/{id}` — single user
- `GET|POST /api/v1/schedules` — schedule CRUD
- `GET|PATCH|DELETE /api/v1/schedules/{id}` — single schedule
- `POST /api/v1/schedules/{id}/enable|disable`
- `GET /ws` — WebSocket endpoint (broadcasts device state changes)

**Persistence** — JSON files in `/var/lib/propertycore/`:
`scenes.json`, `rules.json`, `rooms.json`, `users.json`, `schedules.json`, `devices.json`

### Phase 3 — UIs, Firmware & OS Hardening (current focus)
- [x] ESP32 relay firmware — `firmware/pc-rly-wifi/` (PC-RLY-1/2/4/6CH-W)
- [x] React config dashboard v0.1 — `dashboard/` (Vite + React + TypeScript + Tailwind)
- [x] Yocto recipe — nginx + `propertycore-dashboard` recipe serves dashboard at `/admin`
- [ ] Flutter mobile app (owner/guest control)
- [ ] InfluxDB recipe + time-series data pipeline
- [ ] Read-only rootfs + overlay
- [ ] OTA update mechanism (Mender or RAUC)
- [ ] RPi5 image verification on physical hardware

**Dashboard v0.1 (`dashboard/`):**
- Vite 5 + React 18 + TypeScript + Tailwind CSS v3.
- Served at `http://[hub-ip]/admin` (base path `/admin/`).
- Dev: `cd dashboard && npm install && npm run dev` (proxy → engine :8080).
- Build: `npm run build` → `dist/` (static files for nginx or engine to serve).
- Implements UI-SCOPE sections backed by current engine API:
  - Overview (§2): /status, WS live updates, resource counts
  - Rooms (§4): CRUD with floor assignment
  - Devices (§5): list, room assignment, online badge, live state preview
  - Scenes (§13a): CRUD + execute button
  - Rules (§13b): CRUD + enable/disable toggle
  - Schedules (§13c): CRUD + enable/disable toggle
  - Users (§21): CRUD (owner/admin/guest, PIN)
  - All other §(1, 6–12, 14–20, 22–35) show as "Coming soon" stubs in sidebar.

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
- **`randomID()` not `newID()`** — ID generator is defined in `room.go` as `randomID()`. All managers call this function. Do not rename it.
- **Mutex + persist deadlock** — in `DeviceRegistry` (and any future manager), always release the write mutex BEFORE calling `persist()`. The `persist()` method calls `GetAll()` which takes an `RLock` — holding the write lock first will deadlock.
- **Atomic JSON writes** — `store.go` writes to a temp file then renames. Never write JSON directly to the target file.
- **QEMU restart race** — `systemctl restart && wget` will fail (connection refused). Always send restart and the subsequent request as separate SSH commands.
- **MQTT topic pattern** — devices publish to `propertycore/devices/{id}/state`. The engine subscribes to `propertycore/devices/+/state`. The engine publishes commands to `propertycore/devices/{id}/cmd`.

---

## Key Reference Files

- `Docs/CONCEPT.md` — Full platform concept: architecture, software stack, relay server, inverter integration, 12 feature modules, 4 deployment profiles
- `Docs/PRODUCT-LIBRARY.md` — Full hardware catalog: 78 SKUs across 19 categories with sourcing strategy
- `Docs/UI-SCOPE.md` — All 4 UI surfaces fully scoped: Web Config Dashboard (35 sections), Mobile App, Wall Panel Kiosk, Smart Remote (v0.4)
- `Docs/inverter/deye 16kw.yaml` — DEYE inverter ESPHome YAML — source of truth for Modbus register map

---

## Team

Currently two people: the founder (Syeed) and GitHub Copilot (AI assistant). This is a concept-to-product project being built from the ground up — no external team yet.
