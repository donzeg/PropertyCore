# PropertyCore — Full Concept Document

> Version 0.1 — April 2026  
> Status: Concept / Pre-build

---

## 1. Vision Statement

Build a stable, engineer-deployed smart property automation **platform** with a proprietary **hardware ecosystem** — designed specifically for African commercial and residential properties: hotels, estates, apartments, offices.

The product is two things working as one:
- **PropertyCore Platform** — software installed on-site, managing all devices, automation logic, multimedia routing, and the guest/tenant/operations experience
- **PropertyCore Devices** — branded hardware modules (wall switches, dimmers, relay boards, AC gateways, wall panels, smart remotes) running PropertyCore firmware, sourced initially from OEM bare boards and reflashed

References: Control4 (Director + SR remotes), HDL Buspro (bus controller + modules), KNX (ETS software + certified modules), Loxone (Miniserver + extensions)

The ecosystem owns: firmware, controller software, mobile app, hardware branding, installation model, and support.

---

## 2. Core Philosophy

### Platform + Device Ecosystem
PropertyCore is not Home Assistant (open platform, any hardware). It is not a dumb appliance either. It is a **controlled commercial platform** paired with a **proprietary device ecosystem** — exactly how Control4, HDL, and KNX operate. The platform is deployed by a trained engineer and configured for each property. The devices only function when paired to a PropertyCore platform instance.

### Engineer-Deployed, Not DIY
Customers do not install PropertyCore. A certified PropertyCore engineer deploys it, configures it, and hands over a working system. This is the same model as Control4 dealers and HDL integrators. It creates a support relationship and recurring revenue.

### OEM Hardware + Custom Firmware
PropertyCore does not manufacture PCBs from scratch initially. The Shenzhen OEM ecosystem produces bare boards for wall switches, dimmers, relay modules, AC controllers, and wall panels. Many Tuya-branded products are the same physical board sold under different names. PropertyCore sources these bare boards, flashes them with custom PropertyCore firmware, and brands them. Over time, custom PCB designs are developed for differentiated products. This is standard practice among KNX module vendors and smart home hardware brands globally.

### Local-first
All automation logic runs on the on-site PropertyCore Hub. Internet connectivity is optional — used only for remote access, notifications, and cloud backups. Power outage or ISP failure does not break any room automation.

### Firmware Pairing as a Commercial Moat
PropertyCore device firmware speaks only to a registered PropertyCore Hub. The Hub only accepts commands from certified PropertyCore devices. No third-party app, no competing remote, no HomeAssistant instance can pair with PropertyCore hardware. This is the same lock-in strategy Control4 and Crestron use — it is reliability engineering and commercial strategy at the same time.
 h
---

## 3. System Architecture

The system has three tiers: the cloud relay layer, the on-site hub layer, and the device layer. The hub is the brain. The cloud relay is a thin router. Devices are dumb endpoints.

```
┌──────────────────────────────────────────────────────────────┐
│              PROPERTYCORE RELAY SERVER (your VPS)            │
│                                                              │
│  ┌─────────────────────┐  ┌──────────────────────────────┐  │
│  │ Hub Connection Mgr  │  │ App / Voice API Handler      │  │
│  │ - Authenticates hub │  │ - Alexa Skill endpoint       │  │
│  │ - Holds persistent  │  │ - Google Action endpoint     │  │
│  │   outbound tunnel   │◄►│ - Owner app WebSocket        │  │
│  │ - Routes by site ID │  │ - Remote config / support    │  │
│  └─────────────────────┘  │ - OTA firmware delivery      │  │
│                           └──────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ WebRTC Signalling (TURN/STUN) — camera peer-to-peer     │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Account & Auth Service — sites, users, device certs     │ │
│  └─────────────────────────────────────────────────────────┘ │
└───────────────────────────┬──────────────────────────────────┘
                            │ Persistent outbound tunnel (hub dials out)
                            │ HTTPS + WebSocket + WireGuard
┌───────────────────────────▼──────────────────────────────────┐
│              PROPERTYCORE HUB  (on-site box)                 │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              AUTOMATION ENGINE (Go)                    │  │
│  │  - Device state manager       - Rules & scene engine   │  │
│  │  - Event processor            - Scheduling engine      │  │
│  │  - MQTT broker (Mosquitto)    - OTA update manager     │  │
│  │  - Local REST + WebSocket API - Multimedia router      │  │
│  │  - FFmpeg pipeline (cameras)  - Relay tunnel client    │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────┐  ┌───────────────┐  ┌──────────────┐  │
│  │ SQLite           │  │ InfluxDB      │  │ File system  │  │
│  │ Config / users / │  │ Sensor data / │  │ Camera       │  │
│  │ scenes / devices │  │ energy history│  │ recordings   │  │
│  └──────────────────┘  └───────────────┘  └──────────────┘  │
│                                                              │
│  OS: Embedded Linux  |  Docker containers  |  Read-only root │
└───┬──────────┬──────────┬──────────┬──────────┬─────────────┘
    │          │          │          │          │
 Zigbee     Wi-Fi      RS485      IR Bridge  Ethernet
 Gateway    Devices    Modbus     (AC/TV)    (IP cameras
    │          │          │          │         smart locks)
 Switches  ESP32       Meters   IR Blaster  IP Cameras
 Sensors   Relays    Industrial  AC Gateway  Smart Locks
 Remotes   AC mods    Sensors               Gate Ctrl
```

**UI Layer (served from Hub locally, accessed via Relay remotely)**

```
┌────────────────┐  ┌──────────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Mobile App    │  │  Web Config Dashboard │  │  Wall Panel     │  │  Smart Remote   │
│  (Flutter)     │  │  (React + TypeScript) │  │  (Flutter kiosk)│  │  (LVGL V1 /     │
│                │  │                       │  │                 │  │  Flutter V2)    │
│  Guest/owner   │  │  Installer/engineer   │  │  In-room guest  │  │  Handheld       │
│  room control  │  │  tool — not for       │  │  wall-mounted   │  │  remote UI      │
│  surveillance  │  │  end customers        │  │  controller     │  │  (per room)     │
│  scenes, locks │  │                       │  │                 │  │                 │
└───────┬────────┘  └──────────┬────────────┘  └────────┬────────┘  └────────┬────────┘
        │                      │                         │                    │
        └──────────────────────┴─────────────────────────┴────────────────────┘
                               │
                    WebSocket (local) or
                    Relay tunnel (remote)
                               │
                    PropertyCore Hub
```

---

## 4. Device Ecosystem (Planned)

### Hardware Sourcing Model
Two categories of PropertyCore hardware:

**OEM-sourced (short term):** Buy bare boards from Shenzhen OEM manufacturers. These are the same boards under many Tuya/Moes/Sonoff-type brand names. Flash with PropertyCore firmware. Rebrand. Certify locally. Sell as PropertyCore hardware.

**Custom-designed (medium/long term):** For products where no good OEM board exists or where differentiation matters — smart remote, hub, wall panel form factor — design original PCBs. Use ESP32, STM32, or ARM SoC depending on product.

Target OEM categories available today: 2/4/6-gang switch modules, dimmer boards, curtain/blind controllers, IR AC gateways, thermostat controllers, in-wall relay modules, 4–7" wall panel tablets.

---

### 4.1 PropertyCore Hub
The central controller. A branded box installed in a wall cabinet, server room, or electrical panel enclosure. The customer never interacts with the OS or hardware — they interact only with the mobile app. The engineer configures via the web dashboard.

#### Hub SKU Tiers

