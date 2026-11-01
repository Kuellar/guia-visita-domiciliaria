import type { ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { backend } from './data/api'
import { AuthProvider, useAuth } from './data/AuthContext'
import { ConfigProvider } from './data/ConfigContext'
import { AdminLayout } from './pages/admin/AdminLayout'
import { DataAdmin } from './pages/admin/DataAdmin'
import { QuestionsAdmin } from './pages/admin/QuestionsAdmin'
import { RulesAdmin } from './pages/admin/RulesAdmin'
import { StaffAdmin } from './pages/admin/StaffAdmin'
import { ChangePassword } from './pages/ChangePassword'
import { Criterios } from './pages/Criterios'
import { Home } from './pages/Home'
import { Login, NotAuthorized } from './pages/Login'
import { VisitDetail } from './pages/VisitDetail'
import { VisitForm } from './pages/VisitForm'
import { VisitList } from './pages/VisitList'

function Gate({ children }: { children: ReactNode }) {
  const { loading, session, me, mustChangePassword } = useAuth()
  if (loading) return <p className="p-8 text-center text-slate-500">Cargando…</p>
  if (backend.kind === 'supabase' && !session) return <Login />
  if (!me) return <NotAuthorized />
  if (mustChangePassword) return <HashRouter><ChangePassword forced /></HashRouter>
  return <ConfigProvider>{children}</ConfigProvider>
}

function AdminOnly({ children }: { children: ReactNode }) {
  return useAuth().isAdmin ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <Gate>
        <HashRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="visitas" element={<VisitList />} />
              <Route path="visitas/nueva" element={<VisitForm key="new" />} />
              <Route path="visitas/:id" element={<VisitDetail />} />
              <Route path="visitas/:id/editar" element={<VisitForm />} />
              <Route path="criterios" element={<Criterios />} />
              <Route path="cuenta" element={<ChangePassword />} />
              <Route path="admin" element={<AdminOnly><AdminLayout /></AdminOnly>}>
                <Route index element={<Navigate to="reglas" replace />} />
                <Route path="reglas" element={<RulesAdmin />} />
                <Route path="preguntas" element={<QuestionsAdmin />} />
                <Route path="funcionarios" element={<StaffAdmin />} />
                <Route path="datos" element={<DataAdmin />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </HashRouter>
      </Gate>
    </AuthProvider>
  )
}
