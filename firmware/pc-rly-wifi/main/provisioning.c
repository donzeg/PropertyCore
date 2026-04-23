#include "provisioning.h"
#include "nvs_config.h"
#include "config.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_netif.h"
#include "esp_http_server.h"
#include "esp_log.h"
#include "esp_mac.h"
#include "esp_system.h"
#include "nvs_flash.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include <string.h>
#include <stdio.h>
#include <stdlib.h>

static const char *TAG = "provisioning";

// ─── HTML pages ───────────────────────────────────────────────────────────────

// Config form — served at GET /
// The device_id field is pre-filled with the AP name (PC-RLY-XXXXXX).
static const char *HTML_FORM_HEAD =
    "<!DOCTYPE html><html><head>"
    "<meta charset=utf-8>"
    "<meta name=viewport content='width=device-width,initial-scale=1'>"
    "<title>PropertyCore Setup</title>"
    "<style>"
    "body{font-family:system-ui,sans-serif;background:#18181b;color:#f4f4f5;"
    "display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}"
    ".card{background:#27272a;border:1px solid #3f3f46;border-radius:16px;"
    "padding:32px;width:100%;max-width:360px;box-sizing:border-box}"
    "h2{margin:0 0 4px;font-size:20px;color:#fff}"
    "p.sub{margin:0 0 24px;font-size:13px;color:#71717a}"
    "label{display:block;font-size:12px;font-weight:600;color:#a1a1aa;"
    "margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em}"
    "input{width:100%;box-sizing:border-box;background:#18181b;border:1px solid #3f3f46;"
    "border-radius:8px;padding:10px 12px;color:#f4f4f5;font-size:14px;margin-bottom:16px;outline:none}"
    "input:focus{border-color:#10b981}"
    "button{width:100%;background:#10b981;color:#fff;border:none;border-radius:8px;"
    "padding:12px;font-size:15px;font-weight:600;cursor:pointer}"
    "button:active{background:#059669}"
    ".logo{font-size:13px;font-weight:700;color:#10b981;margin-bottom:20px}"
    "</style></head><body><div class=card>"
    "<div class=logo>&#9632; PropertyCore</div>"
    "<h2>Device Setup</h2>"
    "<p class=sub>Connect this device to your site network.</p>"
    "<form method=POST action=/save>";

static const char *HTML_FORM_TAIL =
    "<label>Device ID</label>"
    "<input name=device_id maxlength=63 required placeholder='e.g. relay-01'>"
    "<label>Hub IP Address</label>"
    "<input name=broker_ip maxlength=63 required placeholder='e.g. 192.168.1.100'>"
    "<label>Wi-Fi Network Name (SSID)</label>"
    "<input name=wifi_ssid maxlength=63 required>"
    "<label>Wi-Fi Password</label>"
    "<input name=wifi_pass type=password maxlength=63>"
    "<button type=submit>Connect &amp; Register</button>"
    "</form></div></body></html>";

static const char *HTML_SUCCESS =
    "<!DOCTYPE html><html><head>"
    "<meta charset=utf-8>"
    "<meta name=viewport content='width=device-width,initial-scale=1'>"
    "<title>PropertyCore Setup</title>"
    "<style>"
    "body{font-family:system-ui,sans-serif;background:#18181b;color:#f4f4f5;"
    "display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}"
    ".card{background:#27272a;border:1px solid #3f3f46;border-radius:16px;"
    "padding:32px;width:100%;max-width:360px;text-align:center}"
    "h2{color:#10b981} p{color:#a1a1aa;font-size:14px}"
    "</style></head><body><div class=card>"
    "<h2>&#10003; Connected</h2>"
    "<p>Configuration saved. The device is rebooting and will connect to your network.</p>"
    "<p>You can close this page. The device will appear in the PropertyCore dashboard within 30 seconds.</p>"
    "</div></body></html>";

// ─── URL decode (minimal — handles %XX and + for space) ───────────────────────

