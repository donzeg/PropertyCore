import { useState } from 'react'
import { updateDevice } from '../../api'
import type { Device } from '../../types'

interface AcMeta {
  brand: string
  model: string
  temp_offset: number
  humidity_offset: number
  ir_feedback: boolean
  boot_state: string
  fixed_setpoint: number
}

const AC_BRANDS = [
  'Hisense', 'LG', 'Samsung', 'Panasonic', 'Daikin', 'Midea', 'Gree',
  'Haier', 'Aux', 'Chigo', 'TCL', 'Carrier', 'Lennox', 'Other',
]

const BOOT_STATES = ['restore-last', 'fixed-setpoint', 'unchanged']

function defaultMeta(): AcMeta {
  return {
    brand: '',
    model: '',
    temp_offset: 0,
    humidity_offset: 0,
    ir_feedback: false,
    boot_state: 'restore-last',
    fixed_setpoint: 24,
  }
}

function initMeta(device: Device): AcMeta {
  const meta = device.metadata as Partial<AcMeta> | undefined
  return { ...defaultMeta(), ...meta }
}

export default function AcConfig({
  device,
  onClose,
  onSaved,
}: {
  device: Device
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<AcMeta>(() => initMeta(device))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const set = (patch: Partial<AcMeta>) => setForm((f) => ({ ...f, ...patch }))

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

      {/* Brand & Model */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-3">
          Unit Identity
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Brand</label>
            <select className="input" value={form.brand} onChange={(e) => set({ brand: e.target.value })}>
              <option value="">— Select brand —</option>
              {AC_BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Model</label>
            <input
              className="input"
              value={form.model}
              onChange={(e) => set({ model: e.target.value })}
              placeholder="e.g. HAS-12HRW"
            />
          </div>
        </div>
      </div>

      {/* Sensor Calibration */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-3">
          Sensor Calibration
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Temp Offset (°C)</label>
            <input
              type="number"
              className="input"
              value={form.temp_offset}
              step={0.5}
              min={-5}
              max={5}
              onChange={(e) => set({ temp_offset: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Humidity Offset (%)</label>
            <input
              type="number"
              className="input"
              value={form.humidity_offset}
              step={1}
              min={-10}
              max={10}
              onChange={(e) => set({ humidity_offset: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>

      {/* Behaviour */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-3">
          Behaviour
        </p>
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.ir_feedback}
              onChange={(e) => set({ ir_feedback: e.target.checked })}
              className="rounded border-zinc-300 dark:border-zinc-600 text-brand focus:ring-brand-400"
            />
            IR feedback mode (unit sends ACK signal after receiving command)
          </label>

          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Boot State</label>
            <select className="input" value={form.boot_state} onChange={(e) => set({ boot_state: e.target.value })}>
              {BOOT_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {form.boot_state === 'fixed-setpoint' && (
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Fixed Setpoint (°C)</label>
              <input
                type="number"
                className="input"
                value={form.fixed_setpoint}
                min={16}
                max={30}
                onChange={(e) => set({ fixed_setpoint: Number(e.target.value) })}
              />
            </div>
          )}
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
