import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Staff } from '../domain/types'
import { backend } from './api'
import { supabase } from './supabaseApi'

interface Auth {
  loading: boolean
  session: Session | null
  /** Funcionario asociado al email de la sesión (null si no está habilitado). */
  me: Staff | null
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const LOCAL_ADMIN: Staff = { id: 'local', name: 'Modo local', estamento: '', active: true, isAdmin: true }

const AuthContext = createContext<Auth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const isLocal = backend.kind === 'local'
  const [loading, setLoading] = useState(!isLocal)
  const [session, setSession] = useState<Session | null>(null)
  const [me, setMe] = useState<Staff | null>(isLocal ? LOCAL_ADMIN : null)

  useEffect(() => {
    if (isLocal) return
    const resolve = async (s: Session | null) => {
      setSession(s)
      if (!s) {
        setMe(null)
      } else {
        const email = s.user.email?.toLowerCase()
        const { data } = await supabase.from('staff').select('*').eq('email', email).eq('active', true).maybeSingle()
        setMe(data ? { id: data.id, name: data.name, estamento: data.estamento, email: data.email, isAdmin: data.is_admin, active: data.active } : null)
      }
      setLoading(false)
    }
    void supabase.auth.getSession().then(({ data }) => resolve(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      // Evitar llamadas a Supabase dentro del callback (puede bloquearse); diferir.
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') setTimeout(() => void resolve(s), 0)
    })
    return () => sub.subscription.unsubscribe()
  }, [isLocal])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (!error) return null
    return /invalid/i.test(error.message) ? 'Email o contraseña incorrectos.' : error.message
  }
  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ loading, session, me, isAdmin: !!me?.isAdmin, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
