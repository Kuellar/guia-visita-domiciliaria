/** Ejecuta una acción y muestra el error al usuario si falla (p. ej. sin permiso en Supabase). */
export async function attempt<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn()
  } catch (e) {
    alert((e as Error).message || 'Ocurrió un error. Intenta nuevamente.')
    return undefined
  }
}
