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
  floor_count: number
  area_count: number
  user_count: number
  schedule_count: number
  ws_clients: number
}

// ─── Floor ─────────────────────────────────────────────────────────────────────────────────

export interface Floor {
  id: string
  name: string
  order: number
  created_at: string
}

// ─── Area ─────────────────────────────────────────────────────────────────────────────────

export interface Area {
  id: string
  name: string
  floor_id: string
  area_type: string
  icon: string
  created_at: string
}

// ─── Property ───────────────────────────────────────────────────────────────────────────

export type PropertyType = 'hotel' | 'home' | 'apartment' | 'office' | 'estate'

export interface Property {
  name: string
  address: string
  type: PropertyType
  timezone: string
  updated_at: string
}

// ─── Device ───────────────────────────────────────────────────────────────────

export interface Device {
  id: string
  name: string
  type: string
  area_id: string
  vendor: string
  firmware_version: string
  online: boolean
  last_seen: string
  created_at: string
  metadata?: Record<string, unknown>
  state?: Record<string, unknown>
}

// ─── Scene ───────────────────────────────────────────────────────────────────

export interface SceneAction {
  // action_type: '' or 'device_state' → MQTT publish; 'run_scene' → chain scene; 'delay' → wait
  action_type?: string
  device_id?: string
  payload?: Record<string, unknown>
  run_scene_id?: string
  delay_ms?: number
}

export interface Scene {
  id: string
  name: string
  icon?: string
  area_id?: string
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

export interface ConditionClause {
  type: 'device_state' | 'time_of_day' | 'day_of_week'
  // device_state
  device_id?: string
  field?: string
  operator?: string  // "eq" | "ne" | "gt" | "lt"
  value?: unknown
  // time_of_day
  time_op?: 'before' | 'after' | 'between'
  time_from?: string  // "HH:MM"
  time_to?: string    // "HH:MM" (for between)
  // day_of_week
  days?: string[]     // ["mon","tue",...]
}

export interface Rule {
  id: string
  name: string
  condition: RuleCondition
  conditions?: ConditionClause[]
  condition_logic?: 'and' | 'or'
  action: { type: string; scene_id: string }
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
  trigger_type?: 'fixed' | 'sunrise' | 'sunset'
  sunrise_offset_min?: number
  enabled: boolean
  created_at: string
}

// ─── User ────────────────────────────────────────────────────────────────────

export type UserRole = 'owner' | 'admin' | 'guest'

export interface User {
  id: string
  name: string
  role: UserRole
  area_ids: string[]
  created_at: string
}