| SKU | Target Property | Rooms | Cameras | Devices | SBC |
|---|---|---|---|---|---|
| HC-1 | Single apartment / small home | 1–6 | Up to 4 | Up to 30 | Raspberry Pi 5 (8GB) |
| HC-3 | Large home / boutique hotel | 6–20 | Up to 16 | Up to 150 | Pi CM5 + custom carrier |
| HC-Pro | Estate / hotel / commercial building | 20–100+ | Up to 64 | Up to 500 | Rockchip RK3588 board |
| HC-AV | Premium home / home theater / estate AV | 6–30 | Up to 16 | Up to 200 | RK3588 + integrated AV carrier |

#### SBC Selection Rationale

**HC-1 — Raspberry Pi 5 (8GB)**
- Quad-core ARM Cortex-A76 @ 2.4GHz — significantly faster than Pi 4
- 8GB RAM — comfortable headroom for automation engine + InfluxDB + 4 camera FFmpeg pipelines
- PCIe slot — allows NVMe SSD via HAT (fast, reliable storage vs SD card)
- USB 3.0, Gigabit Ethernet
- Well-supported, easy to source in Nigeria and globally
- Suitable for prototyping and early commercial units
- Limitation: not industrial grade; must use NVMe (not SD card) in production
- **Enclosure:** Compact slim chassis (half-1U or small DIN-mountable box). Does not require a full rack cabinet — suitable for apartments where a dedicated comms room is not present. Can be wall-mounted or shelf-mounted.

