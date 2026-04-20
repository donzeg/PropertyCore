#pragma once

#define NVS_CONFIG_STR_MAX  64

// Runtime configuration loaded from NVS at boot.
// If a key is absent from NVS, the corresponding compile-time default is used.
typedef struct {
    char device_id[NVS_CONFIG_STR_MAX];  // e.g. "relay-01"
    char broker_ip[NVS_CONFIG_STR_MAX];  // e.g. "192.168.1.100"
    char wifi_ssid[NVS_CONFIG_STR_MAX];
    char wifi_pass[NVS_CONFIG_STR_MAX];
} pc_config_t;

// Initialise NVS flash and load config into *cfg.
// Falls back to compile-time defaults (config.h) for any missing NVS key.
void nvs_config_init(pc_config_t *cfg);

// Write *cfg back to NVS (persist new values set at runtime).
void nvs_config_save(const pc_config_t *cfg);
