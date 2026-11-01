import { useState } from 'react'
import type { Evaluation } from '../domain/engine'
import { answerLabel } from '../domain/engine'
import type { Answers, Question } from '../domain/types'
import { OptionPicker } from './OptionPicker'
import { StatusBadge } from './StatusBadge'

interface Props {
  questions: Question[]
  answers: Answers
  evaluation: Evaluation
  onChange: (answers: Answers) => void
}

export function Wizard({ questions, answers, evaluation, onChange }: Props) {
  const [showSkipped, setShowSkipped] = useState(false)
  const { statuses, next, stale } = evaluation
  const set = (id: string, value: string) => onChange({ ...answers, [id]: value })
  const clearStale = () => {
    const copy = { ...answers }
    for (const id of stale) delete copy[id]
    onChange(copy)
  }

  const waiting = questions.filter((q) => statuses[q.id] === 'EN ESPERA').length
  const skipped = questions.filter((q) => statuses[q.id] === 'NO APLICA').length

  return (
    <div className="space-y-3">
      <div className="card flex flex-wrap items-center justify-between gap-2 border-brand-100 bg-brand-50">
        <div>
          <div className="label text-brand-700">Siguiente paso</div>
          <div className="font-medium">
            {next ? `${String(next.step).padStart(2, '0')} · ${next.label}` : 'Cuestionario completo ✓'}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={showSkipped} onChange={(e) => setShowSkipped(e.target.checked)} />
          Mostrar omitidas ({skipped})
        </label>
      </div>

      {stale.length > 0 && (
        <div className="card flex flex-wrap items-center justify-between gap-2 border-amber-200 bg-amber-50 text-sm">
          <span>
            Hay {stale.length} respuesta(s) en preguntas que ya no aplican. No se consideran en el resultado.
          </span>
          <button type="button" className="btn-secondary" onClick={clearStale}>
            Limpiar
          </button>
        </div>
      )}

      {questions.map((q) => {
        const status = statuses[q.id]
        if (status === 'EN ESPERA') return null
        if (status === 'NO APLICA') {
          if (!showSkipped) return null
          return (
            <div key={q.id} className="flex items-center gap-3 rounded-lg px-4 py-2 text-sm text-slate-400">
              <span className="w-6 font-mono">{String(q.step).padStart(2, '0')}</span>
              <span className="flex-1">{q.label}</span>
              <span className="hidden text-xs sm:inline">{q.notApplicableHint?.(answers) ?? 'Esta pregunta se omite'}</span>
              <StatusBadge status={status} />
            </div>
          )
        }
        const isCurrent = next?.id === q.id
        const value = answers[q.id]
        return (
          <div
            key={q.id}
            id={`q-${q.id}`}
            className={`card ${isCurrent ? 'border-amber-300 ring-2 ring-amber-100' : ''}`}
          >
            <div className="mb-1 flex items-start gap-3">
              <span className="mt-0.5 w-6 font-mono text-sm text-slate-400">{String(q.step).padStart(2, '0')}</span>
              <div className="flex-1">
                <div className="font-medium">{q.label}</div>
                <div className="text-sm text-slate-500">{q.help}</div>
              </div>
              <StatusBadge status={status} />
            </div>
            <div className="mt-3 sm:pl-9">
              <OptionPicker options={q.options} value={value} onChange={(v) => set(q.id, v)} />
              {status === 'REVISAR' && (
                <p className="mt-2 text-sm text-red-700">
                  Valor guardado no válido: «{answerLabel(q, value)}». Selecciona una opción.
                </p>
              )}
              {q.sub && value && q.sub.requiredWhen(value) && (
                <div className="mt-3 rounded-lg bg-slate-50 p-3">
                  <div className="mb-2 text-sm font-medium">{q.sub.label}</div>
                  <OptionPicker options={q.sub.options} value={answers[q.sub.id]} onChange={(v) => set(q.sub!.id, v)} />
                </div>
              )}
            </div>
          </div>
        )
      })}

      {waiting > 0 && (
        <p className="px-1 text-sm text-slate-400">{waiting} pregunta(s) en espera de respuestas previas.</p>
      )}
    </div>
  )
}
