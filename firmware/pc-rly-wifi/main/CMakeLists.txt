idf_component_register(
    SRCS
        "main.c"
        "relay.c"
        "nvs_config.c"
        "mqtt_pc.c"
    INCLUDE_DIRS "."
    REQUIRES
        esp_wifi
        mqtt
        nvs_flash
        driver
        json
        esp_event
        esp_netif
)
