import { NavLink, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getStatus } from '../api'
import { useTheme } from '../App'
import type { HubStatus } from '../types'

const NAV = [
  { to: 'overview',   label: 'Overview',   icon: '⬡' },
  { to: 'floors',     label: 'Floors',     icon: '⬜' },
  { to: 'areas',      label: 'Areas',      icon: '⬛' },
  { to: 'devices',    label: 'Devices',    icon: '◉' },
  { to: 'scenes',     label: 'Scenes',     icon: '▷' },
  { to: 'rules',      label: 'Rules',      icon: '⚡' },
  { to: 'schedules',  label: 'Schedules',  icon: '◷' },
  { to: 'users',      label: 'Users',      icon: '◎' },
]

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
  const { theme, toggle } = useTheme()

  useEffect(() => {
    const fetch = () => getStatus().then(setStatus).catch(() => {})
    fetch()
    const id = setInterval(fetch, 10_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="w-56 flex flex-col flex-shrink-0 overflow-y-auto
                        bg-white dark:bg-zinc-900
                        border-r border-zinc-200 dark:border-zinc-800">

        {/* Branding */}
        <div className="px-5 py-5 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-brand flex items-center justify-center text-white text-xs font-bold">
              P
            </span>
            <div>
              <div className="text-zinc-900 dark:text-white font-semibold text-sm leading-tight tracking-tight">
                PropertyCore
              </div>
              <div className="text-zinc-400 dark:text-zinc-500 text-[10px]">Config Dashboard</div>
            </div>
          </div>
        </div>

        {/* Active nav */}
        <nav className="py-3 px-2 flex-1">
          <p className="px-3 pb-1.5 text-zinc-400 dark:text-zinc-600 text-[10px] uppercase tracking-widest font-medium">
            Configuration
          </p>
          {NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors mb-0.5 ${
                  isActive
                    ? 'bg-brand/10 text-brand dark:bg-brand/15 dark:text-brand-400'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`
              }
            >
              <span className="text-[13px] opacity-70">{icon}</span>
              {label}
            </NavLink>
          ))}

          {/* Future stubs */}
          <p className="px-3 pt-4 pb-1.5 text-zinc-300 dark:text-zinc-700 text-[10px] uppercase tracking-widest font-medium">
            Coming soon
          </p>
          {NAV_FUTURE.map((label) => (
            <span
              key={label}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-zinc-300 dark:text-zinc-700 cursor-default mb-0.5"
            >
              <span className="text-[13px]">·</span>
              {label}
            </span>
          ))}
        </nav>

        {/* Footer — status + theme toggle */}
        <div className="px-3 py-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
          {/* MQTT / uptime */}
          <div className="px-2 flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                status?.mqtt_connected ? 'bg-brand' : 'bg-red-400'
              }`}
            />
            <span className="text-zinc-500 dark:text-zinc-400 text-xs truncate">
              {status ? `v${status.version} · ${status.hostname}` : 'Connecting…'}
            </span>
          </div>
          {status && (
            <div className="px-2 text-zinc-400 dark:text-zinc-600 text-[11px]">
              Up {status.uptime}
            </div>
          )}

          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium
                       text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800
                       hover:text-zinc-800 dark:hover:text-zinc-100 transition-colors"
          >
            <span>{theme === 'dark' ? '☀' : '☾'}</span>
            <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </button>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto bg-zinc-50 dark:bg-zinc-950">
        <Outlet />
      </main>
    </div>
  )
}

