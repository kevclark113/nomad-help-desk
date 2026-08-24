import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { User } from 'firebase/auth'
import { firebaseEnabled, loadFirebase } from '../lib/firebase'

interface AuthState {
  /** The signed-in user, or null when signed out. */
  user: User | null
  /** True until the initial auth state is known. */
  loading: boolean
  /** Whether accounts are available at all (Firebase configured). */
  enabled: boolean
  signInWithGoogle: () => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

// Marks that this device has an account, so we know to restore the session (and
// load Firebase) on future visits. First-time/signed-out visitors never load it.
const SEEN_KEY = 'nomad-auth-seen'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(
    () => firebaseEnabled && !!localStorage.getItem(SEEN_KEY),
  )
  const subscribed = useRef(false)

  // Load Firebase + start listening for auth changes (once). Called on mount for
  // returning users, and lazily before any sign-in for new ones.
  const ensureSubscription = useCallback(async () => {
    if (subscribed.current) return
    subscribed.current = true
    const { auth } = await loadFirebase()
    const { onAuthStateChanged } = await import('firebase/auth')
    onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
      if (u) localStorage.setItem(SEEN_KEY, '1')
      else localStorage.removeItem(SEEN_KEY)
    })
  }, [])

  useEffect(() => {
    if (firebaseEnabled && localStorage.getItem(SEEN_KEY)) void ensureSubscription()
  }, [ensureSubscription])

  const value: AuthState = {
    user,
    loading,
    enabled: firebaseEnabled,
    signInWithGoogle: async () => {
      await ensureSubscription()
      const { auth } = await loadFirebase()
      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth')
      await signInWithPopup(auth, new GoogleAuthProvider())
    },
    signUpWithEmail: async (email, password) => {
      await ensureSubscription()
      const { auth } = await loadFirebase()
      const { createUserWithEmailAndPassword } = await import('firebase/auth')
      await createUserWithEmailAndPassword(auth, email, password)
    },
    signInWithEmail: async (email, password) => {
      await ensureSubscription()
      const { auth } = await loadFirebase()
      const { signInWithEmailAndPassword } = await import('firebase/auth')
      await signInWithEmailAndPassword(auth, email, password)
    },
    signOut: async () => {
      const { auth } = await loadFirebase()
      const { signOut } = await import('firebase/auth')
      await signOut(auth)
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
