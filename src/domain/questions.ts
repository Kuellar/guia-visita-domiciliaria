import type { Answers, Option, Question } from './types'

/**
 * Preguntas del ASISTENTE (filas 8–35 de la planilla original).
 * Para cambiar textos usa Administración → Preguntas. Este archivo solo se edita
 * para cambiar condiciones o agregar preguntas.
 */

export const VDI = 'Visita domiciliaria integral'
export const SI = 'Sí'
export const NO = 'No'
export const BARTHEL_SEVERA = '20 a 35 - Dependencia severa'
export const EDAD_0_9 = '0 a 9 años'
export const EDAD_10_14 = '10 a 14 años'
export const EDAD_15_19 = '15 a 19 años'
export const EDAD_20_64 = '20 a 64 años'
export const EDAD_65 = '65 años o más'
export const MENORES_20 = [EDAD_0_9, EDAD_10_14, EDAD_15_19]

const opts = (...values: string[]): Option[] => values.map((v) => ({ value: v, label: v }))
const siNo = () => opts(SI, NO)

const isVdi = (a: Answers) => a.motivo === VDI
const isMenor20 = (a: Answers) => MENORES_20.includes(a.edad ?? '')
const hasCronicas = (a: Answers) => isVdi(a) && a.cronicas === SI
const hasCardio = (a: Answers) => hasCronicas(a) && (a.cardio === SI || a.diabetesAcv === SI)
const hasDepSevera = (a: Answers) => isVdi(a) && a.depSevera === SI
const hasCuidador = (a: Answers) => hasDepSevera(a) && a.cuidador === SI

