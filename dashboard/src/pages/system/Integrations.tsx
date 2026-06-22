import { useEffect, useMemo, useState } from 'react'
import type { Icon } from '@phosphor-icons/react'
import { Cpu, FloppyDisk, Plug, WifiHigh } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { getAdapterHealth, getUnclaimedNodes, purgeUnclaimedNodes } from '../../api'
import Modal from '../../components/Modal'
import { ModalFooter } from '../Areas'
import type { AdapterHealth } from '../../types'

type IntegrationAccent = 'brand' | 'emerald' | 'amber' | 'sky' | 'zinc'

type IntegrationCard = {
  id: string
  title: string
  status: 'Available' | 'Planned'
  statusNote: string
  note: string
  actionLabel?: string
  actionTo?: string
  icon?: Icon
  accent: IntegrationAccent
  brandMark?: boolean
  logoSrc?: string
  logoClass?: string
  capabilities: string[]
}

const logoPath = (file: string) => `./integrations/${file}`

const INTEGRATIONS: IntegrationCard[] = [
  {
    id: 'esphome',
    title: 'ESPHome',
    status: 'Available',
    statusNote: 'Live on this hub',
    note: 'Use ESPHome Builder to flash and manage YAML-based nodes.',
    actionLabel: 'Open ESPHome Builder',
    actionTo: '/esphome',
    icon: Cpu,
    accent: 'emerald',
    logoSrc: logoPath('esphome.svg'),
    logoClass: 'h-5 w-5',
    capabilities: ['YAML firmware', 'Live logs', 'OTA via ESPHome'],
  },
  {
    id: 'propertycore',
    title: 'PropertyCore Firmware Flash',
    status: 'Available',
    statusNote: 'Commissioning-ready',
    note: 'For PC-RLY and other proprietary modules flashed with PropertyCore firmware.',
    actionLabel: 'Open Firmware Flash',
    actionTo: '/firmware-flash',
    accent: 'brand',
    brandMark: true,
    capabilities: ['USB flashing', 'SKU binaries', 'NVS setup guide'],
  },
  {
    id: 'tasmota',
    title: 'Tasmota Adapter',
    status: 'Planned',
    statusNote: 'Adapter scaffold pending',
    note: 'MQTT bridge service for Tasmota topic translation into PropertyCore format.',
    icon: Plug,
    accent: 'amber',
    logoSrc: logoPath('tasmota.svg'),
    logoClass: 'h-5 w-5',
    capabilities: ['Topic mapping', 'State normalization', 'Command bridge'],
  },
  {
    id: 'shelly',
    title: 'Shelly Adapter',
    status: 'Planned',
    statusNote: 'Adapter scaffold pending',
    note: 'Adapter service for Shelly Gen2/Gen3 state and command mapping.',
    icon: WifiHigh,
    accent: 'sky',
    logoSrc: logoPath('shelly.svg'),
    logoClass: 'h-4.5 w-4.5',
    capabilities: ['Gen2/Gen3 mapping', 'State normalization', 'Command bridge'],
  },
  {
    id: 'zigbee',
    title: 'Zigbee2MQTT',
    status: 'Available',
    statusNote: 'UI available, adapter next',
    note: 'Standalone Zigbee service scaffolded as a container with proxied frontend. PropertyCore adapter and discovery bridge come next.',
    actionLabel: 'Open Zigbee2MQTT',
    actionTo: '/zigbee2mqtt',
    icon: Plug,
    accent: 'sky',
    logoSrc: logoPath('zigbee2mqtt.svg'),
    logoClass: 'h-5.5 w-5.5',
    capabilities: ['Coordinator UI', 'Device interview', 'Bridge target'],
  },
  {
    id: 'tuya',
    title: 'Tuya Local Adapter',
    status: 'Planned',
    statusNote: 'Research phase',
    note: 'Local-key based adapter for Tuya devices using LAN protocol.',
    icon: FloppyDisk,
    accent: 'zinc',
    logoSrc: logoPath('tuya-local.svg'),
    logoClass: 'h-4.5 w-4.5',
    capabilities: ['LAN protocol', 'Local key ingestion', 'State normalization'],
  },
]

