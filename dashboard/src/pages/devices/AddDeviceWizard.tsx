import { useEffect, useRef, useState } from 'react'
import { createDevice, getAreas, getWsUrl } from '../../api'
import type { Area } from '../../types'

// ─── Types ───────────────────────────────────────────────────────────────────

type FirmwareType = 'propertycore' | 'tasmota' | 'esphome' | 'shelly' | 'zigbee' | 'tuya' | 'manual'
type DeviceType = 'relay' | 'dimmer' | 'ac_gateway' | 'curtain' | 'sensor' | 'keypad' | 'other'

interface Props {
  onClose: () => void
  onDone: (deviceId: string) => void
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STEPS = ['Firmware', 'Identity', 'Setup', 'Waiting', 'Done']

const FIRMWARE_OPTIONS: { value: FirmwareType; icon: string; label: string; desc: string }[] = [
  { value: 'propertycore', icon: '🔷', label: 'PropertyCore',  desc: 'PC-RLY, PC-DIM, PC-AC-GW, PC-CRT modules' },
  { value: 'tasmota',      icon: '🟠', label: 'Tasmota',       desc: 'Off-the-shelf relay/switch boards' },
  { value: 'esphome',      icon: '🟢', label: 'ESPHome',       desc: 'Dev boards, custom sensors' },
  { value: 'shelly',       icon: '⚪', label: 'Shelly',        desc: 'Shelly relay and dimmer modules' },
  { value: 'zigbee',       icon: '🔵', label: 'Zigbee',        desc: 'Sensors, switches via Zigbee2MQTT' },
  { value: 'tuya',         icon: '🟡', label: 'Tuya Local',    desc: 'Consumer Tuya-based devices' },
  { value: 'manual',       icon: '⬛', label: 'Other / Manual', desc: 'Any device that speaks MQTT' },
]

const DEVICE_TYPES: { value: DeviceType; label: string }[] = [
  { value: 'relay',       label: 'Relay / Switch' },
  { value: 'dimmer',      label: 'Dimmer' },
  { value: 'ac_gateway',  label: 'AC Gateway' },
  { value: 'curtain',     label: 'Curtain / Blind' },
  { value: 'sensor',      label: 'Sensor' },
  { value: 'keypad',      label: 'Keypad' },
  { value: 'other',       label: 'Other' },
]

// ─── Root Wizard ──────────────────────────────────────────────────────────────

export default function AddDeviceWizard({ onClose, onDone }: Props) {
  const [step, setStep]               = useState(0)
  const [firmware, setFirmware]       = useState<FirmwareType | null>(null)
  const [deviceId, setDeviceId]       = useState('')
  const [name, setName]               = useState('')
  const [deviceType, setDeviceType]   = useState<DeviceType>('relay')
  const [areaId, setAreaId]           = useState('')
  const [areas, setAreas]             = useState<Area[]>([])
  const [error, setError]             = useState('')
  const [registering, setRegistering] = useState(false)
  const [wsStatus, setWsStatus]       = useState<'waiting' | 'connected' | 'timeout'>('waiting')
  const [firstState, setFirstState]   = useState<Record<string, unknown> | null>(null)

  const wsRef    = useRef<WebSocket | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Hub IP from browser URL (dashboard is served from the hub)
  const hubIp = window.location.hostname === 'localhost' ? '192.168.31.223' : window.location.hostname

  useEffect(() => {
    getAreas().then(setAreas).catch(() => {})
  }, [])

  // Step 3 (index 3) → open WebSocket and wait for device first message
  useEffect(() => {
    if (step !== 3) return

    setWsStatus('waiting')
    const ws = new WebSocket(getWsUrl())
    wsRef.current = ws

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string)
        if (msg.event === 'device_state' && msg.data?.id === deviceId) {
          setWsStatus('connected')
          setFirstState((msg.data.state as Record<string, unknown>) ?? null)
          ws.close()
          if (timerRef.current) clearTimeout(timerRef.current)
        }
      } catch { /* ignore parse errors */ }
    }

