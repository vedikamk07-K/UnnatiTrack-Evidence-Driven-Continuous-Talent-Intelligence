import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './state/AuthContext.jsx'
import { DataProvider } from './state/DataContext.jsx'
import { ToastProvider } from './components/ui.jsx'
import Shell from './components/Shell.jsx'
import { RoleSelect, Login } from './pages/auth/Login.jsx'
import Dashboard from './pages/hr/Dashboard.jsx'
import Employees from './pages/hr/Employees.jsx'
import EmployeeProfile from './pages/hr/EmployeeProfile.jsx'
import CompetencyPage from './pages/hr/CompetencyPage.jsx'
import Competencies from './pages/hr/Competencies.jsx'
import Evidence from './pages/hr/Evidence.jsx'
import Settings from './pages/Settings.jsx'
import { MyGrowth, MyCompetencies, MyCompetency, MyEvidence, HRFeedback } from './pages/me/MyGrowth.jsx'

const Router = import.meta.env.VITE_ROUTER === 'hash' ? HashRouter : BrowserRouter

/** Role gate: the wrong role is redirected to its own home, never shown the page. */
function RequireRole({ role, children }) {
  const { session } = useAuth()
  if (!session) return <Navigate to="/" replace />
  if (session.role !== role) return <Navigate to={session.role === 'hr' ? '/hr/dashboard' : '/me/growth'} replace />
  return children
}

function Home() {
  const { session } = useAuth()
  if (session) return <Navigate to={session.role === 'hr' ? '/hr/dashboard' : '/me/growth'} replace />
  return <RoleSelect />
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <ToastProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login/:role" element={<Login />} />
              <Route path="/hr" element={<RequireRole role="hr"><Shell /></RequireRole>}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="employees" element={<Employees />} />
                <Route path="employees/:id" element={<EmployeeProfile />} />
                <Route path="employees/:id/:cid" element={<CompetencyPage />} />
                <Route path="competencies" element={<Competencies />} />
                <Route path="evidence" element={<Evidence />} />
                <Route path="settings" element={<Settings />} />
                <Route index element={<Navigate to="dashboard" replace />} />
              </Route>
              <Route path="/me" element={<RequireRole role="employee"><Shell /></RequireRole>}>
                <Route path="growth" element={<MyGrowth />} />
                <Route path="competencies" element={<MyCompetencies />} />
                <Route path="competencies/:cid" element={<MyCompetency />} />
                <Route path="evidence" element={<MyEvidence />} />
                <Route path="feedback" element={<HRFeedback />} />
                <Route path="settings" element={<Settings />} />
                <Route index element={<Navigate to="growth" replace />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </ToastProvider>
      </DataProvider>
    </AuthProvider>
  )
}
