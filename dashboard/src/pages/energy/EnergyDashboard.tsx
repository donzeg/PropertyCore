// Energy Dashboard — Phase 5
// Real-time power flow: solar → battery → load → grid
// Battery SOC gauge · kWh totals · per-circuit live wattage
// UI-SCOPE §14 Energy Dashboard
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Sun,
  BatteryFull,
  BatteryLow,
  Lightning,
  House,
  ArrowRight,
  ArrowLeft,
  ArrowsClockwise,
  Warning,
} from '@phosphor-icons/react'
import { getEnergyLive, getWsUrl } from '../../api'
import type { EnergyLive } from '../../types'

function wattLabel(w: number | null): string {
  if (w === null) return '—'
  const abs = Math.abs(w)
  if (abs >= 1000) return `${(abs / 1000).toFixed(1)} kW`
  return `${Math.round(abs)} W`
}

function socColor(soc: number | null): string {
  if (soc === null) return 'text-zinc-400'
  if (soc > 50) return 'text-brand'
  if (soc > 20) return 'text-yellow-500'
  return 'text-red-500'
}

function socBarColor(soc: number | null): string {
  if (soc === null) return 'bg-zinc-300 dark:bg-zinc-700'
  if (soc > 50) return 'bg-brand'
  if (soc > 20) return 'bg-yellow-400'
  return 'bg-red-500'
}

// ── Power flow node ────────────────────────────────────────────────────────

