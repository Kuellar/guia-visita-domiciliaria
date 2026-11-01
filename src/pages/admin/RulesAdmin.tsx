import { useEffect, useMemo, useState } from 'react'
import { rulesApi } from '../../data/api'
import { useConfig } from '../../data/ConfigContext'
import { attempt } from '../../lib/errors'
import { RULE_TYPES } from '../../domain/engine'
import { RULES } from '../../domain/rules'
import type { Rule, RuleOverride } from '../../domain/types'

function RuleRow({ rule, overridden, onSaved }: { rule: Rule; overridden: boolean; onSaved: () => Promise<void> }) {
  const [text, setText] = useState(rule.text)
  const [origin, setOrigin] = useState(rule.origin)
  const dirty = text !== rule.text || origin !== rule.origin
  const save = async () => {
    await attempt(() => rulesApi.update(rule.id, { text: text.trim(), origin: origin.trim() }))
    await onSaved()
  }
  const toggle = async () => {
    await attempt(() => rulesApi.update(rule.id, { active: !rule.active }))
    await onSaved()
  }
  const reset = async () => {
    if (!confirm('¿Restablecer el texto original de esta regla?')) return
    await attempt(() => rulesApi.reset(rule.id))
    await onSaved()
  }

  return (
    <div className={`card space-y-2 ${rule.active ? '' : 'opacity-60'}`}>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-mono text-slate-400">{String(rule.id).padStart(2, '0')}</span>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-600">{rule.type}</span>
        <span className="flex-1 text-slate-600">Se activa cuando: <b className="font-medium text-slate-800">{rule.trigger}</b></span>
        {overridden && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">editada</span>}
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={rule.active} onChange={toggle} />
          Activa
        </label>
      </div>
      <div>
        <label className="label">Texto que verá el funcionario</label>
        <textarea rows={2} className="input bg-amber-50/50" value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      <div>
        <label className="label">Origen / advertencia</label>
        <input className="input" value={origin} onChange={(e) => setOrigin(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2">
        {overridden && <button type="button" className="btn-secondary" onClick={reset}>Restablecer original</button>}
        {dirty && (
          <>
            <button type="button" className="btn-secondary" onClick={() => { setText(rule.text); setOrigin(rule.origin) }}>Cancelar</button>
            <button type="button" className="btn-primary" disabled={!text.trim()} onClick={save}>Guardar</button>
          </>
        )}
      </div>
    </div>
  )
}

export function RulesAdmin() {
  const { rules, reload } = useConfig()
  const [overrides, setOverrides] = useState<Record<string, RuleOverride>>({})
  const [type, setType] = useState('')
  const [q, setQ] = useState('')

  const refresh = async () => {
    await reload()
    setOverrides(await rulesApi.overrides())
  }
  useEffect(() => {
    void rulesApi.overrides().then(setOverrides)
  }, [])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return rules.filter(
      (r) =>
        (!type || r.type === type) &&
        (!term || `${r.id} ${r.text} ${r.trigger} ${r.origin}`.toLowerCase().includes(term)),
    )
  }, [rules, type, q])

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        Edita el texto que aparece en el resultado o desactiva una regla. Las condiciones (columna «Se activa cuando»)
        están en <code>src/domain/rules.ts</code>. Las visitas ya guardadas conservan el texto con que se guardaron.
      </p>
      <div className="flex flex-wrap gap-2">
        <input className="input max-w-xs" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input max-w-48" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Todos los tipos</option>
          {RULE_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <span className="self-center text-sm text-slate-400">
          {filtered.length} de {RULES.length} · {Object.keys(overrides).length} editadas
        </span>
      </div>
      {filtered.map((r) => (
        <RuleRow key={`${r.id}|${r.text}|${r.origin}`} rule={r} overridden={!!overrides[r.id]} onSaved={refresh} />
      ))}
    </div>
  )
}
