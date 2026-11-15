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

- **Supabase** (si existe `.env.local` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`): datos compartidos. Los funcionarios entran **sin cuenta** y solo guardan visitas; los administradores inician sesión.
- **Local** (sin esas variables): base de datos de prueba en `localStorage`, con datos de ejemplo y sin inicio de sesión.

### Configurar Supabase (una vez)
1. Supabase → **SQL Editor** → pega y ejecuta `supabase/schema.sql` (crea las tablas y las reglas RLS).
2. En el mismo editor, crea el primer administrador:
   ```sql
   insert into public.staff (name, estamento, email, is_admin)
   values ('Tu Nombre', 'Enfermero/a', 'tu@email.com', true);
   ```
3. **Authentication → Users → Add user → Create new user**: el mismo email y una contraseña (marca *Auto confirm*).
4. **Authentication → Sign In / Providers**: deja **activados** *Allow new users to sign up* y *Allow anonymous sign-ins* (la sesión invisible con la que los funcionarios guardan visitas; Supabase la cuenta como registro, por eso ambos deben estar activos). Mantén *Confirm email* activado.
   Una cuenta de email creada por cualquiera no obtiene acceso: las reglas RLS solo dan permisos a administradores registrados en `staff` y a sesiones anónimas (que solo pueden crear visitas).
5. **Captcha** (evita que un bot llene la base de datos):
   - En Cloudflare → *Turnstile* → *Add widget*: agrega el dominio de la app (y `localhost` para pruebas). Obtienes una *site key* y una *secret key*.
   - Supabase → **Authentication → Attack Protection** (o *Bot and Abuse Protection*) → activa *CAPTCHA protection*, proveedor **Turnstile**, pega la *secret key*.
   - En `.env.local` agrega `VITE_TURNSTILE_SITE_KEY=<site key>` y vuelve a compilar.
   - El captcha se pide al guardar la primera visita en un equipo y en el inicio de sesión de administradores.
6. **Authentication → Rate Limits**: *anonymous sign-ins* limita cuántas sesiones nuevas se crean por IP y hora (30 por defecto está bien).

### Edge Function `manage-users` (una vez)
Permite crear usuarios y restablecer contraseñas desde la app, sin entrar a Supabase.
Supabase → **Edge Functions** → *Deploy a new function* → *Via Editor*, nombre `manage-users`, pega
`supabase/functions/manage-users/index.ts` y despliega. La clave secreta la pone Supabase automáticamente.

### Funcionarios y administradores
- **Funcionarios**: no tienen cuenta. Abren la app, llenan el cuestionario y guardan. Agrégalos en Administración → Funcionarios solo para que aparezcan en el selector «Funcionario/a».
- **Administradores**: en Funcionarios marca «Administrador», ingresa su email y una contraseña temporal (botón «Generar»). Entran con el enlace «Acceso administrador»; la primera vez se les pide crear su propia contraseña. Si la olvidan: «Restablecer contraseña». Para quitar el acceso, desactívalos.

### Seguridad
- No se guarda el RUT. Al ejecutar `schema.sql` se elimina la columna `patient_rut` (exporta un respaldo antes si lo necesitas).
- Sesión anónima (funcionario): **solo puede crear** visitas; no puede leer ninguna, ni la tabla `staff` (el selector usa `staff_directory()`, que no expone emails). Máximo 20 visitas por hora por sesión (trigger `visits_rate_limit`) y límites de tamaño en los textos.
- Administrador (email **activo** con `is_admin` en `staff`, función `is_admin()`): lee, edita y borra todas las visitas, textos y funcionarios.
- Los textos de preguntas y reglas son legibles sin sesión (no son datos personales).
- Las sesiones anónimas se acumulan en *Authentication → Users*; al final de `schema.sql` hay una consulta opcional para borrar las de más de 30 días.
- La *publishable key* puede estar en la app; **nunca** pongas la *secret / service_role key* en el código.