function accentClasses(accent: IntegrationAccent) {
  switch (accent) {
    case 'brand':
      return {
        panel: 'border-brand/20 bg-brand/[0.03] dark:bg-brand/[0.06]',
        iconWrap: 'bg-brand text-white shadow-sm shadow-brand/20',
        strip: 'bg-brand/20 dark:bg-brand/30',
      }
    case 'emerald':
      return {
        panel: 'border-emerald-200/80 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/20',
        iconWrap: 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20',
        strip: 'bg-emerald-200/80 dark:bg-emerald-900/50',
      }
    case 'amber':
      return {
        panel: 'border-amber-200/80 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/20',
        iconWrap: 'bg-amber-500 text-white shadow-sm shadow-amber-500/20',
        strip: 'bg-amber-200/80 dark:bg-amber-900/50',
      }
    case 'sky':
      return {
        panel: 'border-sky-200/80 bg-sky-50/70 dark:border-sky-900/60 dark:bg-sky-950/20',
        iconWrap: 'bg-sky-500 text-white shadow-sm shadow-sky-500/20',
        strip: 'bg-sky-200/80 dark:bg-sky-900/50',
      }
    default:
      return {
        panel: 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900',
        iconWrap: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200',
        strip: 'bg-zinc-200/80 dark:bg-zinc-800/90',
      }
  }
}

