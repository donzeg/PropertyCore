import { useState } from 'react'
import { updateDevice } from '../../api'
import type { Area, Device } from '../../types'

interface WallPanelMeta {
  profile: string
  area_id: string
  welcome_message: string
  room_number: string
  screensaver_timeout: number
  screensaver_mode: string
  always_on: boolean
  emergency_button: boolean
  day_brightness: number
  night_brightness: number
  night_start: string
}

const PROFILES = ['residential', 'hotel']
const SCREENSAVER_MODES = ['clock', 'branding', 'blank']

function defaultMeta(): WallPanelMeta {
  return {
    profile: 'residential',
    area_id: '',
    welcome_message: '',
    room_number: '',
    screensaver_timeout: 60,
    screensaver_mode: 'clock',
    always_on: false,
    emergency_button: false,
    day_brightness: 80,
    night_brightness: 30,
    night_start: '22:00',
  }
}

function initMeta(device: Device): WallPanelMeta {
  const meta = device.metadata as Partial<WallPanelMeta> | undefined
  return { ...defaultMeta(), ...meta }
}

export default function WallPanelConfig({
  device,
  areas,
  onClose,
  onSaved,
}: {
  device: Device
  areas: Area[]
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<WallPanelMeta>(() => initMeta(device))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const set = (patch: Partial<WallPanelMeta>) => setForm((f) => ({ ...f, ...patch }))

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

      {/* Identity */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-3">Identity</p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Profile</label>
              <select className="input" value={form.profile} onChange={(e) => set({ profile: e.target.value })}>
                {PROFILES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Room Assignment</label>
              <select className="input" value={form.area_id} onChange={(e) => set({ area_id: e.target.value })}>
                <option value="">— Unassigned —</option>
                {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>

          {form.profile === 'hotel' && (
            <>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Room Number</label>
                <input
                  className="input"
                  value={form.room_number}
                  onChange={(e) => set({ room_number: e.target.value })}
                  placeholder="e.g. 201"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Welcome Message</label>
                <input
                  className="input"
                  value={form.welcome_message}
                  onChange={(e) => set({ welcome_message: e.target.value })}
                  placeholder="e.g. Welcome to Room 201"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Display */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-3">Display</p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Screensaver Mode</label>
              <select className="input" value={form.screensaver_mode} onChange={(e) => set({ screensaver_mode: e.target.value })}>
                {SCREENSAVER_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Screensaver Timeout (s)</label>
              <input
                type="number"
                className="input"
                value={form.screensaver_timeout}
                min={10}
                onChange={(e) => set({ screensaver_timeout: Number(e.target.value) })}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.always_on}
              onChange={(e) => set({ always_on: e.target.checked })}
              className="rounded border-zinc-300 dark:border-zinc-600 text-brand focus:ring-brand-400"
            />
            Always-on display (disables screensaver)
          </label>

          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.emergency_button}
              onChange={(e) => set({ emergency_button: e.target.checked })}
              className="rounded border-zinc-300 dark:border-zinc-600 text-brand focus:ring-brand-400"
            />
            Emergency button enabled
          </label>
        </div>
      </div>

      {/* Brightness Schedule */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-3">Brightness Schedule</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Daytime (%)</label>
            <input
              type="number"
              className="input"
              value={form.day_brightness}
              min={0}
              max={100}
              onChange={(e) => set({ day_brightness: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Night (%)</label>
            <input
              type="number"
              className="input"
              value={form.night_brightness}
              min={0}
              max={100}
              onChange={(e) => set({ night_brightness: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Night Start</label>
            <input
              type="time"
              className="input"
              value={form.night_start}
              onChange={(e) => set({ night_start: e.target.value })}
            />
          </div>
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
