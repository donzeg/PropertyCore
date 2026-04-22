import type {
  Area,
  Device,
  Floor,
  HubStatus,
  Property,
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
  const token = localStorage.getItem('pc-admin-token')
  const res = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    ...init,
  })
  if (res.status === 401) {
    localStorage.removeItem('pc-admin-token')
    localStorage.removeItem('pc-admin-id')
    window.location.href = '/admin/login'
    throw new Error('Unauthorized')
  }
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

// ─── Floors ─────────────────────────────────────────────────────────────────────────────

export const getFloors = (): Promise<Floor[]> =>
  req<Floor[]>('/api/v1/floors')

export const createFloor = (body: { name: string; order?: number }): Promise<Floor> =>
  req<Floor>('/api/v1/floors', { method: 'POST', body: JSON.stringify(body) })

export const updateFloor = (
  id: string,
  body: Partial<Pick<Floor, 'name' | 'order'>>,
): Promise<Floor> =>
  req<Floor>(`/api/v1/floors/${id}`, { method: 'PATCH', body: JSON.stringify(body) })

export const deleteFloor = (id: string): Promise<void> =>
  req<void>(`/api/v1/floors/${id}`, { method: 'DELETE' })

// ─── Areas ─────────────────────────────────────────────────────────────────────────────

export const getAreas = (): Promise<Area[]> =>
  req<Area[]>('/api/v1/areas')

export const createArea = (body: {
  name: string
  floor_id?: string
  area_type?: string
  icon?: string
}): Promise<Area> =>
  req<Area>('/api/v1/areas', { method: 'POST', body: JSON.stringify(body) })

export const updateArea = (
  id: string,
  body: Partial<Pick<Area, 'name' | 'floor_id' | 'area_type' | 'icon'>>,
): Promise<Area> =>
  req<Area>(`/api/v1/areas/${id}`, { method: 'PATCH', body: JSON.stringify(body) })

export const deleteArea = (id: string): Promise<void> =>
  req<void>(`/api/v1/areas/${id}`, { method: 'DELETE' })

// ─── Property ──────────────────────────────────────────────────────────────────────────

export const getProperty = (): Promise<Property> =>
  req<Property>('/api/v1/property')

export const updateProperty = (body: Partial<Omit<Property, 'updated_at'>>): Promise<Property> =>
  req<Property>('/api/v1/property', { method: 'PATCH', body: JSON.stringify(body) })

// ─── Devices ─────────────────────────────────────────────────────────────────

export const getDevices = (): Promise<Device[]> =>
  req<Device[]>('/api/v1/devices')

export const updateDevice = (
  id: string,
  body: Partial<Pick<Device, 'name' | 'type' | 'area_id' | 'vendor' | 'firmware_version' | 'metadata'>>,
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
  area_ids?: string[]
}): Promise<User> =>
  req<User>('/api/v1/users', { method: 'POST', body: JSON.stringify(body) })

export const deleteUser = (id: string): Promise<void> =>
  req<void>(`/api/v1/users/${id}`, { method: 'DELETE' })

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function logout(): Promise<void> {
  const token = localStorage.getItem('pc-admin-token')
  try {
    await fetch('/api/v1/admin/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
  } catch {
    // ignore — clear local state regardless
  } finally {
    localStorage.removeItem('pc-admin-token')
    localStorage.removeItem('pc-admin-id')
  }
}

// ─── WebSocket ────────────────────────────────────────────────────────────────
// The engine's /ws endpoint broadcasts device state updates to all connected clients.
// In dev mode (Vite on :5173) we connect directly to the engine on :8080.
// In production (same-origin) we use the current host.

export function getWsUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  // In Vite dev (any non-standard port) we proxy /ws through the dev server,
  // which forwards to the engine on :8080 via the vite.config ws proxy.
  // In production (port 80/443) we use the same origin.
  return `${proto}//${window.location.host}/ws`
}
