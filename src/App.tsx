import { color, radius, space, type } from './theme/tokens'

/**
 * Phase 1 placeholder screen. The real single-view status card, trips list,
 * and "plan a trip" check arrive in later phases (see CLAUDE.md build order).
 */
export default function App() {
  return (
    <main
      style={{
        background: `linear-gradient(160deg, ${color.groundSheenTop}, ${color.groundSheenBottom})`,
        color: color.paper,
        borderRadius: radius.card,
        padding: space.xl,
        maxWidth: 420,
        width: '100%',
        boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
      }}
    >
      <p style={{ margin: 0, color: color.marigold, fontWeight: 600 }}>Nomad Help Desk</p>
      <h1 style={{ fontFamily: type.display, fontSize: 28, margin: `${space.sm} 0` }}>
        Schengen tracker
      </h1>
      <p style={{ color: color.muted, margin: 0 }}>
        Scaffold ready. The 90/180 engine and status card come next.
      </p>
    </main>
  )
}
