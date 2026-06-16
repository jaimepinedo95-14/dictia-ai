// Diagnostic: log which API keys are baked in at build time — remove after confirming
console.log('[Dictia] env keys at runtime:', {
  ANTHROPIC: import.meta.env.VITE_ANTHROPIC_API_KEY
    ? `✓ set (${(import.meta.env.VITE_ANTHROPIC_API_KEY as string).slice(0, 10)}…)`
    : '✗ NOT SET',
  GROQ: import.meta.env.VITE_GROQ_API_KEY
    ? `✓ set (${(import.meta.env.VITE_GROQ_API_KEY as string).slice(0, 10)}…)`
    : '✗ NOT SET',
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL ? '✓ set' : '✗ NOT SET',
  WOMPI: import.meta.env.VITE_WOMPI_PUBLIC_KEY ? '✓ set' : '✗ NOT SET (dev mode)',
  MODE: import.meta.env.MODE,
})

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
import NoteDetail from './pages/NoteDetail'
import Patients from './pages/Patients'
import Billing from './pages/Billing'
import Settings from './pages/Settings'
import SuperAdmin from './pages/SuperAdmin'
import AdminDashboard from './pages/AdminDashboard'
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

const SUPER_ADMIN_EMAIL = 'jaimepinedo95@gmail.com'

// Guards /admin/* — verifies against Supabase auth session email (JWT), never the profile table.
// Any mismatch → immediate redirect to /dashboard, nothing is rendered.
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  // user.email comes from the Supabase auth JWT — it is NOT the user_profiles table value.
  // It cannot be changed without re-authenticating against Supabase.
  if (user.email !== SUPER_ADMIN_EMAIL) return <Navigate to="/dashboard" replace />

  return <>{children}</>
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

  // Super admin: siempre redirigir a /admin salvo que ya esté en una ruta admin o en la app de médico explícitamente
  if (profile?.role === 'super_admin') {
    const adminRoutes = ['/admin', '/configuracion', '/dashboard', '/nueva-consulta', '/historial', '/pacientes', '/facturacion']
    const isAdminArea = location.pathname.startsWith('/admin')
    const isDoctorApp = adminRoutes.some(r => r !== '/admin' && location.pathname.startsWith(r))
    if (!isAdminArea && !isDoctorApp) return <Navigate to="/admin" replace />
    return <>{children}</>
  }

  // TEMPORAL: acceso libre para cualquier usuario autenticado mientras se configura Wompi
  // TODO: Reactivar cuando Wompi esté configurado
  return <>{children}</>

  /* ── Guard de suscripción — descomentar cuando Wompi esté activo ──────────────
  const status = profile?.subscription_status
  // const location = useLocation()   ← mover fuera del comentario al reactivar
  const path = location.pathname      // location viene del useLocation() de arriba

  // Onboarding: solo si está pendiente
  if (path.startsWith('/onboarding')) {
    if (status === 'trial' || status === 'active') return <Navigate to="/dashboard" replace />
    return <>{children}</>
  }

  // Pantallas de estado de suscripción: siempre permitir
  if (path.startsWith('/subscription')) return <>{children}</>

  // App principal: requiere onboarding completo
  if (!status || status === 'pending') return <Navigate to="/onboarding/plan" replace />
  if (status === 'cancelled') return <Navigate to="/subscription/cancelado" replace />
  if (status === 'expired') return <Navigate to="/subscription/vencido" replace />

  return <>{children}</>
  ─────────────────────────────────────────────────────────────────────────────── */
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, profile } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (user) {
    const dest = profile?.role === 'super_admin' ? '/admin' : '/dashboard'
    return <Navigate to={dest} replace />
  }
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
          <Route path="/historial/:id" element={<ProtectedRoute><NoteDetail /></ProtectedRoute>} />
          <Route path="/pacientes" element={<ProtectedRoute><Patients /></ProtectedRoute>} />
          <Route path="/facturacion" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
          <Route path="/configuracion" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/super" element={<AdminRoute><SuperAdmin /></AdminRoute>} />
          <Route path="/superadmin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/clinica" element={<AdminRoute><ClinicAdmin /></AdminRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
