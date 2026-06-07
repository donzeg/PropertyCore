// Water System Config — Phase 5
// Tank calibration · pump thresholds · flow meter · device links
// UI-SCOPE §15 Water Management
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Drop } from '@phosphor-icons/react'
import { getDevices, getWater, updateWater } from '../../api'
import type { Device, WaterConfig } from '../../types'

function FormRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
        {label}{hint && <span className="ml-1 font-normal text-zinc-400">— {hint}</span>}
      </label>
      {children}
    </div>
  )
}

export default function WaterConfig() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const [enabled,        setEnabled]        = useState(false)
  const [tankCapacity,   setTankCapacity]   = useState(5000)
  const [sensorFull,     setSensorFull]     = useState(20)
  const [sensorEmpty,    setSensorEmpty]    = useState(200)
  const [pumpStart,      setPumpStart]      = useState(20)
  const [pumpStop,       setPumpStop]       = useState(90)
  const [pumpMaxRun,     setPumpMaxRun]     = useState(60)
  const [flowPulse,      setFlowPulse]      = useState(450)
  const [leakAlert,      setLeakAlert]      = useState(50)
  const [tankDeviceId,   setTankDeviceId]   = useState('')
  const [pumpDeviceId,   setPumpDeviceId]   = useState('')
  const [flowDeviceId,   setFlowDeviceId]   = useState('')

  useEffect(() => {
    Promise.all([getWater(), getDevices()])
      .then(([w, devs]) => {
        setDevices(devs)
        setEnabled(w.enabled)
        setTankCapacity(w.tank_capacity_l)
        setSensorFull(w.sensor_full_cm)
        setSensorEmpty(w.sensor_empty_cm)
        setPumpStart(w.pump_start_pct)
        setPumpStop(w.pump_stop_pct)
        setPumpMaxRun(w.pump_max_run_min)
        setFlowPulse(w.flow_pulse_per_l)
        setLeakAlert(w.leak_alert_l_per_h)
        setTankDeviceId(w.tank_device_id || '')
        setPumpDeviceId(w.pump_device_id || '')
        setFlowDeviceId(w.flow_device_id || '')
      })
      .catch(() => setError('Failed to load water configuration.'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true); setError(null); setSaved(false)
    const body: Partial<WaterConfig> = {
      enabled, tank_capacity_l: tankCapacity, sensor_full_cm: sensorFull,
      sensor_empty_cm: sensorEmpty, pump_start_pct: pumpStart, pump_stop_pct: pumpStop,
      pump_max_run_min: pumpMaxRun, flow_pulse_per_l: flowPulse, leak_alert_l_per_h: leakAlert,
      tank_device_id: tankDeviceId, pump_device_id: pumpDeviceId, flow_device_id: flowDeviceId,
    }
    try {
      await updateWater(body)
      setSaved(true); setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-sm text-zinc-400">Loading…</div>

  const deviceOptions = (
    <>
      <option value="">— Not linked —</option>
      {devices.map(d => <option key={d.id} value={d.id}>{d.name || d.id} ({d.type})</option>)}
    </>
  )

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/energy" className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
          <ArrowLeft size={18} weight="bold" />
        </Link>
        <div>
          <h1 className="text-[17px] font-semibold text-zinc-900 dark:text-zinc-100">Water System</h1>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Tank · pump · flow meter configuration</p>
        </div>
        <Drop size={18} weight="fill" className="ml-auto text-blue-400" />
      </div>

      {error && <div className="text-xs text-red-500 bg-red-50 dark:bg-red-500/10 rounded-lg px-4 py-2">{error}</div>}

      <div className="card p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Enable Water Monitoring</div>
            <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Track tank level, pump state, and flow</div>
          </div>
          <button onClick={() => setEnabled(e => !e)}
            className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-brand' : 'bg-zinc-200 dark:bg-zinc-700'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Tank</p>
        <div className="grid grid-cols-3 gap-4">
          <FormRow label="Capacity (L)">
            <input type="number" className="input" value={tankCapacity} min={0}
              onChange={e => setTankCapacity(Number(e.target.value))} />
          </FormRow>
          <FormRow label="Sensor Full (cm)">
            <input type="number" className="input" value={sensorFull} min={0}
              onChange={e => setSensorFull(Number(e.target.value))} />
          </FormRow>
          <FormRow label="Sensor Empty (cm)">
            <input type="number" className="input" value={sensorEmpty} min={0}
              onChange={e => setSensorEmpty(Number(e.target.value))} />
          </FormRow>
        </div>
        <p className="text-[11px] text-zinc-400">
          Ultrasonic sensor distance reading at full/empty water level.
        </p>
      </div>

      <div className="card p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Pump</p>
        <div className="grid grid-cols-3 gap-4">
          <FormRow label="Start Below (%)">
            <input type="number" className="input" value={pumpStart} min={0} max={100}
              onChange={e => setPumpStart(Number(e.target.value))} />
          </FormRow>
          <FormRow label="Stop Above (%)">
            <input type="number" className="input" value={pumpStop} min={0} max={100}
              onChange={e => setPumpStop(Number(e.target.value))} />
          </FormRow>
          <FormRow label="Max Run (min)">
            <input type="number" className="input" value={pumpMaxRun} min={1}
              onChange={e => setPumpMaxRun(Number(e.target.value))} />
          </FormRow>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Flow Meter</p>
        <div className="grid grid-cols-2 gap-4">
          <FormRow label="Pulses per Litre">
            <input type="number" className="input" value={flowPulse} min={1}
              onChange={e => setFlowPulse(Number(e.target.value))} />
          </FormRow>
          <FormRow label="Leak Alert (L/h)">
            <input type="number" className="input" value={leakAlert} min={0}
              onChange={e => setLeakAlert(Number(e.target.value))} />
          </FormRow>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Device Links</p>
        <FormRow label="Tank Level Device">
          <select className="input" value={tankDeviceId} onChange={e => setTankDeviceId(e.target.value)}>{deviceOptions}</select>
        </FormRow>
        <FormRow label="Pump Relay Device">
          <select className="input" value={pumpDeviceId} onChange={e => setPumpDeviceId(e.target.value)}>{deviceOptions}</select>
        </FormRow>
        <FormRow label="Flow Meter Device">
          <select className="input" value={flowDeviceId} onChange={e => setFlowDeviceId(e.target.value)}>{deviceOptions}</select>
        </FormRow>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
          {saving ? 'Saving…' : 'Save Configuration'}
        </button>
        {saved && <span className="flex items-center gap-1.5 text-xs text-brand"><CheckCircle size={14} weight="fill" />Saved</span>}
      </div>
    </div>
  )
}
