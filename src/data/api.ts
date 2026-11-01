import type { Backend } from './backend'
import { localBackend } from './localApi'
import { supabaseBackend } from './supabaseApi'

/**
 * Punto único de acceso a datos. Con VITE_SUPABASE_URL en .env.local se usa Supabase;
 * si no, la base de datos de prueba en localStorage.
 */
export const backend: Backend = import.meta.env.VITE_SUPABASE_URL ? supabaseBackend : localBackend

export const visitsApi = backend.visits
export const staffApi = backend.staff
export const rulesApi = backend.rules
export const questionsApi = backend.questions
export const dataApi = backend.data
