# ESPHome Container Integration (ThinkPad)

Run ESPHome Dashboard as a local container and expose it inside PropertyCore via nginx at `/esphome/`.

## Why this shape

- ESPHome runs as an independent service process.
- PropertyCore keeps a single UI entrypoint for engineers.
- ESPHome listens on host port `6052` so LAN/Tailscale browsers can open it.

## Start / stop

```bash
cd ~/projects/propertycore-os/infra/esphome
docker compose up -d
```

```bash
cd ~/projects/propertycore-os/infra/esphome
docker compose down
```

## Verify

```bash
curl -I http://127.0.0.1:6052/
```

Then from the PropertyCore UI, open:

- `/admin/esphome` (embedded builder page)
- `/esphome/` (direct proxied endpoint)

## Notes

- ESPHome project files persist in `infra/esphome/config/`.
- Keep this directory local; do not commit secrets or Wi-Fi credentials.
- If the container image updates, restart with `docker compose pull && docker compose up -d`.
