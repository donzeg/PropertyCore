import { useEffect, useState } from 'react'
import { createUser, deleteUser, getUsers } from '../api'
import Modal from '../components/Modal'
import { Actions, Empty, Field, ModalFooter, Table } from './Areas'
import type { User, UserRole } from '../types'

const ROLE_STYLE: Record<UserRole, string> = {
  owner: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
  admin: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  guest: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400',
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding]   = useState(false)
  const [form, setForm] = useState({ name: '', role: 'guest' as UserRole, pin: '' })
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    getUsers()
      .then(setUsers)
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user?')) return
    await deleteUser(id).catch(console.error)
    load()
  }

  const handleCreate = async () => {
    if (!form.name.trim()) { setError('Name required'); return }
    if (!form.pin.trim())  { setError('PIN required'); return }
    try {
      await createUser({ name: form.name.trim(), role: form.role, pin: form.pin })
      setAdding(false)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed')
    }
  }

  const openAdd = () => {
    setForm({ name: '', role: 'guest', pin: '' })
    setError('')
    setAdding(true)
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Users</h1>
        <button onClick={openAdd} className="btn-primary">Add User</button>
      </div>

      {loading ? (
        <p className="text-zinc-400 text-sm">Loading…</p>
      ) : users.length === 0 ? (
        <Empty message="No users yet. Add an owner account to hand over the installation." />
      ) : (
        <Table
          head={['Name', 'Role', 'Created', '']}
          rows={users.map((u) => [
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{u.name}</span>,
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_STYLE[u.role]}`}>
              {u.role}
            </span>,
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              {new Date(u.created_at).toLocaleDateString()}
            </span>,
            <Actions onDelete={() => handleDelete(u.id)} />,
          ])}
        />
      )}

      {adding && (
        <Modal title="Add User" onClose={() => setAdding(false)}>
          <div className="space-y-3">
            <Field
              label="Name *"
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            />
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
                className="input"
              >
                <option value="owner">Owner — Full access to all features</option>
                <option value="admin">Admin — Manage devices and scenes, no system settings</option>
                <option value="guest">Guest — Control devices only, no configuration</option>
              </select>
            </div>
            <Field
              label="PIN *"
              value={form.pin}
              onChange={(v) => setForm((f) => ({ ...f, pin: v }))}
              placeholder="4–8 digits"
              type="password"
            />

            {error && <p className="text-red-500 text-xs">{error}</p>}
            <ModalFooter onCancel={() => setAdding(false)} onSave={handleCreate} saveLabel="Add User" />
          </div>
        </Modal>
      )}
    </div>
  )
}
