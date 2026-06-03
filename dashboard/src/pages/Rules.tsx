import { useEffect, useState } from 'react'
import {
  createRule, updateRule, deleteRule, disableRule, enableRule,
  getRules, getScenes, getDevices,
} from '../api'
import Modal from '../components/Modal'
import { Empty, ModalFooter, Table } from './Areas'
import type { Rule, Scene, Device, ConditionClause } from '../types'
import { Plus, X } from '@phosphor-icons/react'

const OPERATORS = [
  { value: 'eq',  label: '= equals' },
  { value: 'ne',  label: '\u2260 not equals' },
  { value: 'gt',  label: '> greater than' },
  { value: 'lt',  label: '< less than' },
]

const DAYS = ['mon','tue','wed','thu','fri','sat','sun']
const DAY_LABELS: Record<string,string> = {
  mon:'Mon', tue:'Tue', wed:'Wed', thu:'Thu', fri:'Fri', sat:'Sat', sun:'Sun'
}

// ─── Default clause ───────────────────────────────────────────────────────────

const newDeviceClause = (): ConditionClause => ({
  type: 'device_state', device_id: '', field: '', operator: 'eq', value: '',
})
const newTimeClause = (): ConditionClause => ({
  type: 'time_of_day', time_op: 'after', time_from: '07:00', time_to: '22:00',
})
const newDayClause = (): ConditionClause => ({
  type: 'day_of_week', days: ['mon','tue','wed','thu','fri'],
})

// ─── Condition summary for table ──────────────────────────────────────────────

function clauseSummary(c: ConditionClause): string {
  if (c.type === 'device_state') {
    return `${c.device_id ?? '?'}.${c.field ?? '?'} ${c.operator ?? '='} ${String(c.value ?? '')}`
  }
  if (c.type === 'time_of_day') {
    if (c.time_op === 'between') return `${c.time_from}\u2013${c.time_to}`
    return `${c.time_op} ${c.time_from}`
  }
  if (c.type === 'day_of_week') {
    return (c.days ?? []).map(d => DAY_LABELS[d] ?? d).join('/')
  }
  return ''
}

// ─── Condition row component ─────────────────────────────────────────────────

