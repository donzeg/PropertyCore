import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { claimDevice, getAreas, getUnclaimedNodes, getWsUrl } from '../../api'
import type { Area, UnclaimedNode } from '../../types'

type DeviceType = 'relay' | 'dimmer' | 'ac_gateway' | 'curtain' | 'sensor' | 'keypad' | 'other'

interface Props {
  onClose: () => void
  onDone: (deviceId: string) => void
  initialDeviceId?: string
}

const STEPS = ['Discover', 'Claim', 'Done']

const DEVICE_TYPES: { value: DeviceType; label: string }[] = [
  { value: 'relay', label: 'Relay / Switch' },
  { value: 'dimmer', label: 'Dimmer' },
  { value: 'ac_gateway', label: 'AC Gateway' },
  { value: 'curtain', label: 'Curtain / Blind' },
  { value: 'sensor', label: 'Sensor' },
  { value: 'keypad', label: 'Keypad' },
  { value: 'other', label: 'Other' },
]

const SOURCE_META: Record<string, { label: string; chip: string }> = {
  esphome: {
    label: 'ESPHome',
    chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  },
  zigbee2mqtt: {
    label: 'Zigbee2MQTT',
    chip: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  },
  tasmota: {
    label: 'Tasmota',
    chip: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  },
  shelly: {
    label: 'Shelly',
    chip: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  },
}

function sourceLabel(source: string): string {
  return SOURCE_META[source]?.label || source
}

function inferDeviceType(node: UnclaimedNode): DeviceType {
  const byType = (node.type || '').toLowerCase()
  if (byType === 'relay' || byType === 'dimmer' || byType === 'ac_gateway' || byType === 'curtain' || byType === 'sensor' || byType === 'keypad') {
    return byType as DeviceType
  }

  const id = node.device_id.toLowerCase()
  if (node.source === 'zigbee2mqtt') {
    if (id.includes('door') || id.includes('motion') || id.includes('temp') || id.includes('sensor')) return 'sensor'
    if (id.includes('switch') || id.includes('relay') || id.includes('plug')) return 'relay'
  }

  if (node.source === 'tasmota') {
    return 'relay'
  }

  return 'other'
}

