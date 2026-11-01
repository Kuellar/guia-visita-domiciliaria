import { applyQuestionOverrides, applyRuleOverrides, evaluate } from '../domain/engine'
import { QUESTIONS } from '../domain/questions'
import { RULES } from '../domain/rules'
import type { Question, QuestionOverride, Rule, RuleOverride, Staff, Visit } from '../domain/types'
import { mergeRuleOverride, type Backend, type StaffInput, type VisitInput } from './backend'
import { clearDb, readDb, writeDb, type DbShape } from './db'
import { SEED_STAFF, SEED_VERSION, SEED_VISITS } from './seed'

/** Backend de prueba: todo en localStorage de este navegador. */

const uid = () => (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2))
const now = () => new Date().toISOString()

function buildSeed(): DbShape {
  const visits: Visit[] = SEED_VISITS.map((s) => {
    const ev = evaluate(s.answers)
    const t = `${s.date}T12:00:00.000Z`
    return { ...s, id: uid(), createdAt: t, updatedAt: t, status: ev.complete ? 'completa' : 'borrador', result: ev.fired }
  })
  return { version: SEED_VERSION, visits, staff: SEED_STAFF, ruleOverrides: {}, questionOverrides: {} }
}

function load(): DbShape {
  const db = readDb()
  if (db) return db
  const fresh = buildSeed()
  writeDb(fresh)
  return fresh
}

function mutate<T>(fn: (db: DbShape) => T): T {
  const db = load()
  const out = fn(db)
  writeDb(db)
  return out
}

const visitsApi = {
  async list(): Promise<Visit[]> {
    return [...load().visits].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  },
  async get(id: string): Promise<Visit | undefined> {
    return load().visits.find((v) => v.id === id)
  },
  async save(input: VisitInput): Promise<Visit> {
    return mutate((db) => {
      const existing = input.id ? db.visits.find((v) => v.id === input.id) : undefined
      if (existing) {
        Object.assign(existing, input, { updatedAt: now() })
        return existing
      }
      const visit: Visit = { ...input, id: uid(), createdAt: now(), updatedAt: now() }
      db.visits.push(visit)
      return visit
    })
  },
  async remove(id: string): Promise<void> {
    mutate((db) => {
      db.visits = db.visits.filter((v) => v.id !== id)
    })
  },
}

const staffApi = {
  async list(): Promise<Staff[]> {
    return [...load().staff].sort((a, b) => a.name.localeCompare(b.name))
  },
  async save(input: StaffInput): Promise<Staff> {
    return mutate((db) => {
      const existing = input.id ? db.staff.find((s) => s.id === input.id) : undefined
      if (existing) return Object.assign(existing, input)
      const staff: Staff = { ...input, id: uid() }
      db.staff.push(staff)
      return staff
    })
  },
  async remove(id: string): Promise<void> {
    mutate((db) => {
      db.staff = db.staff.filter((s) => s.id !== id)
    })
  },
}

const rulesApi = {
  /** Reglas con los textos editados por el administrador aplicados. */
  async list(): Promise<Rule[]> {
    return applyRuleOverrides(RULES, load().ruleOverrides)
  },
  async overrides(): Promise<Record<string, RuleOverride>> {
    return load().ruleOverrides
  },
  async update(id: number, patch: RuleOverride): Promise<void> {
    mutate((db) => {
      const merged = mergeRuleOverride(id, db.ruleOverrides[id], patch)
      if (Object.keys(merged).length) db.ruleOverrides[id] = merged
      else delete db.ruleOverrides[id]
    })
  },
  async reset(id: number): Promise<void> {
    mutate((db) => {
      delete db.ruleOverrides[id]
    })
  },
}

const questionsApi = {
  async list(): Promise<Question[]> {
    return applyQuestionOverrides(QUESTIONS, load().questionOverrides)
  },
  async overrides(): Promise<Record<string, QuestionOverride>> {
    return load().questionOverrides
  },
  async update(id: string, override: QuestionOverride): Promise<void> {
    mutate((db) => {
      db.questionOverrides[id] = override
    })
  },
  async reset(id: string): Promise<void> {
    mutate((db) => {
      delete db.questionOverrides[id]
    })
  },
}

const dataApi = {
  async exportJson(): Promise<string> {
    return JSON.stringify(load(), null, 2)
  },
  async importJson(json: string): Promise<void> {
    const parsed = JSON.parse(json) as DbShape
    if (!Array.isArray(parsed.visits) || !Array.isArray(parsed.staff)) throw new Error('Archivo no válido')
    writeDb({ ...parsed, ruleOverrides: parsed.ruleOverrides ?? {}, questionOverrides: parsed.questionOverrides ?? {}, version: SEED_VERSION })
  },
  async reset(): Promise<void> {
    clearDb()
    load()
  },
}

export const localBackend: Backend = {
  kind: 'local',
  visits: visitsApi,
  staff: staffApi,
  rules: rulesApi,
  questions: questionsApi,
  data: dataApi,
}
