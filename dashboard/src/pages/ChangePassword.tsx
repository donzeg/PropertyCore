import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeSlash } from '@phosphor-icons/react'
import { changeAdminPassword } from '../api'

export default function ChangePassword() {
  const navigate = useNavigate()
  const accountId = localStorage.getItem('pc-admin-id') ?? ''

  const [password,        setPassword]        = useState('')
  const [confirm,         setConfirm]         = useState('')
  const [showPassword,    setShowPassword]    = useState(false)
  const [showConfirm,     setShowConfirm]     = useState(false)
  const [error,           setError]           = useState<string | null>(null)
  const [loading,         setLoading]         = useState(false)

  const valid = password.length >= 8 && password === confirm

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setLoading(true)
    setError(null)
    try {
      await changeAdminPassword(accountId, password)
      navigate('/overview', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password.')
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
            Change Password
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 text-center">
            Your account uses the default password.<br />Set a new password to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4" noValidate>

          {/* New password */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                autoFocus
                className="input pr-10"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null) }}
                placeholder="Minimum 8 characters"
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

          {/* Confirm password */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                className="input pr-10"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setError(null) }}
                placeholder="Re-enter new password"
                disabled={loading}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3
                           text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                {showConfirm
                  ? <EyeSlash size={16} weight="regular" />
                  : <Eye      size={16} weight="regular" />}
              </button>
            </div>
            {confirm && password !== confirm && (
              <p className="text-xs text-red-500 dark:text-red-400 mt-1">Passwords do not match.</p>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !valid}
            className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving…' : 'Set New Password'}
          </button>

        </form>
      </div>
    </div>
  )
}
