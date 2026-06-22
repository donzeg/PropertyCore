import { getZigbee2MQTTUrl } from '../../api'

export default function Zigbee2MQTT() {
  const url = getZigbee2MQTTUrl()

  return (
    <div className="h-[calc(100vh-3rem)] space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Zigbee2MQTT</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Manage Zigbee coordinator pairing and device interviews here. PropertyCore discovery bridging is the next layer on top of this service.
        </p>
      </div>
      <div className="h-[calc(100%-4rem)] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <iframe
          title="Zigbee2MQTT"
          src={url}
          className="h-full w-full"
          loading="eager"
        />
      </div>
    </div>
  )
}
