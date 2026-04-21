import { useEffect, useState } from 'react'
import { createFloor, deleteFloor, getFloors, updateFloor } from '../api'
import Modal from '../components/Modal'
import type { Floor } from '../types'
import { Actions, Empty, Field, ModalFooter, Table } from './Areas'

export default function Floors() {
  const [floors, setFloors] = useState<Floor[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Floor | null>(null)
  const [form, setForm] = useState({ name: '', order: '' })
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    getFloors()
      .then((f) => setFloors([...f].sort((a, b) => a.order - b.order)))
      .catch(() => setError('Failed to load floors'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const openAdd = () => {
    setForm({ name: '', order: String(floors.length) })
    setError('')
    setAdding(true)
  }
  const openEdit = (f: Floor) => {
    setForm({ name: f.name, order: String(f.order) })
    setError('')
    setEditing(f)
  }
  const closeModal = () => { setAdding(false); setEditing(null) }

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Name is required'); return }
    const order = parseInt(form.order, 10) || 0
    try {
      if (editing) await updateFloor(editing.id, { name: form.name.trim(), order })
      else await createFloor({ name: form.name.trim(), order })
      closeModal()
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this floor? Areas on this floor will become unassigned.')) return
    await deleteFloor(id).catch(console.error)
    load()
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Floors</h1>
        <button onClick={openAdd} className="btn-primary">Add Floor</button>
      </div>

      {loading ? (
        <p className="text-zinc-400 text-sm">Loading…</p>
      ) : floors.length === 0 ? (
        <Empty message="No floors configured. Add a floor first, then assign areas to it." />
      ) : (
        <Table
          head={['Order', 'Name', 'ID', '']}
          rows={floors.map((f) => [
            <span className="text-zinc-500 dark:text-zinc-400 text-sm">{f.order}</span>,
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{f.name}</span>,
            <code className="text-xs text-zinc-400 dark:text-zinc-500">{f.id}</code>,
            <Actions
              onEdit={() => openEdit(f)}
              onDelete={() => handleDelete(f.id)}
            />,
          ])}
        />
      )}

      {(adding || editing) && (
        <Modal title={editing ? 'Edit Floor' : 'Add Floor'} onClose={closeModal}>
          <div className="space-y-4">
            {editing && (
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Floor ID</p>
                <code className="text-xs text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-800 px-3 py-1.5 rounded-md block">{editing.id}</code>
              </div>
            )}
            <Field label="Name *" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="e.g. Ground Floor" />
            <Field label="Display Order" value={form.order} onChange={(v) => setForm((f) => ({ ...f, order: v }))} type="number" placeholder="0" />
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <ModalFooter onCancel={closeModal} onSave={handleSubmit} />
          </div>
        </Modal>
      )}
    </div>
  )
}
