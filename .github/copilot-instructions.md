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
A production-grade embedded Linux image for the **Raspberry Pi 5** (PropertyCore Hub HC-1) using the **Yocto Project (Scarthgap / 5.0 LTS)**.

The OS image must:
- Boot in under 20 seconds
- Run as read-only rootfs (corruption-resistant for commercial deployment)
- Include all PropertyCore platform services pre-installed and auto-starting
- Support OTA (over-the-air) updates via Mender or RAUC
- Be reproducible — any engineer can rebuild the exact same image

### Build environment
- **Build machine:** ThinkPad P1 — Ubuntu 24.04 LTS, 12 cores, 32GB RAM, 233GB NVMe
- **Target hardware:** Raspberry Pi 5 (8GB) — cross-compiled on the ThinkPad
- **Yocto release:** Scarthgap (5.0 LTS)

### Project folder structure
```
~/projects/propertycore-os/
├── .github/
│   └── copilot-instructions.md   ← this file
├── poky/                          ← Yocto Poky reference (clone from yoctoproject.org)
├── meta-openembedded/             ← community OE layer collection
├── meta-raspberrypi/              ← Raspberry Pi 5 BSP layer
├── meta-propertycore/             ← PropertyCore custom layer (our work)
│   ├── conf/
│   │   ├── layer.conf
│   │   └── distro/propertycore.conf
│   └── recipes-propertycore/
│       ├── propertycore-engine/   ← Go automation engine
│       ├── mosquitto/             ← MQTT broker config
│       └── ...
├── build/                         ← BitBake build output (gitignored)
├── README.md
├── CONCEPT.md                     ← Full platform concept document
└── PRODUCT-LIBRARY.md             ← Full hardware product catalog (78 SKUs)
```

---

## Full Platform Software Stack

| Component | Technology | Role |
|---|---|---|
| Automation engine | **Go (Golang)** | Core logic, MQTT handler, scene engine, API server |
| Config dashboard | **React + TypeScript** | Installer/engineer web UI at `http://[hub-ip]/admin` |
| Mobile app | **Flutter (Dart)** | Guest/owner/tenant control app (Android + iOS) |
| Smart remote UI | **LVGL (C)** | UI for ESP32-S3 Smart Remote V1 |
| Device firmware | **ESP-IDF + FreeRTOS** | All ESP32-based modules (relays, AC gateways, etc.) |
| MQTT broker | **Mosquitto** | Embedded on hub — all ESP32 device communication |
| Database (config) | **SQLite** | Scenes, users, device config |
| Database (history) | **InfluxDB** | Time-series sensor and energy data |
| Surveillance | **FFmpeg + WebRTC** | RTSP ingestion, recording, live view |
| Media server | **Jellyfin** | Pre-installed on hub, reads from NAS |
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

**Current Yocto build target: PC-HUB-HC1 (Raspberry Pi 5)**

---

## Yocto Build Layers

| Layer | Source | Purpose |
|---|---|---|
| `poky` | https://git.yoctoproject.org/poky | Yocto reference distro (Scarthgap) |
| `meta-openembedded` | https://github.com/openembedded/meta-openembedded | Extended recipe collection |
| `meta-raspberrypi` | https://github.com/agherzan/meta-raspberrypi | Raspberry Pi BSP |
| `meta-propertycore` | This repo | PropertyCore platform layer |

---

## Current Build Phase

> Phase 1 — Foundation: Get a minimal Yocto image booting on Raspberry Pi 5

Steps:
- [ ] Install Yocto host dependencies on ThinkPad
- [ ] Clone Poky (Scarthgap branch)
- [ ] Clone meta-openembedded, meta-raspberrypi
- [ ] Create meta-propertycore layer skeleton
- [ ] Configure build (local.conf, bblayers.conf)
- [ ] First build — minimal image
- [ ] Flash to SD card and boot on Pi 5
- [ ] Verify serial console, SSH, read-only rootfs

---

## Key Reference Files

- `CONCEPT.md` — Full platform concept: architecture, software stack, relay server, inverter integration, 12 feature modules, 4 deployment profiles
- `PRODUCT-LIBRARY.md` — Full hardware catalog: 78 SKUs across 19 categories with sourcing strategy
- `inverter/deye 16kw.yaml` — DEYE inverter ESPHome YAML — source of truth for Modbus register map

---

## Team

Currently two people: the founder (Syeed) and GitHub Copilot (AI assistant). This is a concept-to-product project being built from the ground up — no external team yet.
