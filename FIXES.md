# PropertyCore — Known Issues & Fix Backlog

> Generated: June 2026 — Full codebase review  
> Status key: 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Low · ✅ Fixed

---

## 🔴 Critical

### FIX-001 — Engine API: No authentication on protected endpoints
**File:** `meta-propertycore/recipes-propertycore/propertycore-engine/files/api.go`  
**Status:** ✅ Fixed (engine v0.14.0 — `requireAdminAuth` + `withBodyLimit` middleware wired in `main.go` for all protected routes)

All API endpoint groups except `makeAdminAccountsHandler` perform **zero token validation**. The dashboard sends `Authorization: Bearer <token>` on every request, but the engine ignores it for:
- `makeDevicesHandler`
- `makeScenesHandler`
- `makeRulesHandler`
- `makeAreasHandler`
- `makeFloorsHandler`
- `makePropertyHandler`
- `makeUsersHandler`
- `makeAuthHandler`
- `makeSchedulesHandler`

**Impact:** Any device or browser on the same LAN can call `POST /api/v1/scenes/{id}/execute`, `DELETE /api/v1/devices/{id}`, `PATCH /api/v1/property`, etc. with no credentials.

**Fix:** Add an auth middleware function that extracts the Bearer token from the `Authorization` header and validates it against `adminSessions.ValidateToken()`. Wrap all protected route handlers in `main.go` with this middleware. Public routes: `/health`, `/status`, `/ws`, `/api/v1/auth/*` (mobile PIN login), `/api/v1/admin/login`.

```go
// Pattern to implement in api.go:
func requireAdminAuth(sm *SessionManager, next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        token := adminTokenFromRequest(r)
        if _, ok := sm.ValidateToken(token); !ok {
            w.Header().Set("Content-Type", "application/json")
            w.WriteHeader(http.StatusUnauthorized)
            fmt.Fprint(w, `{"error":"unauthorized"}`)
            return
        }
        next(w, r)
    }
}
```

---

### FIX-002 — Rule operator mismatch: dashboard sends "neq", engine expects "ne"
**Files:** `dashboard/src/types.ts` (line ~84), `meta-propertycore/.../rule.go` (line ~22)  
**Status:** ✅ Fixed (engine v0.14.0 — `rule.go` accepts both `"ne"` and `"neq"`; dashboard `Rules.tsx` operator changed to `"ne"`)

`types.ts` TSDoc comment lists operator values as `"eq" | "neq" | "gt" | "lt"`.  
`rule.go` `Evaluate()` matches against `"eq" | "ne" | "gt" | "lt" | "gte" | "lte"`.

Any rule created via the dashboard using "not equal" will silently never fire because the string `"neq"` does not match `"ne"`.

**Fix (two options — pick one):**
- **Option A (preferred):** Change `rule.go` to accept both `"neq"` and `"ne"` as aliases for not-equal.
- **Option B:** Change `types.ts` TSDoc comment and any Rules UI that constructs the operator value to use `"ne"` instead of `"neq"`.

---

## 🟠 High

### FIX-003 — InfluxDB field key injection via MQTT state payloads
**File:** `meta-propertycore/recipes-propertycore/propertycore-engine/files/influx.go`  
**Status:** ✅ Fixed (engine v0.14.0 — `sanitizeInfluxTag(k)` applied to field keys in `WriteDeviceState`)

`sanitizeInfluxTag()` is called on tag keys/values but **not on field keys**. Field keys come directly from device-published MQTT state JSON. A device publishing `{"foo bar": 1}` or `{"k=v": true}` will produce malformed InfluxDB line protocol (spaces/commas/equals are reserved characters in field keys).

**Fix:** Wrap the field key with `sanitizeInfluxTag()` in `WriteDeviceState`:
```go
// Change this:
fields = append(fields, k+"=true")
// To this:
fields = append(fields, sanitizeInfluxTag(k)+"=true")
```
Apply to all three type cases (bool, float64, string) in the field-building loop.

---

### FIX-004 — User PINs stored as plaintext
**File:** `meta-propertycore/recipes-propertycore/propertycore-engine/files/user.go`  
**Status:** ✅ Fixed (engine v0.14.0 — PINs hashed with PBKDF2-HMAC-SHA256 on `Add()`/`Update()`; migration-safe `FindByPIN()`)

Mobile app user PINs are stored as plain text in `users.json`. The code comment explicitly acknowledges this. Admin passwords already use PBKDF2-HMAC-SHA256 (100k iterations) in `admin.go` — the same approach must be applied to user PINs.

**Fix:** Reuse the `hashAdminPassword()` / `checkAdminPassword()` functions already in `admin.go` (or move them to a shared `crypto.go`). Hash the PIN on `Add()` / `Update()` and compare with `checkAdminPassword()` in `FindByPIN()`. PINs must never be written to disk in plaintext.

**Note:** This is a breaking change — existing `users.json` entries will have unhashed PINs. Handle migration by checking if a stored "pin" value matches the hash format prefix `"pbkdf2:"` on `FindByPIN()` and re-hashing on first successful plain-text match.

