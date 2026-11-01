import { useEffect, useState } from 'react'
import { questionsApi } from '../../data/api'
import { useConfig } from '../../data/ConfigContext'
import { attempt } from '../../lib/errors'
import { QUESTIONS } from '../../domain/questions'
import type { Question, QuestionOverride } from '../../domain/types'

function QuestionRow({ question, overridden, onSaved }: { question: Question; overridden: boolean; onSaved: () => Promise<void> }) {
  const original = QUESTIONS.find((q) => q.id === question.id)!
  const initial = () => ({
    label: question.label,
    help: question.help,
    options: Object.fromEntries(question.options.map((o) => [o.value, o.label])),
  })
  const [form, setForm] = useState(initial)

  const dirty = JSON.stringify(form) !== JSON.stringify(initial())
  const save = async () => {
    const o: QuestionOverride = {}
    if (form.label !== original.label) o.label = form.label
    if (form.help !== original.help) o.help = form.help
    const opts = Object.fromEntries(
      Object.entries(form.options).filter(([v, l]) => original.options.find((x) => x.value === v)?.label !== l),
    )
    if (Object.keys(opts).length) o.options = opts
    await attempt(() => (Object.keys(o).length ? questionsApi.update(question.id, o) : questionsApi.reset(question.id)))
    await onSaved()
  }
  const reset = async () => {
    if (!confirm('¿Restablecer los textos originales de esta pregunta?')) return
    await attempt(() => questionsApi.reset(question.id))
    await onSaved()
  }

  return (
    <div className="card space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-mono text-slate-400">{String(question.step).padStart(2, '0')}</span>
        <code className="flex-1 text-xs text-slate-400">{question.id}</code>
        {overridden && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">editada</span>}
      </div>
      <div>
        <label className="label">Pregunta</label>
        <input className="input" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
      </div>
      <div>
        <label className="label">Ayuda rápida</label>
        <textarea rows={2} className="input" value={form.help} onChange={(e) => setForm({ ...form, help: e.target.value })} />
      </div>
      <div>
        <label className="label">Texto de las opciones</label>
        <div className="grid gap-2 sm:grid-cols-2">
          {question.options.map((o) => (
            <input
              key={o.value}
              className="input"
              title={`Valor interno: ${o.value}`}
              value={form.options[o.value]}
              onChange={(e) => setForm({ ...form, options: { ...form.options, [o.value]: e.target.value } })}
            />
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        {overridden && <button type="button" className="btn-secondary" onClick={reset}>Restablecer original</button>}
        {dirty && (
          <>
            <button type="button" className="btn-secondary" onClick={() => setForm(initial())}>Cancelar</button>
            <button type="button" className="btn-primary" onClick={save}>Guardar</button>
          </>
        )}
      </div>
    </div>
  )
}

export function QuestionsAdmin() {
  const { questions, reload } = useConfig()
  const [overrides, setOverrides] = useState<Record<string, QuestionOverride>>({})
  const refresh = async () => {
    await reload()
    setOverrides(await questionsApi.overrides())
  }
  useEffect(() => {
    void questionsApi.overrides().then(setOverrides)
  }, [])

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        Cambia cómo se ven las preguntas y opciones. Las reglas usan el valor interno de cada opción, así que editar
        el texto no altera el resultado. El orden y las condiciones están en <code>src/domain/questions.ts</code>.
      </p>
      {questions.map((q) => (
        <QuestionRow key={`${q.id}|${q.label}|${q.help}|${q.options.map((o) => o.label).join('|')}`} question={q} overridden={!!overrides[q.id]} onSaved={refresh} />
      ))}
    </div>
  )
}
