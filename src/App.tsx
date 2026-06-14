import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import PwaInstallBanner from './components/PwaInstallBanner'
import TermsConsentModal from './components/TermsConsentModal'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import Dashboard from './pages/Dashboard'
import NewConsultation from './pages/NewConsultation'
import History from './pages/History'
import Patients from './pages/Patients'
import Billing from './pages/Billing'
import Settings from './pages/Settings'
import SuperAdmin from './pages/SuperAdmin'
import ClinicAdmin from './pages/ClinicAdmin'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
import OnboardingPlan from './pages/OnboardingPlan'
import OnboardingCard from './pages/OnboardingCard'
import SubscriptionCancelled from './pages/SubscriptionCancelled'
import SubscriptionExpired from './pages/SubscriptionExpired'

function IpBlockScreen() {
  const { signOut } = useAuth()
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="max-w-sm w-full text-center">
        <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">🔒</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Acceso institucional restringido</h1>
        <p className="text-slate-400 leading-relaxed mb-8">
          Tu institución ha configurado restricción de acceso por IP. Debes conectarte desde la red autorizada de tu clínica para usar Dictia.
        </p>
        <button
          onClick={signOut}
          className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, ipBlocked, profile } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (ipBlocked) return <IpBlockScreen />
  if (profile?.role === 'super_admin') return <>{children}</>

  const status = profile?.subscription_status
  const path = location.pathname

  // Onboarding routes — allow only when pending
  if (path.startsWith('/onboarding')) {
    if (status === 'trial' || status === 'active') return <Navigate to="/dashboard" replace />
    return <>{children}</>
  }

  // Subscription status screens — always allow
  if (path.startsWith('/subscription')) return <>{children}</>

  // Main app — require completed onboarding
  if (!status || status === 'pending') return <Navigate to="/onboarding/plan" replace />
  if (status === 'cancelled') return <Navigate to="/subscription/cancelado" replace />
  if (status === 'expired') return <Navigate to="/subscription/vencido" replace />

  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) return null
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PwaInstallBanner />
        <TermsConsentModal />
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/registro" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/privacidad" element={<PrivacyPage />} />
          <Route path="/terminos" element={<TermsPage />} />

          {/* Onboarding — logged in but subscription pending */}
          <Route path="/onboarding/plan" element={<ProtectedRoute><OnboardingPlan /></ProtectedRoute>} />
          <Route path="/onboarding/tarjeta" element={<ProtectedRoute><OnboardingCard /></ProtectedRoute>} />

          {/* Subscription status screens */}
          <Route path="/subscription/cancelado" element={<ProtectedRoute><SubscriptionCancelled /></ProtectedRoute>} />
          <Route path="/subscription/vencido" element={<ProtectedRoute><SubscriptionExpired /></ProtectedRoute>} />

          {/* Main app */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/nueva-consulta" element={<ProtectedRoute><NewConsultation /></ProtectedRoute>} />
          <Route path="/historial" element={<ProtectedRoute><History /></ProtectedRoute>} />
          <Route path="/pacientes" element={<ProtectedRoute><Patients /></ProtectedRoute>} />
          <Route path="/facturacion" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
          <Route path="/configuracion" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/admin/super" element={<ProtectedRoute><SuperAdmin /></ProtectedRoute>} />
          <Route path="/superadmin" element={<ProtectedRoute><SuperAdmin /></ProtectedRoute>} />
          <Route path="/admin/clinica" element={<ProtectedRoute><ClinicAdmin /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
