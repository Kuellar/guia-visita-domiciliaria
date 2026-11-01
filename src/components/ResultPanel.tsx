import { useState } from 'react'
import { groupByType, RULE_TYPES } from '../domain/engine'
import type { FiredRule, RuleType } from '../domain/types'

const TITLES: Record<RuleType, string> = {
  ACTIVIDAD: 'Actividades',
  FORMULARIO: 'Formularios',
  OBSERVACIÓN: 'Observaciones',
}

const ACCENT: Record<RuleType, string> = {
  ACTIVIDAD: 'border-l-brand-500',
  FORMULARIO: 'border-l-sky-500',
  OBSERVACIÓN: 'border-l-amber-500',
}

export function resultToText(fired: FiredRule[]): string {
  const groups = groupByType(fired)
  return RULE_TYPES.filter((t) => groups[t].length)
    .map((t) => `${TITLES[t].toUpperCase()}\n${groups[t].map((f) => `• ${f.text}`).join('\n')}`)
    .join('\n\n')
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

interface Props {
  fired: FiredRule[]
  started: boolean
  answeredCount?: number
  complete?: boolean
}

export function ResultPanel({ fired, started, answeredCount, complete }: Props) {
  const [copied, setCopied] = useState<string | null>(null)
  const groups = groupByType(fired)
  const doCopy = async (key: string, text: string) => {
    if (await copy(text)) {
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Resultado</h2>
          {answeredCount !== undefined && (
            <p className="text-sm text-slate-500">
              {complete ? 'COMPLETO' : 'EN CURSO'}: {answeredCount} respuestas completadas
            </p>
          )}
        </div>
        {fired.length > 0 && (
          <button type="button" className="btn-secondary print:hidden" onClick={() => doCopy('all', resultToText(fired))}>
            {copied === 'all' ? 'Copiado ✓' : 'Copiar todo'}
          </button>
        )}
      </div>

      {RULE_TYPES.map((t) => (
        <section key={t} className={`card border-l-4 ${ACCENT[t]}`}>
          <h3 className="mb-2 text-sm font-semibold tracking-wide text-slate-600 uppercase">
            {TITLES[t]} <span className="text-slate-400">· {groups[t].length}</span>
          </h3>
          {!started ? (
            <p className="text-sm text-slate-400">Completa primero el estamento y el motivo de visita.</p>
          ) : groups[t].length === 0 ? (
            <p className="text-sm text-slate-400">Sin sugerencias.</p>
          ) : (
            <ul className="space-y-1.5">
              {groups[t].map((f) => (
                <li key={f.id} className="group flex items-start gap-2 text-sm">
                  <span className="mt-0.5 text-slate-300">•</span>
                  <span className="flex-1">{f.text}</span>
                  <button
                    type="button"
                    title="Copiar"
                    className="text-xs text-slate-400 opacity-60 group-hover:opacity-100 hover:text-brand-600 print:hidden"
                    onClick={() => doCopy(String(f.id), f.text)}
                  >
                    {copied === String(f.id) ? '✓' : 'copiar'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <p className="rounded-lg bg-slate-100 p-3 text-xs text-slate-500">
        ATENCIÓN: actividades, instrumentos, periodicidades y tramos de interpretación requieren validación del equipo
        local. No es un diagnóstico ni sustituye protocolos, competencias ni normas de registro locales. Registrar solo
        los controles efectivamente realizados; de lo contrario, coordinar la prestación.
      </p>
    </div>
  )
}
