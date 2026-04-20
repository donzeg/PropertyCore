# PropertyCore — Product Library

> Version 0.3 — April 2026  
> Status: Concept / Pre-build  
> Reference: HDL Buspro, Control4, Loxone hardware ecosystems

---

## Product Naming Convention

`PC-[CATEGORY]-[SPEC]-[VARIANT]`

| Code | Category |
|---|---|
| HUB | Controller / Hub |
| RLY | Relay Module |
| DIM | Dimmer Module |
| CUR | Curtain / Blind Controller |
| ACG | AC Gateway |
| SNS | Sensor |
| WPN | Wall Panel |
| KPD | Keypad / Scene Controller |
| RMT | Remote Control |
| PWR | Energy / Power Module |
| INV | Inverter Interface |
| SEC | Security / Alarm |
| ACC | Access Control |
| AV | AV / IR Controller |
| NET | Network / Gateway |
| WTR | Water Management |
| GEN | Generator Interface |
| ENV | Environmental Sensor |
| INT | Intercom / Doorbell |
| DOK | Charging Dock |
| AUD | Audio / Media Distribution |

---

## Category 1 — Hub / Controller

The brain of every PropertyCore installation. Runs the platform software. One Hub per property or per zone in large installations.

| SKU | Name | Target | Key Specs |
|---|---|---|---|
| PC-HUB-HC1 | PropertyCore Hub HC-1 | Small home / apartment | RPi 5 (8GB), 256GB NVMe, Zigbee, RS485, Ethernet, Wi-Fi, UPS circuit |
| PC-HUB-HC3 | PropertyCore Hub HC-3 | Large home / boutique hotel | Pi CM5 custom carrier, 512GB NVMe, dual RS485, Zigbee, PoE out, UPS |
| PC-HUB-HCPRO | PropertyCore Hub HC-Pro | Estate / hotel / commercial | RK3588, 16GB RAM, 512GB NVMe, NPU, quad RS485, Zigbee, dual Ethernet |

**Common Hub Features (all tiers):**
- Embedded Linux (Yocto custom image in production)
- PropertyCore platform pre-installed and locked
- Web config dashboard (engineer access only)
- Local MQTT broker (Mosquitto)
- Zigbee coordinator (CC2652P)
- RS485 / Modbus RTU port(s)
- RTC (real-time clock — survives power cuts)
- UPS circuit (clean shutdown on extended outage)
- Surge protection on power input (12V DC)
- Gigabit Ethernet
- USB 3.0 (service + external storage)
- DIN rail mount option
- Passive cooling (no fan)
- OTA update support
- WireGuard relay tunnel client (remote access)
- NAS / external storage integration (SMB / NFS)
- Jellyfin media server (built-in — local media library, no subscription)
- Snapcast multi-room audio server (built-in)
- Spotify Connect endpoint — librespot (built-in)
- AirPlay 2 receiver — shairport-sync (built-in)
- IPTV server — Tvheadend (built-in)

---

## Category 2 — Relay Modules (Lighting / Power Switching)

Installed behind existing wall switches. Controls lights, fans, pumps, sockets, and any switched load. Physical switch override always works.

| SKU | Name | Channels | Protocol | Load |
|---|---|---|---|---|
| PC-RLY-1CH-W | Single Relay — Wi-Fi | 1 | Wi-Fi (MQTT) | 10A / 2400W |
| PC-RLY-2CH-W | Dual Relay — Wi-Fi | 2 | Wi-Fi (MQTT) | 10A per ch |
| PC-RLY-4CH-W | 4-Channel Relay — Wi-Fi | 4 | Wi-Fi (MQTT) | 10A per ch |
| PC-RLY-6CH-W | 6-Channel Relay — Wi-Fi | 6 | Wi-Fi (MQTT) | 10A per ch |
| PC-RLY-2CH-Z | Dual Relay — Zigbee | 2 | Zigbee | 10A per ch |
| PC-RLY-4CH-Z | 4-Channel Relay — Zigbee | 4 | Zigbee | 10A per ch |

