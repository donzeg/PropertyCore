import React, { useEffect, useState } from 'react'
import { createArea, deleteArea, getAreas, getFloors, updateArea } from '../api'
import Modal from '../components/Modal'
import type { Area, Floor } from '../types'

const AREA_TYPES = [
  '', 'living_room', 'bedroom', 'master_bedroom', 'kitchen', 'bathroom',
  'dining_room', 'study', 'office', 'lobby', 'gym', 'garage',
  'garden', 'balcony', 'conference_room', 'server_room', 'reception',
  'guest_room', 'suite', 'restaurant', 'back_office',
]

export default function Areas() {
  const [areas, setAreas] = useState<Area[]>([])
  const [floors, setFloors] = useState<Floor[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Area | null>(null)
  const [form, setForm] = useState({ name: '', floor_id: '', area_type: '', icon: '' })
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([getAreas(), getFloors()])
      .then(([a, f]) => { setAreas(a); setFloors(f) })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const floorName = (id: string) => floors.find((f) => f.id === id)?.name ?? ''

  const openAdd = () => {
    setForm({ name: '', floor_id: '', area_type: '', icon: '' })
    setError('')
    setAdding(true)
  }
  const openEdit = (a: Area) => {
    setForm({ name: a.name, floor_id: a.floor_id ?? '', area_type: a.area_type ?? '', icon: a.icon ?? '' })
    setError('')
    setEditing(a)
  }
  const closeModal = () => { setAdding(false); setEditing(null) }

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Name is required'); return }
    try {
      if (editing) await updateArea(editing.id, { name: form.name.trim(), floor_id: form.floor_id, area_type: form.area_type, icon: form.icon.trim() })
      else await createArea({ name: form.name.trim(), floor_id: form.floor_id || undefined, area_type: form.area_type || undefined, icon: form.icon.trim() || undefined })
      closeModal()
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this area? Devices assigned to it will become unassigned.')) return
    await deleteArea(id).catch(console.error)
    load()
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Areas</h1>
        <button onClick={openAdd} className="btn-primary">Add Area</button>
      </div>

      {loading ? (
        <p className="text-zinc-400 text-sm">Loading…</p>
      ) : areas.length === 0 ? (
        <Empty message="No areas configured. Add an area to get started." />
      ) : (
        <Table
          head={['Name', 'Type', 'Floor', 'ID', '']}
          rows={areas.map((a) => [
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{a.name}</span>,
            a.area_type ? (
              <span className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-0.5 rounded-full">
                {a.area_type.replace(/_/g, ' ')}
              </span>
            ) : <span className="text-zinc-400">—</span>,
            floorName(a.floor_id) || <span className="text-zinc-400">—</span>,
            <code className="text-xs text-zinc-400 dark:text-zinc-500">{a.id}</code>,
            <Actions
              onEdit={() => openEdit(a)}
              onDelete={() => handleDelete(a.id)}
            />,
          ])}
        />
      )}

      {(adding || editing) && (
        <Modal title={editing ? 'Edit Area' : 'Add Area'} onClose={closeModal}>
          <div className="space-y-4">
            {editing && (
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Area ID</p>
                <code className="text-xs text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-800 px-3 py-1.5 rounded-md block">{editing.id}</code>
              </div>
            )}
            <Field label="Name *" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Floor</label>
              <select
                value={form.floor_id}
                onChange={(e) => setForm((f) => ({ ...f, floor_id: e.target.value }))}
                className="input"
              >
                <option value="">— Unassigned —</option>
                {floors.map((fl) => (
                  <option key={fl.id} value={fl.id}>{fl.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Area Type</label>
              <select
                value={form.area_type}
                onChange={(e) => setForm((f) => ({ ...f, area_type: e.target.value }))}
                className="input"
              >
                {AREA_TYPES.map((t) => (
                  <option key={t} value={t}>{t ? t.replace(/_/g, ' ') : '— None —'}</option>
                ))}
              </select>
            </div>
            <Field
              label="Icon"
              placeholder="e.g. mdi:sofa, ph:bed, ph:cooking-pot"
              value={form.icon}
              onChange={(v) => setForm((f) => ({ ...f, icon: v }))}
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
      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input"
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
    <div className="flex justify-end gap-2 pt-2">
      <button onClick={onCancel} className="btn-ghost">
        Cancel
      </button>
      <button onClick={onSave} className="btn-primary">
        {saveLabel}
      </button>
    </div>
  )
}

export function Empty({ message }: { message: string }) {
  return <p className="text-sm text-zinc-400 dark:text-zinc-500 py-4">{message}</p>
}

export function Table({
  head,
  rows,
}: {
  head: string[]
  rows: React.ReactNode[][]
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-sm bg-white dark:bg-zinc-900">
        <thead className="bg-zinc-50 dark:bg-zinc-800/60">
          <tr>
            {head.map((h, i) => (
              <th
                key={i}
                className={`px-4 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide ${
                  i === head.length - 1 ? 'text-right' : 'text-left'
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {rows.map((cells, ri) => (
            <tr key={ri} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
              {cells.map((cell, ci) => (
                <td
                  key={ci}
                  className={`px-4 py-3 text-zinc-700 dark:text-zinc-300 ${
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
        <button onClick={onEdit} className="text-xs text-brand hover:text-brand-600 dark:text-brand-400 hover:underline font-medium">
          Edit
        </button>
      )}
      {onDelete && (
        <button onClick={onDelete} className="text-xs text-red-500 hover:text-red-600 hover:underline font-medium">
          Delete
        </button>
      )}
    </span>
  )
}
