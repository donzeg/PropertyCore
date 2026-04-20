#pragma once

typedef struct {
    const char *broker_ip;  // MQTT broker IP address
    int         port;       // MQTT broker port (default: 1883)
    const char *device_id;  // Unique device ID used in MQTT topics
} mqtt_pc_config_t;

// Initialise and start the MQTT client.
// On connect: subscribes to the cmd topic and publishes current relay state.
// Reconnects automatically on disconnect.
void mqtt_pc_init(const mqtt_pc_config_t *cfg);

// Build and publish the current relay state JSON to the state topic.
// Safe to call from any task after mqtt_pc_init().
void mqtt_pc_publish_state(void);
