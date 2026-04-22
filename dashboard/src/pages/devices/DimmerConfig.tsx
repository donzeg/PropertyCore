import { useState } from 'react'
import { updateDevice } from '../../api'
import type { Device } from '../../types'

interface DimmerChannel {
  label: string
  min_brightness: number
  max_brightness: number
  soft_start_ms: number
  soft_off_ms: number
  led_mode: string
  curve: string
}

interface DimmerMeta {
  channels: DimmerChannel[]
}

const LED_MODES = ['trailing-edge', 'leading-edge']
const CURVES = ['logarithmic', 'linear']

function defaultChannel(index: number): DimmerChannel {
  return {
    label: `Channel ${index + 1}`,
    min_brightness: 5,
    max_brightness: 100,
    soft_start_ms: 500,
    soft_off_ms: 500,
    led_mode: 'trailing-edge',
    curve: 'logarithmic',
  }
}

function detectChannelCount(device: Device): number {
  if (device.state) {
    // dimmer state: ch1_level, ch2_level, …
    const n = Object.keys(device.state).filter((k) => /^ch\d+_level$/.test(k)).length
    if (n > 0) return n
    // fallback: ch1, ch2, …
    const n2 = Object.keys(device.state).filter((k) => /^ch\d+$/.test(k)).length
    if (n2 > 0) return n2
  }
  return 1
}

function initChannels(device: Device): DimmerChannel[] {
  const meta = device.metadata as DimmerMeta | undefined
  if (meta?.channels?.length) return meta.channels.map((c, i) => ({ ...defaultChannel(i), ...c }))
  const n = detectChannelCount(device)
  return Array.from({ length: n }, (_, i) => defaultChannel(i))
}

export default function DimmerConfig({
  device,
  onClose,
  onSaved,
}: {
  device: Device
  onClose: () => void
  onSaved: () => void
}) {
  const [channels, setChannels] = useState<DimmerChannel[]>(() => initChannels(device))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const setChannel = (i: number, patch: Partial<DimmerChannel>) =>
    setChannels((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      await updateDevice(device.id, { metadata: { channels } as Record<string, unknown> })
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
      {channels.map((ch, i) => (
        <div key={i} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 bg-zinc-50/50 dark:bg-zinc-800/30">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Channel {i + 1}
          </p>

          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Label</label>
            <input
              className="input"
              value={ch.label}
              onChange={(e) => setChannel(i, { label: e.target.value })}
              placeholder="e.g. Living Room Lights"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Min Brightness (%)</label>
              <input
                type="number"
                className="input"
                value={ch.min_brightness}
                min={0}
                max={30}
                onChange={(e) => setChannel(i, { min_brightness: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Max Brightness (%)</label>
              <input
                type="number"
                className="input"
                value={ch.max_brightness}
                min={50}
                max={100}
                onChange={(e) => setChannel(i, { max_brightness: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Soft-Start (ms)</label>
              <input
                type="number"
                className="input"
                value={ch.soft_start_ms}
                min={0}
                onChange={(e) => setChannel(i, { soft_start_ms: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Soft-Off (ms)</label>
              <input
                type="number"
                className="input"
                value={ch.soft_off_ms}
                min={0}
                onChange={(e) => setChannel(i, { soft_off_ms: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">LED Mode</label>
              <select className="input" value={ch.led_mode} onChange={(e) => setChannel(i, { led_mode: e.target.value })}>
                {LED_MODES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Transition Curve</label>
              <select className="input" value={ch.curve} onChange={(e) => setChannel(i, { curve: e.target.value })}>
                {CURVES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
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
