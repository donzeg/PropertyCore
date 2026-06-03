import { useEffect, useState } from 'react'
import {
  createScene, updateScene, deleteScene, executeScene, getScenes,
  getDevices, getAreas,
} from '../api'
import Modal from '../components/Modal'
import { Empty, ModalFooter, Table } from './Areas'
import type { Scene, SceneAction, Device, Area } from '../types'
import {
  Moon, Sun, House, Play, MusicNotes, Television,
  Users, Bell, Drop, Package, Key, ArrowsClockwise,
  CaretUp, CaretDown, Plus, X,
} from '@phosphor-icons/react'

// ─── Icon palette ───────────────────────────────────────────────────────────────────

const ICONS = [
  { name: 'moon',    Ic: Moon,            label: 'Night'    },
  { name: 'sun',     Ic: Sun,             label: 'Day'      },
  { name: 'house',   Ic: House,           label: 'Home'     },
  { name: 'play',    Ic: Play,            label: 'Media'    },
  { name: 'music',   Ic: MusicNotes,      label: 'Music'    },
  { name: 'tv',      Ic: Television,      label: 'TV'       },
  { name: 'users',   Ic: Users,           label: 'Guests'   },
  { name: 'bell',    Ic: Bell,            label: 'Alert'    },
  { name: 'drop',    Ic: Drop,            label: 'Pool'     },
  { name: 'package', Ic: Package,         label: 'Goods'    },
  { name: 'key',     Ic: Key,             label: 'Security' },
  { name: 'routine', Ic: ArrowsClockwise, label: 'Routine'  },
] as const

type IconName = typeof ICONS[number]['name']

function SceneIcon({ name, size = 18 }: { name?: string; size?: number }) {
  const found = ICONS.find(i => i.name === name)
  if (!found) return <Play size={size} className="text-zinc-400" />
  const { Ic } = found
  return <Ic size={size} />
}

// ─── Action draft ────────────────────────────────────────────────────────────────────

type ActionKind = 'device_state' | 'run_scene' | 'delay'

interface ActionDraft {
  action_type: ActionKind
  device_id: string
  payloadData: Record<string, unknown>
  rawPayload: string
  run_scene_id: string
  delay_seconds: string
}

const emptyDraft = (): ActionDraft => ({
  action_type: 'device_state',
  device_id: '',
  payloadData: {},
  rawPayload: '{}',
  run_scene_id: '',
  delay_seconds: '1',
})

function draftToAction(d: ActionDraft, deviceMap: Record<string, Device>): SceneAction | null {
  if (d.action_type === 'run_scene') {
    if (!d.run_scene_id) return null
    return { action_type: 'run_scene', run_scene_id: d.run_scene_id } as unknown as SceneAction
  }
  if (d.action_type === 'delay') {
    const ms = Math.max(100, Math.round(Number(d.delay_seconds) * 1000))
    return { action_type: 'delay', delay_ms: ms } as unknown as SceneAction
  }
  if (!d.device_id) return null
  const dev = deviceMap[d.device_id]
  const devType = dev?.type ?? 'other'
  let payload: Record<string, unknown>
  if (['relay', 'dimmer', 'ac_gateway', 'curtain'].includes(devType)) {
    payload = { ...d.payloadData }
  } else {
    try { payload = JSON.parse(d.rawPayload) }
    catch { return null }
  }
  return { action_type: 'device_state', device_id: d.device_id, payload } as unknown as SceneAction
}

function actionToDraft(a: Record<string, unknown>, deviceMap: Record<string, Device>): ActionDraft {
  const d = emptyDraft()
  const at = a.action_type as ActionKind | undefined
  if (at === 'run_scene') {
    d.action_type = 'run_scene'
    d.run_scene_id = String(a.run_scene_id ?? '')
    return d
  }
  if (at === 'delay') {
    d.action_type = 'delay'
    d.delay_seconds = String(Number(a.delay_ms ?? 1000) / 1000)
    return d
  }
  d.action_type = 'device_state'
  d.device_id = String(a.device_id ?? '')
  const devType = deviceMap[d.device_id]?.type ?? 'other'
  const payload = (a.payload ?? {}) as Record<string, unknown>
  if (['relay', 'dimmer', 'ac_gateway', 'curtain'].includes(devType)) {
    d.payloadData = { ...payload }
  } else {
    d.rawPayload = JSON.stringify(payload, null, 2)
  }
  return d
}

// ─── Payload builders ─────────────────────────────────────────────────────────────────

