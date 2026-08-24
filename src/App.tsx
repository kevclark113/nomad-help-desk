import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getTrips, addTrip, updateTrip, deleteTrip } from './lib/db'
import type { Trip } from './lib/types'
import { schengenStatus } from './lib/schengen'
import { todayISO } from './lib/dateUtils'
import { color, type } from './theme/tokens'
import { StatusCard } from './theme/components/StatusCard'
import { Panel } from './theme/components/ui'
import { TripEditor } from './components/TripEditor'
import { TripsList } from './components/TripsList'
import { PlanTrip } from './components/PlanTrip'
import { AccountPanel } from './components/AccountPanel'
import { firebaseEnabled } from './lib/firebase'

export default function App() {
  const trips = useLiveQuery(getTrips, [], [] as Trip[])
  const [editing, setEditing] = useState<Trip | null>(null)

  const today = todayISO()
  const status = schengenStatus(trips, today)

  async function handleSubmit(data: Omit<Trip, 'id'>) {
    if (editing?.id !== undefined) {
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
        maxWidth: 460,
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
          Schengen tracker
        </h1>
      </header>

      <StatusCard status={status} asOf={today} />

      <Panel>
        <h2 style={{ fontSize: 14, margin: '0 0 12px', color: color.paper }}>
          {editing ? 'Edit trip' : 'Add a trip'}
        </h2>
        <TripEditor
          editing={editing}
          onSubmit={handleSubmit}
          onCancel={() => setEditing(null)}
        />
      </Panel>

      <Panel>
        <h2 style={{ fontSize: 14, margin: '0 0 12px', color: color.paper }}>Your trips</h2>
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
        <h2 style={{ fontSize: 14, margin: '0 0 12px', color: color.paper }}>Plan a trip</h2>
        <PlanTrip trips={trips} />
      </Panel>

      {firebaseEnabled && (
        <Panel>
          <h2 style={{ fontSize: 14, margin: '0 0 12px', color: color.paper }}>Account</h2>
          <AccountPanel />
        </Panel>
      )}
    </div>
  )
}
