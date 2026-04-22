import { useState } from 'react'
import { updateDevice } from '../../api'
import type { Device, Scene } from '../../types'

interface SmartRemoteButton {
  scene_id: string
}

interface SmartRemoteMeta {
  buttons: SmartRemoteButton[]
  ir_profile: string
  wake_sensitivity: string
  vibration_events: string[]
  display_brightness: number
  display_timeout: number
  dock_device_id: string
}

const WAKE_SENSITIVITIES = ['off', 'low', 'medium', 'high']
const VIBRATION_EVENTS = ['doorbell', 'security', 'scene']
const BUTTON_COUNT = 8

function defaultMeta(): SmartRemoteMeta {
  return {
    buttons: Array.from({ length: BUTTON_COUNT }, () => ({ scene_id: '' })),
    ir_profile: '',
    wake_sensitivity: 'medium',
    vibration_events: [],
    display_brightness: 80,
    display_timeout: 30,
    dock_device_id: '',
  }
}

function initMeta(device: Device): SmartRemoteMeta {
  const meta = device.metadata as Partial<SmartRemoteMeta> | undefined
  const base = defaultMeta()
  return {
    ...base,
    ...meta,
    buttons: meta?.buttons?.length
      ? [...meta.buttons, ...base.buttons.slice(meta.buttons.length)]
      : base.buttons,
    vibration_events: meta?.vibration_events ?? base.vibration_events,
  }
}

export default function SmartRemoteConfig({
  device,
  scenes,
  onClose,
  onSaved,
}: {
  device: Device
  scenes: Scene[]
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<SmartRemoteMeta>(() => initMeta(device))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const set = (patch: Partial<SmartRemoteMeta>) => setForm((f) => ({ ...f, ...patch }))

  const setButton = (i: number, scene_id: string) =>
    setForm((f) => ({
      ...f,
      buttons: f.buttons.map((b, idx) => (idx === i ? { scene_id } : b)),
    }))

  const toggleVibration = (event: string) => {
    const current = form.vibration_events
    set({
      vibration_events: current.includes(event)
        ? current.filter((e) => e !== event)
        : [...current, event],
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      await updateDevice(device.id, { metadata: form as unknown as Record<string, unknown> })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">

      {/* Button Assignments */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-3">
          Button Scene Assignments
        </p>
        <div className="space-y-2">
          {form.buttons.map((btn, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs text-zinc-500 dark:text-zinc-400 w-16 flex-shrink-0">Button {i + 1}</span>
              <select
                className="input"
                value={btn.scene_id}
                onChange={(e) => setButton(i, e.target.value)}
              >
                <option value="">— None —</option>
                {scenes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* IR & Wake */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-3">
          IR & Wake Settings
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">IR Blaster Profile</label>
            <input
              className="input"
              value={form.ir_profile}
              onChange={(e) => set({ ir_profile: e.target.value })}
              placeholder="e.g. living-room-tv"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Wake-on-Pickup Sensitivity</label>
            <select className="input" value={form.wake_sensitivity} onChange={(e) => set({ wake_sensitivity: e.target.value })}>
              {WAKE_SENSITIVITIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Display */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-3">
          Display
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Brightness (%)</label>
            <input
              type="number"
              className="input"
              value={form.display_brightness}
              min={0}
              max={100}
              onChange={(e) => set({ display_brightness: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Timeout (s)</label>
            <input
              type="number"
              className="input"
              value={form.display_timeout}
              min={5}
              onChange={(e) => set({ display_timeout: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-3">
          Vibration Notifications
        </p>
        <div className="flex gap-4">
          {VIBRATION_EVENTS.map((evt) => (
            <label key={evt} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.vibration_events.includes(evt)}
                onChange={() => toggleVibration(evt)}
                className="rounded border-zinc-300 dark:border-zinc-600 text-brand focus:ring-brand-400"
              />
              {evt}
            </label>
          ))}
        </div>
      </div>

      {error && <p className="text-red-500 text-xs">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save Config'}
        </button>
      </div>
    </div>
  )
}
