import { Link, Navigate, useLocation } from 'react-router-dom'
import { ResultPanel } from '../components/ResultPanel'
import type { FiredRule } from '../domain/types'

interface SentState {
  patientName: string
  date: string
  result: FiredRule[]
}

/** Confirmación para funcionarios sin cuenta: no pueden volver a abrir la visita, así que se muestra aquí. */
export function VisitSent() {
  const state = useLocation().state as SentState | null
  if (!state) return <Navigate to="/" replace />

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3 border-emerald-200 bg-emerald-50">
        <div>
          <h1 className="text-lg font-semibold text-emerald-900">Visita guardada</h1>
          <p className="text-sm text-emerald-800">{state.patientName} · {state.date}</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button type="button" className="btn-secondary" onClick={() => window.print()}>Imprimir</button>
          <Link to="/visitas/nueva" className="btn-primary">+ Nueva visita</Link>
        </div>
      </div>
      <p className="text-sm text-slate-500 print:hidden">
        Por privacidad, esta visita ya no se podrá abrir desde este equipo. Imprime o copia el resultado si lo necesitas.
      </p>
      <div className="max-w-2xl">
        <ResultPanel fired={state.result} started />
      </div>
    </div>
  )
}
