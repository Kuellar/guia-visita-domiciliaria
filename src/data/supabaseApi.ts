import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { applyQuestionOverrides, applyRuleOverrides } from '../domain/engine'
import { QUESTIONS } from '../domain/questions'
import { RULES } from '../domain/rules'
import type { FiredRule, QuestionOverride, RuleOverride, Staff, Visit } from '../domain/types'
import { mergeRuleOverride, type Backend } from './backend'

/** Backend real: Supabase (Postgres + Auth). La seguridad la aplica RLS en supabase/schema.sql. */

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

/** null en modo local (sin variables de entorno). */
export const supabase: SupabaseClient = URL && KEY ? createClient(URL, KEY) : (null as unknown as SupabaseClient)

/** Lanza el error de Supabase con un mensaje legible. */
function check<T>(res: { data: T; error: { message: string; code?: string } | null }): T {
  if (res.error) {
    const denied = res.error.code === '42501' || /permission|row-level/i.test(res.error.message)
    throw new Error(denied ? 'No tienes permiso para esta acción.' : res.error.message)
  }
  return res.data
}

interface VisitRow {
  id: string
  created_at: string
  updated_at: string
  date: string
  patient_name: string
  patient_rut: string
  staff_id: string | null
  notes: string
  answers: Visit['answers']
  status: Visit['status']
  result: FiredRule[]
}

const toVisit = (r: VisitRow): Visit => ({
  id: r.id,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  date: r.date,
  patientName: r.patient_name,
  patientRut: r.patient_rut,
  staffId: r.staff_id ?? '',
  notes: r.notes,
  answers: r.answers,
  status: r.status,
  result: r.result,
})

interface StaffRow {
  id: string
  name: string
  estamento: string
  email: string | null
  is_admin: boolean
  active: boolean
}

const toStaff = (r: StaffRow): Staff => ({
  id: r.id,
  name: r.name,
  estamento: r.estamento,
  email: r.email ?? '',
  isAdmin: r.is_admin,
  active: r.active,
})

async function ruleOverrides(): Promise<Record<string, RuleOverride>> {
  const rows = check(await supabase.from('rule_overrides').select('rule_id, text, origin, active'))
  return Object.fromEntries(
    (rows ?? []).map((r) => {
      const o: RuleOverride = {}
      if (r.text !== null) o.text = r.text
      if (r.origin !== null) o.origin = r.origin
      if (r.active !== null) o.active = r.active
      return [r.rule_id, o]
    }),
  )
}

async function questionOverrides(): Promise<Record<string, QuestionOverride>> {
  const rows = check(await supabase.from('question_overrides').select('question_id, label, help, options'))
  return Object.fromEntries(
    (rows ?? []).map((r) => [r.question_id, { label: r.label ?? undefined, help: r.help ?? undefined, options: r.options ?? undefined }]),
  )
}

/** Llama a la Edge Function manage-users y traduce su error a un mensaje legible. */
async function manageUsers(action: 'create' | 'reset-password', email: string, password: string) {
  const { error } = await supabase.functions.invoke('manage-users', { body: { action, email, password } })
  if (!error) return
  let message = error.message
  const ctx = (error as { context?: Response }).context
  if (ctx && typeof ctx.json === 'function') {
    try {
      message = (await ctx.json()).error ?? message
    } catch {
      /* respuesta sin JSON */
    }
  }
  if (/failed to send|fetch/i.test(message)) message = 'No se pudo contactar la función manage-users. ¿Está desplegada en Supabase?'
  throw new Error(message)
}

export const supabaseBackend: Backend = {
  kind: 'supabase',
  users: {
    create: (email, password) => manageUsers('create', email, password),
    resetPassword: (email, password) => manageUsers('reset-password', email, password),
  },
  visits: {
    async list() {
      const rows = check(await supabase.from('visits').select('*').order('date', { ascending: false }).order('created_at', { ascending: false }))
      return (rows as VisitRow[]).map(toVisit)
    },
    async get(id) {
      const row = check(await supabase.from('visits').select('*').eq('id', id).maybeSingle())
      return row ? toVisit(row as VisitRow) : undefined
    },
    async save(v) {
      const row = {
        date: v.date,
        patient_name: v.patientName,
        patient_rut: v.patientRut,
        staff_id: v.staffId || null,
        notes: v.notes,
        answers: v.answers,
        status: v.status,
        result: v.result,
      }
      const res = v.id
        ? await supabase.from('visits').update(row).eq('id', v.id).select().single()
        : await supabase.from('visits').insert(row).select().single()
      return toVisit(check(res) as VisitRow)
    },
    async remove(id) {
      const rows = check(await supabase.from('visits').delete().eq('id', id).select('id'))
      if (!rows?.length) throw new Error('No tienes permiso para eliminar esta visita.')
    },
  },
  staff: {
    async list() {
      const rows = check(await supabase.from('staff').select('*').order('name'))
      return (rows as StaffRow[]).map(toStaff)
    },
    async save(s) {
      const row = {
        name: s.name,
        estamento: s.estamento,
        email: s.email?.trim().toLowerCase() || null,
        is_admin: !!s.isAdmin,
        active: s.active,
      }
      const res = s.id
        ? await supabase.from('staff').update(row).eq('id', s.id).select().single()
        : await supabase.from('staff').insert(row).select().single()
      return toStaff(check(res) as StaffRow)
    },
    async remove(id) {
      check(await supabase.from('staff').delete().eq('id', id))
    },
  },
  rules: {
    async list() {
      return applyRuleOverrides(RULES, await ruleOverrides())
    },
    overrides: ruleOverrides,
    async update(id, patch) {
      const current = (await ruleOverrides())[id]
      const merged = mergeRuleOverride(id, current, patch)
      if (!Object.keys(merged).length) return supabaseBackend.rules.reset(id)
      check(await supabase.from('rule_overrides').upsert({
        rule_id: id,
        text: merged.text ?? null,
        origin: merged.origin ?? null,
        active: merged.active ?? null,
        updated_at: new Date().toISOString(),
      }))
    },
    async reset(id) {
      check(await supabase.from('rule_overrides').delete().eq('rule_id', id))
    },
  },
  questions: {
    async list() {
      return applyQuestionOverrides(QUESTIONS, await questionOverrides())
    },
    overrides: questionOverrides,
    async update(id, o) {
      check(await supabase.from('question_overrides').upsert({
        question_id: id,
        label: o.label ?? null,
        help: o.help ?? null,
        options: o.options ?? null,
        updated_at: new Date().toISOString(),
      }))
    },
    async reset(id) {
      check(await supabase.from('question_overrides').delete().eq('question_id', id))
    },
  },
  data: {
    async exportJson() {
      const [visits, staff, ro, qo] = await Promise.all([
        supabaseBackend.visits.list(),
        supabaseBackend.staff.list(),
        ruleOverrides(),
        questionOverrides(),
      ])
      return JSON.stringify({ exportedAt: new Date().toISOString(), visits, staff, ruleOverrides: ro, questionOverrides: qo }, null, 2)
    },
  },
}
