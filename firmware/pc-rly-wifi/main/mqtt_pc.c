#include "mqtt_pc.h"
#include "relay.h"
#include "config.h"
#include "mqtt_client.h"
#include "cJSON.h"
#include "esp_log.h"
#include <stdio.h>
#include <string.h>

static const char *TAG = "mqtt_pc";

static esp_mqtt_client_handle_t s_client;
static char s_topic_state[128];
static char s_topic_cmd[128];

// ─── State publish ────────────────────────────────────────────────────────────

void mqtt_pc_publish_state(void)
{
    bool states[RELAY_CHANNEL_COUNT];
    relay_get_all(states);

    cJSON *root = cJSON_CreateObject();
    cJSON_AddStringToObject(root, "type", "relay");

    // Publish each channel as "ch1", "ch2", ... "chN".
    char key[8];
    for (int i = 0; i < RELAY_CHANNEL_COUNT; i++) {
        snprintf(key, sizeof(key), "ch%d", i + 1);
        cJSON_AddBoolToObject(root, key, states[i]);
    }

    char *payload = cJSON_PrintUnformatted(root);
    if (payload) {
        // QoS 1, retain=1 so hub sees the state immediately on connection.
        esp_mqtt_client_publish(s_client, s_topic_state, payload, 0, 1, 1);
        ESP_LOGI(TAG, "state -> %s", payload);
        cJSON_free(payload);
    }
    cJSON_Delete(root);
}

// ─── Command handler ──────────────────────────────────────────────────────────

// Payload format: {"ch1":true,"ch2":false, ...}
// Any subset of channels may be present; absent channels are unchanged.
static void handle_cmd(const char *data, int data_len)
{
    // Reject unexpectedly large payloads before parsing.
    if (data_len <= 0 || data_len > 256) {
        ESP_LOGW(TAG, "cmd payload size %d ignored", data_len);
        return;
    }

    char buf[257];
    memcpy(buf, data, data_len);
    buf[data_len] = '\0';

    cJSON *root = cJSON_Parse(buf);
    if (!root) {
        ESP_LOGW(TAG, "invalid JSON cmd: %s", buf);
        return;
    }

    bool changed = false;
    char key[8];
    for (int i = 0; i < RELAY_CHANNEL_COUNT; i++) {
        snprintf(key, sizeof(key), "ch%d", i + 1);
        cJSON *item = cJSON_GetObjectItem(root, key);
        if (item && cJSON_IsBool(item)) {
            relay_set(i + 1, cJSON_IsTrue(item));
            changed = true;
        }
    }
    cJSON_Delete(root);

    if (changed) {
        mqtt_pc_publish_state();
    }
}

// ─── MQTT event handler ───────────────────────────────────────────────────────

static void mqtt_event_handler(void *arg, esp_event_base_t base,
                                int32_t event_id, void *event_data)
{
    esp_mqtt_event_handle_t event = event_data;

    switch ((esp_mqtt_event_id_t)event_id) {
    case MQTT_EVENT_CONNECTED:
        ESP_LOGI(TAG, "MQTT connected");
        esp_mqtt_client_subscribe(s_client, s_topic_cmd, 1);
        mqtt_pc_publish_state();
        break;

    case MQTT_EVENT_DISCONNECTED:
        ESP_LOGW(TAG, "MQTT disconnected — will retry");
        break;

    case MQTT_EVENT_DATA:
        if (event->topic_len > 0 &&
            strncmp(event->topic, s_topic_cmd, event->topic_len) == 0) {
            handle_cmd(event->data, event->data_len);
        }
        break;

    case MQTT_EVENT_ERROR:
        ESP_LOGE(TAG, "MQTT error");
        break;

    default:
        break;
    }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

void mqtt_pc_init(const mqtt_pc_config_t *cfg)
{
    snprintf(s_topic_state, sizeof(s_topic_state), PC_TOPIC_STATE_FMT, cfg->device_id);
    snprintf(s_topic_cmd,   sizeof(s_topic_cmd),   PC_TOPIC_CMD_FMT,   cfg->device_id);

    char uri[128];
    snprintf(uri, sizeof(uri), "mqtt://%s:%d", cfg->broker_ip, cfg->port);

    const esp_mqtt_client_config_t mqtt_cfg = {
        .broker.address.uri       = uri,
        .credentials.client_id    = cfg->device_id,
        // Last-will message: published by the broker if the device disconnects
        // unexpectedly. Marks the device offline in the hub's device registry.
        .session.last_will = {
            .topic  = s_topic_state,
            .msg    = "{\"type\":\"relay\",\"online\":false}",
            .qos    = 1,
            .retain = 1,
        },
        .network.reconnect_timeout_ms = 5000,
    };

    s_client = esp_mqtt_client_init(&mqtt_cfg);
    esp_mqtt_client_register_event(s_client, ESP_EVENT_ANY_ID,
                                    mqtt_event_handler, NULL);
    esp_mqtt_client_start(s_client);

    ESP_LOGI(TAG, "MQTT client started — broker=%s device_id=%s",
             uri, cfg->device_id);
}
