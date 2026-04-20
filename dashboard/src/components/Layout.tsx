import { NavLink, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getStatus } from '../api'
import type { HubStatus } from '../types'

const NAV = [
  { to: 'overview',   label: 'Overview' },
  { to: 'rooms',      label: 'Rooms' },
  { to: 'devices',    label: 'Devices' },
  { to: 'scenes',     label: 'Scenes' },
  { to: 'rules',      label: 'Rules' },
  { to: 'schedules',  label: 'Schedules' },
  { to: 'users',      label: 'Users' },
]

// Sections from UI-SCOPE that are not yet backed by engine API.
// Shown as disabled stubs so the engineer can see the full roadmap.
const NAV_FUTURE = [
  'Energy',
  'Access Control',
  'Security',
  'AV / IR',
  'Network',
  'Logs',
  'OTA Updates',
  'Backup & Restore',
]

export default function Layout() {
  const [status, setStatus] = useState<HubStatus | null>(null)

  useEffect(() => {
    const fetch = () => getStatus().then(setStatus).catch(() => {})
    fetch()
    const id = setInterval(fetch, 10_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="w-56 bg-slate-900 flex flex-col flex-shrink-0 overflow-y-auto">
        {/* Branding */}
        <div className="px-4 py-5 border-b border-slate-700/60">
          <div className="text-white font-bold text-base leading-tight tracking-tight">
            PropertyCore
          </div>
          <div className="text-slate-400 text-xs mt-0.5">Config Dashboard</div>
        </div>

        {/* Active nav */}
        <nav className="py-3 px-2">
          <p className="px-2 pb-1 text-slate-500 text-[10px] uppercase tracking-widest">
            Configuration
          </p>
          {NAV.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              {label}
            </NavLink>
          ))}

          {/* Future stubs */}
          <p className="px-2 pt-4 pb-1 text-slate-600 text-[10px] uppercase tracking-widest">
            Coming soon
          </p>
          {NAV_FUTURE.map((label) => (
            <span
              key={label}
              className="flex items-center gap-2 px-3 py-2 rounded text-sm text-slate-600 cursor-default"
            >
              {label}
            </span>
          ))}
        </nav>

        {/* Hub status footer */}
        <div className="mt-auto px-4 py-3 border-t border-slate-700/60">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                status?.mqtt_connected ? 'bg-green-400' : 'bg-red-400'
              }`}
            />
            <span className="text-slate-400 text-xs truncate">
              {status ? `v${status.version} · ${status.hostname}` : 'Connecting…'}
            </span>
          </div>
          {status && (
            <div className="text-slate-600 text-xs mt-0.5">
              Up {status.uptime}
            </div>
          )}
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
