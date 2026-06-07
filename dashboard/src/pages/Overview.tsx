// Overview — v2.0
// Matches mockup: hero stats · areas grid · live device state · activity feed · quick scenes
// UI-SCOPE §2: hub health, device counts (online/offline/error), areas, recent system alerts
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Cpu,
  GridFour,
  Play,
  GitBranch,
  ArrowsClockwise,
  Plus,
  HardDrives,
  Sun,
  Moon,
  Television,
  LockSimple,
  UserPlus,
  Bell,
  X,
  PlugsConnected,
  SunDim,
  Thermometer,
  WifiHigh,
  Warning,
} from '@phosphor-icons/react'
import { executeScene, getAreas, getDevices, getScenes, getStatus, getWsUrl } from '../api'
import type { Area, Device, HubStatus, Scene } from '../types'

// ─── Types ─────────────────────────────────────────────────────────────────

interface ActivityItem {
  id: string
  color: 'brand' | 'teal' | 'red' | 'blue' | 'yellow'
  Icon: React.ElementType
  text: React.ReactNode
  time: string
}

interface LiveDeviceEntry {
  id: string
  name: string
  type: string
  area_id: string
  state: Record<string, unknown>
  updatedAt: number
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function deviceTypeIcon(type: string) {
  switch (type) {
    case 'relay':      return PlugsConnected
    case 'dimmer':     return SunDim
    case 'ac_gateway': return Thermometer
    case 'sensor':     return WifiHigh
    default:           return HardDrives
  }
}

function primaryStateLabel(type: string, state: Record<string, unknown>): { label: string; variant: 'on' | 'off' | 'val' } {
  if (type === 'ac_gateway') {
    const temp = state['temp'] ?? state['temperature']
    const power = state['power']
    if (power === false) return { label: 'OFF', variant: 'off' }
    if (typeof temp === 'number') return { label: `${temp}°C`, variant: 'val' }
    return { label: 'ON', variant: 'on' }
  }
  if (type === 'sensor') {
    const temp = state['temp'] ?? state['temperature']
    if (typeof temp === 'number') return { label: `${temp.toFixed(1)}°C`, variant: 'val' }
    const hum = state['humidity']
    if (typeof hum === 'number') return { label: `${hum}%`, variant: 'val' }
  }
  // relay / dimmer / generic — check ch1 or first bool
  const ch1 = state['ch1']
  if (typeof ch1 === 'boolean') return { label: ch1 ? 'ON' : 'OFF', variant: ch1 ? 'on' : 'off' }
  for (const v of Object.values(state)) {
    if (typeof v === 'boolean') return { label: v ? 'ON' : 'OFF', variant: v ? 'on' : 'off' }
  }
  return { label: '—', variant: 'off' }
}

function timeLabel(d: Date): string {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function nowId(): string {
  return `${Date.now()}-${Math.random()}`
}

// ─── Stat card ─────────────────────────────────────────────────────────────

function HeroStat({
  label, value, sub, Icon, accent = false,
}: {
  label: string
  value: number | string
  sub: string
  Icon: React.ElementType
  accent?: boolean
}) {
  return (
    <div className={`rounded-xl border p-4 ${
      accent
        ? 'bg-brand/5 border-brand/25 dark:bg-brand/10 dark:border-brand/30'
        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] uppercase tracking-widest font-semibold text-zinc-400 dark:text-zinc-500">
          {label}
        </span>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          accent
            ? 'bg-brand/15 text-brand dark:bg-brand/20 dark:text-brand-400'
            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
        }`}>
          <Icon size={16} weight="bold" />
        </span>
      </div>
      <div className={`text-3xl font-bold tracking-tight ${
        accent ? 'text-brand' : 'text-zinc-900 dark:text-zinc-100'
      }`}>
        {value}
      </div>
      <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">{sub}</div>
    </div>
  )
}

// ─── Area card ─────────────────────────────────────────────────────────────

function AreaCard({
  area, total, active,
}: {
  area: Area
  total: number
  active: number
}) {
  const pct = total > 0 ? Math.round((active / total) * 100) : 0
  return (
    <Link
      to="/devices"
      className="block rounded-xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800
                 p-4 hover:border-brand/50 dark:hover:border-brand/40 transition-colors group"
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="w-9 h-9 rounded-lg bg-brand/10 dark:bg-brand/15 text-brand
                         flex items-center justify-center text-base font-bold flex-shrink-0">
          {area.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate group-hover:text-brand transition-colors">
            {area.name}
          </div>
          <div className="text-xs text-zinc-400 dark:text-zinc-500 capitalize">
            {area.area_type || 'area'}
          </div>
        </div>
      </div>
      <div className="text-xs text-zinc-400 dark:text-zinc-500 mb-1.5">
        {total} device{total !== 1 ? 's' : ''} · {active} on
      </div>
      <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        <div
          className="h-full bg-brand rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </Link>
  )
}

// ─── Main component ────────────────────────────────────────────────────────

export default function Overview() {
  const navigate = useNavigate()

  const [status,      setStatus]      = useState<HubStatus | null>(null)
  const [devices,     setDevices]     = useState<Device[]>([])
  const [areas,       setAreas]       = useState<Area[]>([])
  const [scenes,      setScenes]      = useState<Scene[]>([])
  const [activity,    setActivity]    = useState<ActivityItem[]>([])
  const [liveStates,  setLiveStates]  = useState<Map<string, LiveDeviceEntry>>(new Map())
  const [wsState,     setWsState]     = useState<'connecting' | 'open' | 'closed'>('connecting')
  const [execingId,   setExecingId]   = useState<string | null>(null)
  const [now,         setNow]         = useState(new Date())

  const cancelledRef = useRef(false)

  // Live clock — updates every minute
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  const loadAll = useCallback(() => {
    if (cancelledRef.current) return
    getStatus().then(s  => { if (!cancelledRef.current) setStatus(s) }).catch(() => {})
    getDevices().then(d => { if (!cancelledRef.current) setDevices(d) }).catch(() => {})
    getAreas().then(a   => { if (!cancelledRef.current) setAreas(a) }).catch(() => {})
    getScenes().then(s  => { if (!cancelledRef.current) setScenes(s) }).catch(() => {})
  }, [])

  useEffect(() => {
    cancelledRef.current = false
    loadAll()

    let ws: WebSocket | undefined
    const connect = () => {
      if (cancelledRef.current) return
      ws = new WebSocket(getWsUrl())
      ws.onopen  = () => { if (!cancelledRef.current) setWsState('open') }
      ws.onerror = () => ws?.close()
      ws.onclose = () => {
        if (!cancelledRef.current) {
          setWsState('closed')
          setTimeout(connect, 3000)
        }
      }
      ws.onmessage = (e) => {
        if (cancelledRef.current) return
        try {
          const msg = JSON.parse(e.data) as { event: string; data: unknown }
          handleWsEvent(msg.event, msg.data)
        } catch { /* ignore malformed */ }
      }
    }
    connect()

    return () => {
      cancelledRef.current = true
      ws?.close()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleWsEvent(event: string, data: unknown) {
    const t = new Date()
    const ts = timeLabel(t)

    if (event === 'device_state') {
      const d = data as { id: string; type: string; state: Record<string, unknown> }
      setLiveStates(prev => {
        const next = new Map(prev)
        const existing = next.get(d.id)
        next.set(d.id, {
          id: d.id,
          name: existing?.name ?? d.id,
          type: d.type,
          area_id: existing?.area_id ?? '',
          state: d.state,
          updatedAt: Date.now(),
        })
        return next
      })
      // also update in devices list
      setDevices(prev => prev.map(dev =>
        dev.id === d.id ? { ...dev, state: d.state } : dev
      ))
    }

    if (event === 'device_new') {
      const d = data as { id: string; name: string; type: string }
      pushActivity({
        id: nowId(), color: 'teal', Icon: Cpu,
        text: <>Device <strong>{d.name || d.id}</strong> registered</>,
        time: ts,
      })
      loadAll()
    }

    if (event === 'device_online') {
      const d = data as { id: string; name: string }
      pushActivity({
        id: nowId(), color: 'brand', Icon: Cpu,
        text: <>Device <strong>{d.name || d.id}</strong> came online</>,
        time: ts,
      })
    }

    if (event === 'device_offline') {
      const d = data as { id: string; name: string }
      pushActivity({
        id: nowId(), color: 'red', Icon: Warning,
        text: <>Device <strong>{d.name || d.id}</strong> went offline</>,
        time: ts,
      })
    }

    if (event === 'scene_executed') {
      const s = data as { name: string }
      pushActivity({
        id: nowId(), color: 'brand', Icon: Play,
        text: <>Scene <strong>{s.name}</strong> executed</>,
        time: ts,
      })
    }
  }

  function pushActivity(item: ActivityItem) {
    setActivity(prev => [item, ...prev].slice(0, 20))
  }

  // Merge live states into device list
  useEffect(() => {
    if (liveStates.size === 0) return
    setDevices(prev => prev.map(dev => {
      const live = liveStates.get(dev.id)
      if (!live) return dev
      return { ...dev, state: live.state }
    }))
  }, [liveStates])

  // ── Derived data ──────────────────────────────────────────────────────────

  const onlineDevices  = devices.filter(d => d.online)
  const offlineDevices = devices.filter(d => !d.online)

  // Per-area device counts
  const areaDeviceMap = new Map<string, { total: number; active: number }>()
  for (const dev of devices) {
    const key = dev.area_id || '__none__'
    const cur = areaDeviceMap.get(key) ?? { total: 0, active: 0 }
    cur.total++
    const { variant } = primaryStateLabel(dev.type, dev.state ?? {})
    if (variant === 'on' || variant === 'val') cur.active++
    areaDeviceMap.set(key, cur)
  }

  // Top 6 most-recently-updated devices for live state panel
  const liveList = devices
    .filter(d => d.state && Object.keys(d.state).length > 0)
    .sort((a, b) => {
      const ta = liveStates.get(a.id)?.updatedAt ?? 0
      const tb = liveStates.get(b.id)?.updatedAt ?? 0
      return tb - ta
    })
    .slice(0, 6)

  const dateStr = now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  // Quick scene icons by name heuristic
  function sceneIcon(name: string): React.ElementType {
    const n = name.toLowerCase()
    if (n.includes('morning') || n.includes('day'))  return Sun
    if (n.includes('night') || n.includes('sleep'))  return Moon
    if (n.includes('movie') || n.includes('cinema')) return Television
    if (n.includes('away')  || n.includes('lock'))   return LockSimple
    if (n.includes('guest') || n.includes('welcome'))return UserPlus
    return Play
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Topbar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
        <div>
          <h1 className="text-[17px] font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
            Overview
          </h1>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
            {dateStr} · {timeStr}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* MQTT badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800
                          bg-white dark:bg-zinc-900 text-xs text-zinc-500 dark:text-zinc-400">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              status?.mqtt_connected ? 'bg-brand' : 'bg-red-400'
            }`} />
            MQTT ·{' '}
            {status?.mqtt_connected
              ? `${onlineDevices.length} online`
              : 'disconnected'}
          </div>
          {/* WS badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800
                          bg-white dark:bg-zinc-900 text-xs text-zinc-500 dark:text-zinc-400">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              wsState === 'open' ? 'bg-brand' : 'bg-yellow-400'
            }`} />
            {wsState === 'open' ? 'Live' : 'Reconnecting…'}
          </div>
          {/* Refresh */}
          <button
            onClick={loadAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800
                       bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-600 dark:text-zinc-400
                       hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <ArrowsClockwise size={13} weight="bold" />
            Refresh
          </button>
          {/* Add Device */}
          <button
            onClick={() => navigate('/devices')}
            className="btn-primary py-1.5 px-3 text-xs"
          >
            <Plus size={13} weight="bold" />
            Add Device
          </button>
        </div>
      </div>

      {/* ── Scrollable content ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-6 space-y-8 max-w-[1400px]">

          {/* ── Hero stat cards ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <HeroStat
              label="Devices Online"
              value={onlineDevices.length}
              sub={
                offlineDevices.length > 0
                  ? `${offlineDevices.length} offline`
                  : status ? 'All online' : '—'
              }
              Icon={Cpu}
              accent
            />
            <HeroStat
              label="Areas"
              value={status?.area_count ?? 0}
              sub={
                status
                  ? `Across ${status.floor_count} floor${status.floor_count !== 1 ? 's' : ''}`
                  : '—'
              }
              Icon={GridFour}
            />
            <HeroStat
              label="Scenes"
              value={status?.scene_count ?? 0}
              sub={`${status?.rule_count ?? 0} automation rule${status?.rule_count !== 1 ? 's' : ''}`}
              Icon={Play}
            />
            <HeroStat
              label="Rules Active"
              value={status?.rule_count ?? 0}
              sub={`${status?.schedule_count ?? 0} schedule${status?.schedule_count !== 1 ? 's' : ''}`}
              Icon={GitBranch}
            />
          </div>

          {/* ── Areas grid ──────────────────────────────────────────────── */}
          {areas.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                  Areas
                </h2>
                <Link to="/areas" className="text-xs text-brand hover:underline">
                  Manage areas →
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {areas.map(area => {
                  const counts = areaDeviceMap.get(area.id) ?? { total: 0, active: 0 }
                  return (
                    <AreaCard
                      key={area.id}
                      area={area}
                      total={counts.total}
                      active={counts.active}
                    />
                  )
                })}
              </div>
            </section>
          )}

          {/* ── Two-column: live devices + activity ─────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4">

            {/* Live Device State */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Live Device State
                </span>
                <Link to="/devices" className="text-xs text-brand hover:underline">
                  View all →
                </Link>
              </div>
              {liveList.length === 0 ? (
                <div className="px-5 py-10 text-center text-xs text-zinc-400 dark:text-zinc-500">
                  No live device state yet. Devices will appear here as they report state via MQTT.
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {liveList.map(dev => {
                    const DevIcon = deviceTypeIcon(dev.type)
                    const { label, variant } = primaryStateLabel(dev.type, dev.state ?? {})
                    const areaName = areas.find(a => a.id === dev.area_id)?.name
                    return (
                      <div key={dev.id} className="flex items-center gap-3 px-5 py-3">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          variant === 'off'
                            ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500'
                            : 'bg-brand/10 dark:bg-brand/15 text-brand'
                        }`}>
                          <DevIcon size={15} weight="fill" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                            {dev.name}
                          </div>
                          <div className="text-xs text-zinc-400 dark:text-zinc-500 truncate">
                            {dev.type}{areaName ? ` · ${areaName}` : ''}
                          </div>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md flex-shrink-0 ${
                          variant === 'on'  ? 'bg-brand/10 text-brand dark:bg-brand/15 dark:text-brand-400' :
                          variant === 'val' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' :
                                             'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500'
                        }`}>
                          {label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Activity Feed */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Recent Activity
                </span>
                {activity.length > 0 && (
                  <button
                    onClick={() => setActivity([])}
                    className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              {activity.length === 0 ? (
                <div className="px-5 py-10 text-center text-xs text-zinc-400 dark:text-zinc-500">
                  Activity will appear here as devices report events via WebSocket.
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[360px] overflow-y-auto">
                  {activity.map(item => {
                    const colorMap = {
                      brand:  'bg-brand/10 text-brand dark:bg-brand/15',
                      teal:   'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
                      red:    'bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400',
                      blue:   'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
                      yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400',
                    }
                    return (
                      <div key={item.id} className="flex items-start gap-3 px-5 py-3">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${colorMap[item.color]}`}>
                          <item.Icon size={13} weight="bold" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-zinc-700 dark:text-zinc-300 leading-snug">
                            {item.text}
                          </div>
                          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                            {item.time}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Quick Scenes ─────────────────────────────────────────────── */}
          {scenes.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                  Quick Scenes
                </h2>
                <Link to="/scenes" className="text-xs text-brand hover:underline">
                  Manage scenes →
                </Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {scenes.map(scene => {
                  const SIcon = sceneIcon(scene.name)
                  return (
                    <button
                      key={scene.id}
                      disabled={execingId === scene.id}
                      onClick={async () => {
                        setExecingId(scene.id)
                        try {
                          await executeScene(scene.id)
                          pushActivity({
                            id: nowId(), color: 'brand', Icon: Play,
                            text: <>Scene <strong>{scene.name}</strong> executed</>,
                            time: timeLabel(new Date()),
                          })
                        } catch { /* ignore */ }
                        setExecingId(null)
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        execingId === scene.id
                          ? 'bg-brand text-white border-brand opacity-70'
                          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-brand/50 hover:text-brand dark:hover:text-brand-400'
                      }`}
                    >
                      <SIcon size={14} weight="bold" />
                      {scene.name}
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {/* ── Hub detail footer ────────────────────────────────────────── */}
          {status && (
            <p className="text-[11px] text-zinc-300 dark:text-zinc-600 pb-2">
              {status.hostname} · v{status.version} · {status.uptime} uptime ·{' '}
              broker: {status.mqtt_broker} · {status.ws_clients} WS client{status.ws_clients !== 1 ? 's' : ''}
            </p>
          )}

        </div>
      </div>
    </div>
  )
}

