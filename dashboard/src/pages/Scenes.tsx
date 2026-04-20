import { useEffect, useState } from 'react'
import { createScene, deleteScene, executeScene, getScenes } from '../api'
import Modal from '../components/Modal'
import { Actions, Empty, ModalFooter, Table } from './Rooms'
import type { Scene, SceneAction } from '../types'

interface ActionDraft {
  device_id: string
  payload: string  // raw JSON string
}

export default function Scenes() {
  const [scenes, setScenes] = useState<Scene[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [actions, setActions] = useState<ActionDraft[]>([{ device_id: '', payload: '{}' }])
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    getScenes()
      .then(setScenes)
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const openAdd = () => {
    setName('')
    setActions([{ device_id: '', payload: '{}' }])
    setError('')
    setAdding(true)
  }

  const handleCreate = async () => {
    if (!name.trim()) { setError('Name is required'); return }
    const built: SceneAction[] = []
    for (const a of actions) {
      if (!a.device_id.trim()) continue
      try {
        built.push({ device_id: a.device_id.trim(), payload: JSON.parse(a.payload) })
      } catch {
        setError(`Invalid JSON for device "${a.device_id}"`)
        return
      }
    }
    try {
      await createScene({ name: name.trim(), actions: built })
      setAdding(false)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed')
    }
  }

  const handleExecute = async (id: string) => {
    await executeScene(id).catch((e) => alert(e.message))
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this scene?')) return
    await deleteScene(id).catch(console.error)
    load()
  }

  const addAction = () =>
    setActions((prev) => [...prev, { device_id: '', payload: '{}' }])

  const removeAction = (i: number) =>
    setActions((prev) => prev.filter((_, j) => j !== i))

  const updateAction = (i: number, field: keyof ActionDraft, val: string) =>
    setActions((prev) =>
      prev.map((a, j) => (j === i ? { ...a, [field]: val } : a)),
    )

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-slate-800">Scenes</h1>
        <button onClick={openAdd} className="btn-primary">New Scene</button>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : scenes.length === 0 ? (
        <Empty message="No scenes yet. Create a scene to group device actions together." />
      ) : (
        <Table
          head={['Name', 'Actions', '']}
          rows={scenes.map((s) => [
            <span>
              <span className="font-medium text-slate-800 block">{s.name}</span>
              <code className="text-xs text-slate-400">{s.id}</code>
            </span>,
            <span className="text-slate-600 text-sm">
              {s.actions?.length ?? 0} action{s.actions?.length !== 1 ? 's' : ''}
            </span>,
            <Actions
              extraActions={[{ label: 'Run', onClick: () => handleExecute(s.id), color: 'text-emerald-600' }]}
              onDelete={() => handleDelete(s.id)}
            />,
          ])}
        />
      )}

      {adding && (
        <Modal title="New Scene" onClose={() => setAdding(false)}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1">Scene Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Good Night"
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-600 mb-2">Actions</label>
              <div className="space-y-2">
                {actions.map((a, i) => (
                  <div key={i} className="border border-slate-200 rounded p-2 space-y-1.5 bg-slate-50">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Device ID  (e.g. relay-01)"
                        value={a.device_id}
                        onChange={(e) => updateAction(i, 'device_id', e.target.value)}
                        className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => removeAction(i)}
                        className="text-slate-400 hover:text-red-500 text-sm"
                      >
                        ✕
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      placeholder={'{ "ch1": true }'}
                      value={a.payload}
                      onChange={(e) => updateAction(i, 'payload', e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={addAction}
                className="mt-1.5 text-xs text-blue-600 hover:underline"
              >
                + Add action
              </button>
            </div>

            {error && <p className="text-red-500 text-xs">{error}</p>}
            <ModalFooter onCancel={() => setAdding(false)} onSave={handleCreate} saveLabel="Create" />
          </div>
        </Modal>
      )}
    </div>
  )
}
