import { RULES } from '../domain/rules'
import type { Question, QuestionOverride, Rule, RuleOverride, Staff, Visit } from '../domain/types'

export type VisitInput = Omit<Visit, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
export type StaffInput = Omit<Staff, 'id'> & { id?: string }

/** Contrato que cumplen ambos backends (local y Supabase). Las pantallas solo conocen esto. */
export interface Backend {
  kind: 'local' | 'supabase'
  visits: {
    list(): Promise<Visit[]>
    get(id: string): Promise<Visit | undefined>
    save(input: VisitInput): Promise<Visit>
    remove(id: string): Promise<void>
  }
  staff: {
    list(): Promise<Staff[]>
    save(input: StaffInput): Promise<Staff>
    remove(id: string): Promise<void>
  }
  rules: {
    list(): Promise<Rule[]>
    overrides(): Promise<Record<string, RuleOverride>>
    update(id: number, patch: RuleOverride): Promise<void>
    reset(id: number): Promise<void>
  }
  questions: {
    list(): Promise<Question[]>
    overrides(): Promise<Record<string, QuestionOverride>>
    update(id: string, override: QuestionOverride): Promise<void>
    reset(id: string): Promise<void>
  }
  data: {
    exportJson(): Promise<string>
    /** Solo en modo local. */
    importJson?(json: string): Promise<void>
    reset?(): Promise<void>
  }
}

/** Une el cambio con lo ya editado y descarta lo que coincide con el valor por defecto. */
export function mergeRuleOverride(id: number, current: RuleOverride | undefined, patch: RuleOverride): RuleOverride {
  const def = RULES.find((r) => r.id === id)!
  const merged: RuleOverride = { ...current, ...patch }
  for (const k of Object.keys(merged) as (keyof RuleOverride)[]) {
    if (merged[k] === undefined || merged[k] === def[k]) delete merged[k]
  }
  return merged
}
