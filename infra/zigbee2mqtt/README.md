# Zigbee2MQTT Container Integration (ThinkPad)

Run Zigbee2MQTT as a local container and expose its frontend inside PropertyCore via nginx at `/zigbee2mqtt/`.

## Start / stop

```bash
cd ~/projects/propertycore-os/infra/zigbee2mqtt
docker compose up -d
```

```bash
cd ~/projects/propertycore-os/infra/zigbee2mqtt
docker compose down
```

## Configure before first run

Edit `data/configuration.yaml`:
- Set `serial.port` to your coordinator device path.
- Keep `mqtt.server` pointed at the local Mosquitto broker.
- Frontend runs on port `8099`.

## Verify

```bash
curl -I http://127.0.0.1:8099/
```

Then open:
- `/admin/integrations`
- `/admin/zigbee2mqtt`
- `/zigbee2mqtt/`

## Notes

- This is a standalone upstream service, not a Home Assistant add-on.
- PropertyCore should consume Zigbee2MQTT events over MQTT and translate them through a PropertyCore adapter layer.
- Default device mapping and discovery bridge are not implemented yet in this scaffold.
