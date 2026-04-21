# PropertyCore Mobile App

Flutter app for the PropertyCore smart property platform.

## Architecture

- **Zero hardcoded UI** — all rooms, devices, and scenes are fetched live from the engine API
- **4 tabs**: Home (quick scenes + device tiles), Rooms (floor tabs + area list), Scenes (execute), More (appearance settings)
- **Live state**: WebSocket (`/ws`) pushes device state changes in real time
- **Themes**: 3 background modes (Dark / Light / Theme) × 5 accent colours (Emerald / Sapphire / Amber / Rose / Violet)

## Screens

| Screen | Description |
|---|---|
| Connect | Enter hub IP on first launch |
| Login | User list + PIN pad |
| Home | Greeting, quick scenes, area chips, device tile grid |
| Rooms | Floor tabs, area rows → room detail |
| Scenes | Scene list + execute button |
| More | Appearance settings (mode + accent) |

## Connecting to the hub

The app connects to `http://[hub-ip]/api/v1/` and `ws://[hub-ip]/ws`.

Default hub port: **80** (nginx proxies `/api/v1/` → engine `:8080`).

## Running

```bash
cd mobile
flutter pub get
flutter run
```

## Building

```bash
# Android APK
flutter build apk --release

# Android App Bundle (Play Store)
flutter build appbundle --release

# iOS
flutter build ios --release
```

## Dependencies

| Package | Purpose |
|---|---|
| `provider` | State management |
| `http` | REST API calls |
| `web_socket_channel` | WebSocket live updates |
| `shared_preferences` | Persist hub IP, token, theme prefs |
