import type { Answers, Staff } from '../domain/types'

/**
 * Datos de ejemplo cargados la primera vez (o al "Restablecer datos").
 * Se cargan solo cuando el navegador no tiene datos. Para recargarlos: Administración → Datos → Restablecer.
 */
export const SEED_VERSION = 1

export const SEED_STAFF: Staff[] = [
  { id: 's1', name: 'Dra. Camila Rojas', estamento: 'Médico/a', active: true },
  { id: 's2', name: 'Felipe Soto', estamento: 'Enfermero/a', active: true },
  { id: 's3', name: 'Valentina Muñoz', estamento: 'Matrón/a', active: true },
  { id: 's4', name: 'Javiera Pérez', estamento: 'Psicólogo/a', active: true },
  { id: 's5', name: 'Diego Contreras', estamento: 'TENS', active: true },
  { id: 's6', name: 'Constanza Díaz', estamento: 'Trabajador/a social', active: true },
]

const VDI = 'Visita domiciliaria integral'

export interface SeedVisit {
  date: string
  patientName: string
  patientRut: string
  staffId: string
  notes: string
  answers: Answers
}

export const SEED_VISITS: SeedVisit[] = [
  {
    date: '2026-10-05', patientName: 'Rosa Gutiérrez', patientRut: '5.126.337-5', staffId: 's1', notes: 'No asistió a control en septiembre.',
    answers: { estamento: 'Médico/a', motivo: 'Citación o rescate' },
  },
  {
    date: '2026-10-12', patientName: 'Luis Fernández', patientRut: '9.876.543-3', staffId: 's5', notes: '',
    answers: {
      estamento: 'TENS', motivo: VDI, edad: '65 años o más', emp: 'No', depSevera: 'No', vacunas: 'Sí', ecicep: 'No',
      visitasPrevias: '1', cronicas: 'Sí', cronicosAlDia: 'Sí', cardio: 'Sí', diabetesAcv: 'No', saludMental: 'No',
      demencia: 'No', cvCompensada: 'Sí', examenesCv: 'Hasta 3 meses',
    },
  },
  {
    date: '2026-10-18', patientName: 'Marta Herrera', patientRut: '4.321.987-1', staffId: 's2', notes: 'Hija cuidadora presente.',
    answers: {
      estamento: 'Enfermero/a', motivo: VDI, edad: '65 años o más', emp: 'Sí', depSevera: 'No', evalDep: 'Sí',
      barthel: '20 a 35 - Dependencia severa', vacunas: 'No', ecicep: 'Sí', visitasPrevias: '0', cronicas: 'No',
      riesgoEcicep: 'G3 - Riesgo alto',
    },
  },
  {
    date: '2026-10-22', patientName: 'Tomás Vidal', patientRut: '17.654.323-K', staffId: 's4', notes: '',
    answers: {
      estamento: 'Psicólogo/a', motivo: VDI, edad: '20 a 64 años', edad20: 'No', emp: 'Sí', depSevera: 'No',
      vacunas: 'Sí', ecicep: 'No', visitasPrevias: '1', cronicas: 'Sí', cronicosAlDia: 'No', cardio: 'No',
      saludMental: 'Sí', demencia: 'No',
    },
  },
  {
    date: '2026-10-28', patientName: 'Sofía Araya', patientRut: '23.456.789-6', staffId: 's3', notes: '',
    answers: {
      estamento: 'Matrón/a', motivo: VDI, edad: '15 a 19 años', chcc: 'No', clap: 'No', naneas: 'No',
      depSevera: 'No', vacunas: 'Sí', ecicep: 'No', visitasPrevias: '0', cronicas: 'No',
    },
  },
]
