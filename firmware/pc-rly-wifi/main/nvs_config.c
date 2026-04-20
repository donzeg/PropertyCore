#include "nvs_config.h"
#include "config.h"
#include "nvs_flash.h"
#include "nvs.h"
#include "esp_log.h"
#include <string.h>

static const char *TAG    = "nvs_config";
static const char *NVS_NS = "pc_cfg";

static void apply_defaults(pc_config_t *cfg)
{
    strncpy(cfg->device_id, PC_DEVICE_ID_DEFAULT,   NVS_CONFIG_STR_MAX - 1);
    strncpy(cfg->broker_ip, PC_MQTT_BROKER_DEFAULT, NVS_CONFIG_STR_MAX - 1);
    strncpy(cfg->wifi_ssid, PC_WIFI_SSID_DEFAULT,   NVS_CONFIG_STR_MAX - 1);
    strncpy(cfg->wifi_pass, PC_WIFI_PASS_DEFAULT,   NVS_CONFIG_STR_MAX - 1);
}

void nvs_config_init(pc_config_t *cfg)
{
    memset(cfg, 0, sizeof(*cfg));
    apply_defaults(cfg);

    esp_err_t err = nvs_flash_init();
    if (err == ESP_ERR_NVS_NO_FREE_PAGES || err == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_LOGW(TAG, "NVS partition reset");
        nvs_flash_erase();
        nvs_flash_init();
    }

    nvs_handle_t h;
    if (nvs_open(NVS_NS, NVS_READONLY, &h) != ESP_OK) {
        ESP_LOGI(TAG, "No NVS config — using compile-time defaults");
        return;
    }

    // Read each key; silently keep the default if the key is absent.
    size_t len;
    len = NVS_CONFIG_STR_MAX; nvs_get_str(h, "device_id", cfg->device_id, &len);
    len = NVS_CONFIG_STR_MAX; nvs_get_str(h, "broker_ip", cfg->broker_ip, &len);
    len = NVS_CONFIG_STR_MAX; nvs_get_str(h, "wifi_ssid", cfg->wifi_ssid, &len);
    len = NVS_CONFIG_STR_MAX; nvs_get_str(h, "wifi_pass", cfg->wifi_pass, &len);
    nvs_close(h);

    ESP_LOGI(TAG, "Config loaded — device_id=%s broker=%s ssid=%s",
             cfg->device_id, cfg->broker_ip, cfg->wifi_ssid);
}

void nvs_config_save(const pc_config_t *cfg)
{
    nvs_handle_t h;
    if (nvs_open(NVS_NS, NVS_READWRITE, &h) != ESP_OK) {
        ESP_LOGE(TAG, "Failed to open NVS for write");
        return;
    }
    nvs_set_str(h, "device_id", cfg->device_id);
    nvs_set_str(h, "broker_ip", cfg->broker_ip);
    nvs_set_str(h, "wifi_ssid", cfg->wifi_ssid);
    nvs_set_str(h, "wifi_pass", cfg->wifi_pass);
    nvs_commit(h);
    nvs_close(h);
    ESP_LOGI(TAG, "Config saved to NVS");
}
