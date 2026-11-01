import { QUESTIONS } from './questions'
import { RULES } from './rules'
import type {
  Answers, FiredRule, Question, QuestionOverride, Rule, RuleContext, RuleOverride, RuleType, Status,
} from './types'

export interface Evaluation {
  statuses: Record<string, Status>
  /** Solo respuestas de preguntas LISTO: lo único que usan las reglas. */
  effective: Answers
  /** Primera pregunta que espera respuesta (equivale a "SIGUIENTE PASO"). */
  next?: Question
  answeredCount: number
  complete: boolean
  /** Hay estamento y motivo: ya se puede mostrar resultado. */
  started: boolean
  fired: FiredRule[]
  /** Respuestas guardadas en preguntas que ya no aplican (se ignoran; conviene limpiarlas). */
  stale: string[]
}

export function evaluateQuestions(questions: Question[], answers: Answers) {
  const statuses: Record<string, Status> = {}
  const effective: Answers = {}
  let previousReady = true

  for (const q of questions) {
    const value = answers[q.id]
    let status: Status
    if (!previousReady) status = 'EN ESPERA'
    else if (!q.appliesWhen(effective)) status = 'NO APLICA'
    else if (!value) status = 'PENDIENTE'
    else if (!q.options.some((o) => o.value === value)) status = 'REVISAR'
    else if (q.sub?.requiredWhen(value)) {
      const subValue = answers[q.sub.id]
      if (!subValue) status = 'PENDIENTE'
      else status = q.sub.options.some((o) => o.value === subValue) ? 'LISTO' : 'REVISAR'
    } else status = 'LISTO'

    if (status === 'LISTO') {
      effective[q.id] = value
      if (q.sub?.requiredWhen(value!)) effective[q.sub.id] = answers[q.sub.id]
    }
    statuses[q.id] = status
    previousReady = status === 'LISTO' || status === 'NO APLICA'
  }
  return { statuses, effective }
}

function orderByDependencies(rules: Rule[]): Rule[] {
  const independent = rules.filter((r) => !r.dependsOn?.length)
  const dependent = rules.filter((r) => r.dependsOn?.length)
  return [...independent, ...dependent]
}

/** Evalúa las condiciones. `fired` incluye reglas inactivas (desactivar solo oculta el texto). */
export function evaluateRules(rules: Rule[], effective: Answers): Rule[] {
  const fired = new Set<number>()
  const ctx: RuleContext = {
    get: (id) => effective[id],
    is: (id, ...values) => effective[id] !== undefined && values.includes(effective[id]!),
    fired,
  }
  for (const rule of orderByDependencies(rules)) {
    if (rule.when(ctx)) fired.add(rule.id)
  }
  return rules.filter((r) => fired.has(r.id)).sort((a, b) => a.id - b.id)
}

export function evaluate(
  answers: Answers,
  questions: Question[] = QUESTIONS,
  rules: Rule[] = RULES,
): Evaluation {
  const { statuses, effective } = evaluateQuestions(questions, answers)
  const started = statuses.estamento === 'LISTO' && statuses.motivo === 'LISTO'
  const fired = started
    ? evaluateRules(rules, effective).filter((r) => r.active).map(({ id, type, text }) => ({ id, type, text }))
    : []
  const values = Object.values(statuses)
  const stale = questions
    .filter((q) => statuses[q.id] === 'NO APLICA' && answers[q.id])
    .map((q) => q.id)
  return {
    statuses,
    effective,
    next: questions.find((q) => statuses[q.id] === 'PENDIENTE' || statuses[q.id] === 'REVISAR'),
    answeredCount: values.filter((s) => s === 'LISTO').length,
    complete: values.every((s) => s === 'LISTO' || s === 'NO APLICA'),
    started,
    fired,
    stale,
  }
}

export const RULE_TYPES: RuleType[] = ['ACTIVIDAD', 'FORMULARIO', 'OBSERVACIÓN']

export function groupByType(fired: FiredRule[]): Record<RuleType, FiredRule[]> {
  return Object.fromEntries(RULE_TYPES.map((t) => [t, fired.filter((f) => f.type === t)])) as Record<RuleType, FiredRule[]>
}

export function applyRuleOverrides(rules: Rule[], overrides: Record<string, RuleOverride>): Rule[] {
  return rules.map((r) => ({ ...r, ...overrides[r.id] }))
}

export function applyQuestionOverrides(questions: Question[], overrides: Record<string, QuestionOverride>): Question[] {
  return questions.map((q) => {
    const o = overrides[q.id]
    if (!o) return q
    return {
      ...q,
      label: o.label ?? q.label,
      help: o.help ?? q.help,
      options: q.options.map((opt) => ({ ...opt, label: o.options?.[opt.value] ?? opt.label })),
    }
  })
}

/** Texto de una respuesta para mostrar (usa la etiqueta editable). */
export function answerLabel(q: Question, value: string | undefined): string {
  if (!value) return '—'
  return q.options.find((o) => o.value === value)?.label ?? value
}
