import { useState, useEffect, useCallback } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  LayoutDashboard, Mic, ClipboardList, Users, Settings,
  CreditCard, LogOut, Menu, X, ChevronRight, Smartphone,
} from 'lucide-react'
import Logo from './Logo'
import TrialBanner from './TrialBanner'
import { useAuth } from '../contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Inicio' },
  { to: '/nueva-consulta', icon: Mic, label: 'Nueva consulta' },
  { to: '/historial', icon: ClipboardList, label: 'Historial' },
  { to: '/pacientes', icon: Users, label: 'Pacientes' },
  { to: '/facturacion', icon: CreditCard, label: 'Planes y facturación' },
  { to: '/configuracion', icon: Settings, label: 'Configuración' },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, signOut, user } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [realtimeToast, setRealtimeToast] = useState<string | null>(null)

  const dismissToast = useCallback(() => setRealtimeToast(null), [])

  useEffect(() => {
    if (!isSupabaseConfigured || !user?.id) return

    const channel = supabase
      .channel(`consultations-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'consultations',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          setRealtimeToast('📱 Nueva nota generada desde tu celular')
          const t = setTimeout(() => setRealtimeToast(null), 5000)
          return () => clearTimeout(t)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user?.id])

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  const trialDaysLeft = profile?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-slate-100">
        <Logo size="md" />
      </div>

      {trialDaysLeft !== null && profile?.plan === 'free_trial' && (
        <div className="mx-3 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-xs font-semibold text-amber-700">Período de prueba</p>
          <p className="text-xs text-amber-600 mt-0.5">
            {trialDaysLeft === 0 ? 'Vence hoy' : `${trialDaysLeft} día${trialDaysLeft !== 1 ? 's' : ''} restante${trialDaysLeft !== 1 ? 's' : ''}`}
          </p>
          <button
            onClick={() => navigate('/facturacion')}
            className="mt-2 w-full text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg py-1.5 transition-colors"
          >
            Activar plan
          </button>
        </div>
      )}

      <nav className="flex-1 p-3 space-y-0.5 mt-2">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
              isActive
                ? 'bg-primary-600 text-white shadow-md shadow-primary-200'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            )}
          >
            <Icon size={18} />
            {label}
            {to === '/nueva-consulta' && (
              <span className="ml-auto">
                <ChevronRight size={14} className="opacity-50" />
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-100">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-primary-700">
              {profile?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{profile?.full_name}</p>
            <p className="text-xs text-slate-500 truncate">{profile?.specialty}</p>
            {(profile?.consultations_used ?? 0) > 0 && (
              <p className="text-xs text-emerald-600 font-semibold mt-0.5">
                {profile!.consultations_used} HCs · {((profile!.consultations_used * 12) / 60).toFixed(1)}h ahorradas
              </p>
            )}
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 w-full transition-colors mt-0.5"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
        <div className="flex gap-3 px-3 pt-2 pb-1">
          <NavLink to="/privacidad" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Privacidad</NavLink>
          <span className="text-xs text-slate-200">·</span>
          <NavLink to="/terminos" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Términos</NavLink>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-white border-r border-slate-100 fixed inset-y-0 left-0 z-20">
        {sidebar}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl">
            {sidebar}
          </aside>
        </div>
      )}

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-20 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
        <Logo size="sm" />
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg hover:bg-slate-100">
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Main content */}
      <main className="flex-1 lg:ml-64 pt-16 lg:pt-0 min-h-screen flex flex-col">
        <TrialBanner />
        <div className="flex-1">{children}</div>
      </main>

      {/* Realtime sync toast */}
      {realtimeToast && (
        <div className="fixed top-4 right-4 z-50 animate-slide-up">
          <div className="bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 max-w-xs">
            <Smartphone size={16} className="text-emerald-400 flex-shrink-0" />
            <p className="text-sm font-medium flex-1">{realtimeToast}</p>
            <button onClick={dismissToast} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
