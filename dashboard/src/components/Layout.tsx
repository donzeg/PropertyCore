import { NavLink, Outlet } from 'react-router-dom'
import { createContext, useContext, useEffect, useState } from 'react'
import type { Icon } from '@phosphor-icons/react'
import {
  House,
  Buildings,
  StackSimple,
  GridFour,
  HardDrives,
  Play,
  GitBranch,
  CalendarBlank,
  Users,
  Sun,
  Drop,
  Wrench,
  MusicNotes,
  Television,
  Bell,
  ArrowsClockwise,
  ClipboardText,
  Package,
  Plug,
  Key,
  UserPlus,
  ChartLine,
  CaretDoubleLeft,
  CaretDoubleRight,
  Moon,
} from '@phosphor-icons/react'
import { getStatus, getProperty } from '../api'
import { useTheme } from '../App'
import type { HubStatus, Property } from '../types'

// ─── Property context ─────────────────────────────────────────────────────────

export const PropertyContext = createContext<Property | null>(null)
export const useProperty = () => useContext(PropertyContext)

// ─── Nav types ────────────────────────────────────────────────────────────────

type NavItem = {
  to: string
  label: string
  icon: Icon
  live: boolean
}

type NavSection = {
  heading: string
  items: NavItem[]
}

// ─── Static nav sections ──────────────────────────────────────────────────────

const CORE_SECTIONS: NavSection[] = [
  {
    heading: 'Overview',
    items: [
      { to: 'overview', label: 'Overview', icon: House, live: true },
    ],
  },
  {
    heading: 'Property',
    items: [
      { to: 'property',  label: 'Property', icon: Buildings,   live: true },
      { to: 'floors',    label: 'Floors',   icon: StackSimple, live: true },
      { to: 'areas',     label: 'Areas',    icon: GridFour,    live: true },
    ],
  },
  {
    heading: 'Devices',
    items: [
      { to: 'devices', label: 'Devices', icon: HardDrives, live: true },
    ],
  },
  {
    heading: 'Automation',
    items: [
      { to: 'scenes',    label: 'Scenes',    icon: Play,          live: true },
      { to: 'rules',     label: 'Rules',     icon: GitBranch,     live: true },
      { to: 'schedules', label: 'Schedules', icon: CalendarBlank, live: true },
    ],
  },
  {
    heading: 'Access',
    items: [
      { to: 'users', label: 'Users', icon: Users, live: true },
    ],
  },
]

const HOSPITALITY_SECTION: NavSection = {
  heading: 'Hospitality',
  items: [
    { to: 'visitors',  label: 'Visitor Mgmt', icon: UserPlus,  live: false },
    { to: 'reporting', label: 'Reporting',    icon: ChartLine, live: false },
  ],
}

