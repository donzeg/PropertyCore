#pragma once
#include "nvs_config.h"

// ─── PropertyCore Provisioning ────────────────────────────────────────────────
//
// When the device has no Wi-Fi credentials stored in NVS, it enters
// provisioning mode instead of attempting to connect to a network.
//
// In provisioning mode:
//   1. A Wi-Fi Access Point named "PC-RLY-XXXXXX" (last 3 bytes of MAC) is
//      started. No password — open network for easy tech access on site.
//   2. A minimal HTTP server listens on 192.168.4.1:80.
//   3. GET / → returns an HTML form (device ID, Wi-Fi SSID/pass, hub IP).
//   4. POST /save → validates fields, writes to NVS, returns success page,
//      then reboots the device after 2 seconds.
//   5. GET /status → JSON health check (used by dashboard wizard to confirm
//      connection to the provisioning AP).
//
// After reboot the device loads the new NVS config and enters normal STA mode.

// Returns 1 if provisioning is needed (wifi_ssid is blank in NVS).
// Returns 0 if credentials exist — caller should proceed with normal boot.
int provisioning_needed(const pc_config_t *cfg);

// Enter provisioning mode. This function never returns — it blocks until
// the technician submits the form, then reboots the device.
void provisioning_run(pc_config_t *cfg);