---

### FIX-005 — Hardcoded developer machine IP in AddDeviceWizard
**File:** `dashboard/src/pages/devices/AddDeviceWizard.tsx` (line ~56)  
**Status:** ✅ Fixed (`AddDeviceWizard.tsx` — removed hardcoded `192.168.31.223` fallback; always uses `window.location.hostname`)

```ts
const hubIp = window.location.hostname === 'localhost' ? '192.168.31.223' : window.location.hostname
```

`192.168.31.223` is the ThinkPad's personal LAN IP. Any engineer running the dashboard locally will get the wrong broker IP in generated Tasmota/ESPHome config blocks.

**Fix:** Derive the hub IP from `GET /status` response (`hostname` field, or add a `lan_ip` field to the status response). Fall back to `window.location.hostname` when not `localhost`. Never hardcode a machine-specific IP.

---

## 🟡 Medium

### FIX-006 — Login page: no brute-force lockout implementation
**File:** `dashboard/src/pages/Login.tsx`  
**Status:** ✅ Fixed (`Login.tsx` — 5-attempt counter, 5-minute lockout with countdown error message, submit disabled while locked)

Phase 1 spec requires: "lockout after 5 failed attempts (display 'Too many attempts, wait 5 min')". The login page shows an error message on failure but has no attempt counter and no lockout. The engine also has no server-side rate limiting on `POST /api/v1/admin/login`.

**Fix (two layers):**
- **Dashboard:** Add `attempts` state, increment on each 401, show lockout message + disable form for 5 minutes after 5 failures. Use `localStorage` to persist lockout expiry across page refreshes.
- **Engine:** Add a simple in-memory per-IP or global attempt counter in `makeAdminAuthHandler`. After 5 failures within 5 minutes, return 429 with a `Retry-After` header.

---

### FIX-007 — No idle session timeout on dashboard
**File:** `dashboard/src/App.tsx` / `dashboard/src/pages/Login.tsx`  
**Status:** ✅ Fixed (`App.tsx` `RequireAuth` — 30-min idle timer on `mousemove`/`keydown`/`click`/`touchstart`/`scroll`; auto-logout and redirect to `/login`)

Phase 1 spec: "idle > 30 min → show countdown → auto-logout". Not implemented. Sessions also never expire on the engine side (see FIX-008).

**Fix:** In `App.tsx`, attach `mousemove` / `keydown` / `click` event listeners. Track `lastActive` timestamp. Every 60 seconds, check if `now - lastActive > 25 min` — if so, show a "Session expiring in 5 min" warning modal. At 30 min, call `logout()` and redirect to `/login`.

---

### FIX-008 — Engine session tokens never expire
**File:** `meta-propertycore/recipes-propertycore/propertycore-engine/files/auth.go`  
**Status:** ✅ Fixed (engine v0.14.0 — `auth.go` `SessionManager` uses 24h TTL; background `cleanupLoop` goroutine sweeps expired tokens every 10 min)

`SessionManager` stores `token → userID` with no expiry. A token issued at first commissioning remains valid until the engine process restarts. This applies to both admin sessions and mobile user sessions.

**Fix:** Change `tokens map[string]string` to `tokens map[string]sessionEntry` where `sessionEntry` holds `userID string` and `expiresAt time.Time`. Set TTL to 24h on creation. On `ValidateToken()`, check expiry and delete if expired. Add a background goroutine to sweep expired tokens every 10 minutes.

---

### FIX-009 — Overview.tsx WebSocket missing `onerror` handler
**File:** `dashboard/src/pages/Overview.tsx`  
**Status:** ✅ Fixed (`Overview.tsx` — `ws.onerror = () => ws.close()` added to force reconnect path on error)

`ws.onclose` triggers automatic reconnection after 3 seconds. But `ws.onerror` is not handled — a connection error fires `onerror` **before** `onclose` in some browser/network scenarios, which can leave the "Live updates" status stuck at "Connecting…" permanently.

**Fix:** Add `ws.onerror = () => ws.close()` to force the close path (and thus the reconnect logic) on any error event.

---

### FIX-010 — Dynamic device-category sidebar items not implemented
**File:** `dashboard/src/components/Layout.tsx`  
**Status:** 🟡 Open (Phase 1 spec requirement not met)

Phase 1 spec: "Device-category nav items derive from `GET /api/v1/devices` — show Relay Modules, Dimmers, AC Gateways, etc. if ≥1 device of that type exists." The sidebar has a single static `Devices` item regardless of what device types are registered.

`Layout.tsx` already has a `device_new` WebSocket listener but doesn't build per-type nav items from it.

**Fix:** In `Layout.tsx`, fetch `GET /api/v1/devices` on mount. Derive a `Set<string>` of present device types. Dynamically inject per-type nav items under the Devices section based on this set. Refresh the set when `device_new` or `device_offline` WS events arrive.

---

## 🟢 Low

