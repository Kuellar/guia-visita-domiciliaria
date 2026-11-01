import { NavLink, Outlet } from 'react-router-dom'

const TABS = [
  { to: 'reglas', label: 'Reglas y textos' },
  { to: 'preguntas', label: 'Preguntas' },
  { to: 'funcionarios', label: 'Funcionarios' },
  { to: 'datos', label: 'Datos y respaldo' },
]

export function AdminLayout() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Administración</h1>
      <nav className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              `-mb-px border-b-2 px-3 py-2 text-sm whitespace-nowrap ${isActive ? 'border-brand-600 font-medium text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
