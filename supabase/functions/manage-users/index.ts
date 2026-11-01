// Edge Function "manage-users": crea usuarios y restablece contraseñas desde la app.
// Corre en los servidores de Supabase. La clave secreta (SUPABASE_SERVICE_ROLE_KEY) la entrega
// Supabase automáticamente aquí y NUNCA llega al navegador.
//
// Solo responde a funcionarios activos con is_admin = true en la tabla staff.
//
// Acciones (POST JSON):
//   { "action": "create", "email": "...", "password": "..." }
//   { "action": "reset-password", "email": "...", "password": "..." }

import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function findUserByEmail(email: string) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 })
    if (error) throw error
    const user = data.users.find((u) => u.email?.toLowerCase() === email)
    if (user) return user
    if (data.users.length < 100) return null
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return reply(405, { error: 'Método no permitido' })

  try {
    // 1. ¿Quién llama? (token de la sesión del navegador)
    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) return reply(401, { error: 'Sesión requerida' })
    const { data: caller, error: callerError } = await admin.auth.getUser(token)
    if (callerError || !caller.user?.email) return reply(401, { error: 'Sesión no válida' })

    // 2. ¿Es administrador activo?
    const { data: me, error: staffError } = await admin
      .from('staff')
      .select('id')
      .ilike('email', caller.user.email)
      .eq('active', true)
      .eq('is_admin', true)
      .maybeSingle()
    if (staffError) {
      console.error(staffError)
      return reply(500, { error: `No se pudo leer la tabla staff: ${staffError.message}` })
    }
    if (!me) return reply(403, { error: 'Solo un administrador puede gestionar usuarios' })

    // 3. Validar datos
    const { action, email: rawEmail, password } = await req.json()
    const email = String(rawEmail ?? '').trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(email)) return reply(400, { error: 'Email no válido' })
    if (typeof password !== 'string' || password.length < 8) {
      return reply(400, { error: 'La contraseña debe tener al menos 8 caracteres' })
    }

    // 4. Ejecutar
    if (action === 'create') {
      const { error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { must_change_password: true },
      })
      if (error) {
        if (/already|registered|exists/i.test(error.message)) {
          return reply(409, { error: 'Ya existe un usuario con ese email. Usa «Restablecer contraseña».' })
        }
        throw error
      }
      return reply(200, { ok: true })
    }

    if (action === 'reset-password') {
      const user = await findUserByEmail(email)
      if (!user) return reply(404, { error: 'No existe un usuario con ese email' })
      const { error } = await admin.auth.admin.updateUserById(user.id, {
        password,
        user_metadata: { ...user.user_metadata, must_change_password: true },
      })
      if (error) throw error
      return reply(200, { ok: true })
    }

    return reply(400, { error: 'Acción no válida' })
  } catch (e) {
    console.error(e)
    return reply(500, { error: (e as Error).message || 'Error interno' })
  }
})
