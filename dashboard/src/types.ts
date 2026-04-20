// ─── Hub Status ───────────────────────────────────────────────────────────────

export interface HubStatus {
  version: string
  hostname: string
  uptime: string
  mqtt_broker: string
  mqtt_connected: boolean
  device_count: number
  scene_count: number
  rule_count: number
  room_count: number
  user_count: number
  schedule_count: number
  ws_clients: number
}

// ─── Room ─────────────────────────────────────────────────────────────────────

export interface Room {
  id: string
  name: string
  floor: string
  created_at: string
}

// ─── Device ───────────────────────────────────────────────────────────────────

export interface Device {
  id: string
  name: string
  type: string
  room_id: string
  vendor: string
  firmware_version: string
  online: boolean
  last_seen: string
  created_at: string
  state?: Record<string, unknown>
}

// ─── Scene ───────────────────────────────────────────────────────────────────

export interface SceneAction {
  device_id: string
  payload: Record<string, unknown>
}

export interface Scene {
  id: string
  name: string
  actions: SceneAction[]
  created_at: string
}

// ─── Rule ────────────────────────────────────────────────────────────────────

export interface RuleCondition {
  device_id: string
  field: string
  operator: string   // "eq" | "neq" | "gt" | "lt"
  value: unknown
}

export interface Rule {
  id: string
  label: string
  condition: RuleCondition
  action: { scene_id: string }
  enabled: boolean
  created_at: string
}

// ─── Schedule ────────────────────────────────────────────────────────────────

export interface Schedule {
  id: string
  label: string
  scene_id: string
  hour: number    // 0–23
  minute: number  // 0–59
  days: string[]  // ["mon","tue",...] or [] = every day
  enabled: boolean
  created_at: string
}

// ─── User ────────────────────────────────────────────────────────────────────

export type UserRole = 'owner' | 'admin' | 'guest'

export interface User {
  id: string
  name: string
  role: UserRole
  created_at: string
}
