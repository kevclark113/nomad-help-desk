import { useState } from 'react'
import type { NewTrip, Trip } from './lib/types'
import { schengenStatus } from './lib/schengen'
import { todayISO } from './lib/dateUtils'
import { useTripStore } from './lib/useTripStore'
import { color, type } from './theme/tokens'
import { StatusCard } from './theme/components/StatusCard'
import { Panel } from './theme/components/ui'
import { TripEditor } from './components/TripEditor'
import { TripsList } from './components/TripsList'
import { PlanTrip } from './components/PlanTrip'
import { AccountPanel } from './components/AccountPanel'
import { GmailConnect } from './components/GmailConnect'
import { InviteAccept } from './components/InviteAccept'
import { InvitesPanel } from './components/InvitesPanel'
import { MapView } from './components/MapView'
import { firebaseEnabled } from './lib/firebase'

type View = 'tracker' | 'map'

function TabBar({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const tabs: { id: View; label: string }[] = [
    { id: 'tracker', label: 'Tracker' },
    { id: 'map', label: 'Map' },
  ]
  return (
    <div style={{ display: 'flex', gap: 8, padding: '0 4px' }}>
      {tabs.map((t) => {
        const active = view === t.id
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            aria-pressed={active}
            style={{
              font: 'inherit',
              fontSize: 14,
              fontWeight: 700,
              padding: '8px 18px',
              borderRadius: 999,
              cursor: 'pointer',
              border: '1px solid rgba(255,255,255,0.14)',
              background: active ? color.cobalt : 'transparent',
              color: active ? color.paper : color.muted,
            }}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

export default function App() {
  const { trips, addTrip, updateTrip, deleteTrip } = useTripStore()
  const [editing, setEditing] = useState<Trip | null>(null)
  const [view, setView] = useState<View>('tracker')

  const today = todayISO()
  const status = schengenStatus(trips, today)

  async function handleSubmit(data: NewTrip) {
    if (editing) {
      await updateTrip(editing.id, data)
      setEditing(null)
    } else {
      await addTrip(data)
    }
  }

  return (
    <div
      style={{
        width: '100%',
        // The map wants more room (easier to see + click smaller countries);
        // the tracker stays a comfortable reading width.
        maxWidth: view === 'map' ? 1040 : 760,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <header style={{ padding: '0 4px' }}>
        <p style={{ margin: 0, color: color.marigold, fontWeight: 700, letterSpacing: '0.02em' }}>
          Nomad Help Desk
        </p>
        <h1 style={{ fontFamily: type.display, fontSize: 22, margin: '2px 0 0', fontWeight: 700 }}>
          {view === 'map' ? 'Visited Map' : 'Schengen Tracker'}
        </h1>
      </header>

      {firebaseEnabled && <InviteAccept />}

      <TabBar view={view} onChange={setView} />

      {view === 'map' ? (
        <MapView />
      ) : (
        <>
          <StatusCard status={status} asOf={today} />

          {/* Forms span the full card width. */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Panel>
              <h2 className="panel-heading" style={{ fontSize: 20, margin: '0 0 12px', color: color.paper }}>
                {editing ? 'Edit Trip' : 'Add a Trip'}
              </h2>
              <TripEditor editing={editing} onSubmit={handleSubmit} onCancel={() => setEditing(null)} />
            </Panel>

            <Panel>
              <h2 className="panel-heading" style={{ fontSize: 20, margin: '0 0 12px', color: color.paper }}>
                Your Trips
              </h2>
              <TripsList
                trips={trips}
                violationDate={status.projectedViolationDate}
                onEdit={setEditing}
                onDelete={async (id) => {
                  if (editing?.id === id) setEditing(null)
                  await deleteTrip(id)
                }}
              />
            </Panel>

            <Panel>
              <h2 className="panel-heading" style={{ fontSize: 20, margin: '0 0 12px', color: color.paper }}>
                Plan a Trip
              </h2>
              <PlanTrip trips={trips} />
            </Panel>

            {firebaseEnabled && <InvitesPanel />}

            {firebaseEnabled && <GmailConnect />}

            {firebaseEnabled && (
              <Panel>
                <h2 className="panel-heading" style={{ fontSize: 20, margin: '0 0 12px', color: color.paper }}>
                  Account
                </h2>
                <AccountPanel />
              </Panel>
            )}
          </div>
        </>
      )}
    </div>
  )
}
