import { getEspHomeUrl } from '../../api'

export default function EspHomeBuilder() {
  const url = getEspHomeUrl()

  return (
    <div className="h-[calc(100vh-3rem)]">
      <div className="h-full overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <iframe
          title="ESPHome Builder"
          src={url}
          className="h-full w-full"
          loading="eager"
        />
      </div>
    </div>
  )
}