function RelayBuilder({ device, value, onChange }: {
  device: Device
  value: Record<string, unknown>
  onChange: (v: Record<string, unknown>) => void
}) {
  const n = Math.max(1, Number(device.metadata?.channels ?? 4))
  const channels = Array.from({ length: n }, (_, i) => `ch${i + 1}`)
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {channels.map(ch => (
        <label key={ch} className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(value[ch])}
            onChange={e => onChange({ ...value, [ch]: e.target.checked })}
            className="accent-emerald-500 cursor-pointer"
          />
          <span className="text-xs text-zinc-700 dark:text-zinc-300 uppercase font-mono">{ch}</span>
        </label>
      ))}
    </div>
  )
}

function DimmerBuilder({ value, onChange }: {
  value: Record<string, unknown>
  onChange: (v: Record<string, unknown>) => void
}) {
  const brightness = Number(value.brightness ?? 100)
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-zinc-500 w-20 shrink-0">Brightness</span>
      <input type="range" min={0} max={100} step={1} value={brightness}
        onChange={e => onChange({ brightness: Number(e.target.value) })}
        className="flex-1 accent-emerald-500" />
      <span className="text-xs text-zinc-700 dark:text-zinc-300 w-10 text-right tabular-nums">{brightness}%</span>
    </div>
  )
}

function AcBuilder({ value, onChange }: {
  value: Record<string, unknown>
  onChange: (v: Record<string, unknown>) => void
}) {
  const temp = Number(value.temperature ?? 24)
  const mode = String(value.mode ?? 'cool')
  const fan = String(value.fan_speed ?? 'auto')
  const power = Boolean(value.power ?? true)
  const upd = (k: string, v: unknown) => onChange({ ...value, [k]: v })
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={power} onChange={e => upd('power', e.target.checked)} className="accent-emerald-500 cursor-pointer" />
        <span className="text-xs text-zinc-700 dark:text-zinc-300">Power On</span>
      </label>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Temp °C</label>
          <input type="number" min={16} max={30} value={temp} onChange={e => upd('temperature', Number(e.target.value))} className="input py-1 text-xs" />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Mode</label>
          <select value={mode} onChange={e => upd('mode', e.target.value)} className="input py-1 text-xs">
            {['cool','heat','fan','auto','dry'].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Fan</label>
          <select value={fan} onChange={e => upd('fan_speed', e.target.value)} className="input py-1 text-xs">
            {['auto','low','med','high'].map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>
    </div>
  )
}

function CurtainBuilder({ value, onChange }: {
  value: Record<string, unknown>
  onChange: (v: Record<string, unknown>) => void
}) {
  const pos = Number(value.position ?? 50)
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-zinc-500 w-20 shrink-0">Position</span>
      <input type="range" min={0} max={100} step={1} value={pos}
        onChange={e => onChange({ position: Number(e.target.value) })}
        className="flex-1 accent-emerald-500" />
      <span className="text-xs text-zinc-700 dark:text-zinc-300 w-10 text-right tabular-nums">{pos}%</span>
    </div>
  )
}

// ─── Icon picker ──────────────────────────────────────────────────────────────────────

