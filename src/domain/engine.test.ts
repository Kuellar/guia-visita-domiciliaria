import { describe, expect, it } from 'vitest'
import { evaluate } from './engine'
import { QUESTIONS } from './questions'
import type { Answers } from './types'

/** Completa todas las preguntas aplicables: usa `given` o, por defecto, "No" / primera opción. */
function fill(given: Answers): Answers {
  const answers: Answers = { ...given }
  for (let i = 0; i < QUESTIONS.length; i++) {
    const ev = evaluate(answers)
    const q = ev.next
    if (!q) break
    if (!answers[q.id]) answers[q.id] = q.options.some((o) => o.value === 'No') ? 'No' : q.options[0].value
    if (q.sub?.requiredWhen(answers[q.id]!) && !answers[q.sub.id]) answers[q.sub.id] = 'No'
  }
  return answers
}

const ids = (a: Answers) => evaluate(fill(a)).fired.map((f) => f.id)
const vdi = (a: Answers): Answers => ({ motivo: 'Visita domiciliaria integral', ...a })

describe('estado de preguntas', () => {
  it('empieza con estamento pendiente y el resto en espera', () => {
    const ev = evaluate({})
    expect(ev.statuses.estamento).toBe('PENDIENTE')
    expect(ev.statuses.motivo).toBe('EN ESPERA')
    expect(ev.started).toBe(false)
    expect(ev.fired).toEqual([])
  })

  it('motivo distinto de VDI omite todo el resto y queda completo', () => {
    const ev = evaluate({ estamento: 'Médico/a', motivo: 'Citación o rescate' })
    expect(ev.complete).toBe(true)
    expect(ev.statuses.edad).toBe('NO APLICA')
    expect(ev.fired.map((f) => f.id)).toEqual([1, 25])
  })

  it('20–64 exige responder si tiene exactamente 20', () => {
    const ev = evaluate(vdi({ estamento: 'Médico/a', edad: '20 a 64 años' }))
    expect(ev.statuses.edad).toBe('PENDIENTE')
    expect(evaluate(vdi({ estamento: 'Médico/a', edad: '20 a 64 años', edad20: 'No' })).statuses.edad).toBe('LISTO')
  })

  it('valor inválido queda REVISAR', () => {
    expect(evaluate({ estamento: 'Otro' }).statuses.estamento).toBe('REVISAR')
  })

  it('ignora respuestas antiguas de preguntas que ya no aplican', () => {
    const a = fill(vdi({ estamento: 'Médico/a', edad: '65 años o más', cronicas: 'Sí', cardio: 'Sí', diabetesAcv: 'Sí' }))
    a.cardio = 'No'
    const ev = evaluate(fill(a))
    expect(ev.statuses.diabetesAcv).toBe('NO APLICA')
    expect(ev.stale).toContain('diabetesAcv')
    expect(ev.fired.map((f) => f.id)).not.toContain(20)
  })
})

describe('motivos', () => {
  it.each([
    ['Entrega de medicamentos o alimentos', [2, 26]],
    ['Procedimiento o tratamiento', [3, 27]],
  ])('%s', (motivo, expected) => {
    expect(ids({ estamento: 'TENS', motivo })).toEqual(expected)
  })
})

describe('preventivos', () => {
  it('TENS sin EMP deriva a EMP a cualquier edad', () => {
    for (const edad of ['0 a 9 años', '65 años o más']) {
      const r = ids(vdi({ estamento: 'TENS', edad, emp: 'No' }))
      expect(r).toContain(56)
      expect(r).not.toContain(55)
      expect(r).not.toContain(18)
    }
  })

  it('CLAP ≤19: médico realiza, nutricionista deriva', () => {
    const med = ids(vdi({ estamento: 'Médico/a', edad: '15 a 19 años', clap: 'No' }))
    expect(med).toEqual(expect.arrayContaining([17, 57]))
    expect(med).not.toContain(29)
    const nut = ids(vdi({ estamento: 'Nutricionista', edad: '15 a 19 años', clap: 'No' }))
    expect(nut).toContain(29)
    expect(nut).not.toContain(17)
  })

  it('CLAP en 20–64 solo con exactamente 20', () => {
    const e20 = evaluate(fill(vdi({ estamento: 'Matrón/a', edad: '20 a 64 años', edad20: 'Sí', clap: 'No' })))
    expect(e20.fired.map((f) => f.id)).toContain(57)
    const e21 = evaluate(fill(vdi({ estamento: 'Matrón/a', edad: '20 a 64 años', edad20: 'No' })))
    expect(e21.statuses.clap).toBe('NO APLICA')
  })

  it('65+ sin EMP: enfermería completa EMP, otros derivan a EMPAM', () => {
    expect(ids(vdi({ estamento: 'Enfermero/a', edad: '65 años o más', emp: 'No' }))).toEqual(expect.arrayContaining([19, 54]))
    const kine = ids(vdi({ estamento: 'Kinesiólogo/a', edad: '65 años o más', emp: 'No' }))
    expect(kine).toContain(55)
    expect(kine).not.toContain(54)
  })

  it('20–64 sin EMP: enfermería evalúa, otros gestionan', () => {
    expect(ids(vdi({ estamento: 'Enfermero/a', edad: '20 a 64 años', emp: 'No' }))).toEqual(expect.arrayContaining([18, 30]))
    expect(ids(vdi({ estamento: 'Psicólogo/a', edad: '20 a 64 años', emp: 'No' }))).toEqual(expect.arrayContaining([18, 31]))
  })
})

