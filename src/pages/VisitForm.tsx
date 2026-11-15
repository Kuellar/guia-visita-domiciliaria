import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ResultPanel } from '../components/ResultPanel'
import { Wizard } from '../components/Wizard'
import { Turnstile, captchaEnabled } from '../components/Turnstile'
import { backend, visitsApi } from '../data/api'
import { useAuth } from '../data/AuthContext'
import { useConfig } from '../data/ConfigContext'
import { evaluate } from '../domain/engine'
import type { Answers } from '../domain/types'
import { attempt } from '../lib/errors'

const today = () => new Date().toLocaleDateString('sv-SE')

export function VisitForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { questions, rules, staff } = useConfig()
  const { me, isAdmin, session, startAnonymous } = useAuth()
  // Funcionario sin cuenta: guarda con una sesión anónima y no puede volver a ver la visita.
  const isPublic = backend.kind === 'supabase' && !isAdmin
  const [loaded, setLoaded] = useState(!id)
  const [date, setDate] = useState(today())
  const [patientName, setPatientName] = useState('')
  const [staffId, setStaffId] = useState(() => (!id && me && me.id !== 'local' ? me.id : ''))
  const [notes, setNotes] = useState('')
  const [answers, setAnswers] = useState<Answers>(() =>
    !id && me?.estamento && questions[0].options.some((o) => o.value === me.estamento) ? { estamento: me.estamento } : {},
  )
  const [saving, setSaving] = useState(false)
  const [captcha, setCaptcha] = useState('')
  const [captchaKey, setCaptchaKey] = useState(0)
  const needsCaptcha = isPublic && !session && captchaEnabled

  useEffect(() => {
    if (!id) return
    void visitsApi.get(id).then((v) => {
      if (!v) return navigate('/visitas')
      setDate(v.date)
      setPatientName(v.patientName)
      setStaffId(v.staffId)
      setNotes(v.notes)
      setAnswers(v.answers)
      setLoaded(true)
    })
  }, [id, navigate])

  const evaluation = useMemo(() => evaluate(answers, questions, rules), [answers, questions, rules])
  const canSave = patientName.trim() && !saving && (!needsCaptcha || !!captcha)

  const pickStaff = (sid: string) => {
    setStaffId(sid)
    const s = staff.find((x) => x.id === sid)
    if (s && questions[0].options.some((o) => o.value === s.estamento)) {
      setAnswers((a) => ({ ...a, estamento: s.estamento }))
    }
  }

  const save = async () => {
    setSaving(true)
    if (isPublic && !session) {
      const error = await startAnonymous(captcha)
      if (error) {
        alert(error)
        setCaptcha('')
        setCaptchaKey((k) => k + 1)
        setSaving(false)
        return
      }
    }
    const visit = await attempt(() => visitsApi.save({
      id,
      date,
      patientName: patientName.trim(),
      staffId,
      notes,
      answers,
      status: evaluation.complete ? 'completa' : 'borrador',
      result: evaluation.fired,
    }))
    setSaving(false)
    if (!visit) return
    if (isPublic) navigate('/visitas/enviada', { state: { patientName: visit.patientName, date: visit.date, result: visit.result } })
    else navigate(`/visitas/${visit.id}`)
  }

  if (!loaded) return <p className="text-slate-500">Cargando…</p>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{id ? 'Editar visita' : 'Nueva visita'}</h1>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={() => setAnswers({})}>Reiniciar respuestas</button>
          <button type="button" className="btn-primary" disabled={!canSave} onClick={save}>
            {evaluation.complete || isPublic ? 'Guardar visita' : 'Guardar borrador'}
          </button>
        </div>
      </div>

      <div className="card grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="name">Paciente *</label>
          <input id="name" className="input" value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Nombre completo" maxLength={200} />
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
        <div className="sm:col-span-3">
          <label className="label" htmlFor="notes">Notas</label>
          <textarea id="notes" rows={2} maxLength={5000} className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {needsCaptcha && (
          <div className="sm:col-span-3">
            <Turnstile key={captchaKey} onToken={setCaptcha} />
          </div>
        )}
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