static void url_decode(const char *src, char *dst, size_t dstlen)
{
    size_t i = 0;
    while (*src && i < dstlen - 1) {
        if (*src == '%' && src[1] && src[2]) {
            char hex[3] = {src[1], src[2], 0};
            dst[i++] = (char)strtol(hex, NULL, 16);
            src += 3;
        } else if (*src == '+') {
            dst[i++] = ' ';
            src++;
        } else {
            dst[i++] = *src++;
        }
    }
    dst[i] = '\0';
}

// Extract a named field from application/x-www-form-urlencoded body.
static void form_field(const char *body, const char *key, char *out, size_t outlen)
{
    out[0] = '\0';
    size_t klen = strlen(key);
    const char *p = body;
    while (*p) {
        if (strncmp(p, key, klen) == 0 && p[klen] == '=') {
            p += klen + 1;
            // Find end of value (& or end of string)
            const char *end = strchr(p, '&');
            size_t vlen = end ? (size_t)(end - p) : strlen(p);
            if (vlen >= outlen) vlen = outlen - 1;
            char tmp[NVS_CONFIG_STR_MAX];
            if (vlen >= sizeof(tmp)) vlen = sizeof(tmp) - 1;
            memcpy(tmp, p, vlen);
            tmp[vlen] = '\0';
            url_decode(tmp, out, outlen);
            return;
        }
        // Skip to next field
        p = strchr(p, '&');
        if (!p) break;
        p++;
    }
}

// ─── Shared state — config written by POST handler, read by reboot task ───────

static pc_config_t s_new_cfg;
static volatile int s_do_reboot = 0;

// ─── HTTP Handlers ────────────────────────────────────────────────────────────

static esp_err_t handle_get_root(httpd_req_t *req)
{
    httpd_resp_set_type(req, "text/html");
    httpd_resp_send_chunk(req, HTML_FORM_HEAD, HTTPD_RESP_USE_STRLEN);
    httpd_resp_send_chunk(req, HTML_FORM_TAIL, HTTPD_RESP_USE_STRLEN);
    httpd_resp_send_chunk(req, NULL, 0);
    return ESP_OK;
}

static esp_err_t handle_post_save(httpd_req_t *req)
{
    // Read body (form data)
    char body[512] = {0};
    int total = req->content_len < (int)sizeof(body) - 1
                    ? req->content_len
                    : (int)sizeof(body) - 1;
    int received = 0;
    while (received < total) {
        int r = httpd_req_recv(req, body + received, total - received);
        if (r <= 0) break;
        received += r;
    }
    body[received] = '\0';
    ESP_LOGI(TAG, "POST /save body: %s", body);

    // Parse fields
    char device_id[NVS_CONFIG_STR_MAX] = {0};
    char broker_ip[NVS_CONFIG_STR_MAX] = {0};
    char wifi_ssid[NVS_CONFIG_STR_MAX] = {0};
    char wifi_pass[NVS_CONFIG_STR_MAX] = {0};

    form_field(body, "device_id", device_id, sizeof(device_id));
    form_field(body, "broker_ip", broker_ip, sizeof(broker_ip));
    form_field(body, "wifi_ssid", wifi_ssid, sizeof(wifi_ssid));
    form_field(body, "wifi_pass", wifi_pass, sizeof(wifi_pass));

    // Validate required fields
    if (device_id[0] == '\0' || broker_ip[0] == '\0' || wifi_ssid[0] == '\0') {
        httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST,
                            "device_id, broker_ip, and wifi_ssid are required");
        return ESP_OK;
    }

    // Save to NVS
    strncpy(s_new_cfg.device_id, device_id, NVS_CONFIG_STR_MAX - 1);
    strncpy(s_new_cfg.broker_ip, broker_ip, NVS_CONFIG_STR_MAX - 1);
    strncpy(s_new_cfg.wifi_ssid, wifi_ssid, NVS_CONFIG_STR_MAX - 1);
    strncpy(s_new_cfg.wifi_pass, wifi_pass, NVS_CONFIG_STR_MAX - 1);
    nvs_config_save(&s_new_cfg);

    ESP_LOGI(TAG, "Config saved — device_id=%s broker=%s ssid=%s",
             device_id, broker_ip, wifi_ssid);

    // Respond with success page, then signal reboot
    httpd_resp_set_type(req, "text/html");
    httpd_resp_sendstr(req, HTML_SUCCESS);

    s_do_reboot = 1;
    return ESP_OK;
}

