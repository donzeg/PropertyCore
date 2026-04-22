import { useState } from 'react'
import { updateDevice } from '../../api'
import type { Device } from '../../types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RelayChannel {
  label: string
  load_type: string
  switch_mode: string
  min_on_ms: number
  power_monitor: boolean
}

interface RelayMeta {
  channels: RelayChannel[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LOAD_TYPES = ['light', 'fan', 'socket', 'pump', 'other']
const SWITCH_MODES = ['toggle', 'momentary', 'disabled']

function defaultChannel(index: number): RelayChannel {
  return { label: `Channel ${index + 1}`, load_type: 'light', switch_mode: 'toggle', min_on_ms: 0, power_monitor: false }
}

function detectChannelCount(device: Device): number {
  if (device.state) {
    const n = Object.keys(device.state).filter((k) => /^ch\d+$/.test(k)).length
    if (n > 0) return n
  }
  return 1
}

function initChannels(device: Device): RelayChannel[] {
  const meta = device.metadata as RelayMeta | undefined
  if (meta?.channels?.length) return meta.channels.map((c, i) => ({ ...defaultChannel(i), ...c }))
  const n = detectChannelCount(device)
  return Array.from({ length: n }, (_, i) => defaultChannel(i))
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RelayConfig({
  device,
  onClose,
  onSaved,
}: {
  device: Device
  onClose: () => void
  onSaved: () => void
}) {
  const [channels, setChannels] = useState<RelayChannel[]>(() => initChannels(device))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const setChannel = (i: number, patch: Partial<RelayChannel>) =>
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
              placeholder="e.g. Ceiling Light"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Load Type</label>
              <select className="input" value={ch.load_type} onChange={(e) => setChannel(i, { load_type: e.target.value })}>
                {LOAD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Switch Mode</label>
              <select className="input" value={ch.switch_mode} onChange={(e) => setChannel(i, { switch_mode: e.target.value })}>
                {SWITCH_MODES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Min On-Time (ms)</label>
              <input
                type="number"
                className="input"
                value={ch.min_on_ms}
                min={0}
                onChange={(e) => setChannel(i, { min_on_ms: Number(e.target.value) })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 pb-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={ch.power_monitor}
                onChange={(e) => setChannel(i, { power_monitor: e.target.checked })}
                className="rounded border-zinc-300 dark:border-zinc-600 text-brand focus:ring-brand-400"
              />
              Power monitoring
            </label>
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
