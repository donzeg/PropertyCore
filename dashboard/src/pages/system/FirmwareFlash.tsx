import { useEffect, useState } from 'react'
import { WarningCircle, ArrowSquareOut, CheckCircle, WifiHigh, DownloadSimple, Lock } from '@phosphor-icons/react'

// Tell TypeScript about the custom element injected by esp-web-tools
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'esp-web-install-button': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & { manifest: string },
        HTMLElement
      >
    }
  }
}

interface SkuCard {
  sku: string
  label: string
  channels: number
  description: string
  manifest: string
  appBin: string
  useCases: string
}

const SKUS: SkuCard[] = [
  {
    sku: 'PC-RLY-1CH-W',
    label: '1-Channel Relay',
    channels: 1,
    description: 'Single load control — lighting, fan, or appliance.',
    manifest: 'firmware/manifest-1ch.json',
    appBin: 'pc-rly-1ch.bin',
    useCases: 'Single light, ceiling fan, water pump',
  },
  {
    sku: 'PC-RLY-2CH-W',
    label: '2-Channel Relay',
    channels: 2,
    description: 'Two independent loads on one module.',
    manifest: 'firmware/manifest-2ch.json',
    appBin: 'pc-rly-2ch.bin',
    useCases: 'Two lights, bedside lamps, bathroom + mirror',
  },
  {
    sku: 'PC-RLY-4CH-W',
    label: '4-Channel Relay',
    channels: 4,
    description: 'Four independent loads — most common room module.',
    manifest: 'firmware/manifest-4ch.json',
    appBin: 'pc-rly-4ch.bin',
    useCases: 'Living room lighting zones, hotel room circuits',
  },
  {
    sku: 'PC-RLY-6CH-W',
    label: '6-Channel Relay',
    channels: 6,
    description: 'Six independent loads for larger spaces.',
    manifest: 'firmware/manifest-6ch.json',
    appBin: 'pc-rly-6ch.bin',
    useCases: 'Open-plan lighting, multi-zone curtain + light combos',
  },
]

const NVS_STEPS = [
  {
    title: 'Open Serial Monitor',
    content: (
      <>
        In a terminal (with ESP-IDF sourced), run:{' '}
        <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-xs font-mono">
          idf.py -p /dev/ttyUSB0 monitor
        </code>
      </>
    ),
  },
  {
    title: 'Wait for boot log',
    content:
      'The device will print its boot log and end with "NVS keys not set — using compile-time defaults". You can now send NVS commands.',
  },
  {
    title: 'Set device ID',
    content: (
      <>
        Type and press Enter:{' '}
        <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-xs font-mono">
          set_nvs device_id relay-bedroom-01
        </code>
        <br />
        <span className="text-zinc-500 text-xs">Use a unique ID per device (no spaces).</span>
      </>
    ),
  },
  {
    title: 'Set Wi-Fi credentials',
    content: (
      <>
        <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-xs font-mono block mb-1">
          set_nvs wifi_ssid YourNetworkName
        </code>
        <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-xs font-mono block">
          set_nvs wifi_pass YourPassword
        </code>
      </>
    ),
  },
  {
    title: 'Set MQTT broker IP',
    content: (
      <>
        <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-xs font-mono">
          set_nvs broker_ip 192.168.1.100
        </code>
        <br />
        <span className="text-zinc-500 text-xs">Use the hub's LAN IP address.</span>
      </>
    ),
  },
  {
    title: 'Reboot',
    content: (
      <>
        <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-xs font-mono">
          restart
        </code>
        <span className="text-zinc-500 text-xs ml-2">
          or press the reset button on the board.
        </span>
        <br />
        <span className="text-zinc-500 text-xs">
          The device will connect to Wi-Fi, connect to MQTT, and appear in Devices automatically.
        </span>
      </>
    ),
  },
]

function ChromeWarning() {
  const isChrome =
    /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)

  if (isChrome) return null

  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-600 dark:bg-amber-900/20">
      <WarningCircle size={20} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div>
        <p className="font-medium text-amber-800 dark:text-amber-300">
          Google Chrome required
        </p>
        <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-400">
          ESP Web Tools uses the Web Serial API which is only supported in Chrome and Edge. Open
          this page in Chrome to flash devices.
        </p>
      </div>
    </div>
  )
}