function ConditionRow({ clause, devices, onChange, onRemove }: {
  clause: ConditionClause
  devices: Device[]
  onChange: (c: ConditionClause) => void
  onRemove: () => void
}) {
  const inputCls = "border border-zinc-300 dark:border-zinc-600 rounded-md px-2 py-1.5 text-xs bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-brand-400"

  const coerceValue = (s: string): unknown => {
    if (s === 'true') return true
    if (s === 'false') return false
    if (s !== '' && !isNaN(Number(s))) return Number(s)
    return s
  }

  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 bg-zinc-50 dark:bg-zinc-800/50 space-y-2.5">
      <div className="flex items-center gap-2">
        <select value={clause.type}
          onChange={e => {
            const t = e.target.value as ConditionClause['type']
            if (t === 'device_state') onChange(newDeviceClause())
            else if (t === 'time_of_day') onChange(newTimeClause())
            else onChange(newDayClause())
          }}
          className={inputCls}
        >
          <option value="device_state">Device State</option>
          <option value="time_of_day">Time of Day</option>
          <option value="day_of_week">Day of Week</option>
        </select>
        <div className="flex-1" />
        <button onClick={onRemove} className="p-1 rounded text-zinc-400 hover:text-red-500 transition-colors">
          <X size={14} />
        </button>
      </div>

      {clause.type === 'device_state' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Device</label>
            <select value={clause.device_id ?? ''} onChange={e => onChange({ ...clause, device_id: e.target.value })} className={`w-full ${inputCls}`}>
              <option value="">\u2014 Select device \u2014</option>
              {devices.map(d => <option key={d.id} value={d.id}>{d.name || d.id}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Field</label>
            <input type="text" value={String(clause.field ?? '')} placeholder="ch1, brightness, power\u2026"
              onChange={e => onChange({ ...clause, field: e.target.value })}
              className={`w-full ${inputCls}`} />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Operator</label>
            <select value={clause.operator ?? 'eq'} onChange={e => onChange({ ...clause, operator: e.target.value })} className={`w-full ${inputCls}`}>
              {OPERATORS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Value</label>
            <input type="text" value={String(clause.value ?? '')} placeholder="true, 24, open\u2026"
              onChange={e => onChange({ ...clause, value: coerceValue(e.target.value) })}
              className={`w-full ${inputCls}`} />
          </div>
        </div>
      )}

      {clause.type === 'time_of_day' && (
        <div className="flex items-center gap-2 flex-wrap">
          <select value={clause.time_op ?? 'after'} onChange={e => onChange({ ...clause, time_op: e.target.value as 'before'|'after'|'between' })}
            className={inputCls}>
            <option value="before">Before</option>
            <option value="after">After</option>
            <option value="between">Between</option>
          </select>
          <input type="time" value={clause.time_from ?? '07:00'}
            onChange={e => onChange({ ...clause, time_from: e.target.value })}
            className={inputCls} />
          {clause.time_op === 'between' && (
            <>
              <span className="text-xs text-zinc-500">and</span>
              <input type="time" value={clause.time_to ?? '22:00'}
                onChange={e => onChange({ ...clause, time_to: e.target.value })}
                className={inputCls} />
            </>
          )}
        </div>
      )}

      {clause.type === 'day_of_week' && (
        <div className="flex flex-wrap gap-2">
          {DAYS.map(day => {
            const checked = (clause.days ?? []).includes(day)
            return (
              <label key={day} className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={checked} className="accent-emerald-500 cursor-pointer"
                  onChange={e => {
                    const days = clause.days ?? []
                    onChange({ ...clause, days: e.target.checked ? [...days, day] : days.filter(d => d !== day) })
                  }} />
                <span className="text-xs text-zinc-700 dark:text-zinc-300">{DAY_LABELS[day]}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Toggle badge ─────────────────────────────────────────────────────────────

function ToggleBadge({ enabled, onClick }: { enabled: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function Rules() {
  const [rules, setRules] = useState<Rule[]>([])
  const [scenes, setScenes] = useState<Scene[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [conditionLogic, setConditionLogic] = useState<'and'|'or'>('and')
  const [conditions, setConditions] = useState<ConditionClause[]>([newDeviceClause()])
  const [sceneId, setSceneId] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Rule | null>(null)

  const load = () => {
    setLoading(true)
    Promise.all([getRules(), getScenes(), getDevices()])
      .then(([r, s, d]) => { setRules(r); setScenes(s); setDevices(d) })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const toggle = async (r: Rule) => {
    await (r.enabled ? disableRule(r.id) : enableRule(r.id)).catch(console.error)
    load()
  }

  const openAdd = () => {
    setEditingId(null); setName(''); setConditionLogic('and')
    setConditions([newDeviceClause()]); setSceneId(''); setFormError(''); setModalOpen(true)
  }

  const openEdit = (r: Rule) => {
    setEditingId(r.id); setName(r.name); setConditionLogic((r.condition_logic as 'and'|'or') ?? 'and')
    setConditions(r.conditions?.length ? r.conditions : [newDeviceClause()])
    setSceneId(r.action?.scene_id ?? ''); setFormError(''); setModalOpen(true)
  }

  const handleSave = async () => {
    if (!name.trim()) { setFormError('Name required'); return }
    if (!sceneId) { setFormError('Scene required'); return }
    setSaving(true)
    const body = {
      name: name.trim(),
      conditions,
      condition_logic: conditionLogic,
      action: { type: 'scene', scene_id: sceneId },
    }
    try {
      if (editingId) {
        await updateRule(editingId, body)
      } else {
        await createRule(body)
      }
      setModalOpen(false); load()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await deleteRule(deleteTarget.id).catch(console.error)
    setDeleteTarget(null); load()
  }

  const updateClause = (i: number, c: ConditionClause) =>
    setConditions(prev => prev.map((cl, j) => j === i ? c : cl))
  const removeClause = (i: number) =>
    setConditions(prev => prev.filter((_, j) => j !== i))

  const sceneName = (id: string) => scenes.find(s => s.id === id)?.name ?? id

  const conditionsSummary = (r: Rule): string => {
    const clauses = r.conditions?.length ? r.conditions : []
    if (clauses.length === 0 && r.condition?.device_id) {
      return `${r.condition.device_id}.${r.condition.field} ${r.condition.operator} ${String(r.condition.value)}`
    }
    const sep = r.condition_logic === 'or' ? ' OR ' : ' AND '
    return clauses.map(clauseSummary).join(sep) || '\u2014'
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Rules</h1>
        <button onClick={openAdd} className="btn-primary">New Rule</button>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-zinc-400 text-sm">Loading\u2026</p>
      ) : rules.length === 0 ? (
        <Empty message="No rules yet. Rules trigger a scene automatically when conditions are met." />
      ) : (
        <Table
          head={['Name', 'IF\u2026', '\u2192 Scene', 'On', '']}
          rows={rules.map((r) => [
            <span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100 block">{r.name}</span>
              <code className="text-xs text-zinc-400 dark:text-zinc-500">{r.id}</code>
            </span>,
            <span className="text-xs text-zinc-600 dark:text-zinc-400 max-w-xs block truncate" title={conditionsSummary(r)}>
              {conditionsSummary(r)}
            </span>,
            <span className="text-zinc-600 dark:text-zinc-400">{sceneName(r.action?.scene_id)}</span>,
            <ToggleBadge enabled={r.enabled} onClick={() => toggle(r)} />,
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => openEdit(r)} className="text-xs text-zinc-500 dark:text-zinc-400 hover:underline">Edit</button>
              <button onClick={() => setDeleteTarget(r)} className="text-xs text-red-500 hover:underline">Delete</button>
            </div>,
          ])}
        />
      )}

      {modalOpen && (
        <Modal title={editingId ? 'Edit Rule' : 'New Rule'} onClose={() => setModalOpen(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Rule Name *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. All Lights Off on Lock" className="input" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">IF \u2014 Conditions</label>
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-zinc-500">Match:</span>
                  {(['and','or'] as const).map(l => (
                    <button key={l} type="button"
                      onClick={() => setConditionLogic(l)}
                      className={`px-2 py-0.5 rounded font-medium transition-colors ${
                        conditionLogic === l
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                          : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                      }`}
                    >{l.toUpperCase()}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                {conditions.map((clause, i) => (
                  <ConditionRow key={i} clause={clause} devices={devices}
                    onChange={c => updateClause(i, c)}
                    onRemove={() => removeClause(i)} />
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <button type="button" onClick={() => setConditions(p => [...p, newDeviceClause()])}
                  className="flex items-center gap-1 text-xs text-brand dark:text-brand-400 hover:underline font-medium">
                  <Plus size={12} /> Device state
                </button>
                <button type="button" onClick={() => setConditions(p => [...p, newTimeClause()])}
                  className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 hover:underline">
                  <Plus size={12} /> Time
                </button>
                <button type="button" onClick={() => setConditions(p => [...p, newDayClause()])}
                  className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 hover:underline">
                  <Plus size={12} /> Day
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">THEN \u2192 execute scene *</label>
              <select value={sceneId} onChange={e => setSceneId(e.target.value)} className="input">
                <option value="">\u2014 Select scene \u2014</option>
                {scenes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {formError && <p className="text-red-500 text-xs">{formError}</p>}
            <ModalFooter onCancel={() => setModalOpen(false)} onSave={handleSave}
              saveLabel={saving ? 'Saving\u2026' : editingId ? 'Save Changes' : 'Create'} />
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Delete Rule" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            Delete <strong className="text-zinc-900 dark:text-zinc-100">{deleteTarget.name}</strong>? This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleteTarget(null)} className="btn-ghost">Cancel</button>
            <button onClick={handleDelete}
              className="px-3 py-1.5 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors">
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
