import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Backspace } from '@phosphor-icons/react'
import { getUsers } from '../api'
import type { User } from '../types'

const MAX_ATTEMPTS = 5
const PIN_LENGTH   = 6

// ─── Login page ───────────────────────────────────────────────────────────────

export default function Login() {
  const navigate = useNavigate()

  const [users,       setUsers]       = useState<User[]>([])
  const [selectedId,  setSelectedId]  = useState<string>('')
  const [pin,         setPin]         = useState('')
  const [attempts,    setAttempts]    = useState(0)
  const [error,       setError]       = useState<string | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [locked,      setLocked]      = useState(false)

  useEffect(() => {
    // Redirect if already authenticated
    if (localStorage.getItem('pc-token')) {
      navigate('/overview', { replace: true })
      return
    }
    getUsers().catch(() => []).then((u) => {
      setUsers(u as User[])
      if ((u as User[]).length > 0) setSelectedId((u as User[])[0].id)
    })
  }, [navigate])

  const handleDigit = (d: string) => {
    if (locked || pin.length >= PIN_LENGTH) return
    setPin((p) => p + d)
    setError(null)
  }

  const handleBackspace = () => {
    if (locked) return
    setPin((p) => p.slice(0, -1))
    setError(null)
  }

  const handleSubmit = async () => {
    if (loading || locked || pin.length < PIN_LENGTH || !selectedId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      if (!res.ok) {
        const newAttempts = attempts + 1
        setAttempts(newAttempts)
        if (newAttempts >= MAX_ATTEMPTS) {
          setLocked(true)
          setError(`Too many failed attempts. Please contact your administrator.`)
        } else {
          setError(`Incorrect PIN. ${MAX_ATTEMPTS - newAttempts} attempt${MAX_ATTEMPTS - newAttempts === 1 ? '' : 's'} remaining.`)
        }
        setPin('')
      } else {
        const data = await res.json()
        localStorage.setItem('pc-token',   data.token)
        localStorage.setItem('pc-user-id', selectedId)
        navigate('/overview', { replace: true })
      }
    } catch {
      setError('Connection error. Is the engine running?')
    } finally {
      setLoading(false)
    }
  }

  // Auto-submit when PIN is complete
  useEffect(() => {
    if (pin.length === PIN_LENGTH && !loading && !locked) {
      handleSubmit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin])

  const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', null, '0', 'back']

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand flex items-center justify-center
                          text-white text-2xl font-bold shadow-lg shadow-brand/25 mb-4">
            P
          </div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight">
            PropertyCore
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Engineer Login</p>
        </div>

        <div className="card space-y-5">
          {/* User select */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Login as
            </label>
            {users.length === 0 ? (
              <p className="text-xs text-zinc-400">Loading users…</p>
            ) : (
              <select
                className="input"
                value={selectedId}
                onChange={(e) => { setSelectedId(e.target.value); setPin(''); setError(null) }}
                disabled={locked}
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* PIN dots */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-3">
              PIN
            </label>
            <div className="flex justify-center gap-3 mb-4">
              {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    i < pin.length
                      ? 'bg-brand'
                      : 'bg-zinc-200 dark:bg-zinc-700'
                  }`}
                />
              ))}
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-2">
              {DIGITS.map((d, i) => {
                if (d === null) return <div key={i} />
                if (d === 'back') return (
                  <button
                    key="back"
                    onClick={handleBackspace}
                    disabled={locked || pin.length === 0}
                    className="h-12 rounded-xl flex items-center justify-center
                               text-zinc-500 dark:text-zinc-400
                               hover:bg-zinc-100 dark:hover:bg-zinc-800
                               disabled:opacity-30 disabled:cursor-not-allowed
                               transition-colors"
                  >
                    <Backspace size={18} weight="regular" />
                  </button>
                )
                return (
                  <button
                    key={d}
                    onClick={() => handleDigit(d)}
                    disabled={locked || loading}
                    className="h-12 rounded-xl font-semibold text-lg
                               text-zinc-800 dark:text-zinc-200
                               bg-zinc-100 dark:bg-zinc-800
                               hover:bg-zinc-200 dark:hover:bg-zinc-700
                               disabled:opacity-30 disabled:cursor-not-allowed
                               transition-colors active:scale-95"
                  >
                    {d}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-500 dark:text-red-400 text-center">{error}</p>
          )}

          {/* Loading indicator */}
          {loading && (
            <p className="text-xs text-zinc-400 text-center">Verifying…</p>
          )}
        </div>
      </div>
    </div>
  )
}
