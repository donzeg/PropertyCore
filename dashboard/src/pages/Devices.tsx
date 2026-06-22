import { useEffect, useRef, useState } from 'react'
import { deleteDevice, deleteUnclaimedNode, getAreas, getDevices, getScenes, getWsUrl, getUnclaimedNodes, updateDevice } from '../api'
import Modal from '../components/Modal'
import ConfigSheet from '../components/ConfigSheet'
import RelayConfig from './devices/RelayConfig'
import DimmerConfig from './devices/DimmerConfig'
import AcConfig from './devices/AcConfig'
import CurtainConfig from './devices/CurtainConfig'
import KeypadConfig from './devices/KeypadConfig'
import WallPanelConfig from './devices/WallPanelConfig'
import SmartRemoteConfig from './devices/SmartRemoteConfig'
import { Actions, Empty, Field, ModalFooter, Table } from './Areas'
import AddDeviceWizard from './devices/AddDeviceWizard'
import type { Area, Device, Scene, UnclaimedNode } from '../types'
import { Link, useSearchParams } from 'react-router-dom'

const DEVICE_TYPE_LABELS: Record<string, string> = {
  relay: 'Relay Modules',
  dimmer: 'Dimmers',
  ac_gateway: 'AC Gateways',
  curtain: 'Curtains',
  sensor: 'Sensors',
  keypad: 'Keypads',
  wall_panel: 'Wall Panels',
  smart_remote: 'Smart Remotes',
  camera: 'Cameras',
  access_control: 'Access Control',
}

// Device types that have a dedicated config panel
const CONFIGURABLE_TYPES = new Set([
  'relay', 'dimmer', 'ac_gateway', 'curtain', 'keypad', 'wall_panel', 'smart_remote',
])

const SOURCE_META: Record<string, { label: string; chip: string }> = {
  esphome: {
    label: 'ESPHome',
    chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  },
  zigbee2mqtt: {
    label: 'Zigbee2MQTT',
    chip: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  },
  tasmota: {
    label: 'Tasmota',
    chip: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  },
}

function sourceLabel(source: string): string {
  return SOURCE_META[source]?.label || source
}