export default function AddDeviceWizard({ onClose, onDone, initialDeviceId }: Props) {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [unclaimed, setUnclaimed] = useState<UnclaimedNode[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [selectedID, setSelectedID] = useState(initialDeviceId ?? '')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [doneID, setDoneID] = useState('')

  const [form, setForm] = useState({
    display_name: '',
    area_id: '',
    device_type: 'relay' as DeviceType,
  })

  const selectedNode = useMemo(
    () => unclaimed.find((n) => n.device_id === selectedID) ?? null,
    [unclaimed, selectedID],
  )
  const sourceOptions = useMemo(
    () => ['all', ...Array.from(new Set(unclaimed.map((n) => n.source))).sort()],
    [unclaimed],
  )
  const filteredUnclaimed = useMemo(
    () => sourceFilter === 'all' ? unclaimed : unclaimed.filter((n) => n.source === sourceFilter),
    [unclaimed, sourceFilter],
  )

  const load = () => {
    setLoading(true)
    Promise.all([getUnclaimedNodes(), getAreas()])
      .then(([u, a]) => {
        setUnclaimed(u)
        setAreas(a)
        if (!selectedID && u.length > 0) {
          setSelectedID(initialDeviceId && u.some((n) => n.device_id === initialDeviceId) ? initialDeviceId : u[0].device_id)
        }
      })
      .catch(() => setError('Failed to load discovery data.'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  useEffect(() => {
    const ws = new WebSocket(getWsUrl())
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.event === 'device_unclaimed' && msg.data?.device_id) {
          setUnclaimed((prev) => {
            const idx = prev.findIndex((n) => n.device_id === msg.data.device_id)
            if (idx === -1) return [msg.data, ...prev]
            const copy = [...prev]
            copy[idx] = { ...copy[idx], ...msg.data }
            return copy
          })
        }
        if (msg.event === 'device_claimed' && msg.data?.device_id) {
          setUnclaimed((prev) => prev.filter((n) => n.device_id !== msg.data.device_id))
          if (selectedID === msg.data.device_id) {
            setSelectedID('')
          }
        }
      } catch {
        // ignore malformed WS payloads
      }
    }
    return () => ws.close()
  }, [selectedID])

  useEffect(() => {
    if (!selectedNode) return
    const inferred = inferDeviceType(selectedNode)
    setForm((f) => ({
      ...f,
      display_name: f.display_name || selectedNode.device_id,
      device_type: inferred,
    }))
  }, [selectedNode])

  const goBack = () => {
    setError('')
    setStep((s) => Math.max(0, s - 1))
  }

  const goNext = async () => {
    setError('')

    if (step === 0) {
      if (!selectedNode) {
        setError('Select a discovered device to continue.')
        return
      }
      if (!form.display_name.trim()) {
        setForm((f) => ({ ...f, display_name: selectedNode.device_id }))
      }
      setStep(1)
      return
    }

    if (step === 1) {
      if (!selectedNode) {
        setError('Selected node is no longer available. Refresh and try again.')
        return
      }
      setSaving(true)
      try {
        await claimDevice({
          device_id: selectedNode.device_id,
          display_name: form.display_name.trim() || selectedNode.device_id,
          area_id: form.area_id || undefined,
          device_type: form.device_type,
        })
        setDoneID(selectedNode.device_id)
        setStep(2)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to claim device')
      } finally {
        setSaving(false)
      }
      return
    }

    if (step === 2) {
      onDone(doneID)
    }
  }

  const nextLabel = step === 0 ? 'Next ->' : step === 1 ? (saving ? 'Claiming...' : 'Claim Device ->') : 'Done'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-3xl mx-4 border border-zinc-200 dark:border-zinc-700 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Add Device (Discovery)</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-lg leading-none p-1 rounded">
            x
          </button>
        </div>

        <div className="px-6 pt-4 pb-2 shrink-0">
          <div className="flex items-center">
            {STEPS.map((label, i) => (
              <div key={i} className="flex items-center">
                <div className={`flex items-center gap-2 ${i === step ? '' : 'opacity-60'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i <= step ? 'bg-brand text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'}`}>
                    {i < step ? 'ok' : i + 1}
                  </div>
                  <span className={`text-xs whitespace-nowrap hidden sm:block ${i === step ? 'text-zinc-900 dark:text-zinc-100 font-medium' : 'text-zinc-400'}`}>
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-6 sm:w-10 h-px mx-2 shrink-0 ${i < step ? 'bg-brand' : 'bg-zinc-200 dark:bg-zinc-700'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-5 overflow-y-auto grow min-h-0">
          {step === 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Select an unclaimed discovered device. Firmware setup now lives in System / Integrations.
                </p>
                <button onClick={load} className="btn-ghost text-xs px-3 py-1">Refresh</button>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {sourceOptions.map((src) => (
                  <button
                    key={src}
                    onClick={() => setSourceFilter(src)}
                    className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                      sourceFilter === src
                        ? 'border-brand bg-brand/10 text-brand dark:text-brand-400 dark:bg-brand/15'
                        : 'border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {src === 'all' ? 'All Sources' : sourceLabel(src)}
                  </button>
                ))}
              </div>

              {loading ? (
                <p className="text-sm text-zinc-500">Loading discovery...</p>
              ) : unclaimed.length === 0 ? (
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                    No unclaimed devices discovered yet.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => navigate('/integrations')} className="btn-primary text-xs px-3 py-1.5">
                      Open Integrations Setup
                    </button>
                    <button onClick={load} className="btn-ghost text-xs px-3 py-1.5">
                      Retry Discovery
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUnclaimed.map((node) => (
                    <button
                      key={node.device_id}
                      onClick={() => setSelectedID(node.device_id)}
                      className={`w-full text-left rounded-lg border p-3 transition-colors ${
                        selectedID === node.device_id
                          ? 'border-brand bg-brand/5 dark:bg-brand/10'
                          : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2 flex-wrap">
                            <span>{node.device_id}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${SOURCE_META[node.source]?.chip || 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'}`}>
                              {sourceLabel(node.source)}
                            </span>
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {node.type} · {sourceLabel(node.source)} · {node.online ? 'online' : 'offline'}
                          </p>
                        </div>
                        <div className="text-right text-xs text-zinc-500 dark:text-zinc-400">
                          {node.fw_version && <p>{node.fw_version}</p>}
                          {node.ip && <p>{node.ip}</p>}
                        </div>
                      </div>
                    </button>
                  ))}
                  {filteredUnclaimed.length === 0 && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 px-1">No unclaimed nodes for this source filter.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 1 && selectedNode && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Confirm claim details. Device ID comes from firmware and should remain immutable.
              </p>

              <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-3 bg-zinc-50 dark:bg-zinc-800/30">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-zinc-500 dark:text-zinc-400">Device ID</span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200">{selectedNode.device_id}</span>
                  <span className="text-zinc-500 dark:text-zinc-400">Source</span>
                  <span className="text-zinc-700 dark:text-zinc-300">{sourceLabel(selectedNode.source)}</span>
                  <span className="text-zinc-500 dark:text-zinc-400">Type Detected</span>
                  <span className="text-zinc-700 dark:text-zinc-300">{selectedNode.type}</span>
                  <span className="text-zinc-500 dark:text-zinc-400">Suggested Claim Type</span>
                  <span className="text-zinc-700 dark:text-zinc-300">{inferDeviceType(selectedNode)}</span>
                  <span className="text-zinc-500 dark:text-zinc-400">Firmware</span>
                  <span className="text-zinc-700 dark:text-zinc-300">{selectedNode.fw_version || '-'}</span>
                  <span className="text-zinc-500 dark:text-zinc-400">IP / MAC</span>
                  <span className="text-zinc-700 dark:text-zinc-300">{selectedNode.ip || '-'} / {selectedNode.hardware_uid || '-'}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Display Name</label>
                <input
                  className="input"
                  value={form.display_name}
                  onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                  placeholder={selectedNode.device_id}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Device Type</label>
                  <select
                    className="input"
                    value={form.device_type}
                    onChange={(e) => setForm((f) => ({ ...f, device_type: e.target.value as DeviceType }))}
                  >
                    {DEVICE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Area (optional)</label>
                  <select
                    className="input"
                    value={form.area_id}
                    onChange={(e) => setForm((f) => ({ ...f, area_id: e.target.value }))}
                  >
                    <option value="">- Unassigned -</option>
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="py-6">
              <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Device claimed successfully.</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                <span className="font-mono">{doneID}</span> is now in the device registry and available in All Devices.
              </p>
            </div>
          )}

          {error && <p className="mt-3 text-red-500 text-xs">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between shrink-0">
          <button onClick={step === 0 ? onClose : goBack} className="btn-ghost text-sm px-4 py-1.5">
            {step === 0 ? 'Cancel' : '<- Back'}
          </button>
          <button
            onClick={goNext}
            disabled={saving || (step === 0 && !selectedNode && !loading)}
            className="btn-primary text-sm px-4 py-1.5 disabled:opacity-50"
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