### FIX-011 — Default credentials hint visible on login page
**File:** `dashboard/src/pages/Login.tsx` (line ~110)  
**Status:** ✅ Fixed (`Login.tsx` — default credentials hint paragraph removed from login form)

```tsx
<p className="text-center text-xs text-zinc-400 dark:text-zinc-600">
  Default: admin / propertycore
</p>
```

This is visible to anyone who loads the login URL, including unauthorised users on the LAN.

**Fix:** Remove this hint entirely from the shipped build. Alternatively gate it: only show when the current admin account still has `force_change_password=true` (fetch from `GET /api/v1/admin/accounts` after successful login and redirect to a change-password flow).

---

### FIX-012 — No HTTP request body size limit
**File:** `meta-propertycore/recipes-propertycore/propertycore-engine/files/api.go` (all handlers)  
**Status:** ✅ Fixed (engine v0.14.0 — `withBodyLimit` middleware applies `http.MaxBytesReader` 1 MiB cap to all request bodies)

All handlers decode directly from `r.Body` or call `io.ReadAll(r.Body)` with no size cap. `ReadTimeout: 10s` provides partial protection, but a fast-sending large payload could buffer significant memory before the timeout fires.

**Fix:** Wrap `r.Body` with `http.MaxBytesReader(w, r.Body, 1<<20)` (1 MB limit) at the top of each handler, or in the HTTP server middleware layer. For the command endpoint, 64 KB is a reasonable limit for a JSON device command.

---

### FIX-013 — Error responses leak internal Go error detail
**File:** `meta-propertycore/recipes-propertycore/propertycore-engine/files/api.go` (multiple locations)  
**Status:** ✅ Fixed (engine v0.14.0 — all 14 occurrences of raw Go error strings replaced with `{"error":"invalid request body"}`)

Pattern: `fmt.Fprintf(w, `{"error":"invalid JSON: %s"}`, err.Error())`  
`err.Error()` from `json.Decoder` can reveal internal struct field names and file paths in edge cases.

**Fix:** Replace with a generic message: `{"error":"invalid request body"}`. Log the detailed error server-side with `log.Printf`.

---

### FIX-014 — Pre-built binary tracked in git
**File:** `meta-propertycore/recipes-propertycore/propertycore-engine/files/propertycore-engine`  
**Status:** ✅ Fixed (engine v0.14.0 — `makeAuthHandler` comment updated to reference `area_ids`)

A pre-built `propertycore-engine` binary (≈10 MB) is committed to the repo. This bloats git history with a new 10 MB object on every rebuild.

**Fix:** Add to `.gitignore`:
```
meta-propertycore/recipes-propertycore/propertycore-engine/files/propertycore-engine
```
The binary should only ever live in `build-qemu/tmp/` (Yocto build output) or `~/.local/bin/` (pm2 runtime), never in version control.

---

### FIX-015 — Stale comment in makeAuthHandler references "room_ids"
**File:** `meta-propertycore/recipes-propertycore/propertycore-engine/files/api.go` (makeAuthHandler comment block)  
**Status:** ✅ Fixed (`Devices.tsx` — `handleDelete` now sets `pendingDelete` state; `<Modal>` confirmation dialog replaces `confirm()`)

The function comment still says "role + room_ids" — this field was renamed to `area_ids` in v0.11. The actual code is correct; only the comment is wrong.

**Fix:** Update the comment to say `area_ids`.

---

### FIX-016 — `Devices.tsx` uses `window.confirm()` while other pages use Modal
**File:** `dashboard/src/pages/Devices.tsx` (handleDelete)  
**Status:** 🟢 Open

`handleDelete` calls `window.confirm()` for the destructive delete confirmation. Every other page in the dashboard uses the `<Modal>` component. This is a UX inconsistency.

**Fix:** Replace `window.confirm()` with a `<Modal>` confirmation dialog using the existing `Modal` component.

---

## Fix Sequence (recommended order)

1. **FIX-001** — Auth middleware (engine) — blocks everything else security-wise
2. **FIX-002** — Rule operator mismatch — silent data bug
3. **FIX-003** — InfluxDB field key sanitization
4. **FIX-004** — Hash user PINs
5. **FIX-005** — Remove hardcoded dev IP
6. **FIX-006** — Login lockout (dashboard + engine)
7. **FIX-007 + FIX-008** — Session expiry (dashboard idle timeout + engine TTL)
8. **FIX-009** — WebSocket onerror handler
9. **FIX-010** — Dynamic sidebar device categories
10. **FIX-011 through FIX-016** — Polish items

---

## Engine Version to target next: v0.14

Recommended scope for v0.14:
- FIX-001 (auth middleware — wraps all `/api/v1/*` except auth and mobile endpoints)
- FIX-003 (InfluxDB field sanitization — one-liner)
- FIX-004 (PIN hashing — reuse existing PBKDF2 code)
- FIX-008 (session TTL — small change to SessionManager)
- FIX-012 (MaxBytesReader — one line per handler)
- FIX-013 (generic error messages)
- FIX-015 (comment fix)
