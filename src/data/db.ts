import type { QuestionOverride, RuleOverride, Staff, Visit } from '../domain/types'

/**
 * Base de datos de mentira: un único objeto JSON en localStorage.
 * Solo `api.ts` debe usar este módulo; para pasar a un backend real basta con reemplazar `api.ts`.
 */
export interface DbShape {
  version: number
  visits: Visit[]
  staff: Staff[]
  ruleOverrides: Record<string, RuleOverride>
  questionOverrides: Record<string, QuestionOverride>
}

const KEY = 'guia-vd-db'
let memory: DbShape | null = null

export function readDb(): DbShape | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as DbShape
  } catch {
    /* almacenamiento bloqueado o corrupto: usar memoria */
  }
  return memory
}

export function writeDb(db: DbShape) {
  memory = db
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch {
    /* sin almacenamiento persistente: queda en memoria */
  }
}

export function clearDb() {
  memory = null
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignorar */
  }
}