**HC-3 — Raspberry Pi Compute Module 5 + Custom Carrier Board**
- Same CM5 chip as Pi 5, industrial form factor
- Goes onto a PropertyCore-designed carrier board
- Carrier board adds: PoE input, RS485 port, Zigbee radio (CC2652), UPS battery management, DIN rail mount, surge protection, status LEDs, RTC
- Customers see a **PropertyCore HC-3** branded box — not a Raspberry Pi
- This is the correct production form factor for a commercial product
- **Enclosure:** 1U rack-mount chassis (19" rack standard — approx. 44mm H × 440mm W). Installs in the property comms cabinet alongside network switch, patch panel, and NAS. This is the standard form factor for commercial AV/automation hardware (Control4 CA-1 baseline: 42.9mm H × 442mm W).

**HC-Pro — Rockchip RK3588 (e.g., FriendlyElec CM3588 or Orange Pi 5 Pro)**
- Octa-core ARM, 8–16GB RAM
- Built-in NPU (Neural Processing Unit) — enables on-device AI: person detection, face recognition on camera streams without a GPU
- Hardware H.264/H.265 video encode/decode — handles 8–16 simultaneous camera streams efficiently
- Suitable for large hotels, estates, commercial buildings
- Future AI feature platform: smart motion zones, occupancy analytics, anomaly detection
- **Enclosure:** 1U rack-mount chassis (19" rack standard). Installed in server room or dedicated comms cabinet in large properties. In cascade deployments, each satellite hub also uses a 1U chassis in its floor/zone cabinet.

#### What Goes Inside Every Hub (Beyond the SBC)

- **Zigbee coordinator** — CC2652P (soldered to carrier board on HC-3/Pro; USB dongle on HC-1)
- **RTC (Real-Time Clock)** — maintains accurate time through power cuts; critical for scheduling and automation rules
- **UPS circuit** — supercapacitor or small LiPo + charging IC; survives brief power blips, triggers clean shutdown on extended outages. Non-negotiable for Nigerian power conditions.
- **Surge protection** on power input — MOV + TVS diode on 12V input rail
- **Status LED indicators** — power, network, device activity, storage status on front face
- **Gigabit Ethernet** — wired connection preferred for hub; Wi-Fi as fallback
- **USB 3.0 ports** — service access, external USB storage (HC-1 tier)
- **12V DC input** — powered from standard wall adapter or DIN rail PSU
- **Passive cooling** — no fan where possible; fan = noise + failure point. Thermal design in enclosure handles it.
- **DIN rail mount option** — fits inside standard electrical panel cabinet

#### Storage Architecture

The hub uses a **two-tier storage model**: lean onboard storage for application data and short-term camera buffer, with bulk storage offloaded to an external NAS or USB drive.

**Onboard (NVMe SSD — inside the hub):**

| Data | HC-1 | HC-3 | HC-Pro |
|---|---|---|---|
| OS + application stack | 32GB | 32GB | 64GB |
| Config DB (SQLite) | included | included | included |
| Sensor/energy history (InfluxDB) | included | included | included |
| Camera short-term rolling buffer | ~64–128GB | ~128–256GB | ~256–512GB |
| **Total NVMe** | **256GB** | **256–512GB** | **512GB** |

No hub tier exceeds 512GB onboard. Bulk storage is never onboard.

**External Storage (NAS or USB drive):**

| Use Case | Storage Target |
|---|---|
| Camera long-term archive (days/weeks of footage) | NAS (SMB/NFS mount) |
| Media library — movies, music, property content | NAS |
| Jellyfin media server content | NAS |
| Backup of hub config + scene data | NAS |

The hub's FFmpeg recording pipelines write directly to a network-mounted NAS path. If the NAS goes offline, recording pauses gracefully — automation (lights, AC, scenes) continues unaffected. The separation of storage from automation is a deliberate reliability decision.

**Supported External Storage Options:**

| Option | Tier | Notes |
|---|---|---|
| USB 3.0 external drive | HC-1 | Simple, low cost, no NAS needed for small deployments |
| Synology DS223 / DS423 | HC-3 | Plug-and-play NAS, excellent reliability for hotels/estates |
| QNAP equivalent | HC-3 | Similar to Synology |
| TrueNAS (mini PC + drives) | HC-Pro | Cost-effective at scale for large buildings |

The PropertyCore configuration dashboard includes a **Storage Settings** screen where the installer enters the NAS IP address and credentials once during setup. All storage paths are configured automatically from there.

#### Built-in Media Server (Jellyfin)

The PropertyCore Hub ships with **Jellyfin** pre-installed as part of the platform image. Jellyfin is fully open source with no licensing cost and no cloud dependency — it runs entirely on the hub, reads content from the NAS, and streams to any device on the local network.

This enables:
- Hotel rooms streaming movies and music from a single local server — no internet, no streaming subscription
- Property promotional content pushed to wall panels and room TVs
- Music zones throughout an estate or hotel
- DLNA-compatible TV apps, Jellyfin native apps, and the PropertyCore mobile app all serve as clients

**This is a genuine hospitality differentiator** — especially in markets where internet reliability is inconsistent. The property's entertainment content is entirely self-contained and does not depend on the internet for delivery.

Jellyfin is configured by the engineer during installation. Content is stored on the NAS. The hub handles transcoding to match each device's capability.

---

#### HC-AV — Integrated AV Controller Hub

The HC-AV is a premium hub variant targeting properties where audio/video distribution is a primary requirement: home theaters, estates with outdoor speaker zones, hotel lobbies with video walls, and luxury homes with multi-room AV.

**The concept:** Control4's CORE 5 bundles multi-zone audio streaming directly into the controller. PropertyCore can achieve the same — and go further — by working with a Shenzhen OEM/ODM manufacturer to produce a custom carrier board for the RK3588 that integrates amplifier modules, HDMI matrix silicon, and AV I/O ports directly on the same platform. The customer and engineer see one branded box that is simultaneously the automation hub and the AV matrix.

**Target use cases:**
- Home theater: projector + 7.1 surround amp, controlled from PropertyCore remote
- Estate outdoor: 4–8 zones of weatherproof speakers driven by onboard Class D amp channels
- Home video wall: multiple HDMI outputs driving a 2×2 or 3×3 display matrix
- Hotel lobby / restaurant: background music zones + TV/display control from one unit

**Planned Hardware Specification:**

| Component | Implementation |
|---|---|
| Compute | Rockchip RK3588 SoC (same as HC-Pro) |
| Audio amp | 8-zone Class D — TAS5805M per zone (or TPA3251 for higher power) |
| Audio outputs | 8× stereo binding post / Euroblock per zone |
| Audio inputs | 2× balanced XLR/TRS line in, 1× optical S/PDIF in |
| HDMI outputs | 4–8× HDMI 2.0 out (video wall / zone distribution) |
| HDMI inputs | 2–4× HDMI 2.0 in (sources: media players, streaming boxes) |
| HDMI matrix | Lontium LT8641 or equivalent matrix switch silicon |
| Projector control | RS232 (PJLINK protocol) + IR |
| RS485 | Modbus for energy meters and inverter (same as HC-Pro) |
| Zigbee | CC2652P radio (onboard) |
| Ethernet | 2.5GbE (media-heavy workload benefits from bandwidth) |
| Form factor | 2U rack-mount chassis (standard 19" rack) |
| Power | 12–19V DC, suitable for DIN rail PSU in AV rack |

**Audio zone control via PropertyCore:**
- Each amp channel is a named audio zone: "Living Room," "Pool," "Master Bedroom," "Garden"
- Source selection per zone: Spotify Connect (librespot), AirPlay (shairport-sync), local Jellyfin music, internet radio
- Volume, EQ, and grouping controlled from mobile app, wall panel, or smart remote
- Snapcast handles perfect synchronisation across zones (no echo in adjacent rooms)
- Multi-zone audio scenes: "Party Mode" → pool + garden + living room all play same source at full volume; "Night Mode" → master bedroom zone at 20%

**HDMI distribution:**
- HDMI matrix routes any input source to any output display
- Use cases: one media player to four rooms, laptop screen to projector, security camera on lobby TV
- Controlled from PropertyCore engine — source/output switching exposed as scenes and rules
- HDMI-CEC commands forwarded to all connected displays (power on/off, volume)
- Video wall mode: single 4K source scaled and distributed across multiple screens (requires supported display wall controller add-on)

**Projector integration (home theater):**
- RS232 PJLINK commands: power on/off, input select, lens control
- Scene: "Movie Mode" → lower screen → dim lights to 10% → power on projector → select HDMI 1 → set AC to 20°C silent mode
- Automation: projector idle 30min → power off → raise screen

**OEM/ODM path:**
This is a Year 2–3 product. The approach mirrors the HC-3 custom carrier board but at full AV-rack scale:
1. Engage an RK3588 board manufacturer (FriendlyElec, Geniatech, or Shenzhen ODM) for a carrier board design
2. Specify the HDMI matrix silicon, amp module headers, and I/O panel
3. PropertyCore provides the firmware (Yocto image) and AV engine driver layer
4. Enclosure: standard 2U aluminum rack chassis, custom front panel with PropertyCore branding

The amp modules (TAS5805M evaluation boards → production modules) and HDMI matrix board are sourced separately and integrated onto the carrier. This is standard ODM practice in the AV integration industry.

**Software additions required:**
The PropertyCore automation engine needs AV-specific drivers:
- Multi-zone amp driver (I2C to TAS5805M per zone — volume, EQ, mute, grouping)
- HDMI matrix driver (I2C/SPI to LT8641 — input/output routing, EDID management)
- PJLINK driver (RS232 projector control)
- Audio zone scene engine (source routing, Snapcast zone management)

These extend the existing engine without changing its architecture — additional device type handlers in the same MQTT/state-manager pattern.

---

#### Multi-Hub Cascade (Large Deployments)

For very large properties — hotels with multiple floors, large commercial estates, multi-building compounds — a single hub reaches its device limit or introduces unacceptable latency for devices far from the central unit. PropertyCore supports a **cascaded multi-hub deployment** for these cases.

**Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│              PRIMARY HUB (HC-Pro / HC-AV)                   │
│              Central server room / IT room                   │
│                                                              │
│  - Runs full automation engine (scenes, rules, schedules)   │
│  - Hosts MQTT broker — all satellite hubs connect here      │
│  - Hosts REST API + WebSocket server — all UIs connect here │
│  - Single source of truth for all device state              │
│  - Relay server connection — one outbound tunnel per site   │
└───────────────────────────┬─────────────────────────────────┘
                            │ LAN (Ethernet)
          ┌─────────────────┼─────────────────┐
          │                 │                 │
┌─────────▼──────┐  ┌───────▼────────┐  ┌────▼───────────┐
│ SATELLITE HUB  │  │ SATELLITE HUB  │  │ SATELLITE HUB  │
│  Floor 1       │  │  Floor 2       │  │  Pool / Garden │
│  (HC-3)        │  │  (HC-3)        │  │  (HC-1)        │
│                │  │                │  │                │
│ Local MQTT     │  │ Local MQTT     │  │ Local MQTT     │
│ bridge agent   │  │ bridge agent   │  │ bridge agent   │
│                │  │                │  │                │
│ Floor 1 relays │  │ Floor 2 relays │  │ Pool pump      │
│ Floor 1 ACs    │  │ Floor 2 ACs    │  │ Garden lights  │
│ Floor 1 cameras│  │ Floor 2 cameras│  │ Outdoor ACs    │
└────────────────┘  └────────────────┘  └────────────────┘
```

**How it works:**
- Each satellite hub runs a **lightweight MQTT bridge agent** — not the full automation engine
- The bridge agent connects all local devices to the primary hub's MQTT broker over LAN
- Devices publish their state to the local MQTT instance; the bridge forwards to the primary hub
- The primary hub issues commands; the bridge delivers them to local devices
- To all connected UIs (app, wall panels, dashboard), the entire installation appears as a **single unified system** — no awareness of satellite boundaries

**Why cascading is better than one big hub:**
- **Local latency** — a light switch on floor 3 is controlled by the floor 3 satellite's local MQTT, not a round trip to the server room
- **Resilience** — if the primary hub reboots, satellite hubs continue to operate their local devices; local scenes and schedules still run
- **Scale without redesign** — adding a new wing = deploy a new satellite hub, connect to LAN, register with primary
- **Physical wiring** — each satellite hub sits in the electrical panel of its floor/zone, close to the devices it manages

**Deployment scenarios:**
| Property | Primary | Satellites |
|---|---|---|
| Hotel (8 floors) | HC-Pro in server room | HC-3 per floor (8 units) |
| Large estate (main + 3 annexes) | HC-AV in main house | HC-1 per annex |
| Office building (4 wings) | HC-Pro in comms room | HC-1 per wing |

**Current status:** Cascade deployment is a **Phase 3 feature**. The engine architecture will be designed from Phase 2 to accommodate it (MQTT bridge pattern, device namespace by hub ID) so no rework is required when it ships.

---

### 4.2 Smart Switch / Relay Modules (Lighting / Power)
Initially sourced as OEM bare boards (2, 4, 6 channel variants are widely available), flashed with PropertyCore firmware.

- 1, 2, 4, 6 channel variants
- Wi-Fi or Zigbee connected to Hub
- Physical switch override always works (safety requirement)
- PropertyCore firmware replaces vendor firmware (ESP-IDF based)
- Tested for Nigerian 240V / 50Hz wiring standards
- Future: custom PCB design for PropertyCore-specific form factors
- Target OEM source: ESP32-based bare relay boards (widely available, $3–8 per channel at volume)

### 4.3 AC Gateway Module
Controls split-unit air conditioners via IR + monitoring.

- IR blaster with feedback
- Temperature + humidity sensor
- Current clamp (AC consumption monitoring)
- Supports: Hisense, LG, Samsung, Panasonic, Daikin, Midea, Gree, Haier, Aux
- Works even if AC remote is lost

### 4.4 Energy Monitoring — Meters + Inverter System

PropertyCore treats energy as a first-class feature, not an afterthought. The energy module covers two sources: per-circuit metering and solar/battery inverter systems.

#### 4.4.1 Per-Circuit Energy Meters
Real-time power monitoring at the circuit or room level.

- RS485 / Modbus RTU interface to Hub
- Per-room or per-floor power tracking
- Generator vs utility source detection
- Supports load shedding automation logic
- Compatible with standard DIN-rail CT clamp energy meters (DTSU666, DDSU666, and equivalents)

#### 4.4.2 Inverter Integration — DEYE + Compatible Brands

PropertyCore supports direct integration with solar hybrid inverters. The first supported brand is **DEYE** (16kW and compatible models), with the register map validated against a live installation. The same Modbus layer extends to Growatt, Sofar, Goodwe, and Victron (which also uses Modbus).

**Communication Method**

Two integration paths are supported:

| Path | Method | When to Use |
|---|---|---|
| **Native RS485** | Hub RS485 port → inverter directly, Go Modbus driver | Production deployments — no extra hardware |
| **ESP32 Bridge** | ESP32 reads RS485 → publishes to MQTT → Hub subscribes | MVP / existing ESPHome installations |

For MVP, the ESP32 bridge path reuses existing ESPHome YAML configurations already validated on DEYE hardware. For production, the PropertyCore Hub reads the inverter directly via its onboard RS485 port using a native Go Modbus driver built from the same validated register map.

**Note on Solarman Wi-Fi Dongle:** The LSW-3 dongle that ships with DEYE units primarily communicates via the Solarman cloud. While it exposes a local TCP port (8899) that can be read without cloud access, this is a reverse-engineered interface that DEYE/Solarman can silently break with firmware updates. PropertyCore does not rely on it. RS485 direct connection is the supported and guaranteed method.

**Data Points Collected (DEYE 16kW Register Map)**

*Battery*
| Register | Data Point | Unit |
|---|---|---|
| 184 | Battery SOC | % |
| 183 | Battery Voltage | V |
| 191 | Battery Current | A |
| 190 | Battery Power (charge/discharge) | W |
| 182 | Battery Temperature | °C |
| 70/71 | Day Battery Charge / Discharge | kWh |
| 72/74 | Total Battery Charge / Discharge | kWh |
| 217–222 | Shutdown / restart / low thresholds | % / V |
| 314/315 | Charge / Discharge limit current | A |

*Solar PV*
| Register | Data Point | Unit |
|---|---|---|
| 186/187/188 | PV1 / PV2 / PV3 Power | W |
| 109/111/113 | PV1 / PV2 / PV3 Voltage | V |
| 110/112/114 | PV1 / PV2 / PV3 Current | A |
| Template | Total Solar Power (PV1+PV2+PV3) | W |
| 108 | Day PV Energy | kWh |
| 96 | Total PV Energy | kWh |

*Grid*
| Register | Data Point | Unit |
|---|---|---|
| 150 | Grid Voltage | V |
| 160 | Grid Current | A |
| 79 | Grid Frequency | Hz |
| 169/167/168 | Grid Power (total / L1 / L2) | W |
| 172 | Grid CT Power (import/export) | W |
| 76/77 | Day Grid Import / Export | kWh |
| 78/81 | Total Grid Import / Export | kWh |
| 194 | Grid Connected Status | binary |

*Load*
| Register | Data Point | Unit |
|---|---|---|
| 178 | Total Load Power | W |
| 176/177 | Load L1 / L2 Power | W |
| 192 | Load Frequency | Hz |
| 84 | Day Load Energy | kWh |
| 85 | Total Load Energy | kWh |
| Template | Essential Power | W |
| Template | Non-Essential Power | W |

*Inverter Health*
| Register | Data Point | Unit |
|---|---|---|
| 175 | Inverter Power | W |
| 154 | Inverter Voltage | V |
| 164 | Inverter Current | A |
| 193 | Inverter Frequency | Hz |
| 90 | DC Transformer Temperature | °C |
| 91 | Radiator Temperature | °C |
| 166 | AUX Power | W |

*Work Mode & Status*
| Register | Data Point |
|---|---|
| 280 | Grid / Gen Peak Shaving Status |
| 22–24 | Inverter RTC (time sync) |

**Automation Capabilities Using Inverter Data**

This is where PropertyCore becomes genuinely intelligent for African properties. The automation engine acts on live inverter data:

- **Low battery load shedding** — battery SOC drops below 20% between 11pm–6am → turn off non-essential loads (pool pump, decorative lighting, EV charger)
- **Grid restoration detection** — grid returns → restore loads, send push notification to owner
- **Load shedding AC logic** — grid fails → raise AC setpoints by 2°C to reduce battery draw
- **Solar surplus utilisation** — battery full + PV generating excess → enable high-consumption devices (water heater, EV charger)
- **Generator interlock signal** — battery critically low + grid absent → trigger generator start relay
- **Inverter fault alerting** — temperature threshold exceeded or fault code detected → push notification to owner and engineer

**Dashboard: Energy Flow Diagram**

The PropertyCore web dashboard and mobile app display a real-time animated energy flow diagram showing the live relationship between:

```
[ Solar PV ] ──→ [ Inverter ] ──→ [ Load ]
                      ↕                ↑
                [ Battery ]     [ Grid / Gen ]
```

Values update every 15 seconds (configurable). Historical charts (daily/weekly/monthly) are stored in InfluxDB and visualised in the dashboard.

**Supported Inverter Brands (Planned)**
| Brand | Protocol | Status |
|---|---|---|
| DEYE (all hybrid models) | Modbus RTU RS485 | Primary — register map validated |
| Growatt | Modbus RTU RS485 | Planned |
| Sofar Solar | Modbus RTU RS485 | Planned |
| Goodwe | Modbus RTU RS485 | Planned |
| Victron (MultiPlus, Quattro) | Modbus TCP / VE.Bus | Planned |
| Sunsynk | Modbus RTU RS485 | Planned (shares DEYE register map) |

### 4.5 Smart Remote (Control4-Style)
Handheld premium property remote. See [remote-concept/](./remote-concept/).

**V1 — ESP32 Based**
- ESP32-S3 microcontroller
- 3.5" IPS touchscreen (LVGL UI)
- Physical tactile buttons (6–8)
- 2000mAh Li-ion, USB-C charging
- Magnetic charging dock
- IR blaster (TV/AV control)
- Vibration motor
- Wi-Fi + BLE
- Wake-on-pickup (accelerometer)
- FreeRTOS + LVGL
- OTA firmware updates

**V2 — Linux Based (future)**
- ARM SoC + 4.7" display
- Embedded Linux
- Flutter UI
- SIP calling (intercom)
- Camera feed preview
- Higher cost, hotel suite tier

### 4.6 Wall Panel
Flush-mounted touchscreen controller per room.

- 4", 7", or 10" capacitive IPS display
- Shows: scene buttons, AC status, lights, DND/MUR (Do Not Disturb / Make Up Room), media controls, doorbell/intercom
- Replaces traditional hotel room panel
- **PoE powered** — no separate power cable needed; single Ethernet cable handles data and power
- **OEM sourcing:** Many Chinese manufacturers sell bare Android or Linux wall panel boards in standard EU/UK flush-mount sizes. PropertyCore UI is installed as a kiosk app over Android, or native on embedded Linux.
- These same boards are sold under dozens of brand names on AliExpress/Alibaba — the board is commodity, the software is the product.
- Future: custom enclosure + PropertyCore-branded face plate

### 4.7 Mobile App (Guest / Tenant)
- Room control (lights, AC, scenes)
- Service requests (housekeeping, maintenance)
- Check-in / check-out (future)
- Available on Android and iOS

### 4.8 PropertyCore Media Box (PC-AV-BOX) — Long-Term Product
A PropertyCore-branded per-room media player. HDMI output directly to the room TV. Controlled by the hub over the local network.

**Why this exists:**
The PropertyCore Hub is a headless device installed in an electrical cabinet — it has no HDMI port. HDMI-CEC (two-way TV control over HDMI) and native local media streaming to a room TV both require a device physically connected to the TV. Rather than depending on a third-party Chromecast, Fire TV Stick, or Apple TV, PropertyCore will ship its own per-room device.

**Capabilities:**
- HDMI output to room TV (1080p / 4K)
- HDMI-CEC — two-way TV control (power, input, volume) without IR line-of-sight
- Jellyfin client — plays local hotel content library directly on the TV (no guest device required)
- Spotify Connect receiver — room TV appears as a Spotify output device
- PropertyCore kiosk UI — property information, room controls, welcome screen
- Snapcast audio endpoint — participates in multi-room audio zones
- Ethernet + Wi-Fi
- USB-C power
- PropertyCore firmware (ARM Linux)

**Deployment model:**
One PC-AV-BOX per room. Managed centrally from the hub dashboard. OTA firmware updates pushed from hub.

**Timeline:**
MVP installs use `PC-AV-IR` IR blaster for TV control (no HDMI connection required). `PC-AV-CEC` (USB-CEC dongle) is Phase 2. PC-AV-BOX is a long-term product once the platform has established market presence.

**OEM sourcing:** Custom PCB design on an ARM SoC (RK3326-class or equivalent). Same OEM-then-rebrand approach as other PropertyCore hardware, with PropertyCore firmware replacing vendor software.

---

## 5. Software Stack

### 5.1 Hub — Automation Engine
**Language: Go (Golang)**

Go is the right choice for the hub's core engine. It compiles to a single binary that runs on ARM with minimal memory footprint. It handles thousands of concurrent device connections via goroutines without the overhead of Python or Node.js. It boots fast, runs stably for months without restart, and is easy to cross-compile for different SBC hardware. This is the same reason companies like HashiCorp, Cloudflare, and embedded IoT vendors use Go for infrastructure software.

Responsibilities:
- MQTT broker bridge (interfaces with embedded Mosquitto)
- Device state manager (real-time state of every device on site)
- Rules and scene engine (if motion detected at 10pm → turn on corridor light at 30%)
- Scheduling engine (AC off at midnight, on at 6am)
- Local REST API (serves web dashboard and mobile app on LAN)
- WebSocket server (real-time state push to all connected UIs)
- FFmpeg pipeline manager (camera stream ingestion, recording, transcoding)
- Relay tunnel client (maintains outbound connection to PropertyCore relay server)
- OTA update manager (receives and applies firmware updates to connected devices)
- Snapcast server manager (multi-room audio zone control)
- IR command dispatcher (sends commands to PC-AV-IR blasters per room)
- PC-AV-BOX controller (manages per-room media box fleet over network)

### 5.2 Hub — Web Configuration Dashboard
**Framework: React + TypeScript**

The engineer/installer tool. Not visible to end users. Accessed at `http://[hub-ip]/admin` on the local network, or remotely through the relay tunnel.

Features:
- Room and floor plan builder
- Device discovery and pairing wizard
- Scene builder (drag/drop condition → action)
- User management (owner, tenant, staff roles)
- Camera configuration and feed preview
- Energy monitoring charts
- System logs and diagnostics
- OTA firmware push to all devices on site

### 5.3 Mobile App
**Framework: Flutter (Dart)**

One codebase — Android and iOS. Flutter produces native-performance UI with smooth animations, which matters for a premium product feel. It handles WebSocket real-time state updates well and has strong libraries for camera streaming (WebRTC).

End-user app features:
- Room control (lights, AC, curtains, scenes)
- Live camera feeds (via WebRTC peer-to-peer)
- Smart lock control and access logs
- Energy usage dashboard
- Notifications (motion alerts, door events, energy thresholds)
- Service requests (for hotel/hospitality deployments)
- Works locally (no internet) and remotely (via relay)

### 5.4 Real-Time Communication
| Channel | Technology | Purpose |
|---|---|---|
| Device → Hub | MQTT over Wi-Fi/Zigbee | All device state and command traffic |
| Hub → App/Dashboard | WebSocket | Live state updates to UI |
| Camera → App | WebRTC (peer-to-peer) | Live video — bypasses relay server |
| Hub → Relay Server | WebSocket persistent tunnel | Remote access bridge |
| Voice platforms → Relay | HTTPS webhooks | Alexa / Google command delivery |

### 5.5 Surveillance Stack
- **FFmpeg** — ingests RTSP streams from IP cameras, handles recording and transcoding
- **WebRTC** — delivers live video peer-to-peer from hub to app (relay server only handles signalling handshake, not video data — keeping bandwidth costs near zero)
- **coturn** (self-hosted TURN server) — fallback video relay if peer-to-peer fails on certain networks
- **Rolling storage** — recordings stored as MP4 on hub's local drive with configurable retention (7/14/30 days)
- **Motion events** — FFmpeg motion detection triggers notification + clip save

### 5.5a Entertainment & Media Stack
All services run on the hub. No cloud dependency. No licensing cost.

| Service | Software | Role |
|---|---|---|
| Local media server | **Jellyfin** | Serves movies, TV shows, music from NAS to any device on LAN |
| Multi-room audio | **Snapcast** | Perfectly synchronised audio across lobby, corridors, pool areas |
| Spotify Connect | **librespot** | Hub appears as a Spotify Connect speaker — guest streams from their own Spotify account |
| AirPlay 2 | **shairport-sync** | iPhone / Mac casts audio to PropertyCore speakers |
| IPTV | **Tvheadend** | Restreams cable / satellite IPTV to any room or device |
| Internet Radio | Custom Go player | Stream URL-based radio without subscription |

**Per-room media playback:**
- With **PC-AV-IR** (MVP): hub sends IR commands to control TV power/input. Guest uses their own device for streaming content.
- With **PC-AV-CEC** (Phase 2): USB-CEC dongle enables two-way TV control without IR line-of-sight.
- With **PC-AV-BOX** (long term): per-room media box provides Jellyfin, Spotify Connect, and PropertyCore UI natively on the TV. No guest device required for hotel content.

### 5.6 Database Layer
| Data Type | Database | Reason |
|---|---|---|
| Device config, scenes, users, rooms | SQLite | Embedded, zero config, reliable, fast |
| Sensor readings, energy data, event history | InfluxDB | Purpose-built for time-series data |
| Camera recordings | File system (MP4, rolling) | No database overhead for video |

### 5.7 Hub Operating System
| Stage | OS |
|---|---|
| Development / prototyping | Debian ARM (full, easy to work with) |
| Production hardware | Custom Yocto or Buildroot image — stripped Linux, read-only root filesystem, 30-second boot, no unnecessary services |

Docker containers on the hub isolate the application stack from the OS, making OTA updates clean — update a container without touching the OS.

### 5.8 Device Firmware
| Device Type | Framework |
|---|---|
| ESP32-based relays, AC gateways | ESP-IDF (C/C++) + FreeRTOS |
| Smart remote V1 | ESP-IDF + LVGL (UI framework) |
| Zigbee sensors / scene buttons | Zephyr RTOS or vendor SDK |
| Wall panel (Android-based OEM) | Android kiosk app (Flutter) |
| Smart remote V2 | Embedded Linux + Flutter |
| PC-AV-BOX (Media Box) | ARM Linux + PropertyCore firmware |

### 5.9 Full Stack Summary
| Layer | Technology |
|---|---|
| Hub automation engine | Go |
| MQTT broker (embedded) | Mosquitto |
| Config dashboard | React + TypeScript |
| Mobile app | Flutter |
| Remote UI (wall panel) | Flutter kiosk / LVGL |
| Remote UI (smart remote) | LVGL (C) |
| Multi-room audio | Snapcast |
| Spotify Connect | librespot |
| AirPlay 2 | shairport-sync |
| IPTV | Tvheadend |
| Media box firmware (PC-AV-BOX) | ARM Linux + PropertyCore firmware |
| Real-time UI updates | WebSockets |
| Camera streaming | FFmpeg + WebRTC |
| Remote access | WebSocket tunnel + WireGuard (VPN) |
| Config database | SQLite |
| Time-series / sensor data | InfluxDB |
| Hub OS (dev) | Debian ARM |
| Hub OS (production) | Yocto custom image |
| OTA updates | Docker layer updates + custom update daemon |
| Device firmware | ESP-IDF + FreeRTOS / Zephyr |

---

## 6. Protocol Architecture

All devices communicate over one of:

| Protocol | Used For |
|---|---|
| MQTT (Wi-Fi) | ESP32 relay modules, AC gateways |
| Zigbee | Sensors, scene remotes, low-power devices |
| RS485 / Modbus | Energy meters, industrial sensors |
| IR | AC units, TV/AV control |
| BLE | Configuration, proximity detection |
| RTSP | IP cameras → Hub |
| WebRTC | Live camera → app (peer-to-peer) |
| Matter | Future: native voice assistant integration |

No device ever requires an external cloud to function.

---

## 7. Deployment Model

### How PropertyCore Is Sold and Installed

PropertyCore is not software a customer downloads or installs themselves. It follows the same commercial deployment model as Control4, HDL Buspro, and Loxone:

1. **Customer purchases a PropertyCore Hub** (the box) — this is the platform. The software is pre-installed, locked, and signed. The customer cannot access the OS or modify the platform.

2. **A certified PropertyCore engineer visits the site.** They connect a laptop to the same network as the hub and access the **Web Configuration Dashboard** at `http://[hub-ip]/admin`. This is the "Composer" equivalent — the installer tool.

3. **The engineer pairs all devices:** relay modules, AC gateways, cameras, locks, wall panels, smart remotes. Each device is assigned to a room, floor, and zone within the dashboard.

4. **Scenes and automation rules are configured:** "Arriving Home," "Movie Mode," "Night Mode," "Away," etc.

5. **User accounts are created:** owner, family members, staff, tenants — each with appropriate permission levels.

6. **The hub is registered to the PropertyCore relay server.** From this point, the owner can access their system remotely via the mobile app from anywhere in the world.

7. **Handover:** The engineer hands over the system to the customer. Customer-facing interaction is the mobile app only. The configuration dashboard is installer-access only.

### Hub SKU Tiers (Planned)
| SKU | Target | Rooms | Cameras | Devices | Form Factor |
|---|---|---|---|---|---|
| PropertyCore HC-1 | Single apartment / small home | 1–6 | Up to 4 | Up to 30 | Compact slim / DIN mount |
| PropertyCore HC-3 | Large home / boutique hotel | 6–20 | Up to 16 | Up to 150 | 1U rack (19") |
| PropertyCore HC-Pro | Estate / hotel / commercial | 20–100+ | Up to 64 | Up to 500 | 1U rack (19") |
| PropertyCore HC-AV | Premium home / estate / hotel AV | 6–30 | Up to 16 | Up to 200 | 2U rack (19") |

All HC-3 and above are **rack-mounted and cabinet-installed** — the standard form factor for professionally deployed automation and AV systems. The engineer installs the hub in the property's comms/AV rack cabinet, typically in a utility room, server room, or electrical cabinet. The HC-AV occupies 2U due to the integrated amp and HDMI matrix hardware. The HC-1 is the only tier not requiring a rack cabinet.

---

## 8. Relay Server Architecture

### The Problem
Every PropertyCore Hub sits behind a customer's router with a private IP (192.168.x.x). It is not reachable from the internet directly. The router's public IP also changes periodically (dynamic IP — common with Nigerian ISPs).

The relay server solves this without requiring port forwarding or static IPs from the customer.

### The Mechanism — Persistent Outbound Tunnel
The hub does not wait to be called. On startup, it dials out.

```
PropertyCore Hub (customer site, any location)
    → outbound persistent WebSocket connection → PropertyCore Relay Server (your VPS)
                                                          ↑
                              Mobile App (owner anywhere) connects here
                                                          ↓
                              Traffic is tunnelled back to the correct hub
```

The app never talks to the hub directly over the internet. It talks to the relay server, which identifies the hub by its unique site ID and bridges the session. The hub's private IP is irrelevant.

### Hub Identity
Every hub is assigned a unique device ID at first boot — e.g., `PC-NG-00412` — tied to a customer account. When the hub connects to the relay server, it authenticates with this ID and a hardware-bound secret key. The relay server maps: "connection from PC-NG-00412 = site for [customer account]."

### Relay Server Internal Structure
```
┌─────────────────────────────────────────────────────────────┐
│                PROPERTYCORE RELAY SERVER                     │
│                (single VPS — Hetzner / DigitalOcean)        │
│                                                             │
│  ┌──────────────────┐    ┌──────────────────────────────┐  │
│  │  Hub Connection  │    │  Inbound Request Handler     │  │
│  │  Manager         │    │                              │  │
│  │                  │    │  - Owner mobile app          │  │
│  │  - Authenticates │◄──►│  - Alexa Skill webhook       │  │
│  │    hub on conn.  │    │  - Google Action webhook     │  │
│  │  - Assigns site  │    │  - Remote engineer access    │  │
│  │    session ID    │    │  - OTA firmware delivery     │  │
│  │  - Keeps alive   │    │                              │  │
│  └──────────────────┘    └──────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  WebRTC Signalling (TURN/STUN via coturn)            │  │
│  │  Handles camera peer-to-peer handshake only.         │  │
│  │  Video itself flows directly hub ↔ app.              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Account & Auth Service                              │  │
│  │  - Site registration    - Device certificates        │  │
│  │  - Owner accounts       - JWT token issuance         │  │
│  │  - Installer accounts   - OAuth 2.0 (voice platforms)│  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Camera Streams — Why They Don't Go Through the Relay
Video is high bandwidth. Routing it through a relay server would make the infrastructure expensive. WebRTC solves this differently:

- The relay server handles only the **signalling handshake** — hub and app exchange connection info (a few KB)
- Once signalling completes, video flows **peer-to-peer directly** between hub and app
- If peer-to-peer fails (some network types block it), coturn TURN server relays the video as fallback

Result: the relay server handles tiny command/control messages only. Video never touches it.

### Security Model
| Connection | Security |
|---|---|
| Hub → Relay | Mutual TLS — both sides present certificates |
| App → Relay | JWT tokens with short expiry |
| Hub device certificates | Issued at manufacture, stored in secure flash partition |
| All payloads | End-to-end encrypted — relay server forwards but cannot read |
| Voice integrations | OAuth 2.0 with PropertyCore auth service |

### Infrastructure Cost at Scale
| Service | Cost/month |
|---|---|
| Relay server VPS (Hetzner CX21) | ~$5–8 |
| TURN server (same VPS, self-hosted coturn) | $0 |
| SSL certificates (Let's Encrypt) | $0 |
| Bandwidth (command/control, no video) | ~$0–5 |
| **Total for first 50–100 sites** | **~$10–15/month** |

Video never loads the relay server. Costs scale slowly even with hundreds of sites.

### Dual Use: Remote Access + Remote Support
The same relay infrastructure that gives owners remote access also gives PropertyCore engineers remote diagnostic access. A support engineer can connect to any customer hub from the office — view logs, check device states, push fixes — without traveling to site. This dramatically reduces support costs.

---

## 9. Voice Integration (Alexa, Google Home, Matter)

### How It Works — General Principle
Neither Amazon nor Google charge a licensing fee for voice integration. Both publish free developer programs. The integration cost is engineering time only.

Both platforms work the same way: when a user gives a voice command, Amazon or Google calls a webhook endpoint on your relay server. Your relay server translates the command and forwards it to the correct hub.

```
"Alexa, turn off the bedroom lights"
        ↓
  Amazon Alexa Cloud
        ↓
  PropertyCore Alexa Skill (webhook on relay server)
        ↓
  PropertyCore Relay → Hub tunnel
        ↓
  Hub → Relay module → light off
```

### Amazon Alexa
- **Program:** Alexa Smart Home Skill API
- **Cost:** Free. Hosted on AWS Lambda (free tier covers it) or your relay server
- **User setup:** Owner links PropertyCore account to Alexa via OAuth in the Alexa app
- **Review:** Amazon reviews skills before public listing

### Google Home
- **Program:** Google Home Developer Platform
- **Cost:** Free
- **Mechanism:** Google sends SYNC / QUERY / EXECUTE intents to your webhook
- **User setup:** Owner links account via Google Home app
- **Review:** Google reviews actions before public listing

### Apple HomeKit
- **Program:** HomeKit Accessory Protocol (HAP) — now open source, no hardware chip required
- **Cost:** Free (software implementation)
- **Works locally:** HomeKit can communicate directly with the Hub on the local network — no relay needed
- **Review:** Apple's review process is stricter than Alexa/Google

### Matter — The Future-Proof Option
Matter is an open standard backed by Amazon, Google, Apple, and Samsung. A Matter-compatible device is natively discovered and controlled by all four platforms simultaneously — no separate Skill or Action needed.

If PropertyCore Hub supports the Matter bridge protocol (which is an open SDK, free to implement):
- Amazon Echo discovers it natively
- Google Home discovers it natively
- Apple HomeKit discovers it natively
- Samsung SmartThings discovers it natively

No per-platform integration work. No voice platform dependency. Local communication only — no cloud required for voice control.

**Strategy:** Build Alexa + Google integrations first (widely used, well-documented). Add Matter bridge support to the hub firmware in Phase 2. This removes relay server dependency for voice and becomes a strong marketing point.

### Summary
| Platform | Cost | Requires Cloud Relay? | Standard |
|---|---|---|---|
| Amazon Alexa | Free | Yes | Alexa Smart Home API |
| Google Home | Free | Yes | Google Home Developer |
| Apple HomeKit | Free | No (local) | HAP |
| Matter (all above) | Free | No (local) | Matter SDK (open) |

---

## 10. Firmware Pairing — The Commercial Moat

This is the moat.

- All PropertyCore hardware ships with signed firmware
- Hub only accepts commands from devices with valid device certificates
- Devices only accept commands from a registered Hub
- No third-party app can pair with PropertyCore hardware
- Custom OTA updates delivered only through PropertyCore update server

This creates stickiness without feeling hostile — it's how every commercial system works.

---

## 11. Platform Feature Modules

PropertyCore is one platform with a modular feature set. Every deployment runs the same hub and the same software — the engineer activates the modules relevant to that property type during configuration. A luxury home does not need the staff operations module. A hotel does not need the same billing structure as a residential estate. But all markets share the same hardware ecosystem, the same app, and the same support model.

### 11.1 Core Modules (All Deployments)
These are active in every PropertyCore installation regardless of property type.

| Module | What It Does |
|---|---|
| Lighting Control | Switches, dimmers, scenes, schedules |
| Climate Control | AC gateways, temperature sensors, schedules |
| Energy Monitoring | Per-circuit metering, live power dashboard, InfluxDB history |
| Inverter Integration | Solar PV, battery, grid monitoring + intelligent automation |
| Security & Surveillance | IP cameras, motion detection, recording, live view |
| Smart Locks & Access | Door locks, gate controllers, access logs |
| Scene Engine | Scenes, automation rules, schedules, triggers |
| Mobile App | Guest/owner/tenant control app (Android + iOS) |
| Smart Remote | Control4-style handheld remote |
| Wall Panel | In-room touchscreen controller |
| Remote Access | Owner access from anywhere via relay tunnel |
| Voice Control | Alexa, Google Home, Matter |
| Media Server | Jellyfin — local streaming of movies, music, content |

### 11.2 Water Management Module
Critical for Nigerian properties running on boreholes, overhead tanks, and pressure pumps.

- Ultrasonic tank level sensors (overhead + underground)
- Pump auto-start / auto-stop based on tank level thresholds
- Borehole pump runtime tracking and fault detection
- Daily water consumption logging via flow sensor
- Leak detection: flow running with no usage activity → alert
- Dashboard: tank level gauges, daily consumption chart
- Automation example: "Tank below 20% → start borehole pump"

### 11.3 Generator Management Module
Full generator lifecycle awareness beyond simple on/off detection.

- Auto-start signal relay when grid fails + battery at threshold
- Runtime hours counter (total lifetime hours)
- Maintenance scheduling alert: "Service due at 250 hours"
- Fuel level monitoring (ultrasonic sensor in fuel tank)
- Estimated runtime remaining at current load
- Cool-down timer before shutdown
- Push notification: "Generator running 6h — estimated fuel: 2h remaining"
- Fault alerting (temperature, oil pressure sensors where available)

### 11.4 Intercom + Video Doorbell Module
For gate entrances, building lobbies, and main doors.

- PropertyCore-branded video doorbell / intercom unit
- Live video feed on mobile app and wall panel
- Two-way audio
- Remote gate / door unlock from app
- Visitor snapshot log with timestamps
- Motion-triggered recording at entrance
- Night vision support

### 11.5 Air Quality + Environmental Module
Valuable for hotels, offices, and health-conscious homes.

- CO2 level monitoring (high CO2 = poor ventilation)
- PM2.5 / dust particle sensing (harmattan season)
- Humidity monitoring (mould prevention in tropical climate)
- Automation: high CO2 → increase ventilation / alert
- Automation: humidity threshold → dehumidifier or alert

### 11.6 Emergency + Panic System Module
Non-negotiable for estates, hotels, and luxury homes.

- Physical panic button (on wall panel, smart remote, or dedicated unit)
- Panic trigger: siren, full lights on, camera recording, push alert to owner and security
- Smoke sensor → disable AC fans, unlock exit doors, alert all wall panels
- CO / gas leak sensor → close gas valve relay, alert
- Emergency broadcast: message pushed to all wall panels simultaneously
- Audit log of all emergency events

### 11.7 EV Charging Management Module
For homes and estates with electric vehicles.

- Smart charge scheduling (charge during solar surplus, not from battery)
- Load balancing (pause charging when total load approaches inverter limit)
- Charge session tracking (kWh, cost, duration)
- Remote start/stop from app
- Automation: "Battery SOC > 80% and PV surplus > 2kW → start EV charging"

### 11.8 Occupancy Analytics Module *(Hospitality / Estate)*
The hub passively collects data from motion sensors, door events, AC usage, and power consumption. This module surfaces intelligence from that data.

- Real occupancy vs booked occupancy (is the room actually in use?)
- Energy cost per room per night
- Auto housekeeping trigger: no motion 2h after checkout → notify housekeeping
- Peak occupancy hours for staffing planning
- Monthly occupancy + energy report per unit

### 11.9 Staff Operations Module *(Hospitality)*
A dedicated mobile interface for hotel and property staff — separate from the guest/owner app.

- **Housekeeping view:** room status board, vacated rooms, cleaned/pending
- **Maintenance view:** fault alerts, work order log, repair tracking
- **Management view:** real-time dashboard — all rooms, energy, alerts, occupancy
- Audit trail: who performed which action, when
- DND / Make Up Room status visible to housekeeping app

### 11.10 Tenant & Guest Billing Module *(Estates / Short-lets / Serviced Apartments)*
Turns PropertyCore's energy data into a direct revenue tool for landlords and estate managers.

- Per-unit energy consumption tracked (kWh per apartment / room)
- Automated monthly billing report: "Unit 4B used 312 kWh = ₦28,080"
- Pre-paid energy credit system: tenant buys credit, system cuts non-essential load when credit exhausted
- Water usage billing when meters installed
- Export billing data to PDF or accounting software

### 11.11 Digital Signage + Guest Information Module *(Hospitality)*
The wall panel doubles as a guest information and hotel services terminal.

- Welcome screen with guest name on check-in
- Hotel services menu (restaurant, spa, transport, room service)
- Local information: weather, prayer times, local events
- Emergency instructions and evacuation maps
- Property promotional content
- Replaces the paper welcome folder on every hotel room desk

### 11.12 Multi-Property Dashboard Module *(Enterprise / Property Management)*
For operators managing multiple sites — estates, hotel chains, short-let portfolios.

- All properties on a single cloud dashboard
- Real-time energy and alert status per site
- Remote access to any hub with one click
- Monthly energy and operational reports per property
- Centralised user and device management across sites

---

## 12. Deployment Profiles

PropertyCore is deployed in one of four profiles. The engineer selects the profile during setup — it pre-activates the relevant modules and configures the UI accordingly.

### Profile 1 — Luxury Home
*Target: High-end private residences*

| Active Modules |
|---|
| All Core Modules |
| Water Management |
| Generator Management |
| Intercom + Video Doorbell |
| Air Quality |
| Emergency / Panic |
| EV Charging (optional) |

Focus: seamless personal experience, energy intelligence, security. The homeowner controls everything from one app and one remote. Family and guests get limited-access accounts.

---

### Profile 2 — Residential Estate / Apartment Complex
*Target: Gated communities, apartment blocks, serviced estates*

| Active Modules |
|---|
| All Core Modules |
| Water Management |
| Generator Management |
| Intercom + Video Doorbell |
| Emergency / Panic |
| Tenant & Guest Billing |
| Multi-Property Dashboard (estate manager view) |

Focus: per-unit metering and billing, estate-wide energy management, central oversight. Each apartment has its own hub or a shared hub with per-unit segmentation. Estate manager sees all units from one dashboard.

---

### Profile 3 — Boutique Hotel / Serviced Apartment
*Target: Hotels, guesthouses, short-let operators*

| Active Modules |
|---|
| All Core Modules |
| Water Management |
| Generator Management |
| Intercom + Video Doorbell |
| Air Quality |
| Emergency / Panic |
| Occupancy Analytics |
| Staff Operations |
| Digital Signage + Guest Info |
| Tenant & Guest Billing |

Focus: guest experience, operational efficiency, staff workflow, energy cost control. The wall panel is the in-room service terminal. Staff have their own app. Management sees the full dashboard.

---

### Profile 4 — Commercial / Mixed Use
*Target: Offices, clinics, schools, corporate facilities*

| Active Modules |
|---|
| Core (lighting, climate, energy, security, access) |
| Generator Management |
| Water Management |
| Air Quality |
| Emergency / Panic |
| Multi-Property Dashboard |
| Staff Operations (facilities management view) |

Focus: energy efficiency, access control, environmental quality, facilities management. Less entertainment, more operations.

---

## 13. Market Positioning

### Competitive Comparison

| System | Price Level | Local Support | Africa Fit | Stability |
|---|---|---|---|---|
| Control4 | Very High | None | Poor | High |
| Home Assistant | Free | DIY only | Medium | Low (for commercial) |
| Tuya/Smart Life | Low–Medium | None | Poor | Cloud-dependent |
| KNX / Crestron | Very High | Very poor | None | High |
| **PropertyCore** | **Medium** | **Full local** | **Built for it** | **High** |

### Key Differentiators
1. One platform, four deployment profiles — luxury home to hotel chain
2. Designed for African power and water realities (inverter, water, generator management built-in)
3. Local support engineers — trained, certified, physically reachable
4. No ongoing cloud subscription required for core features
5. Modular feature set — activate only what the property needs
6. Local-language support planned (Yoruba, Hausa, Pidgin UI)
7. Built-in media server (Jellyfin) — entertainment without internet dependency

---

## 12. Revenue Model

| Stream | Description |
|---|---|
| Hardware sales | Hub, relays, remotes, panels, sensors |
| Installation fee | Per-site setup and commissioning |
| Annual maintenance | Optional support contract |
| Cloud subscription | Remote access, analytics, multi-site dashboard |
| White-label licensing | Sell system to estate developers under their brand |
| Training/certification | Installer certification program |

---

## 13. MVP Scope (When Ready to Build)

**MVP Goal:** One hotel/apartment room fully automated.

### MVP Hardware
- [ ] PropertyCore Hub V1 (Raspberry Pi 4 based)
- [ ] 2-channel relay module (lights)
- [ ] AC gateway (one split unit)
- [ ] Smart remote V1 (ESP32 + touchscreen)

### MVP Software
- [ ] Hub firmware (MQTT broker + REST API + rules engine)
- [ ] Relay module firmware (ESP-IDF)
- [ ] Mobile app — basic room control
- [ ] Web admin dashboard — device config + scene builder

### Success Criteria
- Lights controllable from app and remote
- AC controllable from app and remote
- One scene ("Night Mode") works
- System recovers cleanly after power outage
- No internet needed for any of the above

---

## 14. Estimated Build Cost (MVP)

| Item | Estimated Cost (₦) |
|---|---|
| Raspberry Pi 4 + case + SD | ₦85,000 |
| ESP32 relay modules (x4) | ₦40,000 |
| AC gateway module | ₦25,000 |
| Smart remote V1 (prototype) | ₦45,000 |
| Zigbee coordinator | ₦18,000 |
| Enclosures + wiring | ₦30,000 |
| PCB prototyping (relay board) | ₦35,000 |
| **Total MVP Estimate** | **~₦278,000** |

*Retail installed value of same MVP: ₦600,000–₦900,000 per room at commercial rates.*

---

## 15. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| ESP32 supply chain disruption | Qualify backup MCU (STM32 / W600) |
| Firmware complexity | Start with proven base (ESP-IDF + FreeRTOS) |
| Market education needed | Partner with estate developers early |
| Single founder bandwidth | Document everything; modular build order |
| Funding gap | Pilot one real site for proof, attract investor |

---

## 16. Build Phases

**Phase 1 — Platform MVP**
One room, core devices, basic app. Use OEM bare boards + PropertyCore firmware for all hardware except the Hub (Pi-based).

**Phase 2 — Hotel Package**
Multi-room dashboard, housekeeping module, energy analytics, multimedia routing (push TV content from Hub to rooms).

**Phase 3 — Estate Package**
Multi-unit, gate control, visitor management, tenant portal, intercom.

**Phase 4 — Platform Expansion**
Third-party installer/integrator network, certified installer program, white-label licensing option, developer API.

**Phase 5 — Hardware Line**
Custom PCB design for differentiated products (smart remote, hub, wall panel). Local assembly. Injection-moulded branded enclosures. SON/NAFDAC/local certification where applicable.

**Phase 6 — Ecosystem Scale**
PropertyCore becomes a platform other integrators build on. Module marketplace. Enterprise multi-site dashboard. Hospitality SaaS tier.

---

## 17. Related Documents

- [PRODUCT-LIBRARY.md](PRODUCT-LIBRARY.md) — Full hardware product catalog: 78 planned SKUs across 19 categories with sourcing strategy

*(Add links to related idea repos as they are created)*

- Smart Remote V1 — ESP32 Control4-style handheld remote
- Smart Energy Monitor — Per-room power dashboard  
- Hospitality App — Hotel operations + guest mobile experience
- Smart Gate Controller — Estate access management

---

*Document authored April 2026. Concept stage — pre-funding, pre-build.*  
*Part of a structured idea portfolio for future development or licensing.*