**Features (all relay modules):**
- PropertyCore firmware (ESP-IDF + FreeRTOS)
- Physical switch input (works even if hub offline)
- Power consumption monitoring per channel (optional variant)
- OTA firmware updates via Hub
- DIN rail or in-wall box mount
- 240V / 50Hz rated (Nigerian standard)
- Surge-protected inputs
- Sourcing: OEM ESP32 bare relay boards reflashed

---

## Category 3 — Dimmer Modules

For dimmable lighting loads. Trailing-edge (LED compatible) as default.

| SKU | Name | Channels | Type | Max Load |
|---|---|---|---|---|
| PC-DIM-1CH-TE | Single Dimmer — Trailing Edge | 1 | Trailing edge (LED) | 200W |
| PC-DIM-2CH-TE | Dual Dimmer — Trailing Edge | 2 | Trailing edge (LED) | 200W per ch |
| PC-DIM-1CH-LE | Single Dimmer — Leading Edge | 1 | Leading edge (incandescent/halogen) | 400W |
| PC-DIM-010V | 0-10V Dimmer Interface | 2 | 0-10V signal output | For 0-10V LED drivers |

**Notes:**
- Trailing edge default — compatible with modern LED loads
- Physical switch input on all models
- Soft-start / soft-off transition
- OTA firmware updates
- 240V / 50Hz rated

---

## Category 4 — Curtain / Blind Controllers

Controls motorised curtains, blinds, roller shutters, and garage doors.

| SKU | Name | Channels | Protocol |
|---|---|---|---|
| PC-CUR-1CH-W | Single Curtain Controller — Wi-Fi | 1 motor | Wi-Fi (MQTT) |
| PC-CUR-2CH-W | Dual Curtain Controller — Wi-Fi | 2 motors | Wi-Fi (MQTT) |
| PC-CUR-1CH-Z | Single Curtain Controller — Zigbee | 1 motor | Zigbee |

**Features:**
- Up / Down / Stop control
- Position feedback (percentage open)
- Auto-stop on end-of-travel (time-based or limit switch)
- Works with most 240V AC curtain motors
- Scene integration (e.g., "Movie Mode → Curtains Close")

---

## Category 5 — AC Gateway Modules

Controls split-unit air conditioners without replacing the existing unit. Installs inside or near the indoor unit.

| SKU | Name | Protocol | Features |
|---|---|---|---|
| PC-ACG-IR-W | AC Gateway — IR | Wi-Fi (MQTT) | IR blaster + temp sensor + current clamp |
| PC-ACG-IR-Z | AC Gateway — IR Zigbee | Zigbee | IR blaster + temp/humidity sensor |
| PC-ACG-PRO | AC Gateway Pro | Wi-Fi (MQTT) | IR + temperature + humidity + current clamp + occupancy |

**Features (all AC gateways):**
- Universal IR database: Hisense, LG, Samsung, Panasonic, Daikin, Midea, Gree, Haier, Aux
- Works even if original remote is lost
- Ambient temperature + humidity sensor
- Current clamp (power consumption monitoring per AC unit)
- Feedback confirmation (knows if AC responded to IR command)
- OTA firmware updates

---

## Category 6 — Energy Monitoring Modules

Per-circuit real-time power monitoring.

| SKU | Name | Circuits | Interface |
|---|---|---|---|
| PC-PWR-1CT | Single CT Energy Monitor | 1 | Wi-Fi (MQTT) |
| PC-PWR-4CT | 4-Circuit Energy Monitor | 4 | Wi-Fi (MQTT) |
| PC-PWR-DIN | DIN Rail Energy Meter | 1 | RS485 / Modbus RTU |
| PC-PWR-3PH | 3-Phase Energy Meter | 3-phase | RS485 / Modbus RTU |

**Features:**
- Real-time watts, voltage, current, power factor
- Daily / monthly kWh accumulation
- Data stored in InfluxDB on Hub
- Compatible with standard split-core CT clamps
- RS485 models: DTSU666, DDSU666, and compatible meter standards

