# Guía de Visita Domiciliaria

Versión web de la planilla `Guia_Visitas_Domiciliarias_Rangos_Etarios_y_CLAP_20.xlsx`.
Cuestionario guiado → actividades, formularios y observaciones sugeridas, con historial de visitas.

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # pruebas de la lógica (deben pasar siempre)
npm run build   # compila a dist/
```

## Cómo administrar

| Quiero…                                         | Dónde                                                         |
| ----------------------------------------------- | ------------------------------------------------------------- |
| Cambiar el texto de una actividad/formulario/obs. | App → Administración → Reglas y textos                        |
| Ocultar una regla                               | App → Administración → Reglas y textos → desmarcar «Activa»   |
| Cambiar texto de una pregunta u opción          | App → Administración → Preguntas                              |
| Agregar/desactivar funcionarios                 | App → Administración → Funcionarios                           |
| Respaldar / restaurar datos                     | App → Administración → Datos y respaldo                       |
| Cambiar **cuándo** se activa una regla          | `src/domain/rules.ts` (función `when`) + `npm test`           |
| Agregar o reordenar preguntas, cambiar condiciones | `src/domain/questions.ts` (`appliesWhen`) + `npm test`     |
| Textos de Inicio / Criterios                    | `src/domain/docs.ts`                                          |
| Datos de ejemplo                                | `src/data/seed.ts`                                            |

### Agregar una regla
1. En `src/domain/rules.ts` añade una línea `R(66, A, 'Se activa cuando…', 'Texto', 'Origen', (c) => c.is('pregunta', 'Valor'))`.
   - `c.is(id, ...valores)`: la pregunta está respondida (LISTO) con alguno de esos valores.
   - `c.get(id)`: valor efectivo de la pregunta (o `undefined`).
2. Agrega un caso en `src/domain/engine.test.ts` y corre `npm test`.

### Cómo funciona
- `src/domain/engine.ts` calcula el estado de cada pregunta igual que la planilla (PENDIENTE, EN ESPERA, LISTO, NO APLICA, REVISAR). Solo las respuestas LISTO cuentan para las reglas, así que las respuestas antiguas de preguntas que ya no aplican se ignoran.
- Cada opción tiene un **valor interno** (lo usan las reglas) y una **etiqueta** (editable). Cambiar la etiqueta no rompe la lógica.
- Al guardar una visita se guarda una copia del resultado, así que editar textos después no cambia el historial.

## Datos

Dos modos, elegidos automáticamente por `src/data/api.ts`:

- **Supabase** (si existe `.env.local` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`): datos compartidos, con inicio de sesión.
- **Local** (sin esas variables): base de datos de prueba en `localStorage`, con datos de ejemplo y sin inicio de sesión.

### Configurar Supabase (una vez)
1. Supabase → **SQL Editor** → pega y ejecuta `supabase/schema.sql` (crea las tablas y las reglas RLS).
2. En el mismo editor, crea el primer administrador:
   ```sql
   insert into public.staff (name, estamento, email, is_admin)
   values ('Tu Nombre', 'Enfermero/a', 'tu@email.com', true);
   ```
3. **Authentication → Users → Add user → Create new user**: el mismo email y una contraseña (marca *Auto confirm*).
4. **Authentication → Sign In / Providers**: desactiva *Allow new users to sign up*. Así solo entran las cuentas que tú creas.

### Edge Function `manage-users` (una vez)
Permite crear usuarios y restablecer contraseñas desde la app, sin entrar a Supabase.
Supabase → **Edge Functions** → *Deploy a new function* → *Via Editor*, nombre `manage-users`, pega
`supabase/functions/manage-users/index.ts` y despliega. La clave secreta la pone Supabase automáticamente.

### Dar acceso a otra persona
App → Administración → Funcionarios: agrégala con su email y una contraseña temporal (botón «Generar»).
Al entrar por primera vez se le pide crear su propia contraseña. Si la olvida: «Restablecer contraseña».

Para quitar el acceso, desactívala en Funcionarios.

### Seguridad
- Una cuenta solo ve datos si su email figura como funcionario **activo** en la tabla `staff` (funciones `is_staff()` / `is_admin()` en `schema.sql`).
- Funcionarios: leen todo, crean visitas y editan/borran las propias. Administradores: además editan textos, funcionarios y cualquier visita.
- La *publishable key* puede estar en la app; **nunca** pongas la *secret / service_role key* en el código.