function FlowNode({
  label, value, sub, Icon, active = true, accent = false,
}: {
  label: string
  value: string
  sub?: string
  Icon: React.ElementType
  active?: boolean
  accent?: boolean
}) {
  return (
    <div className={`flex flex-col items-center gap-2 p-4 rounded-2xl border min-w-[110px] ${
      accent
        ? 'bg-brand/5 border-brand/30 dark:bg-brand/10 dark:border-brand/40'
        : active
          ? 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
          : 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 opacity-60'
    }`}>
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${
        accent
          ? 'bg-brand/15 text-brand dark:text-brand-400'
          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
      }`}>
        <Icon size={20} weight="fill" />
      </span>
      <div className="text-center">
        <div className={`text-xl font-bold tabular-nums ${
          accent ? 'text-brand' : 'text-zinc-900 dark:text-zinc-100'
        }`}>{value}</div>
        <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</div>
        {sub && <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

// ── Arrow between nodes ────────────────────────────────────────────────────

function FlowArrow({ active, reverse = false }: { active: boolean; reverse?: boolean }) {
  const Icon = reverse ? ArrowLeft : ArrowRight
  return (
    <div className={`flex items-center px-1 ${active ? 'text-brand' : 'text-zinc-200 dark:text-zinc-700'}`}>
      <Icon size={20} weight="bold" />
    </div>
  )
}

// ── Battery SOC gauge ──────────────────────────────────────────────────────

function BatteryGauge({ soc }: { soc: number | null }) {
  const pct = soc ?? 0
  const BatIcon = soc !== null && soc < 20 ? BatteryLow : BatteryFull
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Battery</span>
        <BatIcon size={18} weight="fill" className={socColor(soc)} />
      </div>
      <div className={`text-4xl font-bold tabular-nums mb-1 ${socColor(soc)}`}>
        {soc !== null ? `${Math.round(soc)}%` : '—'}
      </div>
      <div className="text-xs text-zinc-400 dark:text-zinc-500 mb-3">State of Charge</div>
      <div className="h-3 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${socBarColor(soc)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function EnergyDashboard() {
  const [live,      setLive]      = useState<EnergyLive | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [wsState,   setWsState]   = useState<'connecting' | 'open' | 'closed'>('connecting')
  const cancelledRef = useRef(false)

  const fetchLive = useCallback(() => {
    getEnergyLive()
      .then(d => { if (!cancelledRef.current) { setLive(d); setLoading(false) } })
      .catch(() => { if (!cancelledRef.current) setLoading(false) })
  }, [])

  useEffect(() => {
    cancelledRef.current = false
    fetchLive()

    // Refresh live data whenever any device state changes via WebSocket
    let ws: WebSocket
    const connect = () => {
      if (cancelledRef.current) return
      ws = new WebSocket(getWsUrl())
      ws.onopen  = () => { if (!cancelledRef.current) setWsState('open') }
      ws.onerror = () => ws.close()
      ws.onclose = () => {
        if (!cancelledRef.current) {
          setWsState('closed')
          setTimeout(connect, 3000)
        }
      }
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as { event: string }
          if (msg.event === 'device_state') fetchLive()
        } catch { /* ignore */ }
      }
    }
    connect()

    return () => {
      cancelledRef.current = true
      ws?.close()
    }
  }, [fetchLive])

  const solarActive   = (live?.solar_w   ?? 0) > 10
  const battCharging  = (live?.battery_w ?? 0) > 0
  const battActive    = Math.abs(live?.battery_w ?? 0) > 10
  const gridImport    = (live?.grid_w    ?? 0) > 0
  const gridActive    = Math.abs(live?.grid_w ?? 0) > 10

  return (
    <div className="p-8 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-zinc-900 dark:text-zinc-100">Energy</h1>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
            Live power flow · {wsState === 'open' ? 'Live' : 'Reconnecting…'}
            {live?.timestamp && ` · ${new Date(live.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchLive}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800
                       text-xs text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <ArrowsClockwise size={12} weight="bold" />
            Refresh
          </button>
          <Link
            to="/energy/inverter"
            className="btn-primary py-1.5 px-3 text-xs"
          >
            Inverter Setup →
          </Link>
        </div>
      </div>

      {loading && (
        <div className="text-sm text-zinc-400 dark:text-zinc-500">Loading energy data…</div>
      )}

      {!loading && live && (
        <>
          {/* Power flow diagram */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-5">
              Power Flow
            </p>

            {/* Row: Solar → Battery → Load */}
            <div className="flex items-center justify-center gap-1 mb-3 flex-wrap gap-y-3">
              <FlowNode
                label="Solar"
                value={wattLabel(live.solar_w)}
                sub={solarActive ? 'Generating' : 'No output'}
                Icon={Sun}
                active={solarActive}
                accent={solarActive}
              />
              <FlowArrow active={solarActive} />
              <FlowNode
                label="Battery"
                value={wattLabel(live.battery_w)}
                sub={battCharging ? 'Charging' : battActive ? 'Discharging' : 'Idle'}
                Icon={BatteryFull}
                active={battActive}
              />
              <FlowArrow active={battActive && !battCharging} reverse={battCharging} />
              <FlowNode
                label="Load"
                value={wattLabel(live.load_w)}
                sub="Consumption"
                Icon={House}
                active={(live.load_w ?? 0) > 10}
                accent={(live.load_w ?? 0) > 10}
              />
              <FlowArrow active={gridActive} reverse={!gridImport} />
              <FlowNode
                label="Grid"
                value={wattLabel(live.grid_w)}
                sub={live.grid_present === false ? 'Grid OFF' : gridImport ? 'Importing' : gridActive ? 'Exporting' : 'Standby'}
                Icon={Lightning}
                active={gridActive || live.grid_present !== false}
              />
            </div>

            {live.grid_present === false && (
              <div className="mt-3 flex items-center gap-2 text-xs text-red-500 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">
                <Warning size={14} weight="bold" />
                Grid power not detected — running on solar/battery
              </div>
            )}
          </div>

          {/* Battery gauge + summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <BatteryGauge soc={live.battery_soc} />

            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
              <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-semibold mb-3">Solar</p>
              <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                {wattLabel(live.solar_w)}
              </div>
              <div className={`text-xs mt-1 font-medium ${solarActive ? 'text-brand' : 'text-zinc-400'}`}>
                {solarActive ? 'Generating' : 'No output'}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
              <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-semibold mb-3">Grid</p>
              <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                {wattLabel(live.grid_w)}
              </div>
              <div className={`text-xs mt-1 font-medium ${
                live.grid_present === false ? 'text-red-500' :
                gridImport ? 'text-yellow-500' : gridActive ? 'text-brand' : 'text-zinc-400'
              }`}>
                {live.grid_present === false ? 'Grid OFF' :
                 gridImport ? 'Importing' : gridActive ? 'Exporting' : 'Standby'}
              </div>
            </div>
          </div>

          {/* Setup links */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-4">
              Configuration
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { to: '/energy/inverter', label: 'Inverter Setup', sub: 'DEYE · Growatt · Sofar · Victron', Icon: Lightning },
                { to: '/energy/water',    label: 'Water System',   sub: 'Tank · pump · flow meter',          Icon: Sun },
                { to: '/energy/generator', label: 'Generator',     sub: 'Start/stop · fuel · maintenance',   Icon: BatteryFull },
              ].map(({ to, label, sub, Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-3 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800
                             hover:border-brand/50 hover:bg-brand/5 dark:hover:bg-brand/10 transition-colors group"
                >
                  <span className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center
                                   group-hover:bg-brand/15 group-hover:text-brand transition-colors text-zinc-500">
                    <Icon size={16} weight="fill" />
                  </span>
                  <div>
                    <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200 group-hover:text-brand transition-colors">
                      {label}
                    </div>
                    <div className="text-xs text-zinc-400 dark:text-zinc-500">{sub}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      {!loading && !live && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-10 text-center">
          <Lightning size={36} weight="fill" className="text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">No energy data yet</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4">
            Configure the inverter and link it to a MQTT device ID to start seeing live power data.
          </p>
          <Link to="/energy/inverter" className="btn-primary py-1.5 px-4 text-xs">
            Set up inverter →
          </Link>
        </div>
      )}
    </div>
  )
}