function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {ICONS.map(({ name, Ic, label }) => (
        <button key={name} type="button" onClick={() => onChange(name)} title={label}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors w-14 ${
            value === name
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
              : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500'
          }`}
        >
          <Ic size={18} />
          <span className="text-[10px]">{label}</span>
        </button>
      ))}
    </div>
  )
}

// ─── Action row ──────────────────────────────────────────────────────────────────────

function ActionRow({ draft, index, total, devices, deviceMap, scenes, onChange, onMove, onRemove }: {
  draft: ActionDraft
  index: number
  total: number
  devices: Device[]
  deviceMap: Record<string, Device>
  scenes: Scene[]
  onChange: (updates: Partial<ActionDraft>) => void
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
}) {
  const selectedDev = deviceMap[draft.device_id]

  const handleDeviceChange = (id: string) => {
    const dev = deviceMap[id]
    const devType = dev?.type ?? 'other'
    let payloadData: Record<string, unknown> = {}
    if (devType === 'relay') {
      const n = Math.max(1, Number(dev?.metadata?.channels ?? 4))
      for (let i = 1; i <= n; i++) payloadData[`ch${i}`] = false
    } else if (devType === 'dimmer') {
      payloadData = { brightness: 100 }
    } else if (devType === 'ac_gateway') {
      payloadData = { power: true, temperature: 24, mode: 'cool', fan_speed: 'auto' }
    } else if (devType === 'curtain') {
      payloadData = { position: 50 }
    }
    onChange({ device_id: id, payloadData, rawPayload: '{}' })
  }

  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 space-y-2.5 bg-zinc-50 dark:bg-zinc-800/50">
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-400 font-mono tabular-nums w-5">{index + 1}.</span>
        <select value={draft.action_type}
          onChange={e => onChange({ action_type: e.target.value as ActionKind })}
          className="border border-zinc-300 dark:border-zinc-600 rounded-md px-2 py-1 text-xs bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-brand-400"
        >
          <option value="device_state">Device State</option>
          <option value="run_scene">Run Scene</option>
          <option value="delay">Delay</option>
        </select>
        <div className="flex-1" />
        <button onClick={() => onMove(-1)} disabled={index === 0}
          className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 disabled:opacity-30 transition-colors">
          <CaretUp size={14} />
        </button>
        <button onClick={() => onMove(1)} disabled={index === total - 1}
          className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 disabled:opacity-30 transition-colors">
          <CaretDown size={14} />
        </button>
        <button onClick={onRemove}
          className="p-1 rounded text-zinc-400 hover:text-red-500 transition-colors">
          <X size={14} />
        </button>
      </div>

      {draft.action_type === 'device_state' && (
        <>
          <select value={draft.device_id} onChange={e => handleDeviceChange(e.target.value)}
            className="w-full border border-zinc-300 dark:border-zinc-600 rounded-md px-2 py-1.5 text-xs bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-brand-400">
            <option value="">— Select device —</option>
            {devices.map(d => (
              <option key={d.id} value={d.id}>{d.name || d.id} ({d.type})</option>
            ))}
          </select>
          {draft.device_id && (
            <div className="pt-0.5">
              {selectedDev?.type === 'relay' && (
                <RelayBuilder device={selectedDev} value={draft.payloadData} onChange={pd => onChange({ payloadData: pd })} />
              )}
              {selectedDev?.type === 'dimmer' && (
                <DimmerBuilder value={draft.payloadData} onChange={pd => onChange({ payloadData: pd })} />
              )}
              {selectedDev?.type === 'ac_gateway' && (
                <AcBuilder value={draft.payloadData} onChange={pd => onChange({ payloadData: pd })} />
              )}
              {selectedDev?.type === 'curtain' && (
                <CurtainBuilder value={draft.payloadData} onChange={pd => onChange({ payloadData: pd })} />
              )}
              {(!selectedDev || !['relay','dimmer','ac_gateway','curtain'].includes(selectedDev.type)) && (
                <textarea rows={2} placeholder='{ "ch1": true }' value={draft.rawPayload}
                  onChange={e => onChange({ rawPayload: e.target.value })}
                  className="w-full border border-zinc-300 dark:border-zinc-600 rounded-md px-2 py-1 text-xs font-mono bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-brand-400 resize-none"
                />
              )}
            </div>
          )}
        </>
      )}

      {draft.action_type === 'run_scene' && (
        <select value={draft.run_scene_id} onChange={e => onChange({ run_scene_id: e.target.value })}
          className="w-full border border-zinc-300 dark:border-zinc-600 rounded-md px-2 py-1.5 text-xs bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-brand-400">
          <option value="">— Select scene to run —</option>
          {scenes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}

      {draft.action_type === 'delay' && (
        <div className="flex items-center gap-2">
          <input type="number" min={0.1} step={0.5} value={draft.delay_seconds}
            onChange={e => onChange({ delay_seconds: e.target.value })}
            className="w-24 border border-zinc-300 dark:border-zinc-600 rounded-md px-2 py-1.5 text-xs bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-brand-400"
          />
          <span className="text-xs text-zinc-500">seconds</span>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────────────

export default function Scenes() {
  const [scenes, setScenes] = useState<Scene[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState<IconName>('play')
  const [areaId, setAreaId] = useState('')
  const [actions, setActions] = useState<ActionDraft[]>([emptyDraft()])
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Scene | null>(null)

  const deviceMap = Object.fromEntries(devices.map(d => [d.id, d]))

  const load = () => {
    setLoading(true)
    Promise.all([getScenes(), getDevices(), getAreas()])
      .then(([s, d, a]) => { setScenes(s); setDevices(d); setAreas(a) })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const openAdd = () => {
    setEditingId(null); setName(''); setIcon('play'); setAreaId('')
    setActions([emptyDraft()]); setFormError(''); setModalOpen(true)
  }

  const openEdit = (scene: Scene) => {
    setEditingId(scene.id); setName(scene.name)
    setIcon((scene.icon as IconName) ?? 'play'); setAreaId(scene.area_id ?? '')
    setActions(
      scene.actions?.length
        ? scene.actions.map(a => actionToDraft(a as unknown as Record<string, unknown>, deviceMap))
        : [emptyDraft()],
    )
    setFormError(''); setModalOpen(true)
  }

  const buildActions = (): SceneAction[] | null => {
    const built: SceneAction[] = []
    for (const d of actions) {
      const a = draftToAction(d, deviceMap)
      if (a === null && d.action_type === 'device_state' && d.device_id) {
        setFormError('Invalid JSON payload in one of the actions'); return null
      }
      if (a !== null) built.push(a)
    }
    return built
  }

  const handleSave = async () => {
    if (!name.trim()) { setFormError('Name is required'); return }
    const built = buildActions()
    if (built === null) return
    setSaving(true)
    try {
      if (editingId) {
        await updateScene(editingId, { name: name.trim(), icon, area_id: areaId || undefined, actions: built })
      } else {
        await createScene({ name: name.trim(), icon, area_id: areaId || undefined, actions: built })
      }
      setModalOpen(false); load()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleExecute = async (id: string) => {
    await executeScene(id).catch((e: Error) => alert(e.message))
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await deleteScene(deleteTarget.id).catch(console.error)
    setDeleteTarget(null); load()
  }

  const updateDraft = (i: number, updates: Partial<ActionDraft>) =>
    setActions(prev => prev.map((d, j) => j === i ? { ...d, ...updates } : d))

  const moveAction = (i: number, dir: -1 | 1) => {
    setActions(prev => {
      const next = [...prev]; const j = i + dir
      if (j < 0 || j >= next.length) return prev
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  const removeAction = (i: number) =>
    setActions(prev => prev.filter((_, j) => j !== i))

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Scenes</h1>
        <button onClick={openAdd} className="btn-primary">New Scene</button>
      </div>
      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
      {loading ? (
        <p className="text-zinc-400 text-sm">Loading…</p>
      ) : scenes.length === 0 ? (
        <Empty message="No scenes yet. Create a scene to group device actions together." />
      ) : (
        <Table
          head={['', 'Name', 'Actions', 'Area', '']}
          rows={scenes.map((s) => [
            <span className="text-zinc-500 dark:text-zinc-400"><SceneIcon name={s.icon} size={16} /></span>,
            <span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100 block">{s.name}</span>
              <code className="text-xs text-zinc-400 dark:text-zinc-500">{s.id}</code>
            </span>,
            <span className="text-zinc-600 dark:text-zinc-400 text-sm">
              {s.actions?.length ?? 0} action{s.actions?.length !== 1 ? 's' : ''}
            </span>,
            <span className="text-zinc-500 dark:text-zinc-400 text-sm">
              {s.area_id ? (areas.find(a => a.id === s.area_id)?.name ?? s.area_id) : '—'}
            </span>,
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => handleExecute(s.id)} className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium">Run</button>
              <button onClick={() => openEdit(s)} className="text-xs text-zinc-500 dark:text-zinc-400 hover:underline">Edit</button>
              <button onClick={() => setDeleteTarget(s)} className="text-xs text-red-500 hover:underline">Delete</button>
            </div>,
          ])}
        />
      )}

      {modalOpen && (
        <Modal title={editingId ? 'Edit Scene' : 'New Scene'} onClose={() => setModalOpen(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Scene Name *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Good Night" className="input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">Icon</label>
              <IconPicker value={icon} onChange={v => setIcon(v as IconName)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                Area Scope <span className="font-normal text-zinc-400">(optional)</span>
              </label>
              <select value={areaId} onChange={e => setAreaId(e.target.value)} className="input">
                <option value="">Whole property</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">Actions</label>
              <div className="space-y-2">
                {actions.map((draft, i) => (
                  <ActionRow key={i} draft={draft} index={i} total={actions.length}
                    devices={devices} deviceMap={deviceMap}
                    scenes={scenes.filter(s => s.id !== editingId)}
                    onChange={u => updateDraft(i, u)}
                    onMove={dir => moveAction(i, dir)}
                    onRemove={() => removeAction(i)}
                  />
                ))}
              </div>
              <button type="button"
                onClick={() => setActions(prev => [...prev, emptyDraft()])}
                className="mt-2 flex items-center gap-1 text-xs text-brand dark:text-brand-400 hover:underline font-medium">
                <Plus size={12} /> Add action
              </button>
            </div>
            {formError && <p className="text-red-500 text-xs">{formError}</p>}
            <ModalFooter onCancel={() => setModalOpen(false)} onSave={handleSave}
              saveLabel={saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create'} />
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Delete Scene" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            Delete <strong className="text-zinc-900 dark:text-zinc-100">{deleteTarget.name}</strong>? This cannot be undone.
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