export default function Devices() {
  const [searchParams] = useSearchParams()
  const typeFilter = searchParams.get('type') ?? ''
  const [devices, setDevices] = useState<Device[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [scenes, setScenes] = useState<Scene[]>([])
  const [unclaimed, setUnclaimed] = useState<UnclaimedNode[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Device | null>(null)
  const [configuring, setConfiguring] = useState<Device | null>(null)
  const [addWizard, setAddWizard] = useState(false)
  const [wizardInitialDeviceID, setWizardInitialDeviceID] = useState<string | undefined>(undefined)
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [pendingUnclaimedDelete, setPendingUnclaimedDelete] = useState<string | null>(null)
  const [removingUnclaimed, setRemovingUnclaimed] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', area_id: '' })
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([getDevices(), getAreas(), getScenes(), getUnclaimedNodes()])
      .then(([d, a, s, u]) => { setDevices(d); setAreas(a); setScenes(s); setUnclaimed(u) })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  // Live updates — patch last_seen + online whenever a device_state WS event arrives
  const wsRef = useRef<WebSocket | null>(null)
  useEffect(() => {
    const ws = new WebSocket(getWsUrl())
    wsRef.current = ws
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.event === 'device_state' && msg.data?.id) {
          setDevices((prev) => prev.map((d) =>
            d.id === msg.data.id
              ? { ...d, last_seen: msg.data.last_seen ?? d.last_seen }
              : d
          ))
        }
        if (msg.event === 'device_offline' && msg.data?.id) {
          setDevices((prev) => prev.map((d) =>
            d.id === msg.data.id ? { ...d, online: false } : d
          ))
        }
        if (msg.event === 'device_online' && msg.data?.id) {
          setDevices((prev) => prev.map((d) =>
            d.id === msg.data.id ? { ...d, online: true } : d
          ))
        }
        if (msg.event === 'device_unclaimed' && msg.data?.device_id) {
          setUnclaimed((prev) => {
            const exists = prev.some((u) => u.device_id === msg.data.device_id)
            return exists ? prev : [...prev, msg.data]
          })
        }
        if (msg.event === 'device_claimed' && msg.data?.device_id) {
          setUnclaimed((prev) => prev.filter((u) => u.device_id !== msg.data.device_id))
          // Device is now in registry, so reload devices list
          getDevices().then((d) => setDevices(d)).catch(console.error)
        }
      } catch { /* ignore parse errors */ }
    }
    return () => ws.close()
  }, [])

  const openEdit = (d: Device) => {
    setForm({ name: d.name, area_id: d.area_id || '' })
    setError('')
    setEditing(d)
  }

  const handleSave = async () => {
    if (!editing) return
    try {
      await updateDevice(editing.id, { name: form.name.trim(), area_id: form.area_id })
      setEditing(null)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    }
  }

  const handleDelete = (id: string) => {
    setPendingDelete(id)
  }

  const areaName = (id: string) => areas.find((a) => a.id === id)?.name ?? '—'
  const typeFilteredUnclaimed = typeFilter
    ? unclaimed.filter((u) => u.type === typeFilter)
    : unclaimed
  const sourceOptions = ['all', ...Array.from(new Set(typeFilteredUnclaimed.map((u) => u.source))).sort()]
  const filteredUnclaimed = sourceFilter === 'all'
    ? typeFilteredUnclaimed
    : typeFilteredUnclaimed.filter((u) => u.source === sourceFilter)
  const filteredDevices = typeFilter ? devices.filter((d) => d.type === typeFilter) : devices

  useEffect(() => {
    if (!sourceOptions.includes(sourceFilter)) {
      setSourceFilter('all')
    }
  }, [sourceFilter, sourceOptions])

  // Refresh the configuring device reference after a save (so metadata is up to date)
  const onConfigSaved = () => {
    load()
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Devices</h1>
          {typeFilter && (
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span>Filter: {DEVICE_TYPE_LABELS[typeFilter] ?? typeFilter}</span>
              <Link
                to="/devices"
                className="rounded-full border border-zinc-300 px-2 py-0.5 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                Clear filter
              </Link>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-400">
            {filteredDevices.filter((d) => d.online).length} online · {filteredDevices.length} total
          </span>
          <button
            onClick={() => {
              setWizardInitialDeviceID(undefined)
              setAddWizard(true)
            }}
            className="btn-primary text-sm px-3 py-1.5"
          >
            + Add Device
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-zinc-400 text-sm">Loading…</p>
      ) : (
        <>
          {/* Unclaimed Nodes Card */}
          {typeFilteredUnclaimed.length > 0 && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-lg">
              <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                <h2 className="font-semibold text-amber-900 dark:text-amber-100">
                  Unclaimed Discovered Nodes ({filteredUnclaimed.filter((u) => u.online).length} online)
                </h2>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {sourceOptions.map((src) => (
                    <button
                      key={src}
                      onClick={() => setSourceFilter(src)}
                      className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                        sourceFilter === src
                          ? 'border-brand bg-brand/10 text-brand dark:text-brand-400 dark:bg-brand/15'
                          : 'border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {src === 'all' ? 'All Sources' : sourceLabel(src)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                {filteredUnclaimed.map((node) => (
                  <div
                    key={node.device_id}
                    className="flex items-center justify-between px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-sm"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2 flex-wrap">
                        <span>{node.device_id}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${SOURCE_META[node.source]?.chip || 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'}`}>
                          {sourceLabel(node.source)}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        {node.type} · {node.online ? '🟢 online' : '🔴 offline'} {node.fw_version && `· ${node.fw_version}`}
                      </div>
                    </div>
                      <div className="ml-2 flex items-center gap-2">
                        <button
                          onClick={() => {
                            setWizardInitialDeviceID(node.device_id)
                            setAddWizard(true)
                          }}
                          disabled={removingUnclaimed === node.device_id}
                          className="px-3 py-1 text-xs bg-brand text-white hover:bg-brand/90 rounded font-medium"
                        >
                          Claim
                        </button>
                        <button
                          onClick={() => setPendingUnclaimedDelete(node.device_id)}
                          disabled={removingUnclaimed === node.device_id}
                          className="px-3 py-1 text-xs border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded"
                        >
                          {removingUnclaimed === node.device_id ? 'Removing…' : 'Remove'}
                        </button>
                      </div>
                  </div>
                ))}
                {filteredUnclaimed.length === 0 && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 px-1">
                    {typeFilter
                      ? `No unclaimed ${DEVICE_TYPE_LABELS[typeFilter] ?? typeFilter.toLowerCase()} for this source filter.`
                      : 'No unclaimed nodes for this source filter.'}
                  </p>
                )}
              </div>
            </div>
          )}

          {filteredDevices.length === 0 ? (
            <Empty
              message={typeFilter
                ? `No devices of type ${DEVICE_TYPE_LABELS[typeFilter] ?? typeFilter} found.`
                : 'No devices registered yet. Devices auto-register when they connect to the MQTT broker.'}
            />
          ) : (
            <Table
              head={['Status', 'Name / ID', 'Type', 'Area', 'Last Seen', '']}
              rows={filteredDevices.map((d) => [
                <OnlineBadge online={d.online} />,
                <span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100 block">{d.name}</span>
                  <code className="text-xs text-zinc-400 dark:text-zinc-500">{d.id}</code>
                </span>,
                <span className="text-zinc-600 dark:text-zinc-400">{d.type}</span>,
                <span className="text-zinc-600 dark:text-zinc-400">{areaName(d.area_id)}</span>,
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
              {d.last_seen ? new Date(d.last_seen).toLocaleString() : '—'}
            </span>,
            <Actions
              onEdit={() => openEdit(d)}
              onDelete={() => handleDelete(d.id)}
              extraActions={
                CONFIGURABLE_TYPES.has(d.type)
                  ? [{ label: 'Configure', onClick: () => setConfiguring(d), color: 'text-brand dark:text-brand-400' }]
                  : undefined
              }
            />,
          ])}
            />
          )}
        </>
      )}

      {/* Edit modal (name + area) */}
      {editing && (
        <Modal title={`Edit Device — ${editing.id}`} onClose={() => setEditing(null)}>
          <div className="space-y-3">
            <Field
              label="Display Name"
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            />
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Area</label>
              <select
                value={form.area_id}
                onChange={(e) => setForm((f) => ({ ...f, area_id: e.target.value }))}
                className="input"
              >
                <option value="">— Unassigned —</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            {/* Live state preview */}
            {editing.state && Object.keys(editing.state).length > 0 && (
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Live state</p>
                <pre className="text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md p-2 text-zinc-700 dark:text-zinc-300 overflow-auto max-h-32">
                  {JSON.stringify(editing.state, null, 2)}
                </pre>
              </div>
            )}

            {error && <p className="text-red-500 text-xs">{error}</p>}
            <ModalFooter onCancel={() => setEditing(null)} onSave={handleSave} />
          </div>
        </Modal>
      )}

      {/* Add Device wizard */}
      {addWizard && (
        <AddDeviceWizard
          onClose={() => setAddWizard(false)}
          initialDeviceId={wizardInitialDeviceID}
          onDone={() => { setAddWizard(false); load() }}
        />
      )}

      {/* Delete confirmation */}
      {pendingDelete && (
        <Modal title="Remove Device" onClose={() => setPendingDelete(null)}>
          <div className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Remove this device from the registry? It will re-register automatically if it reconnects via MQTT.
            </p>
            <ModalFooter
              onCancel={() => setPendingDelete(null)}
              onSave={async () => {
                await deleteDevice(pendingDelete).catch(console.error)
                setPendingDelete(null)
                load()
              }}
              saveLabel="Remove"
            />
          </div>
        </Modal>
      )}

        {pendingUnclaimedDelete && (
          <Modal
            title="Remove Unclaimed Node"
            onClose={() => {
              if (removingUnclaimed !== pendingUnclaimedDelete) setPendingUnclaimedDelete(null)
            }}
          >
            <div className="space-y-4">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Remove this unclaimed node from discovery list? It can reappear if it publishes state again.
              </p>
              <ModalFooter
                onCancel={() => setPendingUnclaimedDelete(null)}
                onSave={async () => {
                  const id = pendingUnclaimedDelete
                  setRemovingUnclaimed(id)
                  await deleteUnclaimedNode(id).catch(console.error)
                  setPendingUnclaimedDelete(null)
                  setRemovingUnclaimed(null)
                  load()
                }}
                saveLabel={removingUnclaimed === pendingUnclaimedDelete ? 'Removing…' : 'Remove'}
                saving={removingUnclaimed === pendingUnclaimedDelete}
                cancelDisabled={removingUnclaimed === pendingUnclaimedDelete}
              />
            </div>
          </Modal>
        )}

      {/* Device-type config sheet */}
      {configuring && (
        <ConfigSheet
          title={`Configure — ${configuring.name}`}
          subtitle={`${configuring.type} · ${configuring.id}`}
          onClose={() => setConfiguring(null)}
        >
          {configuring.type === 'relay' && (
            <RelayConfig device={configuring} onClose={() => setConfiguring(null)} onSaved={onConfigSaved} />
          )}
          {configuring.type === 'dimmer' && (
            <DimmerConfig device={configuring} onClose={() => setConfiguring(null)} onSaved={onConfigSaved} />
          )}
          {configuring.type === 'ac_gateway' && (
            <AcConfig device={configuring} onClose={() => setConfiguring(null)} onSaved={onConfigSaved} />
          )}
          {configuring.type === 'curtain' && (
            <CurtainConfig device={configuring} onClose={() => setConfiguring(null)} onSaved={onConfigSaved} />
          )}
          {configuring.type === 'keypad' && (
            <KeypadConfig device={configuring} scenes={scenes} onClose={() => setConfiguring(null)} onSaved={onConfigSaved} />
          )}
          {configuring.type === 'wall_panel' && (
            <WallPanelConfig device={configuring} areas={areas} onClose={() => setConfiguring(null)} onSaved={onConfigSaved} />
          )}
          {configuring.type === 'smart_remote' && (
            <SmartRemoteConfig device={configuring} scenes={scenes} onClose={() => setConfiguring(null)} onSaved={onConfigSaved} />
          )}
        </ConfigSheet>
      )}
    </div>
  )
}

function OnlineBadge({ online }: { online: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
        online
          ? 'bg-brand/10 text-brand dark:bg-brand/15 dark:text-brand-400'
          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-brand' : 'bg-zinc-400'}`}
      />
      {online ? 'Online' : 'Offline'}
    </span>
  )
}