export const QUESTIONS: Question[] = [
  {
    id: 'estamento', step: 1,
    label: 'Estamento profesional',
    help: 'Selecciona tu estamento, incluido Matrón/a o TENS.',
    options: opts('Médico/a', 'Enfermero/a', 'Matrón/a', 'Nutricionista', 'Trabajador/a social', 'Psicólogo/a', 'Kinesiólogo/a', 'TENS'),
    appliesWhen: () => true,
  },
  {
    id: 'motivo', step: 2,
    label: 'Motivo principal de la visita',
    help: 'Elige el objetivo predominante.',
    options: opts('Citación o rescate', 'Entrega de medicamentos o alimentos', 'Procedimiento o tratamiento', VDI),
    appliesWhen: () => true,
  },
  {
    id: 'edad', step: 3,
    label: 'Tramo de edad de la persona',
    help: 'Si seleccionas 20–64 años, responde también si tiene exactamente 20 años.',
    options: opts(EDAD_0_9, EDAD_10_14, EDAD_15_19, EDAD_20_64, EDAD_65),
    appliesWhen: isVdi,
    sub: {
      id: 'edad20',
      label: '¿Tiene exactamente 20 años? (cambia la indicación de CLAP)',
      options: siNo(),
      requiredWhen: (v) => v === EDAD_20_64,
    },
  },
  {
    id: 'chcc', step: 4,
    label: '¿Visita por ChCC o acompañamiento NNAJ?',
    help: 'Solo menores de 20 años.',
    options: siNo(),
    appliesWhen: (a) => isVdi(a) && isMenor20(a),
  },
  {
    id: 'controlInfantil', step: 5,
    label: '¿Control de salud infantil al día?',
    help: 'Solo 0 a 9 años.',
    options: siNo(),
    appliesWhen: (a) => isVdi(a) && a.edad === EDAD_0_9,
  },
  {
    id: 'clap', step: 6,
    label: '¿CLAP / control adolescente vigente?',
    help: 'CLAP si tiene hasta 20 años, incluidos los 19. En el tramo 20–64, solo si tiene exactamente 20 años.',
    options: siNo(),
    appliesWhen: (a) => isVdi(a) && (isMenor20(a) || (a.edad === EDAD_20_64 && a.edad20 === SI)),
  },
  {
    id: 'emp', step: 7,
    label: '¿EMP / EMPAM vigente?',
    help: 'TENS: todas las edades. Otros profesionales: 20 años o más.',
    options: siNo(),
    appliesWhen: (a) => isVdi(a) && (a.estamento === 'TENS' || a.edad === EDAD_20_64 || a.edad === EDAD_65),
  },
  {
    id: 'naneas', step: 8,
    label: '¿Es NANEAS?',
    help: 'Solo personas menores de 20 años.',
    options: siNo(),
    appliesWhen: (a) => isVdi(a) && isMenor20(a),
  },
  {
    id: 'depSevera', step: 9,
    label: '¿Presenta dependencia severa confirmada?',
    help: 'No equivale a estar en evaluación.',
    options: siNo(),
    appliesWhen: isVdi,
  },
  {
    id: 'evalDep', step: 10,
    label: '¿Se está evaluando dependencia severa?',
    help: 'Solo para Enfermero/a, cuando la dependencia aún no está confirmada.',
    options: siNo(),
    appliesWhen: (a) => isVdi(a) && a.estamento === 'Enfermero/a' && a.depSevera === NO,
    notApplicableHint: (a) => (a.estamento !== 'Enfermero/a' ? 'Solo enfermería · No aplica' : undefined),
  },
  {
    id: 'barthel', step: 11,
    label: 'Clasificación Barthel',
    help: 'Selecciona el rango del puntaje obtenido. Se activa ante dependencia confirmada o en evaluación.',
    options: opts('Menos de 20 - Dependencia total', BARTHEL_SEVERA, '40 a 55 - Dependencia moderada', '60 a 95 - Dependencia leve', '100 - Independencia'),
    appliesWhen: (a) => isVdi(a) && (a.depSevera === SI || a.evalDep === SI),
  },
  {
    id: 'vacunas', step: 12,
    label: '¿Vacunación vigente de usuario/cuidador?',
    help: 'Considera cuidador si existe.',
    options: siNo(),
    appliesWhen: isVdi,
  },
  {
    id: 'ecicep', step: 13,
    label: '¿Es usuario/a ECICEP?',
    help: 'La respuesta ECICEP define el tipo de ingreso PADDS. Si responde Sí, al final se preguntará por el riesgo G1/G2/G3.',
    options: siNo(),
    appliesWhen: (a) => isVdi(a) && [EDAD_15_19, EDAD_20_64, EDAD_65].includes(a.edad ?? ''),
  },
  {
    id: 'visitasPrevias', step: 14,
    label: 'Visitas integrales previas desde enero',
    help: 'Si hay salud mental, cuenta las visitas integrales previas por ese motivo.',
    options: opts('0', '1', '2', '3 o más'),
    appliesWhen: isVdi,
  },
  {
    id: 'planPersona', step: 15,
    label: '¿Plan de cuidados de la persona vigente?',
    help: 'Determina elaboración o actualización.',
    options: siNo(),
    appliesWhen: hasDepSevera,
  },
  {
    id: 'cuidador', step: 16,
    label: '¿Cuenta con cuidador/a identificado/a?',
    help: 'Solo dependencia severa confirmada.',
    options: siNo(),
    appliesWhen: hasDepSevera,
  },
  {
    id: 'planCuidador', step: 17,
    label: '¿Plan de cuidados de cuidador/a vigente?',
    help: 'Determina elaboración o actualización.',
    options: siNo(),
    appliesWhen: hasCuidador,
  },
  {
    id: 'zaritVigente', step: 18,
    label: '¿Zarit aplicado hace menos de 1 año?',
    help: 'Según registro clínico disponible.',
    options: siNo(),
    appliesWhen: hasCuidador,
  },
  {
    id: 'zaritTramo', step: 19,
    label: 'Clasificación de puntaje Zarit (cuidador/a)',
    help: 'Si Zarit está vigente, selecciona el tramo obtenido: 0 a 16 sin sobrecarga o 17 a 20 sobrecarga intensa. Puntajes fuera de esos rangos requieren revisión local.',
    options: opts('0-16 - Sin sobrecarga', '17-20 - Sobrecarga intensa'),
    appliesWhen: (a) => isVdi(a) && a.zaritVigente === SI,
  },
  {
    id: 'cronicas', step: 20,
    label: '¿Tiene enfermedades crónicas conocidas?',
    help: 'Habilita el módulo de cronicidad.',
    options: siNo(),
    appliesWhen: isVdi,
  },
  {
    id: 'cronicosAlDia', step: 21,
    label: '¿Controles de crónicos al día?',
    help: 'Solo si presenta enfermedades crónicas.',
    options: siNo(),
    appliesWhen: hasCronicas,
  },
  {
    id: 'cardio', step: 22,
    label: '¿Tiene patología cardiovascular?',
    help: 'Activa actividad y formulario cardiovascular.',
    options: siNo(),
    appliesWhen: hasCronicas,
  },
  {
    id: 'diabetesAcv', step: 23,
    label: '¿Tiene diabetes y/o antecedente de ACV?',
    help: 'Solo si respondió Sí a patología cardiovascular. Si cambia a No, esta respuesta queda fuera del resultado.',
    options: siNo(),
    appliesWhen: (a) => hasCronicas(a) && a.cardio === SI,
    notApplicableHint: (a) => (a.cardio === NO ? 'Sin patología cardiovascular · No aplica' : undefined),
  },
  {
    id: 'saludMental', step: 24,
    label: '¿Tiene alguna patología de salud mental?',
    help: 'Habilita visita integral familiar por salud mental y control de SM.',
    options: siNo(),
    appliesWhen: hasCronicas,
  },
  {
    id: 'demencia', step: 25,
    label: '¿Tiene diagnóstico de demencia?',
    help: 'También activa visita integral familiar por salud mental y su control.',
    options: siNo(),
    appliesWhen: hasCronicas,
  },
  {
    id: 'cvCompensada', step: 26,
    label: '¿Sus patologías cardiovasculares están compensadas?',
    help: 'Incluye diabetes/ACV; valorar control clínico.',
    options: siNo(),
    appliesWhen: hasCardio,
  },
  {
    id: 'examenesCv', step: 27,
    label: 'Antigüedad de exámenes cardiovasculares',
    help: 'En descompensación, revisar si tienen más de 3 meses.',
    options: opts('Hasta 3 meses', 'Más de 3 meses', 'No tiene exámenes'),
    appliesWhen: hasCardio,
  },
  {
    id: 'riesgoEcicep', step: 28,
    label: '¿Cuál es el riesgo ECICEP registrado?',
    help: 'Solo si está ingresado a ECICEP. Selecciona G1, G2 o G3 para indicar la actividad de control integral.',
    options: opts('G1 - Riesgo leve', 'G2 - Riesgo moderado', 'G3 - Riesgo alto'),
    appliesWhen: (a) => isVdi(a) && a.ecicep === SI,
  },
]
