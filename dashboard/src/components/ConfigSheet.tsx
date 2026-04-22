import { X } from '@phosphor-icons/react'

interface Props {
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
}

export default function ConfigSheet({ title, subtitle, onClose, children }: Props) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 dark:bg-black/60 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-[540px] max-w-[95vw] flex flex-col
                      bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800
                      z-50 shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-zinc-200
                        dark:border-zinc-800 flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
            {subtitle && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200
                       hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ml-4 flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </>
  )
}