function HttpsWarning() {
  const isSecure =
    window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'

  if (isSecure) return null

  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-600 dark:bg-amber-900/20">
      <Lock size={20} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="flex-1">
        <p className="font-medium text-amber-800 dark:text-amber-300">
          HTTPS required for browser flashing
        </p>
        <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-400">
          Chrome's Web Serial API only works on <strong>HTTPS</strong> or <strong>localhost</strong>.
          You're on <code className="font-mono text-xs">{window.location.protocol}//{window.location.hostname}</code> so
          the Flash buttons are disabled.
        </p>
        <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
          <strong>Option 1 (quickest):</strong> Download the firmware files below and flash using
          the{' '}
          <a
            href="https://espressif.github.io/esptool-js/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-amber-900 dark:hover:text-amber-200 inline-flex items-center gap-0.5"
          >
            Espressif web flasher <ArrowSquareOut size={12} className="inline" />
          </a>
          {' '}(runs on HTTPS).
        </p>
        <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
          <strong>Option 2:</strong> Flash via command line with{' '}
          <code className="font-mono text-xs bg-amber-100 dark:bg-amber-900/40 px-1 rounded">
            esptool.py
          </code>{' '}
          — see manual flash instructions below.
        </p>
        <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
          <strong>Option 3 (permanent fix):</strong> Configure HTTPS on the hub's nginx — then
          the Flash buttons will work directly on this page.
        </p>
      </div>
    </div>
  )
}

function SkuCardRow({ sku }: { sku: SkuCard }) {
  const dots = Array.from({ length: sku.channels }, (_, i) => i)
  const basePath = 'firmware/'

  return (
    <div className="card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Left — info */}
      <div className="flex items-start gap-4 min-w-0">
        {/* Channel dots */}
        <div className="flex flex-col gap-1 pt-1 shrink-0">
          {dots.map((d) => (
            <span
              key={d}
              className="h-3 w-3 rounded-full bg-emerald-500 dark:bg-emerald-400"
              title={`Channel ${d + 1}`}
            />
          ))}
        </div>
        <div className="min-w-0">
          <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{sku.sku}</p>
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">{sku.label}</p>
          <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">{sku.description}</p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            <WifiHigh size={12} className="inline mr-1 -mt-0.5" />
            {sku.useCases}
          </p>
        </div>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Download (always available) */}
        <a
          href={`${basePath}${sku.appBin}`}
          download
          className="btn-ghost flex items-center gap-1.5 text-sm"
          title="Download firmware binary"
        >
          <DownloadSimple size={15} />
          Download
        </a>

        {/* Flash via browser (HTTPS only) */}
        {/* @ts-ignore — custom element from esp-web-tools */}
        <esp-web-install-button manifest={sku.manifest}>
          <button slot="activate" className="btn-primary whitespace-nowrap">
            Flash via USB
          </button>
          <span slot="unsupported" className="text-xs text-zinc-400 dark:text-zinc-500 italic">
            Needs Chrome
          </span>
        </esp-web-install-button>
      </div>
    </div>
  )
}