function IntegrationIcon({
  icon: IconComp,
  brandMark,
  logoSrc,
  logoClass,
  accent,
}: {
  icon?: Icon
  brandMark?: boolean
  logoSrc?: string
  logoClass?: string
  accent: IntegrationAccent
}) {
  const classes = accentClasses(accent)
  const [logoFailed, setLogoFailed] = useState(false)
  const usingLogo = Boolean(logoSrc && !logoFailed)

  return (
    <div
      className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
        usingLogo
          ? 'border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900'
          : classes.iconWrap
      }`}
    >
      {usingLogo ? (
        <img
          src={logoSrc}
          alt=""
          className={`${logoClass ?? 'h-5 w-5'} object-contain`}
          onError={() => setLogoFailed(true)}
          loading="lazy"
        />
      ) : brandMark ? (
        <span className="text-sm font-bold tracking-tight">P</span>
      ) : IconComp ? (
        <IconComp size={20} weight="bold" />
      ) : null}
    </div>
  )
}

export default function Integrations() {
  const [health, setHealth] = useState<AdapterHealth[]>([])
  const [maintenanceMsg, setMaintenanceMsg] = useState('')
  const [maintenanceBusy, setMaintenanceBusy] = useState(false)
  const [confirmAction, setConfirmAction] = useState<null | 'purge-offline' | 'purge-synthetic'>(null)
  const [runningAction, setRunningAction] = useState<null | 'purge-offline' | 'purge-synthetic'>(null)

  useEffect(() => {
    const poll = () => getAdapterHealth().then(setHealth).catch(() => {})
    poll()
    const id = setInterval(poll, 10_000)
    return () => clearInterval(id)
  }, [])

  const totalUnclaimed = useMemo(
    () => health.reduce((sum, h) => sum + h.total_seen, 0),
    [health],
  )

  async function purgeStaleOffline() {
    setMaintenanceBusy(true)
    setRunningAction('purge-offline')
    setMaintenanceMsg('')
    try {
      const res = await purgeUnclaimedNodes({ older_than_min: 1440, offline_only: true })
      setMaintenanceMsg(`Removed ${res.removed} stale offline node(s).`)
      const refreshed = await getAdapterHealth()
      setHealth(refreshed)
    } catch (e) {
      setMaintenanceMsg((e as Error).message || 'Purge failed')
    } finally {
      setRunningAction(null)
      setMaintenanceBusy(false)
    }
  }

  async function purgeSyntheticTestNodes() {
    setMaintenanceBusy(true)
    setRunningAction('purge-synthetic')
    setMaintenanceMsg('')
    try {
      const nodes = await getUnclaimedNodes()
      const ids = nodes
        .map((n) => n.device_id)
        .filter((id) => id === 'lab-switch' || id === 'tasmota-lamp' || id === 'shellyplug')
      if (ids.length === 0) {
        setMaintenanceMsg('No synthetic test nodes found.')
      } else {
        const res = await purgeUnclaimedNodes({ ids })
        setMaintenanceMsg(`Removed ${res.removed} synthetic test node(s).`)
      }
      const refreshed = await getAdapterHealth()
      setHealth(refreshed)
    } catch (e) {
      setMaintenanceMsg((e as Error).message || 'Purge failed')
    } finally {
      setRunningAction(null)
      setMaintenanceBusy(false)
    }
  }

  return (
    <div className="p-8 max-w-6xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Integrations Setup</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Configure protocol integrations and provisioning tools here. Device claiming is now discovery-only from the Add Device popup.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {INTEGRATIONS.map((item) => (
          <div
            key={item.id}
            className={`rounded-2xl border p-4 ${accentClasses(item.accent).panel}`}
          >
            <div className={`-mx-4 -mt-4 mb-4 h-1.5 rounded-t-2xl ${accentClasses(item.accent).strip}`} />
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <IntegrationIcon
                  icon={item.icon}
                  brandMark={item.brandMark}
                  logoSrc={item.logoSrc}
                  logoClass={item.logoClass}
                  accent={item.accent}
                />
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.title}</h2>
                  <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                    Integration Surface
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <span
                  className={`inline-flex text-xs px-2 py-0.5 rounded-full ${
                  item.status === 'Available'
                    ? 'bg-brand/10 text-brand dark:bg-brand/15 dark:text-brand-400'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {item.status}
                </span>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  {item.statusNote}
                </p>
              </div>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">{item.note}</p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.capabilities.map((cap) => (
                <span
                  key={cap}
                  className="rounded-full border border-zinc-200 bg-white/70 px-2 py-0.5 text-[11px] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-300"
                >
                  {cap}
                </span>
              ))}
            </div>

            {item.actionTo && item.actionLabel && (
              <div className="mt-4">
                <Link to={item.actionTo} className="btn-primary text-xs px-3 py-1.5 inline-flex">
                  {item.actionLabel}
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Discovery Health</p>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{totalUnclaimed} unclaimed total</span>
        </div>
        {health.length === 0 ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">No discovery activity yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {health.map((h) => (
              <div key={h.source} className="flex items-center justify-between text-xs border border-zinc-100 dark:border-zinc-800 rounded px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${h.status === 'healthy' ? 'bg-brand' : h.status === 'idle' ? 'bg-amber-400' : 'bg-zinc-400'}`} />
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">{h.source}</span>
                  <span className="text-[10px] uppercase text-zinc-500 dark:text-zinc-400">{h.status}</span>
                </div>
                <span className="text-zinc-500 dark:text-zinc-400">
                  {h.online_count}/{h.total_seen} online · last seen {h.last_seen ? new Date(h.last_seen).toLocaleTimeString() : '-'}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            className="btn-ghost text-xs px-3 py-1.5"
            onClick={() => setConfirmAction('purge-offline')}
            disabled={maintenanceBusy}
          >
            {runningAction === 'purge-offline' ? 'Purging…' : <>Purge Offline {`>`}24h</>}
          </button>
          <button
            className="btn-ghost text-xs px-3 py-1.5"
            onClick={() => setConfirmAction('purge-synthetic')}
            disabled={maintenanceBusy}
          >
            {runningAction === 'purge-synthetic' ? 'Purging…' : 'Purge Synthetic Test Nodes'}
          </button>
          {maintenanceMsg && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{maintenanceMsg}</span>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-4">
        <p className="text-sm text-amber-900 dark:text-amber-200 font-medium">Provisioning model</p>
        <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
          Integration setup (this page) handles onboarding pipelines. Add Device handles only discovered-node claiming into the registry.
        </p>
        <p className="text-xs text-amber-800 dark:text-amber-300 mt-2">
          External services: ESPHome, Zigbee2MQTT. PropertyCore-managed adapters: Tasmota, Shelly, Tuya, Generic MQTT.
        </p>
      </div>

      {confirmAction && (
        <Modal
          title={confirmAction === 'purge-offline' ? 'Purge Offline Nodes' : 'Purge Synthetic Test Nodes'}
          onClose={() => {
            if (!maintenanceBusy) setConfirmAction(null)
          }}
        >
          <div className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {confirmAction === 'purge-offline'
                ? 'Remove unclaimed nodes that are offline and older than 24 hours?'
                : 'Remove known synthetic test nodes (lab-switch, tasmota-lamp, shellyplug) from unclaimed discovery?'}
            </p>
            <ModalFooter
              onCancel={() => setConfirmAction(null)}
              onSave={async () => {
                if (confirmAction === 'purge-offline') {
                  await purgeStaleOffline()
                } else {
                  await purgeSyntheticTestNodes()
                }
                setConfirmAction(null)
              }}
              saveLabel={confirmAction === 'purge-offline'
                ? (runningAction === 'purge-offline' ? 'Purging…' : 'Confirm')
                : (runningAction === 'purge-synthetic' ? 'Purging…' : 'Confirm')}
              saving={maintenanceBusy}
            />
          </div>
        </Modal>
      )}
    </div>
  )
}
