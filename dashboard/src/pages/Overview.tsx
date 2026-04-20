import { useEffect, useRef, useState } from 'react'
import { getStatus, getWsUrl } from '../api'
import type { HubStatus } from '../types'

export default function Overview() {
  const [status, setStatus] = useState<HubStatus | null>(null)
  const [wsState, setWsState] = useState<'connecting' | 'open' | 'closed'>('connecting')
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false

    const refresh = () =>
      getStatus()
        .then((s) => { if (!cancelledRef.current) setStatus(s) })
        .catch(() => {})

    refresh()

    // Live WebSocket — reconnects on close
    let ws: WebSocket | undefined
    const connect = () => {
      if (cancelledRef.current) return
      ws = new WebSocket(getWsUrl())
      ws.onopen = () => { if (!cancelledRef.current) setWsState('open') }
      ws.onclose = () => {
        if (!cancelledRef.current) {
          setWsState('closed')
          setTimeout(connect, 3000)
        }
      }
      // Any WS message means a device state changed — refresh /status
      ws.onmessage = () => { if (!cancelledRef.current) refresh() }
    }
    connect()

    return () => {
      cancelledRef.current = true
      ws?.close()
    }
  }, [])

  const counts = status
    ? [
        { label: 'Devices',   value: status.device_count },
        { label: 'Scenes',    value: status.scene_count },
        { label: 'Rules',     value: status.rule_count },
        { label: 'Rooms',     value: status.room_count },
        { label: 'Users',     value: status.user_count },
        { label: 'Schedules', value: status.schedule_count },
      ]
    : []

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-lg font-semibold text-slate-800 mb-6">System Overview</h1>

      {/* Hub status strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard label="Version"  value={status?.version ?? '—'} />
        <StatCard label="Uptime"   value={status?.uptime  ?? '—'} />
        <StatCard
          label="MQTT"
          value={status ? (status.mqtt_connected ? 'Connected' : 'Disconnected') : '—'}
          dot={status ? (status.mqtt_connected ? 'green' : 'red') : undefined}
        />
        <StatCard
          label="Live updates"
          value={wsState === 'open' ? 'Active' : wsState === 'closed' ? 'Reconnecting…' : 'Connecting…'}
          dot={wsState === 'open' ? 'green' : 'yellow'}
        />
      </div>

      {/* Resource counts */}
      <h2 className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-3">
        Resources
      </h2>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-8">
        {counts.map(({ label, value }) => (
          <div
            key={label}
            className="bg-white rounded-lg border border-slate-200 px-4 py-4 text-center"
          >
            <div className="text-2xl font-bold text-slate-800">{value}</div>
            <div className="text-xs text-slate-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {status && (
        <p className="text-xs text-slate-400">
          {status.hostname} &middot; Broker: {status.mqtt_broker} &middot;{' '}
          {status.ws_clients} WebSocket client{status.ws_clients !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  dot,
}: {
  label: string
  value: string
  dot?: 'green' | 'red' | 'yellow'
}) {
  const dotClass = dot
    ? { green: 'bg-green-400', red: 'bg-red-400', yellow: 'bg-yellow-400' }[dot]
    : ''
  return (
    <div className="bg-white rounded-lg border border-slate-200 px-4 py-3">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="flex items-center gap-1.5">
        {dot && <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`} />}
        <span className="text-sm font-medium text-slate-800 truncate">{value}</span>
      </div>
    </div>
  )
}
