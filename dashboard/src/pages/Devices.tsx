import { useEffect, useRef, useState } from 'react'
import { deleteDevice, getAreas, getDevices, getScenes, getWsUrl, updateDevice } from '../api'
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
import type { Area, Device, Scene } from '../types'

// Device types that have a dedicated config panel
const CONFIGURABLE_TYPES = new Set([
  'relay', 'dimmer', 'ac_gateway', 'curtain', 'keypad', 'wall_panel', 'smart_remote',
])

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [scenes, setScenes] = useState<Scene[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Device | null>(null)
  const [configuring, setConfiguring] = useState<Device | null>(null)
  const [form, setForm] = useState({ name: '', area_id: '' })
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([getDevices(), getAreas(), getScenes()])
      .then(([d, a, s]) => { setDevices(d); setAreas(a); setScenes(s) })
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
              ? { ...d, online: msg.data.online ?? d.online, last_seen: msg.data.last_seen ?? d.last_seen }
              : d
          ))
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

  const handleDelete = async (id: string) => {
    if (!confirm('Remove device from registry? It will re-register automatically if it reconnects via MQTT.')) return
    await deleteDevice(id).catch(console.error)
    load()
  }

  const areaName = (id: string) => areas.find((a) => a.id === id)?.name ?? '—'

  // Refresh the configuring device reference after a save (so metadata is up to date)
  const onConfigSaved = () => {
    load()
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Devices</h1>
        <span className="text-sm text-zinc-400">
          {devices.filter((d) => d.online).length} online · {devices.length} total
        </span>
      </div>

      {loading ? (
        <p className="text-zinc-400 text-sm">Loading…</p>
      ) : devices.length === 0 ? (
        <Empty message="No devices registered yet. Devices auto-register when they connect to the MQTT broker." />
      ) : (
        <Table
          head={['Status', 'Name / ID', 'Type', 'Area', 'Last Seen', '']}
          rows={devices.map((d) => [
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
