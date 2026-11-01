import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ResultPanel } from '../components/ResultPanel'
import { Wizard } from '../components/Wizard'
import { visitsApi } from '../data/api'
import { useAuth } from '../data/AuthContext'
import { useConfig } from '../data/ConfigContext'
import { evaluate } from '../domain/engine'
import type { Answers } from '../domain/types'
import { attempt } from '../lib/errors'
import { formatRut, isValidRut } from '../lib/rut'

const today = () => new Date().toLocaleDateString('sv-SE')

export function VisitForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { questions, rules, staff } = useConfig()
  const { me } = useAuth()
  const [loaded, setLoaded] = useState(!id)
  const [date, setDate] = useState(today())
  const [patientName, setPatientName] = useState('')
  const [patientRut, setPatientRut] = useState('')
  const [staffId, setStaffId] = useState(() => (!id && me && me.id !== 'local' ? me.id : ''))
  const [notes, setNotes] = useState('')
  const [answers, setAnswers] = useState<Answers>(() =>
    !id && me?.estamento && questions[0].options.some((o) => o.value === me.estamento) ? { estamento: me.estamento } : {},
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    void visitsApi.get(id).then((v) => {
      if (!v) return navigate('/visitas')
      setDate(v.date)
      setPatientName(v.patientName)
      setPatientRut(v.patientRut)
      setStaffId(v.staffId)
      setNotes(v.notes)
      setAnswers(v.answers)
      setLoaded(true)
    })
  }, [id, navigate])

  const evaluation = useMemo(() => evaluate(answers, questions, rules), [answers, questions, rules])
  const rutError = patientRut && !isValidRut(patientRut) ? 'RUT no válido' : ''
  const canSave = patientName.trim() && !rutError && !saving

  const pickStaff = (sid: string) => {
    setStaffId(sid)
    const s = staff.find((x) => x.id === sid)
    if (s && questions[0].options.some((o) => o.value === s.estamento)) {
      setAnswers((a) => ({ ...a, estamento: s.estamento }))
    }
  }

  const save = async () => {
    setSaving(true)
    const visit = await attempt(() => visitsApi.save({
      id,
      date,
      patientName: patientName.trim(),
      patientRut: patientRut ? formatRut(patientRut) : '',
      staffId,
      notes,
      answers,
      status: evaluation.complete ? 'completa' : 'borrador',
      result: evaluation.fired,
    }))
    setSaving(false)
    if (visit) navigate(`/visitas/${visit.id}`)
  }

  if (!loaded) return <p className="text-slate-500">Cargando…</p>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{id ? 'Editar visita' : 'Nueva visita'}</h1>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={() => setAnswers({})}>Reiniciar respuestas</button>
          <button type="button" className="btn-primary" disabled={!canSave} onClick={save}>
            {evaluation.complete ? 'Guardar visita' : 'Guardar borrador'}
          </button>
        </div>
      </div>

      <div className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="label" htmlFor="name">Paciente *</label>
          <input id="name" className="input" value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Nombre completo" />
        </div>
        <div>
          <label className="label" htmlFor="rut">RUT</label>
          <input
            id="rut"
            className={`input ${rutError ? 'border-red-400' : ''}`}
            value={patientRut}
            onChange={(e) => setPatientRut(e.target.value)}
            onBlur={() => patientRut && isValidRut(patientRut) && setPatientRut(formatRut(patientRut))}
            placeholder="12.345.678-9"
          />
          {rutError && <p className="mt-1 text-xs text-red-600">{rutError}</p>}
        </div>
        <div>
          <label className="label" htmlFor="date">Fecha</label>
          <input id="date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="staff">Funcionario/a</label>
          <select id="staff" className="input" value={staffId} onChange={(e) => pickStaff(e.target.value)}>
            <option value="">— Seleccionar —</option>
            {staff.filter((s) => s.active || s.id === staffId).map((s) => (
              <option key={s.id} value={s.id}>{s.name} · {s.estamento}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <label className="label" htmlFor="notes">Notas</label>
          <textarea id="notes" rows={2} className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Wizard questions={questions} answers={answers} evaluation={evaluation} onChange={setAnswers} />
        <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto">
          <ResultPanel
            fired={evaluation.fired}
            started={evaluation.started}
            answeredCount={evaluation.answeredCount}
            complete={evaluation.complete}
          />
        </aside>
      </div>
    </div>
  )
}
