# PropertyCore — Smart Property Automation Ecosystem

> A productized, locally-controlled smart automation platform built for African hotels, estates, and commercial properties.

---

## The Problem

Most smart home/property automation systems sold in Africa are:

- Imported, overpriced, and poorly supported locally
- Dependent on cloud services that fail with unstable internet
- Too broad (Home Assistant) or too locked (Control4) for commercial deployment
- Priced for Western markets — not sized for Nigerian estate developers, hotel chains, or apartment complexes

A hotel room controller that costs $300 from a US vendor could be built, supported, and serviced locally for a fraction of that — with better local fit.

---

## The Solution

**PropertyCore** is a focused, closed-loop property automation ecosystem that covers:

| Domain | What It Controls |
|---|---|
| Lighting | Switches, dimmers, scenes |
| Climate | AC units (IR + smart gateway) |
| Power | Energy monitoring, generator switching |
| Access | Gate controllers, door locks |
| Entertainment | TV/AV scene control, local media streaming (Jellyfin), multi-room audio, IR/CEC TV control, smart remote |
| Guest/Tenant UX | Mobile app, wall panel, smart remote |
| Operations | Housekeeping, maintenance alerts, dashboards |

---

## Architecture: Platform + Hardware Ecosystem

PropertyCore is two things working together:

**1. The Platform** — software deployed on-site at every customer location, like Control4's Director or HDL's logic controller. It manages devices, runs automation logic, serves the mobile app, and handles multimedia routing. It is installed by a certified PropertyCore engineer and configured for that property.

**2. The Device Ecosystem** — branded hardware modules (switches, relays, AC gateways, wall panels, smart remotes) that run PropertyCore firmware. These devices only pair with a PropertyCore platform instance. No third-party app controls them.

Together they form a closed commercial product — a platform that is useless without the hardware, and hardware that is useless without the platform. That is the same model Control4, HDL Buspro, KNX, and Loxone use to create commercial lock-in.

---

## Why Not Just Use Home Assistant?

Home Assistant is a great open platform. It is not a commercial product.

Commercial installations need:

- **Stability** — no community plugin breakage after updates
- **Predictability** — same behavior across every site
- **Curated device support** — only approved, certified hardware
- **Installation model** — engineer-deployed, not DIY
- **Local support** — someone physically able to service it

PropertyCore is not Home Assistant with a skin. It is a controlled product with a defined device ecosystem, an installation model, and a support structure.

---

## Target Markets

**Primary**
- Boutique hotels and serviced apartments (Nigeria / West Africa)
- Luxury residential estates
- Short-let property operators

**Secondary**
- Corporate offices
- Hospital and clinic facilities
- Educational facilities

---

## Status

> **Concept / Pre-MVP** — Idea documented for future build, funding, or licensing.

- [ ] Concept architecture (done — see [CONCEPT.md](./CONCEPT.md))
- [ ] MVP hardware prototype (ESP32 remote + relay board)
- [ ] MVP software (local controller + mobile app)
- [ ] Pilot installation
- [ ] Commercial rollout

---

## Hardware Sourcing Strategy

PropertyCore does not manufacture bare PCBs from scratch initially. The strategy is:

1. **Source OEM bare boards** — Chinese manufacturers (Shenzhen ecosystem) produce wall switch modules, dimmer boards, relay modules, AC controllers, and wall panels as unbranded or white-label hardware. Many Tuya-branded sellers use the same physical boards under different names.
2. **Flash PropertyCore firmware** — buy the bare board, replace the vendor firmware with our own ESP-IDF / Zephyr firmware that speaks the PropertyCore protocol.
3. **Brand and certify** — enclosure, label, and certify under the PropertyCore brand.
4. **Build custom hardware over time** — as volumes grow, design and manufacture original PCBs for differentiated products (the smart remote, hub, wall panel, and eventually the **PropertyCore Media Box (PC-AV-BOX)** — a per-room ARM media player with HDMI out, native CEC, and Jellyfin client).

This is how dozens of KNX and Zigbee hardware vendors operate — the electronics are commodity, the value is in the firmware, platform integration, and brand.

---

## Repo Purpose

This repository documents the product concept, architecture, and market case for **PropertyCore**.  
It is part of an idea portfolio being developed for future build, investor pitch, or licensing.

---

*Last updated: April 2026*
