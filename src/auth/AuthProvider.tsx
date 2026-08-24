import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { auth, firebaseEnabled } from '../lib/firebase'

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

const notConfigured = () => {
  throw new Error('Accounts are unavailable — Firebase is not configured.')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  // If Firebase isn't configured, there's nothing to wait for.
  const [loading, setLoading] = useState(firebaseEnabled)

  useEffect(() => {
    if (!auth) return
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
  }, [])

  const value: AuthState = {
    user,
    loading,
    enabled: firebaseEnabled,
    signInWithGoogle: async () => {
      if (!auth) return notConfigured()
      await signInWithPopup(auth, new GoogleAuthProvider())
    },
    signUpWithEmail: async (email, password) => {
      if (!auth) return notConfigured()
      await createUserWithEmailAndPassword(auth, email, password)
    },
    signInWithEmail: async (email, password) => {
      if (!auth) return notConfigured()
      await signInWithEmailAndPassword(auth, email, password)
    },
    signOut: async () => {
      if (!auth) return notConfigured()
      await fbSignOut(auth)
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