describe('dependencia', () => {
  it('evaluación con Barthel severo y sin ECICEP: 2 ingresos PADDS sin ECICEP', () => {
    const r = ids(vdi({ estamento: 'Enfermero/a', edad: '65 años o más', depSevera: 'No', evalDep: 'Sí', barthel: '20 a 35 - Dependencia severa', ecicep: 'No' }))
    expect(r).toEqual(expect.arrayContaining([11, 12, 13, 33, 58, 59, 62]))
    expect(r).not.toContain(4)
    expect(r).not.toContain(9)
    expect(r).not.toContain(60)
  })

  it('evaluación con Barthel severo y ECICEP G2: ingresos vía ECICEP + control G2', () => {
    const r = ids(vdi({ estamento: 'Enfermero/a', edad: '65 años o más', depSevera: 'No', evalDep: 'Sí', barthel: '20 a 35 - Dependencia severa', ecicep: 'Sí', riesgoEcicep: 'G2 - Riesgo moderado' }))
    expect(r).toEqual(expect.arrayContaining([60, 61, 64, 22, 42]))
    expect(r).not.toContain(58)
  })

  it('evaluación con Barthel leve: evaluación funcional y VDI genérica', () => {
    const r = ids(vdi({ estamento: 'Enfermero/a', edad: '65 años o más', depSevera: 'No', evalDep: 'Sí', barthel: '60 a 95 - Dependencia leve' }))
    expect(r).toEqual(expect.arrayContaining([4, 9, 11]))
  })

  it('solo enfermería ve la pregunta de evaluación', () => {
    const ev = evaluate(fill(vdi({ estamento: 'Médico/a', edad: '65 años o más', depSevera: 'No' })))
    expect(ev.statuses.evalDep).toBe('NO APLICA')
  })

  it('dependencia confirmada con cuidador, Zarit no vigente', () => {
    const r = ids(vdi({ estamento: 'Médico/a', edad: '65 años o más', depSevera: 'Sí', planPersona: 'No', cuidador: 'Sí', planCuidador: 'Sí', zaritVigente: 'No' }))
    expect(r).toEqual(expect.arrayContaining([5, 8, 11, 12, 13, 14, 15, 35, 36]))
  })

  it('Zarit 17–20 sugiere derivación', () => {
    const r = ids(vdi({ estamento: 'Médico/a', edad: '65 años o más', depSevera: 'Sí', cuidador: 'Sí', zaritVigente: 'Sí', zaritTramo: '17-20 - Sobrecarga intensa' }))
    expect(r).toContain(37)
    expect(r).not.toContain(13)
  })

  it('dependencia confirmada sin cuidador', () => {
    expect(ids(vdi({ estamento: 'Médico/a', edad: '65 años o más', depSevera: 'Sí', cuidador: 'No' }))).toContain(34)
  })
})

describe('cronicidad', () => {
  it('diabetes/ACV solo se habilita con patología CV', () => {
    const ev = evaluate(fill(vdi({ estamento: 'Médico/a', edad: '65 años o más', cronicas: 'Sí', cardio: 'No' })))
    expect(ev.statuses.diabetesAcv).toBe('NO APLICA')
    expect(ev.statuses.cvCompensada).toBe('NO APLICA')
  })

  it('CV descompensado con exámenes > 3 meses', () => {
    const r = ids(vdi({ estamento: 'Médico/a', edad: '65 años o más', cronicas: 'Sí', cardio: 'Sí', cvCompensada: 'No', examenesCv: 'Más de 3 meses' }))
    expect(r).toEqual(expect.arrayContaining([20, 40, 45, 49]))
  })

  it.each([
    ['0', 51],
    ['1', 52],
    ['2', 53],
    ['3 o más', 53],
  ])('salud mental con %s visitas previas → regla %i y sin VDI genérica', (visitasPrevias, rule) => {
    const r = ids(vdi({ estamento: 'Psicólogo/a', edad: '20 a 64 años', visitasPrevias, cronicas: 'Sí', saludMental: 'Sí' }))
    expect(r).toEqual(expect.arrayContaining([rule, 21, 46, 50]))
    expect(r).not.toContain(4)
  })
})

describe('ECICEP', () => {
  it.each([
    ['G1 - Riesgo leve', 63],
    ['G2 - Riesgo moderado', 64],
    ['G3 - Riesgo alto', 65],
  ])('%s', (riesgoEcicep, rule) => {
    expect(ids(vdi({ estamento: 'Médico/a', edad: '65 años o más', ecicep: 'Sí', riesgoEcicep }))).toContain(rule)
  })

  it('menores de 15 no ven ECICEP', () => {
    expect(evaluate(fill(vdi({ estamento: 'Médico/a', edad: '10 a 14 años' }))).statuses.ecicep).toBe('NO APLICA')
  })
})
