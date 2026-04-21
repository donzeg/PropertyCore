import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeSlash } from '@phosphor-icons/react'

export default function Login() {
  const navigate = useNavigate()

  const [username,     setUsername]     = useState('')
  const [password,     setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [loading,      setLoading]      = useState(false)

  useEffect(() => {
    if (localStorage.getItem('pc-admin-token')) {
      navigate('/overview', { replace: true })
    }
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })
      if (!res.ok) {
        setError('Invalid username or password.')
        setPassword('')
      } else {
        const data = await res.json()
        localStorage.setItem('pc-admin-token', data.token)
        localStorage.setItem('pc-admin-id',    data.account.id)
        navigate('/overview', { replace: true })
      }
    } catch {
      setError('Connection error. Is the engine running?')
    } finally {
      setLoading(false)
    }
  }

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
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Configuration Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4" noValidate>
          {/* Username */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Username
            </label>
            <input
              type="text"
              autoComplete="username"
              autoFocus
              className="input"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(null) }}
              placeholder="admin"
              disabled={loading}
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className="input pr-10"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null) }}
                placeholder="••••••••"
                disabled={loading}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3
                           text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                {showPassword
                  ? <EyeSlash size={16} weight="regular" />
                  : <Eye      size={16} weight="regular" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="text-center text-xs text-zinc-400 dark:text-zinc-600">
            Default: admin / propertycore
          </p>
        </form>
      </div>
    </div>
  )
}