    timerRef.current = setTimeout(() => {
      setWsStatus('timeout')
      ws.close()
    }, 5 * 60 * 1000) // 5 minutes

    return () => {
      ws.close()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [step, deviceId])

  const goNext = async () => {
    setError('')

    if (step === 0) {
      if (!firmware) { setError('Select a firmware type to continue.'); return }
      setStep(1)

    } else if (step === 1) {
      if (!deviceId.trim())            { setError('Device ID is required.'); return }
      if (!/^[a-z0-9_-]+$/.test(deviceId.trim())) { setError('Device ID can only contain lowercase letters, numbers, hyphens and underscores.'); return }
      if (!name.trim())                { setError('Display name is required.'); return }
      setStep(2)

    } else if (step === 2) {
      // Register the device with the engine before moving to wait step
      setRegistering(true)
      try {
        await createDevice({
          id:       deviceId.trim(),
          name:     name.trim(),
          type:     deviceType,
          area_id:  areaId || undefined,
          metadata: { firmware_type: firmware },
        })
        setStep(3)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Registration failed'
        if (msg.includes('409') || msg.toLowerCase().includes('already')) {
          setError(`A device with ID "${deviceId}" already exists. Use a different ID or delete the existing device.`)
        } else {
          setError(msg)
        }
      } finally {
        setRegistering(false)
      }

    } else if (step === 3) {
      if (wsStatus === 'waiting') {
        setError('Device has not connected yet. You can skip, but the device will need to connect before it can be controlled.')
        // allow continuing anyway
        setStep(4)
      } else {
        setStep(4)
      }

    } else if (step === 4) {
      onDone(deviceId.trim())
    }
  }

  const goPrev = () => {
    setError('')
    if (step === 3) {
      // Going back from wait step — close WS, go to setup instructions
      wsRef.current?.close()
      if (timerRef.current) clearTimeout(timerRef.current)
      setStep(2)
    } else {
      setStep((s) => Math.max(0, s - 1))
    }
  }

  const nextLabel = () => {
    if (step === 4)                               return 'Done'
    if (step === 3 && wsStatus === 'connected')   return 'Continue →'
    if (step === 3)                               return 'Skip →'
    if (step === 2)                               return registering ? 'Registering…' : 'Register & Wait →'
    return 'Next →'
  }

  // Tasmota Backlog command
  const tasmotaCmd =
    `Backlog MqttHost ${hubIp}; MqttPort 1883; MqttClient ${deviceId || 'device-id'}; ` +
    `Topic propertycore/devices/${deviceId || 'device-id'}\n` +
    `Rule1 ON Power1#State DO Publish propertycore/devices/${deviceId || 'device-id'}/state ` +
    `{"type":"${deviceType}","ch1":%value%} ENDON\n` +
    `Rule1 1`

  // ESPHome YAML snippet
  const esphomeYaml =
    `mqtt:\n` +
    `  broker: ${hubIp}\n` +
    `  port: 1883\n` +
    `  client_id: ${deviceId || 'device-id'}\n` +
    `  topic_prefix: propertycore/devices/${deviceId || 'device-id'}\n` +
    `  birth_message:\n` +
    `    topic: propertycore/devices/${deviceId || 'device-id'}/state\n` +
    `    payload: '{"type":"${deviceType}","online":true}'\n` +
    `  will_message:\n` +
    `    topic: propertycore/devices/${deviceId || 'device-id'}/state\n` +
    `    payload: '{"type":"${deviceType}","online":false}'`

