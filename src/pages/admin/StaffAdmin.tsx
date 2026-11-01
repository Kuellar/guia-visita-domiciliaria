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

export function StaffAdmin() {
  const { staff, reload } = useConfig()
  const { me } = useAuth()
  const [form, setForm] = useState<Omit<Staff, 'id'> & { id?: string }>(empty)

  const isSelf = (s: { id?: string }) => remote && s.id === me?.id
  const emailOk = !remote || !form.email || /^\S+@\S+\.\S+$/.test(form.email)

  const save = async () => {
    if (!form.name.trim() || !emailOk) return
    const ok = await attempt(() => staffApi.save({ ...form, name: form.name.trim() }))
    if (!ok) return
    setForm(empty)
    await reload()
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
          Para dar acceso: 1) agrega aquí a la persona con su <b>email</b>; 2) en Supabase → Authentication → Users →
          <i> Add user</i>, crea el usuario con el mismo email y una contraseña. Desactivar a alguien le quita el acceso
          de inmediato.
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
            <label className="flex items-center gap-1.5 pb-2 text-sm">
              <input type="checkbox" checked={!!form.isAdmin} disabled={isSelf(form)} onChange={(e) => setForm({ ...form, isAdmin: e.target.checked })} />
              Administrador
            </label>
          </>
        )}
        <button type="button" className="btn-primary" disabled={!form.name.trim() || !emailOk} onClick={save}>
          {form.id ? 'Guardar cambios' : '+ Agregar'}
        </button>
        {form.id && <button type="button" className="btn-secondary" onClick={() => setForm(empty)}>Cancelar</button>}
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
            <button type="button" className="text-brand-600 hover:underline" onClick={() => setForm({ ...empty, ...s })}>Editar</button>
            {!isSelf(s) && <button type="button" className="text-red-600 hover:underline" onClick={() => remove(s)}>Eliminar</button>}
          </div>
        ))}
      </div>
    </div>
  )
}
