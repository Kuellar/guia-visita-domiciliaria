import { BARTHEL_SEVERA, EDAD_20_64, EDAD_65, MENORES_20, NO, SI, VDI } from './questions'
import type { Rule, RuleContext } from './types'

/**
 * Catálogo de reglas (hoja REGLAS EDITABLES).
 * - `text` y `origin` son los valores por defecto; se pueden sobrescribir desde Administración → Reglas.
 * - `when` es la condición (columna E de la planilla). Para cambiarla edita este archivo y corre `npm test`.
 */

type When = (c: RuleContext) => boolean

const PROF_CLAP = ['Médico/a', 'Matrón/a', 'Enfermero/a']

const clapPendiente: When = (c) =>
  (c.is('edad', ...MENORES_20) || (c.is('edad', EDAD_20_64) && c.get('edad20') === SI)) && c.is('clap', NO)
const barthelSeveraEnEvaluacion: When = (c) => c.is('evalDep', SI) && c.is('barthel', BARTHEL_SEVERA)
const cronicaCardio: When = (c) => c.is('cronicas', SI) && (c.is('cardio', SI) || c.is('diabetesAcv', SI))
const cronicaSaludMental: When = (c) => c.is('cronicas', SI) && (c.is('saludMental', SI) || c.is('demencia', SI))
const vdiSaludMental = (...visitas: string[]): When => (c) =>
  c.is('motivo', VDI) && c.is('visitasPrevias', ...visitas) && cronicaSaludMental(c)

type RuleDef = Omit<Rule, 'active'> & { active?: boolean }

const R = (
  id: number,
  type: Rule['type'],
  trigger: string,
  text: string,
  origin: string,
  when: When,
  dependsOn?: number[],
): RuleDef => ({ id, type, trigger, text, origin, when, dependsOn })

const A = 'ACTIVIDAD' as const
const F = 'FORMULARIO' as const
const O = 'OBSERVACIÓN' as const

