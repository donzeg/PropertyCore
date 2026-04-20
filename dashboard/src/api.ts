import type {
  Device,
  HubStatus,
  Room,
  Rule,
  Scene,
  SceneAction,
  Schedule,
  User,
  UserRole,
} from './types'

// ─── Core fetch helper ────────────────────────────────────────────────────────
// All API calls go through here. Parses JSON if a body is present;
// returns undefined for empty responses (204 or empty body).

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText)
    throw new Error(`HTTP ${res.status}: ${msg}`)
  }
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

// ─── Status ───────────────────────────────────────────────────────────────────

export const getStatus = (): Promise<HubStatus> =>
  req<HubStatus>('/status')

// ─── Rooms ───────────────────────────────────────────────────────────────────

export const getRooms = (): Promise<Room[]> =>
  req<Room[]>('/api/v1/rooms')

export const createRoom = (body: { name: string; floor: string }): Promise<Room> =>
  req<Room>('/api/v1/rooms', { method: 'POST', body: JSON.stringify(body) })

export const updateRoom = (
  id: string,
  body: Partial<Pick<Room, 'name' | 'floor'>>,
): Promise<Room> =>
  req<Room>(`/api/v1/rooms/${id}`, { method: 'PATCH', body: JSON.stringify(body) })

export const deleteRoom = (id: string): Promise<void> =>
  req<void>(`/api/v1/rooms/${id}`, { method: 'DELETE' })

// ─── Devices ─────────────────────────────────────────────────────────────────

export const getDevices = (): Promise<Device[]> =>
  req<Device[]>('/api/v1/devices')

export const updateDevice = (
  id: string,
  body: Partial<Pick<Device, 'name' | 'type' | 'room_id' | 'vendor' | 'firmware_version'>>,
): Promise<Device> =>
  req<Device>(`/api/v1/devices/${id}`, { method: 'PATCH', body: JSON.stringify(body) })

export const deleteDevice = (id: string): Promise<void> =>
  req<void>(`/api/v1/devices/${id}`, { method: 'DELETE' })

// ─── Scenes ──────────────────────────────────────────────────────────────────

export const getScenes = (): Promise<Scene[]> =>
  req<Scene[]>('/api/v1/scenes')

export const createScene = (body: {
  name: string
  actions: SceneAction[]
}): Promise<Scene> =>
  req<Scene>('/api/v1/scenes', { method: 'POST', body: JSON.stringify(body) })

export const executeScene = (id: string): Promise<void> =>
  req<void>(`/api/v1/scenes/${id}/execute`, { method: 'POST' })

export const deleteScene = (id: string): Promise<void> =>
  req<void>(`/api/v1/scenes/${id}`, { method: 'DELETE' })

// ─── Rules ───────────────────────────────────────────────────────────────────

export const getRules = (): Promise<Rule[]> =>
  req<Rule[]>('/api/v1/rules')

export const createRule = (body: {
  label: string
  condition: Rule['condition']
  action: Rule['action']
}): Promise<Rule> =>
  req<Rule>('/api/v1/rules', { method: 'POST', body: JSON.stringify(body) })

export const enableRule = (id: string): Promise<Rule> =>
  req<Rule>(`/api/v1/rules/${id}/enable`, { method: 'POST' })

export const disableRule = (id: string): Promise<Rule> =>
  req<Rule>(`/api/v1/rules/${id}/disable`, { method: 'POST' })

export const deleteRule = (id: string): Promise<void> =>
  req<void>(`/api/v1/rules/${id}`, { method: 'DELETE' })

// ─── Schedules ───────────────────────────────────────────────────────────────

export const getSchedules = (): Promise<Schedule[]> =>
  req<Schedule[]>('/api/v1/schedules')

export const createSchedule = (
  body: Omit<Schedule, 'id' | 'created_at'>,
): Promise<Schedule> =>
  req<Schedule>('/api/v1/schedules', { method: 'POST', body: JSON.stringify(body) })

export const enableSchedule = (id: string): Promise<Schedule> =>
  req<Schedule>(`/api/v1/schedules/${id}/enable`, { method: 'POST' })

export const disableSchedule = (id: string): Promise<Schedule> =>
  req<Schedule>(`/api/v1/schedules/${id}/disable`, { method: 'POST' })

export const deleteSchedule = (id: string): Promise<void> =>
  req<void>(`/api/v1/schedules/${id}`, { method: 'DELETE' })

// ─── Users ───────────────────────────────────────────────────────────────────

export const getUsers = (): Promise<User[]> =>
  req<User[]>('/api/v1/users')

export const createUser = (body: {
  name: string
  role: UserRole
  pin: string
}): Promise<User> =>
  req<User>('/api/v1/users', { method: 'POST', body: JSON.stringify(body) })

export const deleteUser = (id: string): Promise<void> =>
  req<void>(`/api/v1/users/${id}`, { method: 'DELETE' })

// ─── WebSocket ────────────────────────────────────────────────────────────────
// The engine's /ws endpoint broadcasts device state updates to all connected clients.
// In dev mode (Vite on :5173) we connect directly to the engine on :8080.
// In production (same-origin) we use the current host.

export function getWsUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const isViteDev = window.location.port === '5173'
  const host = isViteDev
    ? `${window.location.hostname}:8080`
    : window.location.host
  return `${proto}//${host}/ws`
}
