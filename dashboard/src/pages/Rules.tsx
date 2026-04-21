import { useEffect, useState } from 'react'
import {
  createRule,
  deleteRule,
  disableRule,
  enableRule,
  getRules,
  getScenes,
} from '../api'
import Modal from '../components/Modal'
import { Actions, Empty, Field, ModalFooter, Table } from './Areas'
import type { Rule, Scene } from '../types'

const OPERATORS = [
  { value: 'eq',  label: '= equals' },
  { value: 'neq', label: '≠ not equals' },
  { value: 'gt',  label: '> greater than' },
  { value: 'lt',  label: '< less than' },
]

export default function Rules() {
  const [rules, setRules]   = useState<Rule[]>([])
  const [scenes, setScenes] = useState<Scene[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding]   = useState(false)
  const [form, setForm] = useState({
    label: '',
    device_id: '',
    field: '',
    operator: 'eq',
    value: '',
    scene_id: '',
  })
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([getRules(), getScenes()])
      .then(([r, s]) => { setRules(r); setScenes(s) })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const toggle = async (r: Rule) => {
    await (r.enabled ? disableRule(r.id) : enableRule(r.id)).catch(console.error)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this rule?')) return
    await deleteRule(id).catch(console.error)
    load()
  }

  const handleCreate = async () => {
    if (!form.label.trim())   { setError('Label required'); return }
    if (!form.device_id.trim()) { setError('Device ID required'); return }
    if (!form.scene_id)       { setError('Scene required'); return }

    // Coerce value string to the appropriate JS type
    let value: unknown = form.value
    if (form.value === 'true')  value = true
    else if (form.value === 'false') value = false
    else if (form.value !== '' && !isNaN(Number(form.value))) value = Number(form.value)

    try {
      await createRule({
        label: form.label.trim(),
        condition: {
          device_id: form.device_id.trim(),
          field: form.field.trim(),
          operator: form.operator,
          value,
        },
        action: { scene_id: form.scene_id },
      })
      setAdding(false)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed')
    }
  }

  const openAdd = () => {
    setForm({ label: '', device_id: '', field: '', operator: 'eq', value: '', scene_id: '' })
    setError('')
    setAdding(true)
  }

  const sceneName = (id: string) => scenes.find((s) => s.id === id)?.name ?? id

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Rules</h1>
        <button onClick={openAdd} className="btn-primary">New Rule</button>
      </div>

      {loading ? (
        <p className="text-zinc-400 text-sm">Loading…</p>
      ) : rules.length === 0 ? (
        <Empty message="No rules yet. Rules trigger a scene automatically when a device state condition is met." />
      ) : (
        <Table
          head={['Label', 'IF condition', '→ Scene', 'On', '']}
          rows={rules.map((r) => [
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{r.label}</span>,
            <span className="text-xs text-zinc-600 dark:text-zinc-400">
              {r.condition.device_id} · <code>{r.condition.field}</code>{' '}
              {r.condition.operator} {String(r.condition.value)}
            </span>,
            <span className="text-zinc-600 dark:text-zinc-400">{sceneName(r.action.scene_id)}</span>,
            <ToggleBadge enabled={r.enabled} onClick={() => toggle(r)} />,
            <Actions onDelete={() => handleDelete(r.id)} />,
          ])}
        />
      )}

      {adding && (
        <Modal title="New Rule" onClose={() => setAdding(false)}>
          <div className="space-y-3">
            <Field
              label="Label *"
              value={form.label}
              onChange={(v) => setForm((f) => ({ ...f, label: v }))}
              placeholder="e.g. All Lights Off on Lock"
            />

            <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 space-y-3 bg-zinc-50 dark:bg-zinc-800/50">
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">IF — condition</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Device ID *</label>
                  <input
                    type="text"
                    value={form.device_id}
                    onChange={(e) => setForm((f) => ({ ...f, device_id: e.target.value }))}
                    className="w-full border border-zinc-300 dark:border-zinc-600 rounded-md px-2 py-1.5 text-xs
                               bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
                               focus:outline-none focus:ring-1 focus:ring-brand-400"
                    placeholder="relay-01"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Field</label>
                  <input
                    type="text"
                    value={form.field}
                    onChange={(e) => setForm((f) => ({ ...f, field: e.target.value }))}
                    className="w-full border border-zinc-300 dark:border-zinc-600 rounded-md px-2 py-1.5 text-xs
                               bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
                               focus:outline-none focus:ring-1 focus:ring-brand-400"
                    placeholder="power"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Operator</label>
                  <select
                    value={form.operator}
                    onChange={(e) => setForm((f) => ({ ...f, operator: e.target.value }))}
                    className="input text-xs py-1.5"
                  >
                    {OPERATORS.map((op) => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Value</label>
                  <input
                    type="text"
                    value={form.value}
                    onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                    className="w-full border border-zinc-300 dark:border-zinc-600 rounded-md px-2 py-1.5 text-xs
                               bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
                               focus:outline-none focus:ring-1 focus:ring-brand-400"
                    placeholder="true"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">THEN → execute scene *</label>
              <select
                value={form.scene_id}
                onChange={(e) => setForm((f) => ({ ...f, scene_id: e.target.value }))}
                className="input"
              >
                <option value="">— Select scene —</option>
                {scenes.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {error && <p className="text-red-500 text-xs">{error}</p>}
            <ModalFooter onCancel={() => setAdding(false)} onSave={handleCreate} saveLabel="Create" />
          </div>
        </Modal>
      )}
    </div>
  )
}

// ToggleBadge is only used in Rules — copy for local use
function ToggleBadge({ enabled, onClick }: { enabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-2.5 py-0.5 rounded-full font-medium transition-colors ${
        enabled
          ? 'bg-brand/10 text-brand dark:bg-brand/15 dark:text-brand-400'
          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
      }`}
    >
      {enabled ? 'On' : 'Off'}
    </button>
  )
}
