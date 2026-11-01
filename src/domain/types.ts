/** Valor estable de una respuesta (no cambia aunque el administrador edite la etiqueta). */
export type Answers = Record<string, string | undefined>

export type Status = 'PENDIENTE' | 'EN ESPERA' | 'LISTO' | 'NO APLICA' | 'REVISAR'

export interface Option {
  /** Valor usado por las reglas. NO editar: las condiciones dependen de él. */
  value: string
  /** Texto visible. Editable desde Administración. */
  label: string
}

export interface Question {
  id: string
  step: number
  label: string
  help: string
  options: Option[]
  /** Condición de aplicabilidad (traducción de la columna E de ASISTENTE). Recibe solo respuestas LISTO. */
  appliesWhen: (a: Answers) => boolean
  /** Pregunta adicional embebida (p. ej. "¿tiene exactamente 20 años?"). */
  sub?: {
    id: string
    label: string
    options: Option[]
    /** Si se cumple, la subpregunta es obligatoria para quedar LISTO. */
    requiredWhen: (value: string) => boolean
  }
  /** Mensaje cuando NO APLICA por una razón específica. */
  notApplicableHint?: (a: Answers) => string | undefined
}

export type RuleType = 'ACTIVIDAD' | 'FORMULARIO' | 'OBSERVACIÓN'

export interface RuleContext {
  /** Respuesta efectiva (solo preguntas LISTO). */
  get: (id: string) => string | undefined
  /** true si la pregunta está LISTO y su valor es uno de los indicados. */
  is: (id: string, ...values: string[]) => boolean
  /** Ids de reglas ya disparadas (para reglas que dependen de otras). */
  fired: Set<number>
}

export interface Rule {
  id: number
  type: RuleType
  trigger: string
  text: string
  origin: string
  active: boolean
  when: (ctx: RuleContext) => boolean
  /** Reglas que deben evaluarse antes que esta. */
  dependsOn?: number[]
}

export interface RuleOverride {
  text?: string
  origin?: string
  active?: boolean
}

export interface QuestionOverride {
  label?: string
  help?: string
  options?: Record<string, string>
}

export interface FiredRule {
  id: number
  type: RuleType
  text: string
}

export interface Staff {
  id: string
  name: string
  estamento: string
  active: boolean
  /** Email con el que inicia sesión (solo con Supabase). */
  email?: string
  isAdmin?: boolean
}

export interface Visit {
  id: string
  createdAt: string
  updatedAt: string
  date: string
  patientName: string
  patientRut: string
  staffId: string
  notes: string
  answers: Answers
  status: 'borrador' | 'completa'
  /** Copia del resultado al guardar: no cambia si luego se editan los textos. */
  result: FiredRule[]
}
