import { useEffect, useState } from 'react'
import { deleteDevice, getDevices, getRooms, updateDevice } from '../api'
import Modal from '../components/Modal'
import { Actions, Empty, Field, ModalFooter, Table } from './Rooms'
import type { Device, Room } from '../types'

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Device | null>(null)
  const [form, setForm] = useState({ name: '', room_id: '' })
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([getDevices(), getRooms()])
      .then(([d, r]) => { setDevices(d); setRooms(r) })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const openEdit = (d: Device) => {
    setForm({ name: d.name, room_id: d.room_id || '' })
    setError('')
    setEditing(d)
  }

  const handleSave = async () => {
    if (!editing) return
    try {
      await updateDevice(editing.id, { name: form.name.trim(), room_id: form.room_id })
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

  const roomName = (id: string) => rooms.find((r) => r.id === id)?.name ?? '—'

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-slate-800">Devices</h1>
        <span className="text-sm text-slate-400">
          {devices.filter((d) => d.online).length} online · {devices.length} total
        </span>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : devices.length === 0 ? (
        <Empty message="No devices registered yet. Devices auto-register when they connect to the MQTT broker." />
      ) : (
        <Table
          head={['Status', 'Name / ID', 'Type', 'Room', 'Last Seen', '']}
          rows={devices.map((d) => [
            <OnlineBadge online={d.online} />,
            <span>
              <span className="font-medium text-slate-800 block">{d.name}</span>
              <code className="text-xs text-slate-400">{d.id}</code>
            </span>,
            <span className="text-slate-600">{d.type}</span>,
            <span className="text-slate-600">{roomName(d.room_id)}</span>,
            <span className="text-xs text-slate-400">
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
              <label className="block text-xs text-slate-600 mb-1">Room</label>
              <select
                value={form.room_id}
                onChange={(e) => setForm((f) => ({ ...f, room_id: e.target.value }))}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Unassigned —</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.floor ? `${r.floor} / ` : ''}{r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Live state preview */}
            {editing.state && Object.keys(editing.state).length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Live state</p>
                <pre className="text-xs bg-slate-50 border border-slate-200 rounded p-2 text-slate-700 overflow-auto max-h-32">
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
        online ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-green-500' : 'bg-slate-400'}`}
      />
      {online ? 'Online' : 'Offline'}
    </span>
  )
}