static esp_err_t handle_get_status(httpd_req_t *req)
{
    httpd_resp_set_type(req, "application/json");
    httpd_resp_sendstr(req, "{\"mode\":\"provisioning\",\"ok\":true}");
    return ESP_OK;
}

// ─── AP + HTTP server setup ───────────────────────────────────────────────────

static void start_ap(void)
{
    // Build SSID from last 3 bytes of MAC: "PC-RLY-AABBCC"
    uint8_t mac[6];
    esp_read_mac(mac, ESP_MAC_WIFI_SOFTAP);
    char ap_ssid[32];
    snprintf(ap_ssid, sizeof(ap_ssid), "PC-RLY-%02X%02X%02X",
             mac[3], mac[4], mac[5]);

    esp_netif_create_default_wifi_ap();

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    esp_wifi_init(&cfg);

    wifi_config_t ap_cfg = {
        .ap = {
            .ssid_len       = 0,
            .channel        = 1,
            .authmode       = WIFI_AUTH_OPEN,
            .max_connection = 4,
        },
    };
    strncpy((char *)ap_cfg.ap.ssid, ap_ssid, sizeof(ap_cfg.ap.ssid) - 1);

    esp_wifi_set_mode(WIFI_MODE_AP);
    esp_wifi_set_config(WIFI_IF_AP, &ap_cfg);
    esp_wifi_start();

    ESP_LOGI(TAG, "Provisioning AP started: SSID=%s  IP=192.168.4.1", ap_ssid);
}

static httpd_handle_t start_http_server(void)
{
    httpd_config_t config = HTTPD_DEFAULT_CONFIG();
    config.server_port = 80;
    config.lru_purge_enable = true;

    httpd_handle_t server = NULL;
    if (httpd_start(&server, &config) != ESP_OK) {
        ESP_LOGE(TAG, "Failed to start HTTP server");
        return NULL;
    }

    httpd_uri_t get_root  = { .uri = "/",       .method = HTTP_GET,  .handler = handle_get_root,   .user_ctx = NULL };
    httpd_uri_t post_save = { .uri = "/save",    .method = HTTP_POST, .handler = handle_post_save,  .user_ctx = NULL };
    httpd_uri_t get_status = { .uri = "/status", .method = HTTP_GET,  .handler = handle_get_status, .user_ctx = NULL };

    httpd_register_uri_handler(server, &get_root);
    httpd_register_uri_handler(server, &post_save);
    httpd_register_uri_handler(server, &get_status);

    ESP_LOGI(TAG, "HTTP server running on port 80");
    return server;
}

// ─── Public API ───────────────────────────────────────────────────────────────

int provisioning_needed(const pc_config_t *cfg)
{
    return cfg->wifi_ssid[0] == '\0';
}

void provisioning_run(pc_config_t *cfg)
{
    ESP_LOGI(TAG, "Entering provisioning mode");

    // NVS flash must already be initialised by nvs_config_init().
    esp_event_loop_create_default();
    esp_netif_init();

    start_ap();
    start_http_server();

    // Copy current config as base for new values
    memcpy(&s_new_cfg, cfg, sizeof(pc_config_t));

    ESP_LOGI(TAG, "Waiting for technician to submit config form...");

    // Block until POST /save handler sets s_do_reboot
    while (!s_do_reboot) {
        vTaskDelay(pdMS_TO_TICKS(200));
    }

    // Give the HTTP response time to reach the browser
    vTaskDelay(pdMS_TO_TICKS(2000));
    ESP_LOGI(TAG, "Rebooting into normal mode");
    esp_restart();
}
