import { NavLink, Outlet } from 'react-router-dom'
import { backend } from '../data/api'
import { useAuth } from '../data/AuthContext'

const LINKS = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/visitas/nueva', label: 'Nueva visita' },
  { to: '/visitas', label: 'Visitas', end: true },
  { to: '/criterios', label: 'Criterios' },
  { to: '/admin', label: 'Administración', admin: true },
]

export function Layout() {
  const { me, isAdmin, signOut } = useAuth()
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <NavLink to="/" className="font-semibold text-brand-700">
            Guía de Visita Domiciliaria
          </NavLink>
          <nav className="-mx-1 flex gap-1 overflow-x-auto text-sm">
            {LINKS.filter((l) => !l.admin || isAdmin).map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `rounded-md px-2.5 py-1.5 whitespace-nowrap ${isActive ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-600 hover:bg-slate-100'}`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          {backend.kind === 'supabase' && me && (
            <div className="ml-auto flex items-center gap-3 text-sm text-slate-500">
              <NavLink to="/cuenta" title="Cambiar contraseña" className="hover:text-brand-600">{me.name}</NavLink>
              <button type="button" className="hover:text-brand-600" onClick={signOut}>Salir</button>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