---

## Category 7 — Inverter Interface Module

Connects solar hybrid inverters to the PropertyCore Hub.

| SKU | Name | Interface | Supported Brands |
|---|---|---|---|
| PC-INV-RS485 | Inverter RS485 Bridge | RS485 / Modbus RTU | DEYE, Growatt, Sofar, Goodwe, Sunsynk |
| PC-INV-ESP | Inverter ESP32 Bridge | Wi-Fi (MQTT) | DEYE (via ESP32 + ESPHome — MVP path) |
| PC-INV-VIC | Victron Interface | Modbus TCP / VE.Can | Victron MultiPlus, Quattro, MPPT |

**Data pulled (DEYE register map validated):**
Battery SOC, voltage, current, power, temperature, charge/discharge kWh — Solar PV1/PV2/PV3 power, voltage, current, daily/total energy — Grid voltage, current, frequency, import/export — Load power, daily/total energy — Inverter temperature, fault codes — Work mode and peak shaving status

---

## Category 8 — Water Management Modules

| SKU | Name | What It Does |
|---|---|---|
| PC-WTR-ULT | Tank Level Sensor | Ultrasonic — measures water level in overhead / underground tank |
| PC-WTR-FLO | Flow Meter Interface | Pulse-output flow meter integration — daily consumption tracking |
| PC-WTR-RLY | Pump Controller Relay | Controls borehole pump / pressure pump with level-based automation |

**System:**
Ultrasonic sensor mounted on tank → reports level to Hub → Hub triggers PC-WTR-RLY to start/stop pump at configured thresholds. Flow meter detects abnormal flow (leak detection). All data visualised in dashboard.

---

## Category 9 — Generator Management Module

| SKU | Name | What It Does |
|---|---|---|
| PC-GEN-CTL | Generator Controller Interface | Auto-start relay signal, status input, runtime counter |
| PC-GEN-FUL | Fuel Level Sensor | Ultrasonic sensor for diesel/petrol fuel tank level |
| PC-GEN-SNS | Generator Sensor Pack | Temperature + oil pressure sensors for health monitoring |

**Automation:**
Grid failure detected (via inverter module) → battery SOC below threshold → PC-GEN-CTL sends start signal → Hub monitors runtime, fuel estimate, temperature → notification to owner → cool-down sequence on shutdown.

---

## Category 10 — Sensors

Standalone sensors that feed data into the automation engine.

| SKU | Name | Measures | Protocol |
|---|---|---|---|
| PC-SNS-PIR | Motion Sensor | PIR motion + lux | Zigbee |
| PC-SNS-PIR-W | Motion Sensor — Wi-Fi | PIR motion + lux + temperature | Wi-Fi |
| PC-SNS-DW | Door / Window Sensor | Open / closed state | Zigbee |
| PC-SNS-TH | Temperature + Humidity | Temp (°C) + humidity (%) | Zigbee |
| PC-SNS-SMK | Smoke Detector | Smoke (photoelectric) | Zigbee |
| PC-SNS-CO | CO / Gas Detector | Carbon monoxide / LPG / natural gas | Zigbee |
| PC-SNS-FLD | Flood / Leak Sensor | Water presence | Zigbee |
| PC-SNS-VIB | Vibration Sensor | Shock / vibration (glass break, fence sensor) | Zigbee |
| PC-SNS-LUX | Lux Sensor | Ambient light level | Zigbee |

---

## Category 11 — Environmental Sensors (Air Quality)

| SKU | Name | Measures | Protocol |
|---|---|---|---|
| PC-ENV-CO2 | CO2 + Temp + Humidity | CO2 (ppm), temp, humidity | Wi-Fi or Zigbee |
| PC-ENV-PM | Air Quality Sensor | PM2.5, PM10, VOC, CO2, temp, humidity | Wi-Fi |
| PC-ENV-FULL | Full Environmental Monitor | CO2, PM2.5, PM10, VOC, HCHO, temp, humidity | Wi-Fi |

---

## Category 12 — Wall Panels

