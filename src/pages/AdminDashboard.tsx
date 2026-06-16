import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, FileText, DollarSign, UserCheck,
  Gift, Ban, CheckCircle, Search, Trash2, Stethoscope, LogOut,
  ShieldCheck, LayoutDashboard, BarChart2, Settings, Check,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import {
  fetchAllUsers, fetchNotesStats, fetchNotesByType, fetchNotesBySpecialty,
  updateUserPlan, grantFreeAccess, blockUser, reactivateUser, deleteUser,
} from '../lib/adminDb'
import type { UserSummary, NoteTypeCount, SpecialtyCount } from '../lib/adminDb'
import { Analytics } from '../lib/analytics'
import Logo from '../components/Logo'

type Tab = 'dashboard' | 'usuarios' | 'metricas' | 'config'

const PLAN_OPTIONS = [
  { id: 'free_trial',  label: 'Trial gratis' },
  { id: 'basic',       label: 'Básico — $39.900' },
  { id: 'standard',   label: 'Estándar — $54.900' },
  { id: 'advanced',   label: 'Avanzado — $69.900' },
  { id: 'pro',        label: 'Pro — $99.900' },
]

const PLAN_PRICES: Record<string, number> = {
  basic: 39900, standard: 54900, advanced: 69900, pro: 99900,
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  trial:     { label: 'Trial',     cls: 'bg-blue-100 text-blue-700' },
  active:    { label: 'Activo',    cls: 'bg-emerald-100 text-emerald-700' },
  pending:   { label: 'Pendiente', cls: 'bg-slate-100 text-slate-500' },
  expired:   { label: 'Vencido',   cls: 'bg-red-100 text-red-600' },
  cancelled: { label: 'Bloqueado', cls: 'bg-red-100 text-red-700' },
  gratis:    { label: 'Gratis',    cls: 'bg-emerald-100 text-emerald-700' },
}

const NAV: { id: Tab; label: string; Icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard',    Icon: LayoutDashboard },
  { id: 'usuarios',  label: 'Usuarios',     Icon: Users },
  { id: 'metricas',  label: 'Métricas',     Icon: BarChart2 },
  { id: 'config',    label: 'Configuración', Icon: Settings },
]

