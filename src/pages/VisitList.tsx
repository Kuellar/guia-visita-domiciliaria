import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { visitsApi } from '../data/api'
import { useConfig } from '../data/ConfigContext'
import type { Visit } from '../domain/types'

export function VisitList() {
  const { staff, questions } = useConfig()
  const [visits, setVisits] = useState<Visit[]>([])
  const [q, setQ] = useState('')
  const [staffId, setStaffId] = useState('')
  const [motivo, setMotivo] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    void visitsApi.list().then(setVisits)
  }, [])

  const motivoQ = questions.find((x) => x.id === 'motivo')!
  const staffName = (id: string) => staff.find((s) => s.id === id)?.name ?? '—'
  const motivoLabel = (v?: string) => motivoQ.options.find((o) => o.value === v)?.label ?? '—'

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return visits.filter(
      (v) =>
        (!term || v.patientName.toLowerCase().includes(term) || v.patientRut.toLowerCase().includes(term)) &&
        (!staffId || v.staffId === staffId) &&
        (!motivo || v.answers.motivo === motivo) &&
        (!status || v.status === status),
    )
  }, [visits, q, staffId, motivo, status])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Visitas <span className="text-slate-400">· {filtered.length}</span></h1>
        <Link to="/visitas/nueva" className="btn-primary">+ Nueva visita</Link>
      </div>

      <div className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input className="input" placeholder="Buscar por nombre o RUT" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
          <option value="">Todos los funcionarios</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="input" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
          <option value="">Todos los motivos</option>
          {motivoQ.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="completa">Completa</option>
          <option value="borrador">Borrador</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="card text-center text-slate-500">No hay visitas que coincidan.</p>
      ) : (
        <div className="card divide-y divide-slate-100 p-0">
          {filtered.map((v) => (
            <Link key={v.id} to={`/visitas/${v.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-slate-50">
              <span className="w-24 font-mono text-sm text-slate-500">{v.date}</span>
              <span className="min-w-40 flex-1">
                <span className="font-medium">{v.patientName}</span>
                {v.patientRut && <span className="ml-2 text-sm text-slate-400">{v.patientRut}</span>}
              </span>
              <span className="text-sm text-slate-600">{motivoLabel(v.answers.motivo)}</span>
              <span className="text-sm text-slate-500">{staffName(v.staffId)}</span>
              <span className="text-xs text-slate-400">{v.result.length} sugerencias</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${v.status === 'completa' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {v.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
