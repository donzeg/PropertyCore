// Inverter Setup — Phase 5
// DEYE / Growatt / Sofar / Goodwe / Sunsynk / Victron
// RS485 port · baud rate · Modbus slave address · poll interval · device link
// UI-SCOPE §14 Inverter Setup
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle } from '@phosphor-icons/react'
import { getDevices, getInverter, updateInverter } from '../../api'
import type { Device, InverterBrand, InverterConfig } from '../../types'

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

const BRANDS: { value: InverterBrand; label: string }[] = [
  { value: 'deye',    label: 'DEYE' },
  { value: 'growatt', label: 'Growatt' },
  { value: 'sofar',   label: 'Sofar Solar' },
  { value: 'goodwe',  label: 'Goodwe' },
  { value: 'sunsynk', label: 'Sunsynk' },
  { value: 'victron', label: 'Victron' },
  { value: 'other',   label: 'Other / Custom' },
]

const BAUD_RATES = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200]

export default function InverterSetup() {
  const [config,   setConfig]   = useState<InverterConfig | null>(null)
  const [devices,  setDevices]  = useState<Device[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  // form state
  const [enabled,      setEnabled]      = useState(false)
  const [brand,        setBrand]        = useState<InverterBrand>('deye')
  const [model,        setModel]        = useState('')
  const [port,         setPort]         = useState('/dev/ttyUSB0')
  const [baudRate,     setBaudRate]     = useState(9600)
  const [slaveAddr,    setSlaveAddr]    = useState(1)
  const [pollInterval, setPollInterval] = useState(10)
  const [deviceId,     setDeviceId]     = useState('')

  useEffect(() => {
    Promise.all([getInverter(), getDevices()])
      .then(([inv, devs]) => {
        setConfig(inv)
        setDevices(devs)
        setEnabled(inv.enabled)
        setBrand(inv.brand)
        setModel(inv.model || '')
        setPort(inv.port)
        setBaudRate(inv.baud_rate)
        setSlaveAddr(inv.slave_addr)
        setPollInterval(inv.poll_interval)
        setDeviceId(inv.device_id || '')
      })
      .catch(() => setError('Failed to load inverter configuration.'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await updateInverter({
        enabled,
        brand,
        model,
        port,
        baud_rate:     baudRate,
        slave_addr:    slaveAddr,
        poll_interval: pollInterval,
        device_id:     deviceId,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-sm text-zinc-400">Loading…</div>

  return (
    <div className="p-8 max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/energy" className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
          <ArrowLeft size={18} weight="bold" />
        </Link>
        <div>
          <h1 className="text-[17px] font-semibold text-zinc-900 dark:text-zinc-100">Inverter Setup</h1>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">RS485 Modbus — DEYE · Growatt · Sofar · Goodwe · Sunsynk · Victron</p>
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-500 bg-red-50 dark:bg-red-500/10 rounded-lg px-4 py-2">{error}</div>
      )}

      {/* Enable toggle */}
      <div className="card p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Enable Inverter Integration</div>
            <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
              Poll the inverter via RS485 Modbus and push data to MQTT
            </div>
          </div>
          <button
            onClick={() => setEnabled(e => !e)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              enabled ? 'bg-brand' : 'bg-zinc-200 dark:bg-zinc-700'
            }`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              enabled ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
          </button>
        </div>
      </div>

      {/* Config form */}
      <div className="card p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          Inverter Details
        </p>

        <FormRow label="Brand">
          <select
            className="input"
            value={brand}
            onChange={e => setBrand(e.target.value as InverterBrand)}
          >
            {BRANDS.map(b => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>
        </FormRow>

        <FormRow label="Model (optional)">
          <input
            type="text"
            className="input"
            value={model}
            onChange={e => setModel(e.target.value)}
            placeholder="e.g. SUN-16K-SG04LP3"
          />
        </FormRow>
      </div>

      <div className="card p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          RS485 / Modbus
        </p>

        <FormRow label="Serial Port">
          <input
            type="text"
            className="input font-mono"
            value={port}
            onChange={e => setPort(e.target.value)}
            placeholder="/dev/ttyUSB0"
          />
        </FormRow>

        <div className="grid grid-cols-3 gap-4">
          <FormRow label="Baud Rate">
            <select className="input" value={baudRate} onChange={e => setBaudRate(Number(e.target.value))}>
              {BAUD_RATES.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </FormRow>
          <FormRow label="Slave Address">
            <input
              type="number"
              className="input"
              value={slaveAddr}
              min={1} max={247}
              onChange={e => setSlaveAddr(Number(e.target.value))}
            />
          </FormRow>
          <FormRow label="Poll Interval (s)">
            <input
              type="number"
              className="input"
              value={pollInterval}
              min={5} max={300}
              onChange={e => setPollInterval(Number(e.target.value))}
            />
          </FormRow>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          MQTT Device Link
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Select the MQTT device ID used by the Modbus bridge (pc-bridge-modbus) to publish inverter state.
          The energy dashboard reads live data from this device's state.
        </p>
        <FormRow label="Inverter Device ID">
          <select className="input" value={deviceId} onChange={e => setDeviceId(e.target.value)}>
            <option value="">— Not linked —</option>
            {devices.map(d => (
              <option key={d.id} value={d.id}>{d.name || d.id} ({d.type})</option>
            ))}
          </select>
        </FormRow>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Save Configuration'}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-xs text-brand">
            <CheckCircle size={14} weight="fill" />
            Saved
          </span>
        )}
      </div>
    </div>
  )
}