export default function AdminDashboard() {
  const { signOut } = useAuth()
  const [tab, setTab]         = useState<Tab>('usuarios')
  const [users, setUsers]     = useState<UserSummary[]>([])
  const [notes, setNotes]     = useState({ today: 0, month: 0, total: 0 })
  const [noteTypes, setNoteTypes]     = useState<NoteTypeCount[]>([])
  const [specialties, setSpecialties] = useState<SpecialtyCount[]>([])
  const [loading, setLoading] = useState(true)
  const [planMap, setPlanMap] = useState<Record<string, string>>({})
  const [busyId, setBusyId]   = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [search, setSearch]   = useState('')

  useEffect(() => {
    Promise.all([fetchAllUsers(), fetchNotesStats(), fetchNotesByType(), fetchNotesBySpecialty()])
      .then(([u, n, nt, sp]) => {
        setUsers(u)
        setNotes(n)
        setNoteTypes(nt)
        setSpecialties(sp)
        const map: Record<string, string> = {}
        u.forEach(usr => { map[usr.id] = usr.plan_seleccionado ?? 'standard' })
        setPlanMap(map)
        setLoading(false)
      })
  }, [])

  const totalUsers      = users.length
  const activeThisMonth = users.filter(u => u.subscription_status === 'active' || u.subscription_status === 'trial').length
  const estimatedRevenue = users
    .filter(u => u.subscription_status === 'active' && u.plan_seleccionado)
    .reduce((sum, u) => sum + (PLAN_PRICES[u.plan_seleccionado ?? ''] ?? 0), 0)

  const filteredUsers = search.trim()
    ? users.filter(u => {
        const q = search.toLowerCase()
        return u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      })
    : users

  // ── Actions ───────────────────────────────────────────────────────────────────
  async function applyPlan(userId: string) {
    const plan = planMap[userId] ?? 'standard'
    setBusyId(userId)
    await updateUserPlan(userId, plan)
    setUsers(prev => prev.map(u => u.id === userId
      ? { ...u, plan_seleccionado: plan, plan, subscription_status: 'active' }
      : u))
    Analytics.planActivado(plan, userId)
    setBusyId(null)
    flashSaved(userId)
  }

  async function handlePlanChange(userId: string, plan: string) {
    setPlanMap(prev => ({ ...prev, [userId]: plan }))
    setBusyId(userId + '_plan')
    await updateUserPlan(userId, plan)
    setUsers(prev => prev.map(u => u.id === userId
      ? { ...u, plan_seleccionado: plan, plan, subscription_status: 'active' }
      : u))
    Analytics.planActivado(plan, userId)
    setBusyId(null)
    flashSaved(userId + '_plan')
  }

  async function applyFreeAccess(userId: string) {
    setBusyId(userId + '_free')
    await grantFreeAccess(userId)
    setUsers(prev => prev.map(u => u.id === userId
      ? { ...u, plan: 'gratis', plan_seleccionado: 'gratis', subscription_status: 'active', consultations_limit: 999999 }
      : u))
    setBusyId(null)
    flashSaved(userId + '_free')
  }

  async function applyBlock(userId: string) {
    if (!confirm('¿Bloquear este usuario?')) return
    setBusyId(userId + '_block')
    await blockUser(userId)
    setUsers(prev => prev.map(u => u.id === userId
      ? { ...u, subscription_status: 'cancelled', consultations_limit: 0 }
      : u))
    setBusyId(null)
  }

  async function applyReactivate(userId: string) {
    setBusyId(userId + '_react')
    await reactivateUser(userId)
    setUsers(prev => prev.map(u => u.id === userId
      ? { ...u, subscription_status: 'active', consultations_limit: 250 }
      : u))
    setBusyId(null)
    flashSaved(userId + '_react')
  }

  async function applyDelete(userId: string, name: string) {
    if (!confirm(`¿Eliminar permanentemente a ${name}? No se puede deshacer.`)) return
    setBusyId(userId + '_del')
    await deleteUser(userId)
    setUsers(prev => prev.filter(u => u.id !== userId))
    setBusyId(null)
  }

  function flashSaved(id: string) {
    setSavedId(id)
    setTimeout(() => setSavedId(null), 1800)
  }

  const initials = (name: string) =>
    name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()

  // ── Sidebar ───────────────────────────────────────────────────────────────────
  const sidebar = (
    <div className="w-56 flex-shrink-0 bg-white border-r border-slate-100 min-h-screen flex flex-col sticky top-0">
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <Logo size="sm" />
          <div>
            <p className="font-bold text-slate-900 text-sm">Dictia</p>
            <span className="flex items-center gap-1 text-[10px] font-bold text-primary-600">
              <ShieldCheck size={9} /> Super Admin
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 pt-4">
        {NAV.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
              tab === id
                ? 'bg-primary-600 text-white shadow-sm shadow-primary-200'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-100 space-y-1">
        <Link
          to="/dashboard"
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          <Stethoscope size={15} /> Usar como médico
        </Link>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut size={15} /> Cerrar sesión
        </button>
      </div>
    </div>
  )

  // ── KPI cards ─────────────────────────────────────────────────────────────────
  const kpiCards = (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users,       label: 'Usuarios totales',  value: loading ? '—' : totalUsers,                                   color: 'text-primary-600', bg: 'bg-primary-50' },
          { icon: UserCheck,   label: 'Activos este mes',  value: loading ? '—' : activeThisMonth,                              color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { icon: FileText,    label: 'Notas generadas',   value: loading ? '—' : notes.total.toLocaleString('es-CO'),          color: 'text-violet-600',  bg: 'bg-violet-50' },
          { icon: DollarSign,  label: 'Ingresos estimados',value: loading ? '—' : `$${estimatedRevenue.toLocaleString('es-CO')}`, color: 'text-amber-600',   bg: 'bg-amber-50' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon size={17} className={color} />
            </div>
            <p className="text-2xl font-black text-slate-900">{value}</p>
            <p className="text-sm text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <p className="font-bold text-slate-900 mb-1">Notas hoy</p>
          <p className="text-4xl font-black text-primary-600">{loading ? '—' : notes.today}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <p className="font-bold text-slate-900 mb-1">Notas este mes</p>
          <p className="text-4xl font-black text-violet-600">{loading ? '—' : notes.month.toLocaleString('es-CO')}</p>
        </div>
      </div>
    </div>
  )

  // ── Métricas ──────────────────────────────────────────────────────────────────
  const metricas = (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-slate-900">Métricas</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <p className="font-bold text-slate-900 mb-4">Notas por tipo</p>
          <div className="space-y-3">
            {noteTypes.map(({ type, count }) => {
              const max = noteTypes[0]?.count ?? 1
              return (
                <div key={type}>
                  <div className="flex justify-between text-xs text-slate-600 mb-1 font-medium capitalize">
                    <span>{type}</span><span>{count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${(count / max) * 100}%` }} />
                  </div>
                </div>
              )
            })}
            {noteTypes.length === 0 && <p className="text-sm text-slate-400">Sin datos aún</p>}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <p className="font-bold text-slate-900 mb-4">Notas por especialidad</p>
          <div className="space-y-3">
            {specialties.map(({ specialty, count }) => {
              const max = specialties[0]?.count ?? 1
              return (
                <div key={specialty}>
                  <div className="flex justify-between text-xs text-slate-600 mb-1 font-medium">
                    <span>{specialty}</span><span>{count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${(count / max) * 100}%` }} />
                  </div>
                </div>
              )
            })}
            {specialties.length === 0 && <p className="text-sm text-slate-400">Sin datos aún</p>}
          </div>
        </div>
      </div>
    </div>
  )

  // ── Configuración ─────────────────────────────────────────────────────────────
  const config = (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-slate-900">Configuración</h1>
      <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
        <p className="text-sm text-slate-500">Variables de entorno activas en este despliegue:</p>
        {[
          { key: 'VITE_SUPABASE_URL',       set: !!import.meta.env.VITE_SUPABASE_URL },
          { key: 'VITE_ANTHROPIC_API_KEY',  set: !!import.meta.env.VITE_ANTHROPIC_API_KEY },
          { key: 'VITE_GROQ_API_KEY',       set: !!import.meta.env.VITE_GROQ_API_KEY },
          { key: 'VITE_POSTHOG_KEY',        set: !!import.meta.env.VITE_POSTHOG_KEY },
          { key: 'VITE_CRISP_ID',           set: !!import.meta.env.VITE_CRISP_ID },
          { key: 'VITE_WOMPI_PUBLIC_KEY',   set: !!import.meta.env.VITE_WOMPI_PUBLIC_KEY },
        ].map(({ key, set }) => (
          <div key={key} className="flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${set ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            <span className="text-sm font-mono text-slate-700">{key}</span>
            <span className={`text-xs font-semibold ml-auto ${set ? 'text-emerald-600' : 'text-slate-400'}`}>
              {set ? 'Configurado' : 'No configurado'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )

  // ── Users table ───────────────────────────────────────────────────────────────
  const usersTable = (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-black text-slate-900">
          Usuarios
          {!loading && <span className="ml-2 text-slate-400 font-normal text-base">({filteredUsers.length})</span>}
        </h1>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 w-72"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">×</button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Cargando usuarios...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            {search ? 'Sin resultados' : 'No hay usuarios aún'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  {['Usuario', 'Plan', 'Notas', 'Registro', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.map(u => {
                  const st = STATUS_MAP[u.plan === 'gratis' ? 'gratis' : (u.subscription_status ?? '')] ?? { label: u.subscription_status ?? '—', cls: 'bg-slate-100 text-slate-500' }
                  const busy    = (busyId ?? '').startsWith(u.id)
                  const isBlocked = u.subscription_status === 'cancelled'
                  const isSelf  = u.email === 'jaimepinedo95@gmail.com'

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">

                      {/* Name / email */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-primary-700">{initials(u.full_name)}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 leading-tight">{u.full_name}</p>
                            <p className="text-xs text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Plan dropdown with auto-save */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <select
                            value={planMap[u.id] ?? 'standard'}
                            onChange={e => handlePlanChange(u.id, e.target.value)}
                            disabled={busy}
                            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 cursor-pointer"
                          >
                            {PLAN_OPTIONS.map(p => (
                              <option key={p.id} value={p.id}>{p.label}</option>
                            ))}
                          </select>
                          {savedId === u.id + '_plan' && (
                            <span className="text-emerald-500 animate-pulse"><Check size={13} /></span>
                          )}
                        </div>
                      </td>

                      {/* Notes */}
                      <td className="px-5 py-4 text-center">
                        <span className="text-base font-black text-slate-900">{u.consultations_used}</span>
                      </td>

                      {/* Date */}
                      <td className="px-5 py-4 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(u.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${st.cls}`}>{st.label}</span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 flex-wrap">

                          {/* Activar */}
                          <button
                            onClick={() => applyPlan(u.id)}
                            disabled={busy}
                            className="flex items-center gap-1 text-xs bg-primary-600 hover:bg-primary-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                          >
                            {savedId === u.id ? <><Check size={11} /> Guardado</> : busyId === u.id ? '...' : 'Activar'}
                          </button>

                          {/* Gratis */}
                          <button
                            onClick={() => applyFreeAccess(u.id)}
                            disabled={busy}
                            title="Dar acceso gratuito ilimitado"
                            className="flex items-center gap-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 disabled:opacity-40 font-semibold px-3 py-1.5 rounded-lg transition-colors"
                          >
                            {savedId === u.id + '_free'
                              ? <><Check size={11} /> Guardado</>
                              : busyId === u.id + '_free'
                                ? '...'
                                : <><Gift size={11} /> Gratis</>
                            }
                          </button>

                          {/* Block / Reactivate */}
                          {isBlocked ? (
                            <button
                              onClick={() => applyReactivate(u.id)}
                              disabled={busy}
                              className="flex items-center gap-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 disabled:opacity-40 font-semibold px-3 py-1.5 rounded-lg transition-colors"
                            >
                              {savedId === u.id + '_react'
                                ? <><Check size={11} /> Reactivado</>
                                : <><CheckCircle size={11} /> Reactivar</>
                              }
                            </button>
                          ) : (
                            <button
                              onClick={() => applyBlock(u.id)}
                              disabled={busy || isSelf}
                              className="flex items-center gap-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 disabled:opacity-40 font-semibold px-3 py-1.5 rounded-lg transition-colors"
                            >
                              <Ban size={11} />
                              {busyId === u.id + '_block' ? '...' : 'Bloquear'}
                            </button>
                          )}

                          {/* Delete */}
                          {!isSelf && (
                            <button
                              onClick={() => applyDelete(u.id, u.full_name)}
                              disabled={busy}
                              title="Eliminar usuario"
                              className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-40 rounded-lg transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {sidebar}

      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {tab === 'dashboard' && kpiCards}
          {tab === 'usuarios'  && usersTable}
          {tab === 'metricas'  && metricas}
          {tab === 'config'    && config}
        </div>
      </div>
    </div>
  )
}