function ManualFlash() {
  const [open, setOpen] = useState(false)

  return (
    <section>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
      >
        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
          Manual flash with esptool (no browser required)
        </span>
        <span className="text-sm text-zinc-500">{open ? 'Hide' : 'Show'}</span>
      </button>

      {open && (
        <div className="mt-2 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
          <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
            Download the firmware files above, then flash using <code className="font-mono text-xs bg-zinc-100 dark:bg-zinc-800 px-1 rounded">esptool.py</code>{' '}
            from the command line. Replace <code className="font-mono text-xs bg-zinc-100 dark:bg-zinc-800 px-1 rounded">/dev/ttyUSB0</code> with your port
            (Windows: <code className="font-mono text-xs bg-zinc-100 dark:bg-zinc-800 px-1 rounded">COM3</code> etc).
          </p>
          <code className="block bg-zinc-900 dark:bg-zinc-950 text-emerald-400 text-xs font-mono rounded-lg p-4 leading-relaxed overflow-x-auto whitespace-pre">
{`pip install esptool

# Download: bootloader-Xch.bin, partition-table-Xch.bin, pc-rly-Xch.bin
# (where X = 1, 2, 4, or 6 for your board)

esptool.py --chip esp32 -p /dev/ttyUSB0 -b 460800 \\
  --before default_reset --after hard_reset write_flash \\
  --flash_mode dio --flash_size 2MB --flash_freq 40m \\
  0x1000  bootloader-4ch.bin \\
  0x8000  partition-table-4ch.bin \\
  0x10000 pc-rly-4ch.bin`}
          </code>
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Alternatively use the{' '}
            <a
              href="https://espressif.github.io/esptool-js/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand underline hover:text-brand-600 inline-flex items-center gap-0.5"
            >
              Espressif web flasher <ArrowSquareOut size={11} className="inline" />
            </a>{' '}
            — upload all 3 files with their respective offsets (0x1000, 0x8000, 0x10000).
          </p>
        </div>
      )}
    </section>
  )
}

function NvsSetup() {
  const [open, setOpen] = useState(false)

  return (
    <section>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
      >
        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
          After flashing — configure the device
        </span>
        <span className="text-sm text-zinc-500">{open ? 'Hide' : 'Show steps'}</span>
      </button>

      {open && (
        <div className="mt-2 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            After flashing, the device will boot with default settings. You must set a unique
            device ID, Wi-Fi credentials, and the hub's broker IP via the serial console. These
            values are stored in NVS (non-volatile storage) and survive firmware updates.
          </p>
          <ol className="space-y-4">
            {NVS_STEPS.map((step, idx) => (
              <li key={idx} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                  {idx + 1}
                </span>
                <div>
                  <p className="font-medium text-zinc-800 dark:text-zinc-200">{step.title}</p>
                  <div className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                    {step.content}
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex items-start gap-2 rounded bg-emerald-50 px-3 py-2 dark:bg-emerald-900/20">
            <CheckCircle size={16} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <p className="text-xs text-emerald-800 dark:text-emerald-300">
              Once rebooted, the device connects to MQTT and auto-registers in the Devices page
              within a few seconds.
            </p>
          </div>
        </div>
      )}
    </section>
  )
}

export default function FirmwareFlash() {
  const [scriptLoaded, setScriptLoaded] = useState(false)

  useEffect(() => {
    if (document.querySelector('script[data-esp-web-tools]')) {
      setScriptLoaded(true)
      return
    }
    const script = document.createElement('script')
    script.type = 'module'
    script.src = 'https://unpkg.com/esp-web-tools@10/dist/web/install-button.js'
    script.setAttribute('data-esp-web-tools', 'true')
    script.onload = () => setScriptLoaded(true)
    document.head.appendChild(script)
  }, [])

  return (
    <div className="p-8 max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Firmware Flash</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Flash PropertyCore firmware to ESP32 relay modules via USB.
          Connect the device to this computer before clicking Flash.
        </p>
      </div>

      {/* Banners */}
      <HttpsWarning />
      <ChromeWarning />

      {/* Connection instructions */}
      <div className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
        <ArrowSquareOut size={18} className="mt-0.5 shrink-0 text-zinc-500" />
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Connect the ESP32 board via USB. Hold the{' '}
          <span className="font-medium">BOOT</span> button while clicking Flash, then release
          it when prompted. The flash process takes ~30 seconds.
        </p>
      </div>

      {/* SKU cards */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          Select firmware variant
        </h2>
        {SKUS.map((sku) => (
          <SkuCardRow key={sku.sku} sku={sku} />
        ))}
      </section>

      {/* Manual flash */}
      <ManualFlash />

      {/* Post-flash NVS config */}
      <NvsSetup />

      {/* Loader note */}
      {!scriptLoaded && (
        <p className="text-xs text-zinc-400 dark:text-zinc-600">
          Loading ESP Web Tools…
        </p>
      )}
    </div>
  )
}
