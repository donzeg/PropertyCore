#include "relay.h"
#include "config.h"
#include "driver/gpio.h"
#include "esp_log.h"

static const char *TAG = "relay";

// All six possible GPIO pins — only the first RELAY_CHANNEL_COUNT are used.
static const int relay_gpios[] = {
    RELAY_CH1_GPIO, RELAY_CH2_GPIO, RELAY_CH3_GPIO,
    RELAY_CH4_GPIO, RELAY_CH5_GPIO, RELAY_CH6_GPIO,
};

static bool relay_state[RELAY_CHANNEL_COUNT];

void relay_init(void)
{
    gpio_config_t io = {
        .mode         = GPIO_MODE_OUTPUT,
        .pull_up_en   = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type    = GPIO_INTR_DISABLE,
    };

    for (int i = 0; i < RELAY_CHANNEL_COUNT; i++) {
        io.pin_bit_mask = (1ULL << relay_gpios[i]);
        gpio_config(&io);
        relay_state[i] = false;
        // Drive to OFF level immediately — do not energise relays at boot.
        gpio_set_level(relay_gpios[i], RELAY_ACTIVE_LOW ? 1 : 0);
    }

    ESP_LOGI(TAG, "Relay driver ready — %d channels", RELAY_CHANNEL_COUNT);
}

void relay_set(int channel, bool on)
{
    if (channel < 1 || channel > RELAY_CHANNEL_COUNT) {
        ESP_LOGW(TAG, "relay_set: channel %d out of range", channel);
        return;
    }
    int idx   = channel - 1;
    int level = RELAY_ACTIVE_LOW ? (on ? 0 : 1) : (on ? 1 : 0);
    relay_state[idx] = on;
    gpio_set_level(relay_gpios[idx], level);
    ESP_LOGI(TAG, "ch%d -> %s", channel, on ? "ON" : "OFF");
}

bool relay_get(int channel)
{
    if (channel < 1 || channel > RELAY_CHANNEL_COUNT) return false;
    return relay_state[channel - 1];
}

void relay_get_all(bool states[])
{
    for (int i = 0; i < RELAY_CHANNEL_COUNT; i++) {
        states[i] = relay_state[i];
    }
}

void relay_toggle(int channel)
{
    if (channel < 1 || channel > RELAY_CHANNEL_COUNT) return;
    relay_set(channel, !relay_state[channel - 1]);
}
