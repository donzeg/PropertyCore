import { useEffect, useMemo, useState } from 'react'
import {
  createSchedule, updateSchedule, deleteSchedule,
  disableSchedule, enableSchedule, getSchedules, getScenes,
} from '../api'
import Modal from '../components/Modal'
import { Empty, ModalFooter, Table } from './Areas'
import type { Schedule, Scene } from '../types'

const ALL_DAYS = ['mon','tue','wed','thu','fri','sat','sun']
const DAY_MAP = ['sun','mon','tue','wed','thu','fri','sat'] // JS getDay() index

// ─── Next-N-triggers computation ─────────────────────────────────────────────

function computeNextTriggers(sched: { hour: number; minute: number; days: string[]; trigger_type?: string }, count = 5): Date[] {
  if (sched.trigger_type && sched.trigger_type !== 'fixed') return []
  const days = sched.days ?? []
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const result: Date[] = []
  for (let i = 0; i < 365 && result.length < count; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const trigger = new Date(d.getFullYear(), d.getMonth(), d.getDate(), sched.hour, sched.minute, 0)
    const dayKey = DAY_MAP[d.getDay()]
    const dayMatch = days.length === 0 || days.includes(dayKey)
    if (dayMatch && trigger > now) result.push(trigger)
  }
  return result
}

