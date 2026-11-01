import { useRef, useState } from 'react'
import { backend, dataApi } from '../../data/api'
import { useConfig } from '../../data/ConfigContext'

export function DataAdmin() {
  const { reload } = useConfig()
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')

  const exportJson = async () => {
    const blob = new Blob([await dataApi.exportJson()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `respaldo-visitas-${new Date().toLocaleDateString('sv-SE')}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importJson = async (file: File) => {
    if (!confirm('Importar reemplazará TODOS los datos actuales (visitas, funcionarios y textos editados). ¿Continuar?')) return
    try {
      await dataApi.importJson!(await file.text())
      await reload()
      setMsg('Datos importados correctamente.')
    } catch (e) {
      setMsg(`Error al importar: ${(e as Error).message}`)
    }
  }

  const reset = async () => {
    if (!confirm('Esto borra todos los datos de este navegador y carga los datos de ejemplo. ¿Continuar?')) return
    await dataApi.reset!()
    await reload()
    setMsg('Datos restablecidos a los de ejemplo.')
  }

  return (
    <div className="space-y-3">
      <div className="card border-sky-200 bg-sky-50 text-sm text-sky-900">
        {backend.kind === 'supabase' ? (
          <>Los datos se guardan en <b>Supabase</b> y se comparten entre todos los usuarios. Supabase también permite exportar cada tabla a CSV desde su panel (Table Editor).</>
        ) : (
          <>Por ahora los datos se guardan <b>solo en este navegador</b> (base de datos de prueba). Descarga un respaldo regularmente.</>
        )}
      </div>
      {msg && <div className="card text-sm">{msg}</div>}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="card space-y-2">
          <h3 className="font-semibold">Descargar respaldo</h3>
          <p className="text-sm text-slate-500">Exporta visitas, funcionarios y textos editados en un archivo JSON.</p>
          <button type="button" className="btn-primary" onClick={exportJson}>Descargar JSON</button>
        </div>
        {dataApi.importJson && <div className="card space-y-2">
          <h3 className="font-semibold">Importar respaldo</h3>
          <p className="text-sm text-slate-500">Reemplaza los datos actuales con un archivo exportado antes.</p>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void importJson(f)
            e.target.value = ''
          }} />
          <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()}>Elegir archivo…</button>
        </div>}
        {dataApi.reset && <div className="card space-y-2">
          <h3 className="font-semibold">Restablecer</h3>
          <p className="text-sm text-slate-500">Borra todo y vuelve a cargar los datos de ejemplo.</p>
          <button type="button" className="btn-danger" onClick={reset}>Restablecer datos</button>
        </div>}
      </div>
    </div>
  )
}
