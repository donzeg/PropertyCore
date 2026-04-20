#include <string.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/event_groups.h"
#include "freertos/queue.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_log.h"
#include "driver/gpio.h"
#include "config.h"
#include "relay.h"
#include "nvs_config.h"
#include "mqtt_pc.h"

static const char *TAG = "main";

// ─── Wi-Fi ────────────────────────────────────────────────────────────────────

static EventGroupHandle_t s_wifi_eg;
#define WIFI_CONNECTED_BIT  BIT0

static void wifi_event_handler(void *arg, esp_event_base_t base,
                                int32_t id, void *data)
{
    if (base == WIFI_EVENT && id == WIFI_EVENT_STA_DISCONNECTED) {
        ESP_LOGW(TAG, "Wi-Fi disconnected, retrying");
        esp_wifi_connect();
    } else if (base == IP_EVENT && id == IP_EVENT_STA_GOT_IP) {
        ip_event_got_ip_t *e = data;
        ESP_LOGI(TAG, "Wi-Fi got IP: " IPSTR, IP2STR(&e->ip_info.ip));
        xEventGroupSetBits(s_wifi_eg, WIFI_CONNECTED_BIT);
    }
}

static void wifi_init(const char *ssid, const char *pass)
{
    s_wifi_eg = xEventGroupCreate();
    esp_netif_init();
    esp_event_loop_create_default();
    esp_netif_create_default_wifi_sta();

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    esp_wifi_init(&cfg);

    esp_event_handler_register(WIFI_EVENT, ESP_EVENT_ANY_ID, wifi_event_handler, NULL);
    esp_event_handler_register(IP_EVENT,   IP_EVENT_STA_GOT_IP, wifi_event_handler, NULL);

    wifi_config_t wifi_cfg = {0};
    strncpy((char *)wifi_cfg.sta.ssid,     ssid, sizeof(wifi_cfg.sta.ssid) - 1);
    strncpy((char *)wifi_cfg.sta.password, pass, sizeof(wifi_cfg.sta.password) - 1);

    esp_wifi_set_mode(WIFI_MODE_STA);
    esp_wifi_set_config(WIFI_IF_STA, &wifi_cfg);
    esp_wifi_start();
    esp_wifi_connect();

    ESP_LOGI(TAG, "Wi-Fi connecting to: %s", ssid);
    xEventGroupWaitBits(s_wifi_eg, WIFI_CONNECTED_BIT,
                        pdFALSE, pdTRUE, portMAX_DELAY);
}

// ─── Physical Switch Inputs ───────────────────────────────────────────────────

#if SWITCH_ENABLED

static const int switch_gpios[] = {
    SWITCH_CH1_GPIO, SWITCH_CH2_GPIO, SWITCH_CH3_GPIO,
    SWITCH_CH4_GPIO, SWITCH_CH5_GPIO, SWITCH_CH6_GPIO,
};

static QueueHandle_t s_switch_queue;

static void IRAM_ATTR switch_isr_handler(void *arg)
{
    int channel = (int)(intptr_t)arg;  // 1-based channel number
    xQueueSendFromISR(s_switch_queue, &channel, NULL);
}

static void switch_task(void *arg)
{
    int channel;
    TickType_t last_press[RELAY_CHANNEL_COUNT] = {0};

    while (1) {
        if (xQueueReceive(s_switch_queue, &channel, portMAX_DELAY)) {
            // Debounce: ignore events within SWITCH_DEBOUNCE_MS of the last one.
            TickType_t now = xTaskGetTickCount();
            int idx = channel - 1;
            if ((now - last_press[idx]) >= pdMS_TO_TICKS(SWITCH_DEBOUNCE_MS)) {
                last_press[idx] = now;
                relay_toggle(channel);
                mqtt_pc_publish_state();
                ESP_LOGI("switch", "ch%d toggled via physical switch", channel);
            }
        }
    }
}

static void switch_init(void)
{
    s_switch_queue = xQueueCreate(8, sizeof(int));

    // ISR service must be installed before registering individual handlers.
    gpio_install_isr_service(0);

    gpio_config_t io = {
        .mode         = GPIO_MODE_INPUT,
        .pull_up_en   = GPIO_PULLUP_ENABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type    = GPIO_INTR_NEGEDGE,  // falling edge = switch pressed
    };

    for (int i = 0; i < RELAY_CHANNEL_COUNT; i++) {
        io.pin_bit_mask = (1ULL << switch_gpios[i]);
        gpio_config(&io);
        gpio_isr_handler_add(switch_gpios[i], switch_isr_handler,
                              (void *)(intptr_t)(i + 1));
    }

    xTaskCreate(switch_task, "switch_task", 2048, NULL, 5, NULL);
    ESP_LOGI(TAG, "Physical switch inputs ready — %d channels", RELAY_CHANNEL_COUNT);
}

#endif  // SWITCH_ENABLED

// ─── Entry Point ──────────────────────────────────────────────────────────────

void app_main(void)
{
    ESP_LOGI(TAG, "PropertyCore Relay Firmware");
    ESP_LOGI(TAG, "SKU: PC-RLY-%dCH-W  channels: %d", RELAY_CHANNEL_COUNT, RELAY_CHANNEL_COUNT);

    // 1. Relay outputs — all OFF immediately at boot.
    relay_init();

    // 2. Load config from NVS (falls back to compile-time defaults).
    pc_config_t cfg;
    nvs_config_init(&cfg);

    // 3. Connect to Wi-Fi — blocks until an IP is obtained.
    wifi_init(cfg.wifi_ssid, cfg.wifi_pass);

#if SWITCH_ENABLED
    // 4. Physical wall switch inputs — interrupt-driven, debounced.
    switch_init();
#endif

    // 5. MQTT — connect to hub, subscribe to cmd topic, publish initial state.
    mqtt_pc_config_t mqtt_cfg = {
        .broker_ip = cfg.broker_ip,
        .port      = PC_MQTT_PORT,
        .device_id = cfg.device_id,
    };
    mqtt_pc_init(&mqtt_cfg);

    ESP_LOGI(TAG, "Startup complete — device_id=%s", cfg.device_id);

    // All logic runs in the MQTT client task and the switch_task.
    // The main task keeps the watchdog fed.
    while (1) {
        vTaskDelay(pdMS_TO_TICKS(30000));
    }
}