Flush-mounted in-room touchscreen controllers. Sourced as OEM Android/Linux bare boards in EU/UK standard flush-mount sizes, running PropertyCore kiosk UI.

| SKU | Name | Display | Profile |
|---|---|---|---|
| PC-WPN-4 | Wall Panel 4" | 4" capacitive IPS | Residential |
| PC-WPN-7 | Wall Panel 7" | 7" capacitive IPS | Hotel / commercial |
| PC-WPN-10 | Wall Panel 10" | 10" capacitive IPS | Lobby / boardroom |

**Features (all wall panels):**
- PropertyCore kiosk UI (Flutter app, full-screen, locked)
- Scene buttons, AC control, lighting control
- DND / MUR (hotel profile)
- Digital clock + date
- Guest welcome screen (hotel profile)
- Hotel services menu (hotel profile)
- Live camera preview
- Emergency alert display
- Screensaver / always-on mode options
- PoE powered (no separate power cable needed)
- OTA app updates via Hub

---

## Category 13 — Keypads / Scene Controllers

Physical button panels for scene triggering. Installed on walls. No screen.

| SKU | Name | Buttons | Protocol |
|---|---|---|---|
| PC-KPD-2 | 2-Button Scene Keypad | 2 | Zigbee |
| PC-KPD-4 | 4-Button Scene Keypad | 4 | Zigbee |
| PC-KPD-6 | 6-Button Scene Keypad | 6 | Zigbee |
| PC-KPD-8 | 8-Button Scene Keypad | 8 | Zigbee |
| PC-KPD-GLS | Glass Touch Panel 4-key | 4 touch zones | Wi-Fi |

**Features:**
- Each button assignable to any scene or device control
- RGB LED indicator per button (status feedback)
- Capacitive touch or mechanical tactile (model dependent)
- Sourced as OEM glass/plastic panels reflashed with PropertyCore firmware

---

## Category 14 — Smart Remote Controls

Handheld premium remotes. The flagship hardware product.

| SKU | Name | Type | Key Specs |
|---|---|---|---|
| PC-RMT-V1 | Smart Remote V1 | Handheld ESP32 | ESP32-S3, 3.5" IPS, LVGL UI, 6–8 buttons, IR blaster, 2000mAh, USB-C, magnetic dock |
| PC-RMT-V2 | Smart Remote V2 | Handheld Linux | ARM SoC, 4.7" display, Linux, Flutter UI, SIP intercom, camera preview |
| PC-RMT-DOK | Charging Dock | Desk / wall dock | Magnetic pogo-pin charging for V1/V2 remotes |

**V1 Features:**
- ESP32-S3 + FreeRTOS + LVGL
- Scene buttons, AC control, lighting, curtains
- IR blaster (controls TV, decoder, AV)
- Wake-on-pickup (accelerometer)
- Vibration motor + notification feedback
- Wi-Fi + BLE
- OTA firmware updates via Hub

---

## Category 15 — Access Control

| SKU | Name | What It Does |
|---|---|---|
| PC-ACC-LCK | Smart Door Lock Interface | Integrates with electric door locks — remote lock/unlock, access log |
| PC-ACC-GTE | Gate Controller | Controls electric gates — open/close, status, timer |
| PC-ACC-REX | Request to Exit Sensor | PIR-based REX for access control doors |
| PC-ACC-NFC | NFC / RFID Reader | Card/tag access with PropertyCore authentication |
| PC-ACC-FP | Fingerprint Reader | Biometric access — logs entry with identity |

---

## Category 16 — Intercom + Video Doorbell

| SKU | Name | What It Does |
|---|---|---|
| PC-INT-DB | Video Doorbell | 2MP camera, two-way audio, IR night vision, motion detection, door release relay |
| PC-INT-IC | Intercom Panel | Flush-mount intercom with camera for apartment / gate |
| PC-INT-MON | Indoor Monitor | 7" wall monitor for intercom calls (alternative to wall panel for entry-only use) |