function fmtTrigger(d: Date): string {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const dd = String(d.getDate()).padStart(2,'0')
  const mm = String(d.getMonth()+1).padStart(2,'0')
  const hh = String(d.getHours()).padStart(2,'0')
  const min = String(d.getMinutes()).padStart(2,'0')
  return `${days[d.getDay()]} ${dd}/${mm}  ${hh}:${min}`
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

interface FormState {
  label: string
  scene_id: string
  trigger_type: 'fixed' | 'sunrise' | 'sunset'
  hour: string
  minute: string
  days: string[]
  sunrise_offset_min: string
}

const defaultForm = (): FormState => ({
  label: '', scene_id: '', trigger_type: 'fixed',
  hour: '22', minute: '0', days: [], sunrise_offset_min: '0',
})

export default function Schedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [scenes, setScenes] = useState<Scene[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm())
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Schedule | null>(null)

  const load = () => {
    setLoading(true)
    Promise.all([getSchedules(), getScenes()])
      .then(([sc, s]) => { setSchedules(sc); setScenes(s) })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const toggle = async (s: Schedule) => {
    await (s.enabled ? disableSchedule(s.id) : enableSchedule(s.id)).catch(console.error)
    load()
  }

  const openAdd = () => {
    setEditingId(null); setForm(defaultForm()); setFormError(''); setModalOpen(true)
  }

  const openEdit = (s: Schedule) => {
    setEditingId(s.id)
    setForm({
      label: s.label,
      scene_id: s.scene_id,
      trigger_type: (s.trigger_type as FormState['trigger_type']) ?? 'fixed',
      hour: String(s.hour),
      minute: String(s.minute),
      days: s.days ?? [],
      sunrise_offset_min: String(s.sunrise_offset_min ?? 0),
    })
    setFormError(''); setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.label.trim()) { setFormError('Label required'); return }
    if (!form.scene_id) { setFormError('Scene required'); return }
    const h = parseInt(form.hour, 10)
    const m = parseInt(form.minute, 10)
    if (form.trigger_type === 'fixed') {
      if (isNaN(h) || h < 0 || h > 23) { setFormError('Hour must be 0\u201323'); return }
      if (isNaN(m) || m < 0 || m > 59) { setFormError('Minute must be 0\u201359'); return }
    }
    setSaving(true)
    const body = {
      label: form.label.trim(),
      scene_id: form.scene_id,
      hour: isNaN(h) ? 0 : h,
      minute: isNaN(m) ? 0 : m,
      days: form.days,
      trigger_type: form.trigger_type,
      sunrise_offset_min: parseInt(form.sunrise_offset_min, 10) || 0,
      enabled: true,
    }
    try {
      if (editingId) {
        await updateSchedule(editingId, body)
      } else {
        await createSchedule(body)
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
    await deleteSchedule(deleteTarget.id).catch(console.error)
    setDeleteTarget(null); load()
  }

  const toggleDay = (day: string) =>
    setForm(f => ({ ...f, days: f.days.includes(day) ? f.days.filter(d => d !== day) : [...f.days, day] }))

  const fmt = (h: number, m: number) => `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
  const fmtDays = (days: string[]) => days.length === 0 ? 'Every day' : days.join(', ')
  const sceneName = (id: string) => scenes.find(s => s.id === id)?.name ?? id

  // Preview next 5 triggers for the current form state
  const nextTriggers = useMemo(() => computeNextTriggers({
    hour: parseInt(form.hour, 10) || 0,
    minute: parseInt(form.minute, 10) || 0,
    days: form.days,
    trigger_type: form.trigger_type,
  }), [form.hour, form.minute, form.days, form.trigger_type])

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Schedules</h1>
        <button onClick={openAdd} className="btn-primary">New Schedule</button>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-zinc-400 text-sm">Loading\u2026</p>
      ) : schedules.length === 0 ? (
        <Empty message="No schedules yet. Schedules run a scene automatically at a set time." />
      ) : (
        <Table
          head={['Label', 'Trigger', 'Days', '\u2192 Scene', 'On', '']}
          rows={schedules.map((s) => [
            <span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100 block">{s.label}</span>
              <code className="text-xs text-zinc-400 dark:text-zinc-500">{s.id}</code>
            </span>,
            <span>
              {(!s.trigger_type || s.trigger_type === 'fixed') ? (
                <code className="text-sm text-zinc-700 dark:text-zinc-300">{fmt(s.hour, s.minute)}</code>
              ) : (
                <span className="text-xs text-zinc-600 dark:text-zinc-400 capitalize">
                  {s.trigger_type}{s.sunrise_offset_min !== 0 ? ` ${s.sunrise_offset_min! > 0 ? '+' : ''}${s.sunrise_offset_min}min` : ''}
                </span>
              )}
            </span>,
            <span className="text-xs text-zinc-600 dark:text-zinc-400">{fmtDays(s.days)}</span>,
            <span className="text-zinc-600 dark:text-zinc-400">{sceneName(s.scene_id)}</span>,
            <ToggleBadge enabled={s.enabled} onClick={() => toggle(s)} />,
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => openEdit(s)} className="text-xs text-zinc-500 dark:text-zinc-400 hover:underline">Edit</button>
              <button onClick={() => setDeleteTarget(s)} className="text-xs text-red-500 hover:underline">Delete</button>
            </div>,
          ])}
        />
      )}

      {modalOpen && (
        <Modal title={editingId ? 'Edit Schedule' : 'New Schedule'} onClose={() => setModalOpen(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Label *</label>
              <input type="text" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder="e.g. Lights Off at 10pm" className="input" />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Trigger Type</label>
              <div className="flex gap-2">
                {(['fixed','sunrise','sunset'] as const).map(t => (
                  <button key={t} type="button"
                    onClick={() => setForm(f => ({ ...f, trigger_type: t }))}
                    className={`px-3 py-1.5 text-xs rounded-md border font-medium transition-colors capitalize ${
                      form.trigger_type === t
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-500 text-emerald-700 dark:text-emerald-400'
                        : 'border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400'
                    }`}
                  >{t === 'fixed' ? 'Fixed Time' : t.charAt(0).toUpperCase() + t.slice(1)}</button>
                ))}
              </div>
            </div>

            {form.trigger_type === 'fixed' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Hour (0\u201323)</label>
                  <input type="number" min={0} max={23} value={form.hour}
                    onChange={e => setForm(f => ({ ...f, hour: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Minute (0\u201359)</label>
                  <input type="number" min={0} max={59} value={form.minute}
                    onChange={e => setForm(f => ({ ...f, minute: e.target.value }))} className="input" />
                </div>
              </div>
            )}

            {(form.trigger_type === 'sunrise' || form.trigger_type === 'sunset') && (
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                  Offset <span className="font-normal text-zinc-400">minutes (\u00b1 relative to {form.trigger_type})</span>
                </label>
                <input type="number" step={1} value={form.sunrise_offset_min}
                  onChange={e => setForm(f => ({ ...f, sunrise_offset_min: e.target.value }))}
                  className="input w-32" placeholder="-30 or +15" />
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
                  \u26a0\ufe0f Sunrise/sunset triggers require location configuration (coming soon).
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                Days <span className="text-zinc-400 font-normal">(leave empty = every day)</span>
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {ALL_DAYS.map(d => (
                  <button key={d} type="button" onClick={() => toggleDay(d)}
                    className={`px-2.5 py-1 text-xs rounded-md border font-medium transition-colors ${
                      form.days.includes(d)
                        ? 'bg-brand text-white border-brand'
                        : 'border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:border-brand dark:hover:border-brand'
                    }`}
                  >{d.charAt(0).toUpperCase() + d.slice(1)}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Scene *</label>
              <select value={form.scene_id} onChange={e => setForm(f => ({ ...f, scene_id: e.target.value }))} className="input">
                <option value="">\u2014 Select scene \u2014</option>
                {scenes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* Next 5 triggers preview */}
            {form.trigger_type === 'fixed' && nextTriggers.length > 0 && (
              <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 bg-zinc-50 dark:bg-zinc-800/50">
                <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">Next 5 triggers</p>
                <ul className="space-y-1">
                  {nextTriggers.map((d, i) => (
                    <li key={i} className="text-xs font-mono text-zinc-700 dark:text-zinc-300">{fmtTrigger(d)}</li>
                  ))}
                </ul>
              </div>
            )}

            {formError && <p className="text-red-500 text-xs">{formError}</p>}
            <ModalFooter onCancel={() => setModalOpen(false)} onSave={handleSave}
              saveLabel={saving ? 'Saving\u2026' : editingId ? 'Save Changes' : 'Create'} />
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Delete Schedule" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            Delete <strong className="text-zinc-900 dark:text-zinc-100">{deleteTarget.label}</strong>? This cannot be undone.
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
