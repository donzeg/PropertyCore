// Generator Config — Phase 5
// Start/stop delays · battery threshold · fuel sensor · maintenance interval
// UI-SCOPE §16 Generator Management
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Wrench } from '@phosphor-icons/react'
import { getDevices, getGenerator, updateGenerator } from '../../api'
import type { Device, GeneratorConfig } from '../../types'

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

export default function GeneratorConfigPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const [enabled,         setEnabled]         = useState(false)
  const [startDelay,      setStartDelay]       = useState(30)
  const [stopDelay,       setStopDelay]        = useState(60)
  const [batteryStartPct, setBatteryStartPct]  = useState(20)
  const [fuelFullV,       setFuelFullV]        = useState(4.5)
  const [fuelEmptyV,      setFuelEmptyV]       = useState(0.5)
  const [maintenanceH,    setMaintenanceH]     = useState(250)
  const [runtimeH,        setRuntimeH]        = useState(0)
  const [genDeviceId,     setGenDeviceId]      = useState('')
  const [fuelDeviceId,    setFuelDeviceId]     = useState('')

  useEffect(() => {
    Promise.all([getGenerator(), getDevices()])
      .then(([g, devs]) => {
        setDevices(devs)
        setEnabled(g.enabled)
        setStartDelay(g.start_delay_s)
        setStopDelay(g.stop_delay_s)
        setBatteryStartPct(g.battery_start_pct)
        setFuelFullV(g.fuel_sensor_full_v)
        setFuelEmptyV(g.fuel_sensor_empty_v)
        setMaintenanceH(g.maintenance_hours)
        setRuntimeH(g.runtime_hours)
        setGenDeviceId(g.gen_device_id || '')
        setFuelDeviceId(g.fuel_device_id || '')
      })
      .catch(() => setError('Failed to load generator configuration.'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true); setError(null); setSaved(false)
    const body: Partial<GeneratorConfig> = {
      enabled, start_delay_s: startDelay, stop_delay_s: stopDelay,
      battery_start_pct: batteryStartPct, fuel_sensor_full_v: fuelFullV,
      fuel_sensor_empty_v: fuelEmptyV, maintenance_hours: maintenanceH,
      runtime_hours: runtimeH, gen_device_id: genDeviceId, fuel_device_id: fuelDeviceId,
    }
    try {
      await updateGenerator(body)
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
          <h1 className="text-[17px] font-semibold text-zinc-900 dark:text-zinc-100">Generator</h1>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Auto-start · fuel monitoring · maintenance tracking</p>
        </div>
        <Wrench size={18} weight="fill" className="ml-auto text-yellow-500" />
      </div>

      {error && <div className="text-xs text-red-500 bg-red-50 dark:bg-red-500/10 rounded-lg px-4 py-2">{error}</div>}

      <div className="card p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Enable Generator Control</div>
            <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Auto-start on grid failure, monitor fuel and runtime</div>
          </div>
          <button onClick={() => setEnabled(e => !e)}
            className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-brand' : 'bg-zinc-200 dark:bg-zinc-700'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Auto-Start Logic</p>
        <div className="grid grid-cols-3 gap-4">
          <FormRow label="Start Delay (s)" hint="After grid failure">
            <input type="number" className="input" value={startDelay} min={0}
              onChange={e => setStartDelay(Number(e.target.value))} />
          </FormRow>
          <FormRow label="Stop Delay (s)" hint="After grid restore">
            <input type="number" className="input" value={stopDelay} min={0}
              onChange={e => setStopDelay(Number(e.target.value))} />
          </FormRow>
          <FormRow label="Battery Start (%)" hint="Start if battery below">
            <input type="number" className="input" value={batteryStartPct} min={0} max={100}
              onChange={e => setBatteryStartPct(Number(e.target.value))} />
          </FormRow>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Fuel Sensor Calibration</p>
        <div className="grid grid-cols-2 gap-4">
          <FormRow label="Full Tank Voltage (V)">
            <input type="number" step="0.1" className="input" value={fuelFullV} min={0} max={5}
              onChange={e => setFuelFullV(Number(e.target.value))} />
          </FormRow>
          <FormRow label="Empty Tank Voltage (V)">
            <input type="number" step="0.1" className="input" value={fuelEmptyV} min={0} max={5}
              onChange={e => setFuelEmptyV(Number(e.target.value))} />
          </FormRow>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Maintenance</p>
        <div className="grid grid-cols-2 gap-4">
          <FormRow label="Service Interval (hours)">
            <input type="number" className="input" value={maintenanceH} min={0}
              onChange={e => setMaintenanceH(Number(e.target.value))} />
          </FormRow>
          <FormRow label="Runtime Counter (hours)">
            <input type="number" step="0.1" className="input" value={runtimeH} min={0}
              onChange={e => setRuntimeH(Number(e.target.value))} />
          </FormRow>
        </div>
        <p className="text-[11px] text-zinc-400">Runtime counter can be reset here after a service.</p>
      </div>

      <div className="card p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Device Links</p>
        <FormRow label="Generator Control Device (relay)">
          <select className="input" value={genDeviceId} onChange={e => setGenDeviceId(e.target.value)}>{deviceOptions}</select>
        </FormRow>
        <FormRow label="Fuel Sensor Device">
          <select className="input" value={fuelDeviceId} onChange={e => setFuelDeviceId(e.target.value)}>{deviceOptions}</select>
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
