import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Staff } from '../domain/types'
import { backend } from './api'
import { supabase } from './supabaseApi'

interface Auth {
  loading: boolean
  session: Session | null
  /** Sesión anónima de un funcionario sin cuenta (solo puede crear visitas). */
  isAnonymous: boolean
  /** Administrador asociado al email de la sesión (null si es anónima o no está habilitado). */
  me: Staff | null
  isAdmin: boolean
  /** El usuario entró con una contraseña temporal y debe cambiarla. */
  mustChangePassword: boolean
  changePassword: (password: string) => Promise<string | null>
  signIn: (email: string, password: string, captchaToken?: string) => Promise<string | null>
  /** Crea la sesión anónima con la que un funcionario guarda visitas. */
  startAnonymous: (captchaToken?: string) => Promise<string | null>
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
      if (!s || s.user.is_anonymous) {
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

  const signIn = async (email: string, password: string, captchaToken?: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password, options: { captchaToken: captchaToken || undefined } })
    if (!error) return null
    if (/captcha/i.test(error.message)) return 'Completa la verificación «No soy un robot».'
    return /invalid/i.test(error.message) ? 'Email o contraseña incorrectos.' : error.message
  }
  const startAnonymous = async (captchaToken?: string) => {
    const { error } = await supabase.auth.signInAnonymously({ options: { captchaToken: captchaToken || undefined } })
    if (!error) return null
    if (/captcha/i.test(error.message)) return 'Completa la verificación «No soy un robot».'
    if (/rate limit|too many/i.test(error.message)) return 'Demasiados intentos desde esta red. Intenta más tarde.'
    if (/anonymous.*disabled/i.test(error.message)) return 'El acceso sin cuenta no está habilitado en Supabase.'
    return error.message
  }
  const changePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password, data: { must_change_password: false } })
    if (!error) return null
    if (/different|same/i.test(error.message)) return 'La nueva contraseña debe ser distinta de la actual.'
    if (/weak|short|characters/i.test(error.message)) return 'Contraseña demasiado débil: usa al menos 8 caracteres.'
    return error.message
  }
  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      loading,
      session,
      isAnonymous: !!session?.user.is_anonymous,
      me,
      isAdmin: !!me?.isAdmin,
      mustChangePassword: !!session?.user.user_metadata?.must_change_password,
      changePassword,
      signIn,
      startAnonymous,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
