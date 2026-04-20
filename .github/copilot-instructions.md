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
│           │   ├── main.go          ← Go source (HTTP /health + /status, MQTT ping)
│           │   ├── go.mod           ← module github.com/propertycore/propertycore-engine
│           │   └── propertycore-engine.service  ← systemd unit
│           └── propertycore-engine_0.1.bb       ← Yocto recipe
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
> Phase 2 — Go Automation Engine: IN PROGRESS 🔄

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

### Phase 2 — Go Automation Engine (current focus)
The automation engine stub (`v0.1`) provides:
- HTTP `/health` and `/status` endpoints on `:8080`
- TCP ping to Mosquitto to confirm MQTT broker reachability

Next steps for the engine:
- [ ] MQTT client — subscribe to device topics, publish commands
- [ ] Device state manager — in-memory map of all device states
- [ ] WebSocket server — push state changes to connected UIs
- [ ] Scene engine — define and execute scenes (set of device actions)
- [ ] Rules engine — if/then automation rules with conditions
- [ ] SQLite integration — persist devices, scenes, users, rooms
- [ ] REST API — full CRUD for rooms, devices, scenes, users
- [ ] Scheduling engine — time-based scene triggers

### Phase 3 — Planned (not started)
- [ ] React config dashboard (engineer tool)
- [ ] Flutter mobile app (owner/guest control)
- [ ] ESP32 relay module firmware (PropertyCore firmware over OEM boards)
- [ ] InfluxDB recipe + time-series data pipeline
- [ ] Read-only rootfs + overlay
- [ ] OTA update mechanism (Mender or RAUC)
- [ ] RPi5 image verification on physical hardware

---

## Key Technical Notes (lessons learned)

- **`go.bbclass` is GOPATH-mode only** — incompatible with Go 1.22+ which removed GOPATH mode. The `propertycore-engine` recipe uses `DEPENDS=go-native` and drives `go build` directly with `GOOS=linux GOARCH=arm64 CGO_ENABLED=0`. Do NOT use `inherit go` for new recipes.
- **`LAYERDEPENDS`** — must be `"core"` only (not `"core raspberrypi"`) so the layer works for both QEMU and RPi5 builds.
- **Hostname** — must be set in `propertycore.conf` as `hostname:pn-base-files`, not in the image recipe.
- **`INHIBIT_PACKAGE_STRIP=1`** — always set for Go binaries; stripping corrupts them.
- **git HTTP/2 failures** — if `git clone` fails with curl 92, run `git config --global http.version HTTP/1.1`.
- **QEMU SSH** — `runqemu qemuarm64 nographic slirp` → `ssh root@localhost -p 2222`

---

## Key Reference Files

- `Docs/CONCEPT.md` — Full platform concept: architecture, software stack, relay server, inverter integration, 12 feature modules, 4 deployment profiles
- `Docs/PRODUCT-LIBRARY.md` — Full hardware catalog: 78 SKUs across 19 categories with sourcing strategy
- `Docs/UI-SCOPE.md` — All 4 UI surfaces fully scoped: Web Config Dashboard (35 sections), Mobile App, Wall Panel Kiosk, Smart Remote (v0.4)
- `Docs/inverter/deye 16kw.yaml` — DEYE inverter ESPHome YAML — source of truth for Modbus register map

---

## Team

Currently two people: the founder (Syeed) and GitHub Copilot (AI assistant). This is a concept-to-product project being built from the ground up — no external team yet.