**Integration:**
- Live video on mobile app and wall panel
- Door unlock from app or wall panel
- Visitor snapshot + log
- Motion alert with clip

---

## Category 17 — Security / Alarm

| SKU | Name | Type |
|---|---|---|
| PC-SEC-SRN | Siren | 110dB indoor/outdoor siren — triggered by automation rules |
| PC-SEC-PNK | Panic Button | Wall-mount or handheld panic trigger |
| PC-SEC-PIR | Outdoor PIR | Weatherproof motion sensor for perimeter |
| PC-SEC-BEM | Beam Sensor | Infrared beam break for gate / driveway detection |

---

## Category 18 — AV / IR Control

| SKU | Name | What It Does |
|---|---|---|
| PC-AV-IR | IR Blaster Module | Multi-zone IR transmitter — controls TV, decoder, AV receiver, projector via infrared |
| PC-AV-IRL | IR Learner | Learns IR codes from any existing remote |
| PC-AV-HDMI | HDMI Matrix Interface | Integrates HDMI matrix switches for AV distribution |
| PC-AV-CEC | HDMI-CEC Adapter | USB-CEC dongle plugged into TV HDMI port — enables two-way TV control over HDMI (power, input, volume) without IR line-of-sight. Phase 2 product. |
| PC-AV-BOX | PropertyCore Media Box | Per-room ARM media player. HDMI output to TV, HDMI-CEC native, runs Jellyfin client + Spotify Connect receiver + PropertyCore kiosk UI. Controlled by hub over network. Replaces Chromecast/Fire TV Stick with a fully integrated PropertyCore-branded device. Long-term product. |

---

## Category 19 — Network / Gateway Modules

Bridges between PropertyCore and third-party protocols.

| SKU | Name | Bridges |
|---|---|---|
| PC-NET-ZB | Zigbee Coordinator (USB) | Zigbee ↔ Hub MQTT (for HC-1 without onboard Zigbee) |
| PC-NET-KNX | KNX Gateway | KNX/IP ↔ PropertyCore (for properties with existing KNX) |
| PC-NET-DALI | DALI Gateway | DALI ↔ PropertyCore (for commercial DALI lighting) |
| PC-NET-MOD | Modbus Gateway | RS485 Modbus ↔ Wi-Fi MQTT bridge |
| PC-NET-MTR | Matter Bridge | Exposes PropertyCore devices to Matter ecosystem (Alexa, Google, Apple) |

---

## Category 20 — Audio / Media Distribution

Multi-room audio hardware. PropertyCore Hub handles all media sources in software (Jellyfin, Spotify Connect, AirPlay 2, Internet Radio, IPTV). This category covers the physical amplification and speaker hardware that delivers audio to rooms.

| SKU | Name | Zones | Output Power | Notes |
|---|---|---|---|---|
| PC-AUD-AMP4 | 4-Zone Audio Amplifier | 4 | 2 × 30W per zone | Class-D, low heat, DIN rail mount, line-in + network audio |
| PC-AUD-AMP8 | 8-Zone Audio Amplifier | 8 | 2 × 30W per zone | For large homes, hotels, commercial |
| PC-AUD-SPK-IC6 | In-Ceiling Speaker Pair 6.5" | — | Passive | 6.5" 2-way in-ceiling, 8Ω, 60W RMS, sold in pairs |
| PC-AUD-SPK-IC4 | In-Ceiling Speaker Pair 4" | — | Passive | 4" compact in-ceiling, 8Ω, 30W RMS, for small rooms / bathrooms |
| PC-AUD-LINE | Line Input Module | 1 | — | Accepts 3.5mm / RCA line-in from TV or external source, feeds into amp zone |

**Features (amplifier modules):**
- Controlled by PropertyCore Hub via network (Snapcast audio stream)
- Per-zone volume control from mobile app, wall panel, and smart remote
- Zone grouping for synchronised multi-room playback
- Input: network audio (Snapcast), line-in (PC-AUD-LINE), or USB audio
- Output: passive speaker terminals (left + right per zone)
- DIN rail mountable alongside relay and energy modules in electrical panel
- OTA firmware updates
- Sourcing: OEM class-D multi-zone amplifier boards, rebrand and firmware integration

