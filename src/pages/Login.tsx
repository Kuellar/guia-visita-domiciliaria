import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Turnstile, captchaEnabled } from '../components/Turnstile'
import { useAuth } from '../data/AuthContext'

export function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [captcha, setCaptcha] = useState('')
  const [captchaKey, setCaptchaKey] = useState(0)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const err = await signIn(email, password, captcha)
    setError(err ?? '')
    if (err) {
      // El token del captcha es de un solo uso: pedir uno nuevo.
      setCaptcha('')
      setCaptchaKey((k) => k + 1)
    }
    setBusy(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6">
        <div>
          <h1 className="text-lg font-semibold text-brand-700">Guía de Visita Domiciliaria</h1>
          <p className="text-sm text-slate-500">Acceso para administradores.</p>
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="password">Contraseña</label>
          <input id="password" type="password" autoComplete="current-password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Turnstile key={captchaKey} onToken={setCaptcha} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={busy || (captchaEnabled && !captcha)}>{busy ? 'Ingresando…' : 'Ingresar'}</button>
        <Link to="/" className="block text-xs text-slate-400 hover:text-brand-600">← Volver sin iniciar sesión</Link>
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
          La cuenta <b>{session?.user.email}</b> no está registrada como administrador/a activo/a. Pide a un administrador
          que la habilite en Administración → Funcionarios.
        </p>
        <button type="button" className="btn-secondary" onClick={signOut}>Cerrar sesión</button>
      </div>
    </div>
  )
}
