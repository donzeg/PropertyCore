import { useEffect, useState } from 'react'
import { deleteDevice, getAreas, getDevices, updateDevice } from '../api'
import Modal from '../components/Modal'
import { Actions, Empty, Field, ModalFooter, Table } from './Areas'
import type { Area, Device } from '../types'

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Device | null>(null)
  const [form, setForm] = useState({ name: '', area_id: '' })
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([getDevices(), getAreas()])
      .then(([d, a]) => { setDevices(d); setAreas(a) })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

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
            <Actions onEdit={() => openEdit(d)} onDelete={() => handleDelete(d.id)} />,
          ])}
        />
      )}

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
