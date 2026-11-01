import { CRITERIA, WARNINGS } from '../domain/docs'

export function Criterios() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Criterios · alcance y validaciones</h1>
        <p className="text-sm text-slate-500">
          Qué se tomó del borrador, qué se adaptó y qué decisiones requieren confirmación institucional.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {CRITERIA.map((c) => (
          <div key={c.area + c.question} className="card text-sm">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="label mb-0">{c.area}</span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{c.origin}</span>
            </div>
            <div className="font-medium">{c.question}</div>
            <div className="text-slate-500">→ {c.output}</div>
            <p className="mt-2">{c.criterion}</p>
            <p className="mt-2 rounded bg-amber-50 p-2 text-xs text-amber-900"><b>A validar localmente:</b> {c.validate}</p>
          </div>
        ))}
      </div>
      <section>
        <h2 className="label">Advertencias clínicas y de uso</h2>
        <ol className="card list-decimal space-y-2 pl-8 text-sm">
          {WARNINGS.map((w) => <li key={w}>{w}</li>)}
        </ol>
      </section>
    </div>
  )
}