  const downloadYaml = () => {
    const blob = new Blob([esphomeYaml], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${deviceId || 'device'}.yaml`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyText = (text: string) => navigator.clipboard.writeText(text).catch(() => {})

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-2xl mx-4
                      border border-zinc-200 dark:border-zinc-700 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Add Device</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-lg leading-none p-1 rounded transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-4 pb-2 shrink-0">
          <div className="flex items-center">
            {STEPS.map((label, i) => (
              <div key={i} className="flex items-center">
                <div className={`flex items-center gap-2 ${i === step ? '' : 'opacity-60'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors
                    ${i < step
                      ? 'bg-brand text-white'
                      : i === step
                        ? 'bg-brand text-white'
                        : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'
                    }`}
                  >
                    {i < step ? '✓' : i + 1}
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

        {/* Step content */}
        <div className="px-6 py-5 overflow-y-auto grow min-h-0">
          {step === 0 && (
            <StepFirmware firmware={firmware} onSelect={setFirmware} />
          )}
          {step === 1 && (
            <StepIdentity
              deviceId={deviceId} setDeviceId={setDeviceId}
              name={name} setName={setName}
              deviceType={deviceType} setDeviceType={setDeviceType}
              areaId={areaId} setAreaId={setAreaId}
              areas={areas}
            />
          )}
          {step === 2 && firmware && (
            <StepSetup
              firmware={firmware}
              deviceId={deviceId}
              deviceType={deviceType}
              hubIp={hubIp}
              tasmotaCmd={tasmotaCmd}
              esphomeYaml={esphomeYaml}
              onDownloadYaml={downloadYaml}
              onCopy={copyText}
            />
          )}
          {step === 3 && (
            <StepWaiting
              deviceId={deviceId}
              status={wsStatus}
              firstState={firstState}
              onRetry={() => { setWsStatus('waiting'); setStep(3) }}
            />
          )}
          {step === 4 && (
            <StepDone
              deviceId={deviceId}
              name={name}
              deviceType={deviceType}
              firmware={firmware!}
              areas={areas}
              areaId={areaId}
              connected={wsStatus === 'connected'}
            />
          )}

          {error && (
            <p className="mt-3 text-red-500 text-xs">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between shrink-0">
          <button
            onClick={step === 0 ? onClose : goPrev}
            className="btn-ghost text-sm px-4 py-1.5"
          >
            {step === 0 ? 'Cancel' : '← Back'}
          </button>
          <button
            onClick={goNext}
            disabled={registering}
            className="btn-primary text-sm px-4 py-1.5 disabled:opacity-50"
          >
            {nextLabel()}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Step 1: Choose firmware type ─────────────────────────────────────────────

function StepFirmware({
  firmware,
  onSelect,
}: {
  firmware: FirmwareType | null
  onSelect: (f: FirmwareType) => void
}) {
  return (
    <div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
        What firmware is running on the device you want to add?
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {FIRMWARE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className={`text-left px-4 py-3 rounded-lg border transition-colors
              ${firmware === opt.value
                ? 'border-brand bg-brand/5 dark:bg-brand/10'
                : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
              }`}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-base">{opt.icon}</span>
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{opt.label}</span>
              {firmware === opt.value && (
                <span className="ml-auto text-brand text-xs font-semibold">✓</span>
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 pl-6">{opt.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Step 2: Device identity ──────────────────────────────────────────────────

function StepIdentity({
  deviceId, setDeviceId,
  name, setName,
  deviceType, setDeviceType,
  areaId, setAreaId,
  areas,
}: {
  deviceId: string; setDeviceId: (v: string) => void
  name: string; setName: (v: string) => void
  deviceType: DeviceType; setDeviceType: (v: DeviceType) => void
  areaId: string; setAreaId: (v: string) => void
  areas: Area[]
}) {
  // Auto-fill name when ID changes if name is still blank
  const handleIdChange = (v: string) => {
    setDeviceId(v)
    if (!name) setName(v)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Give this device a unique ID and a display name.
      </p>

      <div>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
          Device ID <span className="text-zinc-400 font-normal">(permanent — used in MQTT topics)</span>
        </label>
        <input
          className="input"
          placeholder="e.g. relay-lounge-01"
          value={deviceId}
          onChange={(e) => handleIdChange(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
        />
        {deviceId && (
          <p className="mt-1 text-xs text-zinc-400">
            MQTT topic: <code className="font-mono">propertycore/devices/{deviceId}/state</code>
          </p>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
          Display Name
        </label>
        <input
          className="input"
          placeholder="e.g. Lounge Relay"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
            Device Type
          </label>
          <select
            className="input"
            value={deviceType}
            onChange={(e) => setDeviceType(e.target.value as DeviceType)}
          >
            {DEVICE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
            Area <span className="text-zinc-400 font-normal">(optional)</span>
          </label>
          <select
            className="input"
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
          >
            <option value="">— Unassigned —</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

// ─── Step 3: Firmware-specific setup instructions ─────────────────────────────

function StepSetup({
  firmware, deviceId, deviceType, hubIp,
  tasmotaCmd, esphomeYaml, onDownloadYaml, onCopy,
}: {
  firmware: FirmwareType
  deviceId: string
  deviceType: string
  hubIp: string
  tasmotaCmd: string
  esphomeYaml: string
  onDownloadYaml: () => void
  onCopy: (t: string) => void
}) {
  const [copied, setCopied] = useState<string | null>(null)

  const copy = (key: string, text: string) => {
    onCopy(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const CopyBtn = ({ id, text }: { id: string; text: string }) => (
    <button
      onClick={() => copy(id, text)}
      className="text-xs px-2 py-0.5 rounded border border-zinc-300 dark:border-zinc-600
                 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
    >
      {copied === id ? 'Copied ✓' : 'Copy'}
    </button>
  )

  const CodeBlock = ({ id, text }: { id: string; text: string }) => (
    <div className="relative mt-2">
      <pre className="text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700
                      rounded-md p-3 text-zinc-700 dark:text-zinc-300 overflow-x-auto whitespace-pre-wrap">
        {text}
      </pre>
      <div className="absolute top-2 right-2">
        <CopyBtn id={id} text={text} />
      </div>
    </div>
  )

  const Row = ({ label, value }: { label: string; value: string }) => (
    <tr className="border-b border-zinc-100 dark:border-zinc-800">
      <td className="py-1.5 pr-4 text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{label}</td>
      <td className="py-1.5 text-xs font-mono text-zinc-900 dark:text-zinc-100">{value}</td>
      <td className="py-1.5 pl-4">
        <CopyBtn id={label} text={value} />
      </td>
    </tr>
  )

  if (firmware === 'propertycore') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          PropertyCore modules boot into AP mode on first use. Follow these steps to connect the device to this hub.
        </p>
        <ol className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
          <li className="flex gap-3">
            <span className="shrink-0 w-5 h-5 rounded-full bg-brand/15 text-brand text-xs flex items-center justify-center font-bold">1</span>
            <span>Power on the device. It will broadcast a Wi-Fi hotspot named <strong className="font-mono">PC-RLY-XXXXXX</strong> (open network, no password).</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-5 h-5 rounded-full bg-brand/15 text-brand text-xs flex items-center justify-center font-bold">2</span>
            <span>Connect your phone or laptop to that network.</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-5 h-5 rounded-full bg-brand/15 text-brand text-xs flex items-center justify-center font-bold">3</span>
            <span>Open a browser and go to <strong className="font-mono">http://192.168.4.1</strong></span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-5 h-5 rounded-full bg-brand/15 text-brand text-xs flex items-center justify-center font-bold">4</span>
            <span>Fill in the configuration form with these values:</span>
          </li>
        </ol>
        <table className="w-full mt-1">
          <tbody>
            <Row label="Device ID"   value={deviceId} />
            <Row label="Hub IP"      value={hubIp} />
            <Row label="Wi-Fi SSID"  value="(your network name)" />
            <Row label="Wi-Fi Pass"  value="(your network password)" />
          </tbody>
        </table>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          After submitting, the device will reboot, join Wi-Fi, and connect to this hub automatically.
          Then click <strong>Register & Wait →</strong>.
        </p>
      </div>
    )
  }

  if (firmware === 'tasmota') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Paste this command in the Tasmota <strong>Console</strong> (Configuration → Console):
        </p>
        <CodeBlock id="tasmota" text={tasmotaCmd} />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Or go to <strong>Configuration → Configure MQTT</strong> and set Host to <code className="font-mono">{hubIp}</code>, Port to <code className="font-mono">1883</code>, Client to <code className="font-mono">{deviceId}</code>, Topic to <code className="font-mono">propertycore/devices/{deviceId}</code>.
        </p>
      </div>
    )
  }

  if (firmware === 'esphome') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Add this MQTT block to your ESPHome <code className="font-mono">.yaml</code> configuration:
        </p>
        <CodeBlock id="esphome" text={esphomeYaml} />
        <div className="flex gap-2">
          <button onClick={onDownloadYaml} className="btn-ghost text-xs px-3 py-1.5">
            ⬇ Download .yaml
          </button>
          <CopyBtn id="esphome-copy" text={esphomeYaml} />
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Then run: <code className="font-mono">esphome run your-device.yaml</code>
        </p>
      </div>
    )
  }

  if (firmware === 'shelly') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Open the Shelly device web UI and go to <strong>Settings → MQTT</strong>. Enable MQTT and set:
        </p>
        <table className="w-full mt-1">
          <tbody>
            <Row label="Server"      value={`${hubIp}:1883`} />
            <Row label="Client ID"   value={deviceId} />
            <Row label="Topic prefix" value={`propertycore/devices/${deviceId}`} />
          </tbody>
        </table>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          For Shelly Gen2/3 devices, use the RPC API or the mobile app → Settings → MQTT.
          The state topic will automatically publish to <code className="font-mono">propertycore/devices/{deviceId}/state</code>.
        </p>
      </div>
    )
  }

  if (firmware === 'zigbee') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Zigbee devices are onboarded via <strong>Zigbee2MQTT</strong> running on this hub.
        </p>
        <ol className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
          <li className="flex gap-3">
            <span className="shrink-0 w-5 h-5 rounded-full bg-brand/15 text-brand text-xs flex items-center justify-center font-bold">1</span>
            <span>Ensure Zigbee2MQTT is running. Check the System → Integrations page.</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-5 h-5 rounded-full bg-brand/15 text-brand text-xs flex items-center justify-center font-bold">2</span>
            <span>Put the Zigbee device in pairing mode (typically hold the button for 5 seconds until the LED flashes).</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-5 h-5 rounded-full bg-brand/15 text-brand text-xs flex items-center justify-center font-bold">3</span>
            <span>Zigbee2MQTT will interview the device and publish its state to the bridge topic. The pc-bridge-zigbee service translates this to <code className="font-mono">propertycore/devices/{deviceId}/state</code>.</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-5 h-5 rounded-full bg-brand/15 text-brand text-xs flex items-center justify-center font-bold">4</span>
            <span>Map the Zigbee IEEE address to Device ID <strong className="font-mono">{deviceId}</strong> in the bridge config.</span>
          </li>
        </ol>
      </div>
    )
  }

  if (firmware === 'tuya') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Tuya Local devices require extracting the local key. This is a one-time setup per device.
        </p>
        <ol className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
          <li className="flex gap-3">
            <span className="shrink-0 w-5 h-5 rounded-full bg-brand/15 text-brand text-xs flex items-center justify-center font-bold">1</span>
            <span>Pair the device with the Tuya/Smart Life app first to provision its Wi-Fi.</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-5 h-5 rounded-full bg-brand/15 text-brand text-xs flex items-center justify-center font-bold">2</span>
            <span>Run <code className="font-mono">python3 -m tinytuya wizard</code> on the hub to scan local devices and extract keys.</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-5 h-5 rounded-full bg-brand/15 text-brand text-xs flex items-center justify-center font-bold">3</span>
            <span>Configure the <strong>pc-bridge-tuya</strong> service with the device IP, key, and Device ID <strong className="font-mono">{deviceId}</strong>. It will bridge to <code className="font-mono">propertycore/devices/{deviceId}/state</code>.</span>
          </li>
        </ol>
      </div>
    )
  }

  // manual / other
  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Configure your device to publish its state to the following MQTT topic:
      </p>
      <table className="w-full">
        <tbody>
          <Row label="State topic"   value={`propertycore/devices/${deviceId}/state`} />
          <Row label="Command topic" value={`propertycore/devices/${deviceId}/cmd`} />
          <Row label="Broker"        value={`${hubIp}:1883`} />
        </tbody>
      </table>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">State payload format:</p>
      <CodeBlock id="manual" text={`{"type":"${deviceType}","online":true,"ch1":false}`} />
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        The engine will accept any JSON keys in the state payload — they will be stored and forwarded to the dashboard.
      </p>
    </div>
  )
}

// ─── Step 4: Waiting for first MQTT message ───────────────────────────────────

function StepWaiting({
  deviceId, status, firstState, onRetry,
}: {
  deviceId: string
  status: 'waiting' | 'connected' | 'timeout'
  firstState: Record<string, unknown> | null
  onRetry: () => void
}) {
  if (status === 'connected') {
    return (
      <div className="text-center py-6">
        <div className="text-4xl mb-3">✅</div>
        <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Device connected!</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
          <code className="font-mono">{deviceId}</code> sent its first state message.
        </p>
        {firstState && (
          <div className="text-left">
            <p className="text-xs text-zinc-400 mb-1">First state payload:</p>
            <pre className="text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700
                            rounded-md p-3 text-zinc-700 dark:text-zinc-300 overflow-x-auto">
              {JSON.stringify(firstState, null, 2)}
            </pre>
          </div>
        )}
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-4">Click <strong>Continue →</strong> to finish.</p>
      </div>
    )
  }

  if (status === 'timeout') {
    return (
      <div className="text-center py-6">
        <div className="text-4xl mb-3">⏱️</div>
        <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Timed out</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
          The device did not connect within 5 minutes. Check the device is powered on and the Wi-Fi credentials are correct.
        </p>
        <button onClick={onRetry} className="btn-ghost text-sm px-4 py-1.5">
          Try Again
        </button>
        <p className="text-xs text-zinc-400 mt-3">Or click <strong>Skip →</strong> to register without waiting.</p>
      </div>
    )
  }

  // waiting
  return (
    <div className="text-center py-6">
      <div className="text-4xl mb-3 animate-spin inline-block">⟳</div>
      <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Waiting for device…</p>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
        Listening for the first message from <code className="font-mono">{deviceId}</code> on the MQTT broker.
      </p>
      <p className="text-xs text-zinc-400">Timeout in 5 minutes. You can skip if the device is not ready yet.</p>
    </div>
  )
}

// ─── Step 5: Confirm ──────────────────────────────────────────────────────────

function StepDone({
  deviceId, name, deviceType, firmware, areas, areaId, connected,
}: {
  deviceId: string
  name: string
  deviceType: DeviceType
  firmware: FirmwareType
  areas: Area[]
  areaId: string
  connected: boolean
}) {
  const areaName = areas.find((a) => a.id === areaId)?.name ?? 'Unassigned'
  const firmwareLabel = FIRMWARE_OPTIONS.find((f) => f.value === firmware)?.label ?? firmware
  const typeLabel = DEVICE_TYPES.find((t) => t.value === deviceType)?.label ?? deviceType

  return (
    <div className="py-2">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🎉</span>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Device registered{connected ? ' and connected' : ''}.
        </p>
      </div>

      {/* Device summary card */}
      <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{name}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium
            ${connected
              ? 'bg-brand/10 text-brand dark:bg-brand/15 dark:text-brand-400'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
            }`}
          >
            {connected ? '● Online' : '○ Offline'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <span>ID</span>            <code className="font-mono text-zinc-700 dark:text-zinc-300">{deviceId}</code>
          <span>Type</span>          <span className="text-zinc-700 dark:text-zinc-300">{typeLabel}</span>
          <span>Firmware</span>      <span className="text-zinc-700 dark:text-zinc-300">{firmwareLabel}</span>
          <span>Area</span>          <span className="text-zinc-700 dark:text-zinc-300">{areaName}</span>
        </div>
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-4">
        The device will appear in the Devices list. Click <strong>Done</strong> to close this wizard, or use the <strong>Configure</strong> button in the list to set up channel labels and load types.
      </p>
    </div>
  )
}