**Media Source Architecture (software — runs on hub):**

| Source | Type | Who Uses It |
|---|---|---|
| Jellyfin | Hub-native | Local movie / TV / music library from NAS — no subscription |
| Spotify Connect (librespot) | Hub-native | Guest opens Spotify app, sees room as a speaker — no PropertyCore app needed |
| Apple AirPlay 2 (shairport-sync) | Hub-native | Guest AirPlays from iPhone / Mac directly to room speakers |
| Google Cast | Hub-native | Guest casts from Android / Chrome to room |
| Snapcast | Hub-native | Synchronised multi-room audio — lobby / corridors / pool all in sync |
| Internet Radio (stream URLs) | Hub-native | Background music for lobbies — no subscription |
| IPTV (Tvheadend) | Hub-native | Cable / satellite IPTV channels restreamed to any room or device |
| Netflix / Apple TV+ / Prime Video | External device | IR control via PC-AV-IR (MVP). HDMI-CEC via PC-AV-CEC or PC-AV-BOX (Phase 2+). PropertyCore does not serve the content. |
| DStv / GOtv / StarTimes / Canal+ | External device | IR control of decoder — channel navigation, power, guide. Critical for Nigeria. |
| Showmax | External device | African streaming service — IR control of Smart TV (MVP). CEC via PC-AV-BOX (Phase 2+). |

---

## Product Library Summary

| Category | SKUs Planned |
|---|---|
| Hub / Controller | 3 |
| Relay Modules | 6 |
| Dimmer Modules | 4 |
| Curtain Controllers | 3 |
| AC Gateways | 3 |
| Energy Meters | 4 |
| Inverter Interfaces | 3 |
| Water Management | 3 |
| Generator Management | 3 |
| Sensors | 9 |
| Environmental Sensors | 3 |
| Wall Panels | 3 |
| Keypads / Scene Controllers | 5 |
| Smart Remotes | 3 |
| Access Control | 5 |
| Intercom / Doorbell | 3 |
| Security / Alarm | 4 |
| AV / IR Control | 5 |
| Network / Gateways | 5 |
| Audio / Media Distribution | 5 |
| **Total** | **85 SKUs** |

---

## Sourcing Notes

| Product Type | Sourcing Strategy |
|---|---|
| Relay modules | OEM ESP32 bare relay boards — reflash with PropertyCore firmware |
| Dimmer modules | OEM bare dimmer boards — reflash |
| Curtain controllers | OEM bare motor controller boards — reflash |
| AC gateways | OEM IR + sensor boards — reflash |
| Sensors (Zigbee) | OEM Zigbee sensor modules — reflash with Zephyr firmware |
| Wall panels | OEM Android/Linux wall panel boards — install PropertyCore kiosk app |
| Keypads | OEM glass/plastic keypad boards — reflash |
| Smart Remote V1 | Custom PCB — ESP32-S3 + LVGL (PropertyCore original design) |
| Hub HC-1 | Raspberry Pi 5 + carrier board + custom enclosure |
| Hub HC-3 | Pi CM5 + custom carrier board (PropertyCore original design) |
| Hub HC-Pro | RK3588 board + custom enclosure |
| Access control | OEM electric lock / RFID boards — integrate via Wiegand or RS485 |
| Energy meters | Standard DIN rail RS485 Modbus meters (DTSU666 / compatible) |
| Audio amplifiers | OEM class-D multi-zone amplifier boards — rebrand and integrate via Snapcast |
| In-ceiling speakers | OEM passive in-ceiling speakers — rebrand only |
| PC-AV-CEC | USB-CEC adapter (e.g. Pulse-Eight) — branded and bundled |
| PC-AV-BOX | Custom ARM board (e.g. RK3326 or similar) + PropertyCore firmware + branded enclosure |

---

*Product Library v0.3 — April 2026. Concept stage.*  
*All SKUs represent planned products. None are in production.*