const DEFS: RuleDef[] = [
  R(1, A, 'Motivo: citación/rescate', 'Rescate de pacientes inasistentes - En domicilio', 'Borrador',
    (c) => c.is('motivo', 'Citación o rescate')),
  R(2, A, 'Motivo: entrega', 'Entrega de medicamentos y/o alimentos en domicilio: confirmar actividad y código local.', 'Propuesta | No se incluye una actividad específica para entrega en el borrador.',
    (c) => c.is('motivo', 'Entrega de medicamentos o alimentos')),
  R(3, A, 'Motivo: procedimiento', 'Tratamientos y/o Procedimientos en Domicilio: confirmar prestación y código local.', 'Borrador adaptado | Nombre de subcategoría a verificar.',
    (c) => c.is('motivo', 'Procedimiento o tratamiento')),
  R(4, A, 'VDI sin dependencia severa confirmada', 'Visita Domiciliaria Integral: seleccionar código específico autorizado por el establecimiento.', 'Propuesta',
    (c) => c.is('motivo', VDI) && c.is('depSevera', NO) && ![51, 52, 53].some((id) => c.fired.has(id)) && !barthelSeveraEnEvaluacion(c),
    [51, 52, 53]),
  R(5, A, 'Dependencia severa, sin plan vigente', 'Elaboración Plan Cuidado Integral a Persona con Dependencia Severa', 'Borrador',
    (c) => c.is('depSevera', SI) && c.is('planPersona', NO)),
  R(6, A, 'Dependencia severa, con plan vigente', 'Evaluación y actualización plan de cuidados a personas con dependencia severa', 'Borrador',
    (c) => c.is('depSevera', SI) && c.is('planPersona', SI)),
  R(7, A, 'Cuidador con plan no vigente', 'Elaboración plan de cuidados a cuidador', 'Borrador',
    (c) => c.is('depSevera', SI) && c.is('cuidador', SI) && c.is('planCuidador', NO)),
  R(8, A, 'Cuidador con plan vigente', 'Evaluación y actualización plan de cuidados a cuidador', 'Borrador',
    (c) => c.is('depSevera', SI) && c.is('cuidador', SI) && c.is('planCuidador', SI)),
  R(9, A, 'Evaluación de dependencia sin clasificación Barthel severa', 'Evaluación funcional / dependencia: seleccionar actividad local de evaluación; no registrar como dependencia confirmada.', 'Propuesta',
    (c) => c.is('evalDep', SI) && !barthelSeveraEnEvaluacion(c)),
  R(10, A, 'ChCC o programa de acompañamiento', 'Registro de actividad ChCC o Acompañamiento NNAJ, según programa vigente.', 'Propuesta',
    (c) => c.is('chcc', SI)),
  R(11, F, 'Dependiente severo confirmado o en evaluación: clasificar Barthel', 'Barthel (registrar puntaje y clasificación seleccionada)', 'Borrador',
    (c) => c.is('depSevera', SI) || c.is('evalDep', SI)),
  R(12, F, 'Dependencia severa previamente confirmada o identificada durante evaluación (Barthel 20–35)', 'programa dependencia, padds y cpu', 'Solicitud octubre 2026 | También se aplica durante evaluación de dependencia si Barthel resulta severa (20–35).',
    (c) => c.is('depSevera', SI) || barthelSeveraEnEvaluacion(c)),
  R(13, F, 'Evaluación con Barthel severo, o dependencia confirmada con cuidador y Zarit no vigente', 'Zarit abreviado', 'Solicitud octubre 2026 | Durante evaluación con Barthel 20–35 se indica junto a «programa dependencia, padds y cpu». Comprobar cuidador disponible y aplicación pertinente.',
    (c) => barthelSeveraEnEvaluacion(c) || (c.is('depSevera', SI) && c.is('cuidador', SI) && c.is('zaritVigente', NO))),
  R(14, F, 'Dependencia severa con plan vigente o por crear', 'Plan de cuidados integral de persona con dependencia severa', 'Borrador adaptado',
    (c) => c.is('depSevera', SI)),
  R(15, F, 'Dependencia severa con cuidador', 'Plan de cuidados del cuidador', 'Borrador adaptado',
    (c) => c.is('depSevera', SI) && c.is('cuidador', SI)),
  R(16, F, '0–9 años, control pendiente', 'Registro de control de salud infantil según programa local', 'Propuesta',
    (c) => c.is('edad', '0 a 9 años') && c.is('controlInfantil', NO)),
  R(17, F, 'Hasta 20 años incluido, CLAP pendiente, médico/a, matrón/a o enfermero/a', 'Formulario CLAP / ficha de control de salud adolescente (realizar CLAP).', 'Solicitud octubre 2026 | Verificar pertinencia de CLAP en menores de 10 años según programa local.',
    (c) => clapPendiente(c) && c.is('estamento', ...PROF_CLAP)),
  R(18, F, '20–64 años, EMP pendiente', 'EMP (Examen de Medicina Preventiva)', 'Borrador',
    (c) => c.is('edad', EDAD_20_64) && c.is('emp', NO) && !c.is('estamento', 'TENS')),
  R(19, F, '65 años o más, EMP/EMPAM no vigente, estamento enfermería', 'Completar formulario de EMP', 'Solicitud octubre 2026 | Confirmar denominación del formulario EMP para 65+ en la plataforma local.',
    (c) => c.is('estamento', 'Enfermero/a') && c.is('edad', EDAD_65) && c.is('emp', NO)),
  R(20, F, 'Patología cardiovascular, diabetes o ACV', 'Formulario de Salud Cardiovascular Integral', 'Actualización solicitada | Prestación según protocolo local.',
    cronicaCardio),
  R(21, F, 'Salud mental o demencia', 'Formulario de Salud Mental', 'Actualización solicitada | Demencia incluida.',
    cronicaSaludMental),
  R(22, F, 'Usuario ECICEP', 'Plan de Cuidado Integral / registro de seguimiento ECICEP (según plataforma local)', 'Propuesta',
    (c) => c.is('ecicep', SI)),
  R(23, F, 'Visita de programa ChCC / acompañamiento', 'Registro de ChCC o programa de acompañamiento NNAJ, según prestación efectuada.', 'Propuesta',
    (c) => c.is('chcc', SI)),
  R(24, F, 'Usuario NANEAS', 'Registro NANEAS y formularios clínicos correspondientes, según programa local.', 'Propuesta',
    (c) => c.is('naneas', SI)),
  R(25, O, 'Visita por rescate', 'Documentar causal de inasistencia, intento de contacto y coordinación de nueva citación.', 'Propuesta',
    (c) => c.is('motivo', 'Citación o rescate')),
  R(26, O, 'Visita por entrega', 'Registrar destinatario, producto entregado, cantidad y comprobante de recepción según norma local.', 'Propuesta',
    (c) => c.is('motivo', 'Entrega de medicamentos o alimentos')),
  R(27, O, 'Visita por procedimiento', 'Registrar indicación, procedimiento ejecutado, tolerancia, insumos y eventos adversos si los hubo.', 'Propuesta',
    (c) => c.is('motivo', 'Procedimiento o tratamiento')),
  R(28, O, 'Control infantil pendiente', 'Coordinar control de salud infantil con el equipo de sector.', 'Propuesta',
    (c) => c.is('controlInfantil', NO)),
  R(29, O, 'Hasta 20 años incluido, CLAP pendiente, otros estamentos', 'Derivar a CLAP.', 'Solicitud octubre 2026 | Solo derivación; no generar formulario CLAP en otros estamentos.',
    (c) => clapPendiente(c) && c.get('estamento') !== undefined && !c.is('estamento', ...PROF_CLAP)),
  R(30, O, '20 a 64 años, EMP no vigente, estamento enfermería', 'Evaluar realización del EMP según competencia, oportunidad y protocolo del establecimiento.', 'Borrador adaptado',
    (c) => c.is('emp', NO) && c.is('edad', EDAD_20_64) && c.is('estamento', 'Enfermero/a')),
  R(31, O, '20 a 64 años, EMP no vigente; profesional distinto de enfermería y TENS', 'Gestionar realización del EMP con el coordinador de sector y el estamento correspondiente.', 'Borrador adaptado',
    (c) => c.is('emp', NO) && c.is('edad', EDAD_20_64) && c.get('estamento') !== undefined && !c.is('estamento', 'Enfermero/a', 'TENS')),
  R(32, O, 'Vacunación incompleta', 'Coordinar actualización de vacunación del usuario y cuidador (si existe) con el equipo de sector.', 'Borrador',
    (c) => c.is('vacunas', NO)),
  R(33, O, 'Posible dependencia en evaluación', 'Completar evaluación funcional y verificación de criterios locales antes de clasificar dependencia severa.', 'Propuesta',
    (c) => c.is('evalDep', SI)),
  R(34, O, 'Dependencia severa confirmada sin cuidador', 'Evaluar red de apoyo y pertinencia de intervención de trabajo social.', 'Propuesta',
    (c) => c.is('depSevera', SI) && c.is('cuidador', NO)),
  R(35, O, 'Dependencia severa confirmada', 'Revisar pertinencia del plan domiciliario, prestaciones y acuerdos de seguimiento.', 'Propuesta',
    (c) => c.is('depSevera', SI)),
  R(36, O, 'Cuidador con Zarit no vigente', 'Aplicar Zarit, registrar resultados y definir seguimiento según instrumento y contexto.', 'Borrador adaptado',
    (c) => c.is('cuidador', SI) && c.is('zaritVigente', NO)),
  R(37, O, 'Zarit 17-20: sobrecarga intensa', 'Se sugiere derivar a cuidador a taller de cuidador o control de salud mental.', 'Solicitud octubre 2026 | Activación por rango 17-20; validar versión local de Zarit.',
    (c) => c.is('zaritTramo', '17-20 - Sobrecarga intensa')),
  R(38, O, 'Zarit 0-16: sin sobrecarga', 'Zarit: sin sobrecarga (puntaje 0-16).', 'Solicitud octubre 2026 | Clasificación según los rangos indicados.',
    (c) => c.is('zaritTramo', '0-16 - Sin sobrecarga')),
  R(39, O, 'Controles de crónicos atrasados', 'Gestionar regularización de controles de enfermedades crónicas con profesional tratante/sector.', 'Propuesta',
    (c) => c.is('cronicosAlDia', NO)),
  R(40, O, 'Cardiovascular descompensado y exámenes de más de 3 meses', 'Solicitar exámenes y gestionar revisión por profesional.', 'Condición solicitada | Confirmar exámenes pertinentes.',
    (c) => c.is('cvCompensada', NO) && c.is('examenesCv', 'Más de 3 meses')),
  R(41, O, 'Sin exámenes cardiovasculares disponibles', 'Revisar necesidad de solicitar exámenes y gestionar evaluación por profesional, según condición clínica.', 'Acción sugerida | Según juicio clínico.',
    (c) => c.is('examenesCv', 'No tiene exámenes')),
  R(42, O, 'ECICEP', 'Revisar continuidad de cuidados, PCI y coordinación de controles ECICEP.', 'Propuesta',
    (c) => c.is('ecicep', SI)),
  R(43, O, 'NANEAS', 'Considerar necesidades especiales de atención en salud y coordinación con programas pertinentes.', 'Propuesta',
    (c) => c.is('naneas', SI)),
  R(44, O, 'ChCC o acompañamiento', 'Aplicar ruta correspondiente de ChCC / acompañamiento NNAJ y registrar prestaciones efectivas.', 'Propuesta',
    (c) => c.is('chcc', SI)),
  R(45, O, 'Patología cardiovascular, diabetes y/o ACV', 'Revisar tratamiento, adherencia, alertas clínicas y necesidad de seguimiento cardiovascular.', 'Propuesta',
    cronicaCardio),
  R(46, O, 'Salud mental (incluye demencia)', 'Verificar continuidad de controles de salud mental, signos de alarma y apoyos disponibles.', 'Propuesta',
    cronicaSaludMental),
  R(47, O, 'Demencia', 'Evaluar seguridad domiciliaria, funcionalidad, redes de apoyo y necesidades del cuidador.', 'Propuesta',
    (c) => c.is('demencia', SI)),
  R(48, O, 'VDI sin visitas previas en el año', 'Primera visita desde enero: verificar diagnósticos, planes previos y trazabilidad de atención.', 'Propuesta',
    (c) => c.is('visitasPrevias', '0')),
  R(49, A, 'Cardiovascular, diabetes y/o ACV', 'Habilitar actividad: Control cardiovascular (registrar cuando se realice la prestación).', 'Actualización solicitada | Validar código de actividad local.',
    cronicaCardio),
  R(50, A, 'Patología de salud mental o demencia', 'Habilitar actividad: Control de salud mental (registrar cuando se realice la prestación).', 'Actualización solicitada | Incluye demencia.',
    cronicaSaludMental),
  R(51, A, 'Salud mental o demencia; 0 visitas integrales previas', 'Visita domiciliaria integral familia con integrante con problema de salud mental - Primera visita', 'Actualización solicitada | Corresponde a la primera visita integral de salud mental.',
    vdiSaludMental('0')),
  R(52, A, 'Salud mental o demencia; 1 visita integral previa', 'Visita domiciliaria integral familia con integrante con problema de salud mental - Segunda visita', 'Actualización solicitada | Corresponde a la segunda visita integral de salud mental.',
    vdiSaludMental('1')),
  R(53, A, 'Salud mental o demencia; 2 o más visitas integrales previas', 'Visita domiciliaria integral familia con integrante con problema de salud mental - Tercera o más visitas de seguimiento', 'Actualización solicitada | Corresponde a partir de la tercera visita integral de salud mental.',
    vdiSaludMental('2', '3 o más')),
  R(54, O, '65 años o más, EMP/EMPAM no vigente, enfermero/a', 'Completar formulario de EMP.', 'Solicitud octubre 2026 | Solo enfermería; comprobar prestación realizada.',
    (c) => c.is('estamento', 'Enfermero/a') && c.is('edad', EDAD_65) && c.is('emp', NO)),
  R(55, O, '65 años o más, EMP/EMPAM no vigente, otro profesional (excepto TENS)', 'Derivar a EMPAM.', 'Solicitud octubre 2026 | Derivación al EMPAM para otros estamentos.',
    (c) => c.get('estamento') !== undefined && !c.is('estamento', 'Enfermero/a', 'TENS') && c.is('edad', EDAD_65) && c.is('emp', NO)),
  R(56, O, 'TENS sin EMP/EMPAM vigente, a cualquier edad', 'Derivar a EMP.', 'Solicitud octubre 2026 | Regla prioritaria para TENS, independiente de la edad; no derivar a EMPAM.',
    (c) => c.is('estamento', 'TENS') && c.is('emp', NO)),
  R(57, O, 'Hasta 20 años incluido, CLAP pendiente, médico/a, matrón/a o enfermero/a', 'Realizar CLAP.', 'Solicitud octubre 2026 | Solo estamentos médico/a, matrón/a o enfermero/a.',
    (c) => clapPendiente(c) && c.is('estamento', ...PROF_CLAP)),
  R(58, A, 'Evaluación de dependencia + Barthel severa + NO ECICEP | Persona', 'Ingresos del PADDS - Ingresos persona con dependencia severa - Ingresos con plan de cuidado integral (no ingresados a ECICEP)', 'Actualizado octubre 2026 | Sin ECICEP: ingreso PADDS de la persona.',
    (c) => barthelSeveraEnEvaluacion(c) && c.is('ecicep', NO)),
  R(59, A, 'Evaluación de dependencia + Barthel severa + NO ECICEP | Cuidador', 'Ingresos del PADDS - Ingreso cuidador - Ingreso con plan de cuidado al cuidador (no ingresado a ECICEP)', 'Actualizado octubre 2026 | Sin ECICEP: ingreso PADDS del cuidador.',
    (c) => barthelSeveraEnEvaluacion(c) && c.is('ecicep', NO)),
  R(60, A, 'Evaluación de dependencia + Barthel severa + SÍ ECICEP | Persona', 'Ingresos del PADDS - Ingresos persona con dependencia severa - Ingresos con plan de cuidado integral (ingresado vía ECICEP)', 'Actualizado octubre 2026 | Con ECICEP: ingreso PADDS de la persona.',
    (c) => barthelSeveraEnEvaluacion(c) && c.is('ecicep', SI)),
  R(61, A, 'Evaluación de dependencia + Barthel severa + SÍ ECICEP | Cuidador', 'Ingresos del PADDS - Ingreso cuidador - Ingreso con plan de cuidado al cuidador (ingresado vía ECICEP)', 'Actualizado octubre 2026 | Con ECICEP: ingreso PADDS del cuidador.',
    (c) => barthelSeveraEnEvaluacion(c) && c.is('ecicep', SI)),
  R(62, O, 'Persona sin ingreso a ECICEP', 'Solicitar ingreso ECICEP.', 'Se presenta cuando en el cuestionario se marca No a ECICEP. Gestionar según pertinencia clínica y criterios locales.',
    (c) => c.is('ecicep', NO)),
  R(63, A, 'Ingreso ECICEP y riesgo G1 (leve)', 'Control Integral con Riesgo Leve (G1)', 'Registrar esta actividad si corresponde al control integral efectuado; según estratificación vigente.',
    (c) => c.is('ecicep', SI) && c.is('riesgoEcicep', 'G1 - Riesgo leve')),
  R(64, A, 'Ingreso ECICEP y riesgo G2 (moderado)', 'Control Integral con Riesgo Moderado (G2)', 'Registrar esta actividad si corresponde al control integral efectuado; según estratificación vigente.',
    (c) => c.is('ecicep', SI) && c.is('riesgoEcicep', 'G2 - Riesgo moderado')),
  R(65, A, 'Ingreso ECICEP y riesgo G3 (alto)', 'Control Integral con Riesgo Alto (G3)', 'Registrar esta actividad si corresponde al control integral efectuado; según estratificación vigente.',
    (c) => c.is('ecicep', SI) && c.is('riesgoEcicep', 'G3 - Riesgo alto')),
]

export const RULES: Rule[] = DEFS.map((d) => ({ ...d, active: d.active ?? true }))
