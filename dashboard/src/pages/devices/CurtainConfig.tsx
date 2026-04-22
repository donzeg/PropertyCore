import { useState } from 'react'
import { Plus, Trash } from '@phosphor-icons/react'
import { updateDevice } from '../../api'
import type { Device } from '../../types'

interface PositionPreset {
  label: string
  position: number
}

interface CurtainMotor {
  label: string
  travel_open_s: number
  travel_close_s: number
  end_stop: string
  invert: boolean
  presets: PositionPreset[]
}

interface CurtainMeta {
  motors: CurtainMotor[]
}

const END_STOPS = ['time-based', 'limit-switch']

function defaultMotor(index: number): CurtainMotor {
  return {
    label: `Motor ${index + 1}`,
    travel_open_s: 30,
    travel_close_s: 30,
    end_stop: 'time-based',
    invert: false,
    presets: [],
  }
}

function detectMotorCount(device: Device): number {
  if (device.state) {
    const n = Object.keys(device.state).filter((k) => /^motor\d+/.test(k)).length
    if (n > 0) return n
    if ('position' in device.state || 'moving' in device.state) return 1
  }
  return 1
}

function initMotors(device: Device): CurtainMotor[] {
  const meta = device.metadata as CurtainMeta | undefined
  if (meta?.motors?.length) return meta.motors.map((m, i) => ({ ...defaultMotor(i), ...m }))
  const n = detectMotorCount(device)
  return Array.from({ length: n }, (_, i) => defaultMotor(i))
}

export default function CurtainConfig({
  device,
  onClose,
  onSaved,
}: {
  device: Device
  onClose: () => void
  onSaved: () => void
}) {
  const [motors, setMotors] = useState<CurtainMotor[]>(() => initMotors(device))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const setMotor = (i: number, patch: Partial<CurtainMotor>) =>
    setMotors((ms) => ms.map((m, idx) => (idx === i ? { ...m, ...patch } : m)))

  const addPreset = (i: number) =>
    setMotors((ms) =>
      ms.map((m, idx) =>
        idx === i ? { ...m, presets: [...m.presets, { label: 'Half', position: 50 }] } : m,
      ),
    )

  const removePreset = (motorIdx: number, presetIdx: number) =>
    setMotors((ms) =>
      ms.map((m, idx) =>
        idx === motorIdx ? { ...m, presets: m.presets.filter((_, pi) => pi !== presetIdx) } : m,
      ),
    )

  const setPreset = (motorIdx: number, presetIdx: number, patch: Partial<PositionPreset>) =>
    setMotors((ms) =>
      ms.map((m, idx) =>
        idx === motorIdx
          ? { ...m, presets: m.presets.map((p, pi) => (pi === presetIdx ? { ...p, ...patch } : p)) }
          : m,
      ),
    )

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      await updateDevice(device.id, { metadata: { motors } as Record<string, unknown> })
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
    <div className="space-y-4">
      {motors.map((motor, i) => (
        <div key={i} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 bg-zinc-50/50 dark:bg-zinc-800/30">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Motor {i + 1}
          </p>

          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Label</label>
            <input
              className="input"
              value={motor.label}
              onChange={(e) => setMotor(i, { label: e.target.value })}
              placeholder="e.g. Living Room Curtain"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Travel Time Open (s)</label>
              <input
                type="number"
                className="input"
                value={motor.travel_open_s}
                min={1}
                onChange={(e) => setMotor(i, { travel_open_s: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Travel Time Close (s)</label>
              <input
                type="number"
                className="input"
                value={motor.travel_close_s}
                min={1}
                onChange={(e) => setMotor(i, { travel_close_s: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">End-Stop Mode</label>
              <select className="input" value={motor.end_stop} onChange={(e) => setMotor(i, { end_stop: e.target.value })}>
                {END_STOPS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 pb-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={motor.invert}
                onChange={(e) => setMotor(i, { invert: e.target.checked })}
                className="rounded border-zinc-300 dark:border-zinc-600 text-brand focus:ring-brand-400"
              />
              Invert direction
            </label>
          </div>

          {/* Position presets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Position Presets</label>
              <button
                onClick={() => addPreset(i)}
                className="flex items-center gap-1 text-xs text-brand hover:text-brand-600 dark:text-brand-400 font-medium"
              >
                <Plus size={12} /> Add preset
              </button>
            </div>
            {motor.presets.length === 0 && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">No presets configured.</p>
            )}
            {motor.presets.map((preset, pi) => (
              <div key={pi} className="flex gap-2 mb-2 items-center">
                <input
                  className="input"
                  value={preset.label}
                  onChange={(e) => setPreset(i, pi, { label: e.target.value })}
                  placeholder="Label"
                />
                <input
                  type="number"
                  className="input w-24 flex-shrink-0"
                  value={preset.position}
                  min={0}
                  max={100}
                  onChange={(e) => setPreset(i, pi, { position: Number(e.target.value) })}
                />
                <span className="text-xs text-zinc-400 flex-shrink-0">%</span>
                <button
                  onClick={() => removePreset(i, pi)}
                  className="text-zinc-400 hover:text-red-500 transition-colors flex-shrink-0"
                >
                  <Trash size={14} />
                </button>
              </div>
            ))}
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
