import React, { useEffect, useState } from 'react'
import { createRoom, deleteRoom, getRooms, updateRoom } from '../api'
import Modal from '../components/Modal'
import type { Room } from '../types'

export default function Rooms() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Room | null>(null)
  const [form, setForm] = useState({ name: '', floor: '' })
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    getRooms()
      .then(setRooms)
      .catch(() => setError('Failed to load rooms'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const openAdd = () => {
    setForm({ name: '', floor: '' })
    setError('')
    setAdding(true)
  }
  const openEdit = (r: Room) => {
    setForm({ name: r.name, floor: r.floor })
    setError('')
    setEditing(r)
  }
  const closeModal = () => { setAdding(false); setEditing(null) }

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Name is required'); return }
    try {
      if (editing) await updateRoom(editing.id, { name: form.name.trim(), floor: form.floor.trim() })
      else await createRoom({ name: form.name.trim(), floor: form.floor.trim() })
      closeModal()
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this room? Devices assigned to it will become unassigned.')) return
    await deleteRoom(id).catch(console.error)
    load()
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-slate-800">Rooms</h1>
        <button onClick={openAdd} className="btn-primary">Add Room</button>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : rooms.length === 0 ? (
        <Empty message="No rooms configured. Add a room to get started." />
      ) : (
        <Table
          head={['Name', 'Floor', 'ID', '']}
          rows={rooms.map((r) => [
            <span className="font-medium text-slate-800">{r.name}</span>,
            r.floor || <span className="text-slate-400">—</span>,
            <code className="text-xs text-slate-400">{r.id}</code>,
            <Actions
              onEdit={() => openEdit(r)}
              onDelete={() => handleDelete(r.id)}
            />,
          ])}
        />
      )}

      {(adding || editing) && (
        <Modal title={editing ? 'Edit Room' : 'Add Room'} onClose={closeModal}>
          <div className="space-y-3">
            <Field label="Name *" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
            <Field
              label="Floor"
              placeholder="e.g. Ground Floor"
              value={form.floor}
              onChange={(v) => setForm((f) => ({ ...f, floor: v }))}
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <ModalFooter onCancel={closeModal} onSave={handleSubmit} />
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Shared primitives ────────────────────────────────────────────────────────

export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div>
      <label className="block text-xs text-slate-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}

export function ModalFooter({
  onCancel,
  onSave,
  saveLabel = 'Save',
}: {
  onCancel: () => void
  onSave: () => void
  saveLabel?: string
}) {
  return (
    <div className="flex justify-end gap-2 pt-1">
      <button onClick={onCancel} className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800">
        Cancel
      </button>
      <button onClick={onSave} className="btn-primary">
        {saveLabel}
      </button>
    </div>
  )
}

export function Empty({ message }: { message: string }) {
  return <p className="text-sm text-slate-400">{message}</p>
}

export function Table({
  head,
  rows,
}: {
  head: string[]
  rows: React.ReactNode[][]
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <table className="w-full text-sm bg-white">
        <thead className="bg-slate-50">
          <tr>
            {head.map((h, i) => (
              <th
                key={i}
                className={`px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide ${
                  i === head.length - 1 ? 'text-right' : 'text-left'
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((cells, ri) => (
            <tr key={ri} className="hover:bg-slate-50">
              {cells.map((cell, ci) => (
                <td
                  key={ci}
                  className={`px-4 py-3 text-slate-700 ${
                    ci === cells.length - 1 ? 'text-right' : ''
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Actions({
  onEdit,
  onDelete,
  extraActions,
}: {
  onEdit?: () => void
  onDelete?: () => void
  extraActions?: { label: string; onClick: () => void; color?: string }[]
}) {
  return (
    <span className="flex items-center justify-end gap-3">
      {extraActions?.map(({ label, onClick, color }) => (
        <button
          key={label}
          onClick={onClick}
          className={`text-xs hover:underline ${color ?? 'text-slate-600'}`}
        >
          {label}
        </button>
      ))}
      {onEdit && (
        <button onClick={onEdit} className="text-xs text-blue-600 hover:underline">
          Edit
        </button>
      )}
      {onDelete && (
        <button onClick={onDelete} className="text-xs text-red-500 hover:underline">
          Delete
        </button>
      )}
    </span>
  )
}
