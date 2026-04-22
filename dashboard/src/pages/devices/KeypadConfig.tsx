import { useState } from 'react'
import { updateDevice } from '../../api'
import type { Device, Scene } from '../../types'

interface KeypadButton {
  scene_id: string
  led_idle: string
  led_active: string
  led_brightness: number
  hold_scene_id: string
  lock_behavior: string
}

interface KeypadMeta {
  buttons: KeypadButton[]
}

const LED_COLORS = ['white', 'amber', 'red', 'green', 'blue', 'off']
const LOCK_BEHAVIORS = ['unchanged', 'disabled']

function defaultButton(index: number): KeypadButton {
  return {
    scene_id: '',
    led_idle: 'white',
    led_active: 'green',
    led_brightness: 80,
    hold_scene_id: '',
    lock_behavior: 'unchanged',
  }
}

function detectButtonCount(device: Device): number {
  if (device.state) {
    const n = Object.keys(device.state).filter((k) => /^btn\d+$/.test(k)).length
    if (n > 0) return n
  }
  return 4
}

function initButtons(device: Device): KeypadButton[] {
  const meta = device.metadata as KeypadMeta | undefined
  if (meta?.buttons?.length) return meta.buttons.map((b, i) => ({ ...defaultButton(i), ...b }))
  const n = detectButtonCount(device)
  return Array.from({ length: n }, (_, i) => defaultButton(i))
}

export default function KeypadConfig({
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
  const [buttons, setButtons] = useState<KeypadButton[]>(() => initButtons(device))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const setButton = (i: number, patch: Partial<KeypadButton>) =>
    setButtons((bs) => bs.map((b, idx) => (idx === i ? { ...b, ...patch } : b)))

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      await updateDevice(device.id, { metadata: { buttons } as Record<string, unknown> })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const sceneName = (id: string) => scenes.find((s) => s.id === id)?.name ?? ''

  return (
    <div className="space-y-4">
      {buttons.map((btn, i) => (
        <div key={i} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 bg-zinc-50/50 dark:bg-zinc-800/30">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Button {i + 1}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Scene (press)</label>
              <select
                className="input"
                value={btn.scene_id}
                onChange={(e) => setButton(i, { scene_id: e.target.value })}
              >
                <option value="">— None —</option>
                {scenes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Scene (hold)</label>
              <select
                className="input"
                value={btn.hold_scene_id}
                onChange={(e) => setButton(i, { hold_scene_id: e.target.value })}
              >
                <option value="">— None —</option>
                {scenes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">LED Idle</label>
              <select className="input" value={btn.led_idle} onChange={(e) => setButton(i, { led_idle: e.target.value })}>
                {LED_COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">LED Active</label>
              <select className="input" value={btn.led_active} onChange={(e) => setButton(i, { led_active: e.target.value })}>
                {LED_COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Brightness (%)</label>
              <input
                type="number"
                className="input"
                value={btn.led_brightness}
                min={0}
                max={100}
                onChange={(e) => setButton(i, { led_brightness: Number(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Lock-Mode Behavior</label>
            <select className="input" value={btn.lock_behavior} onChange={(e) => setButton(i, { lock_behavior: e.target.value })}>
              {LOCK_BEHAVIORS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>
      ))}

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
