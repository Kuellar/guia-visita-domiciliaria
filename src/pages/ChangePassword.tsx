import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../data/AuthContext'

/** Cambio de contraseña. `forced`: pantalla completa tras entrar con contraseña temporal. */
export function ChangePassword({ forced = false }: { forced?: boolean }) {
  const { changePassword, signOut, session } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < 8) return setError('Usa al menos 8 caracteres.')
    if (password !== confirm) return setError('Las contraseñas no coinciden.')
    setBusy(true)
    const err = await changePassword(password)
    setBusy(false)
    if (err) return setError(err)
    setError('')
    setDone(true)
    if (!forced) setTimeout(() => navigate('/'), 1200)
  }

  const form = (
    <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6">
      <div>
        <h1 className="text-lg font-semibold">{forced ? 'Crea tu contraseña' : 'Cambiar contraseña'}</h1>
        <p className="text-sm text-slate-500">
          {forced
            ? `Entraste con una contraseña temporal (${session?.user.email}). Elige una propia para continuar.`
            : 'Elige una nueva contraseña de al menos 8 caracteres.'}
        </p>
      </div>
      <div>
        <label className="label" htmlFor="pw">Nueva contraseña</label>
        <input id="pw" type="password" autoComplete="new-password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="pw2">Repetir contraseña</label>
        <input id="pw2" type="password" autoComplete="new-password" required className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {done && <p className="text-sm text-emerald-700">Contraseña actualizada ✓</p>}
      <button type="submit" className="btn-primary w-full" disabled={busy || done}>{busy ? 'Guardando…' : 'Guardar contraseña'}</button>
      {forced && <button type="button" className="w-full text-sm text-slate-500 hover:text-slate-800" onClick={signOut}>Cerrar sesión</button>}
    </form>
  )

  return forced ? <div className="flex min-h-screen items-center justify-center px-4">{form}</div> : <div className="flex justify-center">{form}</div>
}
