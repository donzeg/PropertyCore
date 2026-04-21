import { useEffect, useState } from 'react'
import {
  createSchedule,
  deleteSchedule,
  disableSchedule,
  enableSchedule,
  getSchedules,
  getScenes,
} from '../api'
import Modal from '../components/Modal'
import { Actions, Empty, Field, ModalFooter, Table } from './Areas'
import type { Schedule, Scene } from '../types'

const ALL_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

export default function Schedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [scenes, setScenes]       = useState<Scene[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding]   = useState(false)
  const [form, setForm] = useState({
    label: '',
    scene_id: '',
    hour: '22',
    minute: '0',
    days: [] as string[],
  })
  const [error, setError] = useState('')

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

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this schedule?')) return
    await deleteSchedule(id).catch(console.error)
    load()
  }

  const toggleDay = (day: string) =>
    setForm((f) => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day],
    }))

  const handleCreate = async () => {
    if (!form.label.trim()) { setError('Label required'); return }
    if (!form.scene_id)     { setError('Scene required'); return }
    const h = parseInt(form.hour, 10)
    const m = parseInt(form.minute, 10)
    if (isNaN(h) || h < 0 || h > 23) { setError('Hour must be 0–23'); return }
    if (isNaN(m) || m < 0 || m > 59) { setError('Minute must be 0–59'); return }

    try {
      await createSchedule({
        label: form.label.trim(),
        scene_id: form.scene_id,
        hour: h,
        minute: m,
        days: form.days,
        enabled: true,
      })
      setAdding(false)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed')
    }
  }

  const openAdd = () => {
    setForm({ label: '', scene_id: '', hour: '22', minute: '0', days: [] })
    setError('')
    setAdding(true)
  }

  const fmt = (h: number, m: number) =>
    `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`

  const fmtDays = (days: string[]) =>
    days.length === 0 ? 'Every day' : days.join(', ')

  const sceneName = (id: string) => scenes.find((s) => s.id === id)?.name ?? id

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Schedules</h1>
        <button onClick={openAdd} className="btn-primary">New Schedule</button>
      </div>

      {loading ? (
        <p className="text-zinc-400 text-sm">Loading…</p>
      ) : schedules.length === 0 ? (
        <Empty message="No schedules yet. Schedules run a scene automatically at a set time." />
      ) : (
        <Table
          head={['Label', 'Time', 'Days', '→ Scene', 'On', '']}
          rows={schedules.map((s) => [
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{s.label}</span>,
            <code className="text-sm text-zinc-700 dark:text-zinc-300">{fmt(s.hour, s.minute)}</code>,
            <span className="text-xs text-zinc-600 dark:text-zinc-400">{fmtDays(s.days)}</span>,
            <span className="text-zinc-600 dark:text-zinc-400">{sceneName(s.scene_id)}</span>,
            <ToggleBadge enabled={s.enabled} onClick={() => toggle(s)} />,
            <Actions onDelete={() => handleDelete(s.id)} />,
          ])}
        />
      )}

      {adding && (
        <Modal title="New Schedule" onClose={() => setAdding(false)}>
          <div className="space-y-3">
            <Field
              label="Label *"
              value={form.label}
              onChange={(v) => setForm((f) => ({ ...f, label: v }))}
              placeholder="e.g. Lights Off at 10pm"
            />

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Hour (0–23)"
                value={form.hour}
                onChange={(v) => setForm((f) => ({ ...f, hour: v }))}
                type="number"
              />
              <Field
                label="Minute (0–59)"
                value={form.minute}
                onChange={(v) => setForm((f) => ({ ...f, minute: v }))}
                type="number"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                Days <span className="text-zinc-400 dark:text-zinc-500 font-normal">(leave empty = every day)</span>
              </label>
              <div className="flex gap-1 flex-wrap">
                {ALL_DAYS.map((d) => (
                  <button
                    key={d}
                    onClick={() => toggleDay(d)}
                    className={`px-2 py-1 text-xs rounded-md border font-medium transition-colors ${
                      form.days.includes(d)
                        ? 'bg-brand text-white border-brand'
                        : 'border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:border-brand dark:hover:border-brand'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Scene *</label>
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
