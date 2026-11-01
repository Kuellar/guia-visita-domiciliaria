import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ResultPanel } from '../components/ResultPanel'
import { StatusBadge } from '../components/StatusBadge'
import { visitsApi } from '../data/api'
import { useConfig } from '../data/ConfigContext'
import { answerLabel, evaluate } from '../domain/engine'
import { attempt } from '../lib/errors'
import type { Visit } from '../domain/types'

export function VisitDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { questions, rules, staff } = useConfig()
  const [visit, setVisit] = useState<Visit | null>(null)
  const [showCurrent, setShowCurrent] = useState(false)

  useEffect(() => {
    void visitsApi.get(id!).then((v) => (v ? setVisit(v) : navigate('/visitas')))
  }, [id, navigate])

  const evaluation = useMemo(() => (visit ? evaluate(visit.answers, questions, rules) : null), [visit, questions, rules])
  if (!visit || !evaluation) return <p className="text-slate-500">Cargando…</p>

  const changed = JSON.stringify(evaluation.fired) !== JSON.stringify(visit.result)
  const member = staff.find((s) => s.id === visit.staffId)
  const remove = async () => {
    if (!confirm(`¿Eliminar la visita de ${visit.patientName}? Esta acción no se puede deshacer.`)) return
    const ok = await attempt(async () => {
      await visitsApi.remove(visit.id)
      return true
    })
    if (ok) navigate('/visitas')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link to="/visitas" className="text-sm text-slate-500 hover:text-brand-600">← Volver a visitas</Link>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={() => window.print()}>Imprimir</button>
          <Link to={`/visitas/${visit.id}/editar`} className="btn-secondary">Editar</Link>
          <button type="button" className="btn-danger" onClick={remove}>Eliminar</button>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold">{visit.patientName}</h1>
            <p className="text-sm text-slate-500">
              {visit.patientRut || 'Sin RUT'} · {visit.date} · {member ? `${member.name} (${member.estamento})` : 'Sin funcionario'}
            </p>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${visit.status === 'completa' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
            {visit.status}
          </span>
        </div>
        {visit.notes && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm whitespace-pre-wrap">{visit.notes}</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="card p-0">
          <h2 className="border-b border-slate-100 px-4 py-3 font-semibold">Respuestas</h2>
          <dl className="divide-y divide-slate-100">
            {questions.filter((q) => evaluation.statuses[q.id] !== 'NO APLICA').map((q) => (
              <div key={q.id} className="flex items-start gap-3 px-4 py-2 text-sm">
                <span className="w-6 font-mono text-slate-400">{String(q.step).padStart(2, '0')}</span>
                <dt className="flex-1 text-slate-600">{q.label}</dt>
                <dd className="text-right font-medium">
                  {answerLabel(q, visit.answers[q.id])}
                  {q.sub && visit.answers[q.id] && q.sub.requiredWhen(visit.answers[q.id]!) && (
                    <span className="block text-xs font-normal text-slate-500">
                      Exactamente 20: {answerLabel({ ...q, options: q.sub.options }, visit.answers[q.sub.id])}
                    </span>
                  )}
                </dd>
                {evaluation.statuses[q.id] !== 'LISTO' && <StatusBadge status={evaluation.statuses[q.id]} />}
              </div>
            ))}
          </dl>
        </section>
        <aside className="space-y-3">
          {changed && (
            <div className="card border-amber-200 bg-amber-50 text-sm print:hidden">
              Las reglas o textos cambiaron desde que se guardó esta visita.
              <button type="button" className="ml-1 font-medium text-brand-700 underline" onClick={() => setShowCurrent((s) => !s)}>
                {showCurrent ? 'Ver resultado guardado' : 'Ver resultado con reglas actuales'}
              </button>
            </div>
          )}
          <ResultPanel fired={showCurrent ? evaluation.fired : visit.result} started={evaluation.started} />
        </aside>
      </div>
    </div>
  )
}
