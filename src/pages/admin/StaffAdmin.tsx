import { useState } from 'react'
import { backend, staffApi } from '../../data/api'
import { useAuth } from '../../data/AuthContext'
import { useConfig } from '../../data/ConfigContext'
import { QUESTIONS } from '../../domain/questions'
import type { Staff } from '../../domain/types'
import { attempt } from '../../lib/errors'

const ESTAMENTOS = QUESTIONS[0].options.map((o) => o.value)
const empty = { name: '', estamento: ESTAMENTOS[0], active: true, email: '', isAdmin: false }
const remote = backend.kind === 'supabase'

/** Contraseña temporal fácil de dictar (sin caracteres ambiguos). */
function generatePassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(10))
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

interface Credentials {
  name: string
  email: string
  password: string
  note?: string
}

export function StaffAdmin() {
  const { staff, reload } = useConfig()
  const { me } = useAuth()
  const [form, setForm] = useState<Omit<Staff, 'id'> & { id?: string }>(empty)
  const [tempPassword, setTempPassword] = useState('')
  const [credentials, setCredentials] = useState<Credentials | null>(null)
  const [copied, setCopied] = useState(false)

  const isSelf = (s: { id?: string }) => remote && s.id === me?.id
  const emailOk = !remote || !form.email || /^\S+@\S+\.\S+$/.test(form.email)
  const email = form.email?.trim().toLowerCase() ?? ''
  // Nuevo funcionario con email: hay que crear su cuenta, por lo que la contraseña es obligatoria.
  const needsPassword = remote && !!email && !form.id
  const passwordOk = !tempPassword || tempPassword.length >= 8
  const canSave = !!form.name.trim() && emailOk && passwordOk && (!needsPassword || !!tempPassword)

  const resetForm = () => {
    setForm(empty)
    setTempPassword('')
  }

  const save = async () => {
    if (!canSave) return
    let note: string | undefined
    if (remote && email && tempPassword && backend.users) {
      try {
        await backend.users.create(email, tempPassword)
      } catch (e) {
        const msg = (e as Error).message
        if (!/ya existe/i.test(msg)) return alert(msg)
        note = 'Ya tenía una cuenta: su contraseña NO se cambió. Usa «Restablecer contraseña» si la olvidó.'
      }
    }
    const ok = await attempt(() => staffApi.save({ ...form, name: form.name.trim() }))
    if (!ok) return
    if (remote && email && tempPassword) {
      setCredentials({ name: form.name.trim(), email, password: note ? '' : tempPassword, note })
      setCopied(false)
    }
    resetForm()
    await reload()
  }

  const resetPassword = async (s: Staff) => {
    if (!s.email || !backend.users) return
    const password = generatePassword()
    if (!confirm(`¿Crear una nueva contraseña temporal para ${s.name}? La actual dejará de funcionar.`)) return
    const ok = await attempt(async () => {
      await backend.users!.resetPassword(s.email!, password)
      return true
    })
    if (ok) {
      setCredentials({ name: s.name, email: s.email, password })
      setCopied(false)
    }
  }

  const copyCredentials = async () => {
    if (!credentials) return
    const text = `Guía de Visita Domiciliaria\n${window.location.origin}${window.location.pathname}\nEmail: ${credentials.email}\nContraseña temporal: ${credentials.password}\n(Al entrar se te pedirá crear tu propia contraseña.)`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      /* el usuario puede copiar a mano */
    }
  }
  const toggle = async (s: Staff) => {
    await attempt(() => staffApi.save({ ...s, active: !s.active }))
    await reload()
  }
  const remove = async (s: Staff) => {
    if (!confirm(`¿Eliminar a ${s.name}? Las visitas existentes quedarán sin funcionario. Considera desactivarlo en su lugar.`)) return
    await attempt(() => staffApi.remove(s.id))
    await reload()
  }

  return (
    <div className="space-y-4">
      {remote && (
        <div className="card border-sky-200 bg-sky-50 text-sm text-sky-900">
          Para dar acceso, agrega a la persona con su <b>email</b> y una <b>contraseña temporal</b>. Al entrar por
          primera vez se le pedirá crear su propia contraseña. Desactivar a alguien le quita el acceso de inmediato.
        </div>
      )}
      {credentials && (
        <div className="card space-y-2 border-emerald-200 bg-emerald-50 text-sm">
          <div className="font-semibold text-emerald-900">Acceso listo para {credentials.name}</div>
          {credentials.note ? (
            <p className="text-emerald-900">{credentials.note}</p>
          ) : (
            <>
              <div className="font-mono">
                Email: {credentials.email}
                <br />
                Contraseña temporal: <b>{credentials.password}</b>
              </div>
              <p className="text-emerald-800">Entrégasela por un medio seguro. No se volverá a mostrar.</p>
            </>
          )}
          <div className="flex gap-2">
            {!credentials.note && <button type="button" className="btn-secondary" onClick={copyCredentials}>{copied ? 'Copiado ✓' : 'Copiar mensaje'}</button>}
            <button type="button" className="btn-secondary" onClick={() => setCredentials(null)}>Cerrar</button>
          </div>
        </div>
      )}
      <div className="card flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <label className="label">Nombre</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="min-w-44">
          <label className="label">Estamento</label>
          <select className="input" value={form.estamento} onChange={(e) => setForm({ ...form, estamento: e.target.value })}>
            {ESTAMENTOS.map((e) => <option key={e}>{e}</option>)}
          </select>
        </div>
        {remote && (
          <>
            <div className="min-w-56 flex-1">
              <label className="label">Email de acceso</label>
              <input type="email" className={`input ${emailOk ? '' : 'border-red-400'}`} value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Sin acceso a la app" />
            </div>
            {email && (
              <div className="min-w-56">
                <label className="label">Contraseña temporal{form.id ? ' (solo si aún no tiene cuenta)' : ''}</label>
                <div className="flex gap-1">
                  <input className={`input font-mono ${passwordOk ? '' : 'border-red-400'}`} value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} placeholder="mín. 8 caracteres" />
                  <button type="button" className="btn-secondary" title="Generar" onClick={() => setTempPassword(generatePassword())}>Generar</button>
                </div>
              </div>
            )}
            <label className="flex items-center gap-1.5 pb-2 text-sm">
              <input type="checkbox" checked={!!form.isAdmin} disabled={isSelf(form)} onChange={(e) => setForm({ ...form, isAdmin: e.target.checked })} />
              Administrador
            </label>
          </>
        )}
        <button type="button" className="btn-primary" disabled={!canSave} onClick={save}>
          {form.id ? 'Guardar cambios' : '+ Agregar'}
        </button>
        {form.id && <button type="button" className="btn-secondary" onClick={resetForm}>Cancelar</button>}
      </div>

      <div className="card divide-y divide-slate-100 p-0">
        {staff.map((s) => (
          <div key={s.id} className={`flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm ${s.active ? '' : 'text-slate-400'}`}>
            <span className="min-w-40 flex-1">
              <span className="font-medium">{s.name}</span>
              {s.isAdmin && remote && <span className="ml-2 rounded bg-brand-50 px-1.5 py-0.5 text-xs text-brand-700">admin</span>}
              {remote && <span className="block text-xs text-slate-400">{s.email || 'sin acceso'}</span>}
            </span>
            <span className="w-40">{s.estamento}</span>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={s.active} disabled={isSelf(s)} onChange={() => toggle(s)} /> Activo
            </label>
            <button type="button" className="text-brand-600 hover:underline" onClick={() => { setForm({ ...empty, ...s }); setTempPassword('') }}>Editar</button>
            {remote && s.email && !isSelf(s) && <button type="button" className="text-brand-600 hover:underline" onClick={() => resetPassword(s)}>Restablecer contraseña</button>}
            {!isSelf(s) && <button type="button" className="text-red-600 hover:underline" onClick={() => remove(s)}>Eliminar</button>}
          </div>
        ))}
      </div>
    </div>
  )
}
