import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { visitsApi } from '../data/api'
import { FAQ, NOTES, STEPS } from '../domain/docs'
import type { Visit } from '../domain/types'

export function Home() {
  const [visits, setVisits] = useState<Visit[]>([])
  useEffect(() => {
    void visitsApi.list().then(setVisits)
  }, [])
  const drafts = visits.filter((v) => v.status === 'borrador').length

  return (
    <div className="space-y-6">
      <section className="card bg-gradient-to-br from-brand-600 to-brand-700 p-6 text-white">
        <h1 className="text-2xl font-semibold">Guía inteligente de visita domiciliaria</h1>
        <p className="mt-1 max-w-2xl text-brand-50">
          Un recorrido sencillo para orientar el registro de actividades, formularios y observaciones.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/visitas/nueva" className="btn bg-white text-brand-700 hover:bg-brand-50">▶ Nueva visita</Link>
          <Link to="/visitas" className="btn border border-white/40 text-white hover:bg-white/10">
            Ver visitas ({visits.length}{drafts ? ` · ${drafts} borrador` : ''})
          </Link>
        </div>
      </section>

      <section>
        <h2 className="label">Cómo usarlo en 3 pasos</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="card">
              <div className="font-mono text-sm text-brand-600">{s.n}</div>
              <div className="font-semibold">{s.title}</div>
              <p className="text-sm text-slate-600">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="label">Preguntas frecuentes</h2>
          <div className="card space-y-3">
            {FAQ.map((f) => (
              <div key={f.q}>
                <div className="font-medium">{f.q}</div>
                <p className="text-sm text-slate-600">{f.a}</p>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2 className="label">Notas de implementación</h2>
          <ul className="card list-disc space-y-1.5 pl-8 text-sm text-slate-600">
            {NOTES.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </section>
      </div>
    </div>
  )
}
