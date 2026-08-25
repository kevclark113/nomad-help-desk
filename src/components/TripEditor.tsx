import { useEffect, useState } from 'react'
import type { Trip } from '../lib/types'
import { isValidISODate, daysBetween, todayISO } from '../lib/dateUtils'
import { SCHENGEN_COUNTRIES } from '../lib/schengenCountries'
import { color } from '../theme/tokens'
import { Button, Field, SelectField } from '../theme/components/ui'

/**
 * Add/edit form for a single trip. Native date inputs give us `YYYY-MM-DD`
 * values directly — the exact shape we store, no conversion needed.
 */
export function TripEditor({
  editing,
  onSubmit,
  onCancel,
}: {
  editing: Trip | null
  onSubmit: (trip: Omit<Trip, 'id'>) => void | Promise<void>
  onCancel?: () => void
}) {
  const [entryDate, setEntryDate] = useState('')
  const [exitDate, setExitDate] = useState('')
  const [note, setNote] = useState('')
  const [countryCode, setCountryCode] = useState('')

  useEffect(() => {
    setEntryDate(editing?.entryDate ?? '')
    setExitDate(editing?.exitDate ?? '')
    setNote(editing?.note ?? '')
    setCountryCode(editing?.countryCode ?? '')
  }, [editing])

  const validDates = isValidISODate(entryDate) && isValidISODate(exitDate)
  const orderOk = validDates && daysBetween(entryDate, exitDate) >= 0
  const canSave = validDates && orderOk

  let error: string | null = null
  if (validDates && !orderOk) error = 'Exit date is before entry date.'

  function submit() {
    if (!canSave) return
    onSubmit({
      entryDate,
      exitDate,
      note: note.trim() || undefined,
      countryCode: countryCode || undefined,
    })
    if (!editing) {
      setEntryDate('')
      setExitDate('')
      setNote('')
      setCountryCode('')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Field
          label="Entry date"
          type="date"
          value={entryDate}
          max={exitDate || undefined}
          onChange={(e) => setEntryDate(e.target.value)}
          style={{ flex: '1 1 140px' }}
        />
        <Field
          label="Exit date"
          type="date"
          value={exitDate}
          min={entryDate || undefined}
          onChange={(e) => setExitDate(e.target.value)}
          style={{ flex: '1 1 140px' }}
        />
      </div>
      <SelectField
        label="Country (optional)"
        value={countryCode}
        onChange={(e) => setCountryCode(e.target.value)}
      >
        <option value="">— Select a Schengen country —</option>
        {SCHENGEN_COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </SelectField>
      <Field
        label="Note (optional)"
        type="text"
        placeholder="e.g. Portugal trip"
        value={note}
        maxLength={80}
        onChange={(e) => setNote(e.target.value)}
      />

      {error && <span style={{ color: color.coral, fontSize: 12 }}>{error}</span>}

      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="chip" onClick={submit} disabled={!canSave} style={{ opacity: canSave ? 1 : 0.5 }}>
          {editing ? 'Save changes' : 'Add Trip'}
        </Button>
        {editing && onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        {!editing && (
          <Button
            variant="chipTeal"
            onClick={() => {
              setEntryDate(todayISO())
              setExitDate(todayISO())
            }}
          >
            Today
          </Button>
        )}
      </div>
    </div>
  )
}