const FUTURE_SECTIONS: NavSection[] = [
  {
    heading: 'Energy',
    items: [
      { to: 'energy',    label: 'Energy',     icon: Sun,         live: false },
      { to: 'water',     label: 'Water',      icon: Drop,        live: false },
      { to: 'generator', label: 'Generator',  icon: Wrench,      live: false },
    ],
  },
  {
    heading: 'Media',
    items: [
      { to: 'entertainment', label: 'Entertainment', icon: MusicNotes, live: false },
      { to: 'av-ir',         label: 'AV / IR',        icon: Television, live: false },
    ],
  },
  {
    heading: 'System',
    items: [
      { to: 'notifications', label: 'Notifications', icon: Bell,           live: false },
      { to: 'ota',           label: 'OTA Updates',   icon: ArrowsClockwise,live: false },
      { to: 'logs',          label: 'Logs',          icon: ClipboardText,  live: false },
      { to: 'backup',        label: 'Backup',        icon: Package,        live: false },
      { to: 'integrations',  label: 'Integrations',  icon: Plug,           live: false },
      { to: 'api',           label: 'API Keys',      icon: Key,            live: false },
    ],
  },
]

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function Layout() {
  const [status,   setStatus]   = useState<HubStatus | null>(null)
  const [property, setProperty] = useState<Property | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const { theme, toggle } = useTheme()

  useEffect(() => {
    const poll = () => getStatus().then(setStatus).catch(() => {})
    poll()
    const id = setInterval(poll, 10_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    getProperty().then(setProperty).catch(() => {})
  }, [])

  // Build full section list — conditionally inject Hospitality for hotels
  const sections: NavSection[] = [
    ...CORE_SECTIONS,
    ...(property?.type === 'hotel' ? [HOSPITALITY_SECTION] : []),
    ...FUTURE_SECTIONS,
  ]

  return (
    <PropertyContext.Provider value={property}>
      <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">

        {/* ── Sidebar ───────────────────────────────────────────── */}
        <aside
          className={`${collapsed ? 'w-14' : 'w-60'} flex flex-col flex-shrink-0 overflow-y-auto
                      bg-white dark:bg-zinc-900 transition-[width] duration-200 ease-in-out`}
        >
          {/* Branding */}
          <div className="flex items-center gap-2.5 px-4 py-4 min-h-[56px]">
            <span className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center
                             text-white text-xs font-bold flex-shrink-0">
              P
            </span>
            {!collapsed && (
              <div className="overflow-hidden">
                <div className="text-zinc-900 dark:text-white font-semibold text-sm leading-tight tracking-tight truncate">
                  PropertyCore
                </div>
                <div className="text-zinc-400 dark:text-zinc-500 text-[10px]">Config Dashboard</div>
              </div>
            )}
          </div>

          {/* Nav sections */}
          <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-4">
            {sections.map((section) => (
              <div key={section.heading}>
                {/* Section heading — hidden when collapsed */}
                {!collapsed && (
                  <p className="px-2 pb-1 text-[10px] uppercase tracking-widest font-semibold
                                text-zinc-400 dark:text-zinc-600">
                    {section.heading}
                  </p>
                )}
                <div className="space-y-0.5">
                  {section.items.map(({ to, label, icon: IconComp, live }) =>
                    live ? (
                      <NavLink
                        key={to}
                        to={to}
                        title={collapsed ? label : undefined}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                            collapsed ? 'justify-center' : ''
                          } ${
                            isActive
                              ? 'bg-brand/10 text-brand dark:bg-brand/15 dark:text-brand-400'
                              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
                          }`
                        }
                      >
                        <IconComp size={16} weight="regular" className="flex-shrink-0" />
                        {!collapsed && label}
                      </NavLink>
                    ) : (
                      <span
                        key={to}
                        title={collapsed ? label : undefined}
                        className={`flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm
                                    text-zinc-300 dark:text-zinc-700 cursor-not-allowed opacity-60
                                    ${collapsed ? 'justify-center' : ''}`}
                      >
                        <IconComp size={16} weight="regular" className="flex-shrink-0" />
                        {!collapsed && label}
                      </span>
                    )
                  )}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="px-2 py-3 space-y-1">
            {/* MQTT + version */}
            {!collapsed ? (
              <div className="px-2 py-1.5 flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    status?.mqtt_connected ? 'bg-brand' : 'bg-red-400'
                  }`}
                />
                <span className="text-zinc-500 dark:text-zinc-400 text-xs truncate">
                  {status ? `v${status.version} · ${status.uptime}` : 'Connecting…'}
                </span>
              </div>
            ) : (
              <div
                title={status?.mqtt_connected ? 'MQTT connected' : 'MQTT disconnected'}
                className="flex justify-center py-1.5"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    status?.mqtt_connected ? 'bg-brand' : 'bg-red-400'
                  }`}
                />
              </div>
            )}

            {/* Theme toggle */}
            <button
              onClick={toggle}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium
                         text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800
                         hover:text-zinc-800 dark:hover:text-zinc-100 transition-colors
                         ${collapsed ? 'justify-center' : ''}`}
            >
              {theme === 'dark'
                ? <Sun size={14} weight="regular" className="flex-shrink-0" />
                : <Moon size={14} weight="regular" className="flex-shrink-0" />}
              {!collapsed && (theme === 'dark' ? 'Light mode' : 'Dark mode')}
            </button>

            {/* Collapse toggle */}
            <button
              onClick={() => setCollapsed((c) => !c)}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium
                         text-zinc-400 dark:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800
                         hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors
                         ${collapsed ? 'justify-center' : ''}`}
            >
              {collapsed
                ? <CaretDoubleRight size={14} weight="regular" />
                : <CaretDoubleLeft  size={14} weight="regular" />}
              {!collapsed && 'Collapse'}
            </button>
          </div>
        </aside>

        {/* ── Main content ──────────────────────────────────────── */}
        <main className="flex-1 overflow-auto bg-zinc-50 dark:bg-zinc-950">
          <Outlet />
        </main>
      </div>
    </PropertyContext.Provider>
  )
}

