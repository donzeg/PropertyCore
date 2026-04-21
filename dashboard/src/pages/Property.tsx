import { useEffect, useState } from 'react'
import { getProperty, updateProperty } from '../api'
import type { Property, PropertyType } from '../types'

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: 'hotel',     label: 'Hotel' },
  { value: 'home',      label: 'Private Home' },
  { value: 'apartment', label: 'Apartment / Flat' },
  { value: 'office',    label: 'Office' },
  { value: 'estate',    label: 'Estate / Complex' },
]

const TIMEZONES = [
  'Africa/Lagos',
  'Africa/Abuja',
  'Africa/Accra',
  'Africa/Nairobi',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'America/Toronto',
  'Asia/Dubai',
  'Asia/Riyadh',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'UTC',
]

export default function PropertyPage() {
  const [data,    setData]    = useState<Property | null>(null)
  const [form,    setForm]    = useState({ name: '', address: '', type: 'home' as PropertyType, timezone: 'Africa/Lagos' })
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    getProperty()
      .then((p) => {
        setData(p)
        setForm({ name: p.name, address: p.address ?? '', type: p.type, timezone: p.timezone || 'Africa/Lagos' })
      })
      .catch(() => setError('Failed to load property settings.'))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const updated = await updateProperty({ name: form.name, address: form.address, type: form.type, timezone: form.timezone })
      setData(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-white mb-1">Property</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        Basic information about this installation.
      </p>

      <div className="card space-y-5">
        {/* Property name */}
        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Property name
          </label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Lagos Luxury Suites"
          />
        </div>

        {/* Address */}
        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Address <span className="text-zinc-400 font-normal">(optional)</span>
          </label>
          <input
            className="input"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            placeholder="e.g. 12 Eko Atlantic, Lagos"
          />
        </div>

        {/* Property type */}
        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Property type
          </label>
          <select
            className="input"
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as PropertyType }))}
          >
            {PROPERTY_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          {form.type === 'hotel' && (
            <p className="mt-1.5 text-xs text-brand dark:text-brand-400">
              Hospitality features will appear in the sidebar.
            </p>
          )}
        </div>

        {/* Timezone */}
        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Timezone
          </label>
          <select
            className="input"
            value={form.timezone}
            onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>

        {/* Last updated */}
        {data?.updated_at && (
          <p className="text-xs text-zinc-400 dark:text-zinc-600">
            Last updated {new Date(data.updated_at).toLocaleString()}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {saved && (
            <span className="text-xs text-brand dark:text-brand-400 font-medium">Saved ✓</span>
          )}
          {error && (
            <span className="text-xs text-red-500">{error}</span>
          )}
        </div>
      </div>
    </div>
  )
}
