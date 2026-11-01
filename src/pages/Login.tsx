import { useState, type FormEvent } from 'react'
import { useAuth } from '../data/AuthContext'

export function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError((await signIn(email, password)) ?? '')
    setBusy(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6">
        <div>
          <h1 className="text-lg font-semibold text-brand-700">Guía de Visita Domiciliaria</h1>
          <p className="text-sm text-slate-500">Inicia sesión con tu cuenta institucional.</p>
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="password">Contraseña</label>
          <input id="password" type="password" autoComplete="current-password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</button>
        <p className="text-xs text-slate-400">¿No tienes cuenta? Pide acceso a un administrador.</p>
      </form>
    </div>
  )
}

export function NotAuthorized() {
  const { session, signOut } = useAuth()
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card max-w-sm space-y-3 p-6 text-center">
        <h1 className="font-semibold">Usuario no habilitado</h1>
        <p className="text-sm text-slate-600">
          La cuenta <b>{session?.user.email}</b> no está registrada como funcionario/a activo/a. Pide a un administrador
          que la agregue en Administración → Funcionarios.
        </p>
        <button type="button" className="btn-secondary" onClick={signOut}>Cerrar sesión</button>
      </div>
    </div>
  )
}
