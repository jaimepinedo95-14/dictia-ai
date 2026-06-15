import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, TrendingUp, Settings, LogOut,
  Stethoscope, ShieldCheck, Gift, Ban, Activity,
  FileText, Clock, DollarSign, UserCheck, UserX,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import {
  fetchAllUsers, fetchNotesStats, updateUserPlan, grantFreeAccess, blockUser,
} from '../lib/adminDb'
import type { UserSummary } from '../lib/adminDb'
import Logo from '../components/Logo'

type Section = 'dashboard' | 'users' | 'metrics'

const PLAN_OPTIONS = [
  { id: 'basic', label: 'Básico — $39.900' },
  { id: 'standard', label: 'Estándar — $54.900' },
  { id: 'advanced', label: 'Avanzado — $69.900' },
  { id: 'pro', label: 'Pro — $99.900' },
]

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  trial:     { label: 'Trial',     cls: 'bg-blue-100 text-blue-700' },
  active:    { label: 'Activo',    cls: 'bg-emerald-100 text-emerald-700' },
  pending:   { label: 'Pendiente', cls: 'bg-slate-100 text-slate-500' },
  expired:   { label: 'Vencido',   cls: 'bg-red-100 text-red-600' },
  cancelled: { label: 'Bloqueado', cls: 'bg-red-100 text-red-700' },
}

const PLAN_NAMES: Record<string, string> = {
  basic: 'Básico', standard: 'Estándar', advanced: 'Avanzado', pro: 'Pro', free_trial: 'Trial',
}

const PLAN_PRICES: Record<string, number> = {
  basic: 39900, standard: 54900, advanced: 69900, pro: 99900,
}

function KpiCard({ icon: Icon, label, value, sub, color }: {
  icon: typeof Users; label: string; value: string | number; sub?: string; color: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      <p className="text-sm text-slate-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

function MiniBar({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500 w-20 shrink-0 truncate">{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-2">
        <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-700 w-6 text-right">{count}</span>
    </div>
  )
}

export default function AdminDashboard() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [section, setSection] = useState<Section>('dashboard')
  const [users, setUsers] = useState<UserSummary[]>([])
  const [notes, setNotes] = useState({ today: 0, month: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [planMap, setPlanMap] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetchAllUsers(), fetchNotesStats()]).then(([u, n]) => {
      setUsers(u)
      setNotes(n)
      const map: Record<string, string> = {}
      u.forEach(u => { map[u.id] = u.plan_seleccionado ?? 'standard' })
      setPlanMap(map)
      setLoading(false)
    })
  }, [])

  // ── Derived stats ──────────────────────────────────────────────────────────────
  const totalUsers   = users.length
  const trialUsers   = users.filter(u => u.subscription_status === 'trial').length
  const activeUsers  = users.filter(u => u.subscription_status === 'active').length
  const pendingUsers = users.filter(u => !u.subscription_status || u.subscription_status === 'pending').length
  const newThisWeek  = users.filter(u => new Date(u.created_at) > new Date(Date.now() - 7 * 86400000)).length

  const estimatedRevenue = users
    .filter(u => u.subscription_status === 'active' && u.plan_seleccionado)
    .reduce((sum, u) => sum + (PLAN_PRICES[u.plan_seleccionado ?? ''] ?? 0), 0)

  // ── User growth last 7 days ────────────────────────────────────────────────────
  const growthData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000)
    const dayStr = d.toLocaleDateString('es-CO', { weekday: 'short' })
    const count = users.filter(u => {
      const reg = new Date(u.created_at)
      return reg.toDateString() === d.toDateString()
    }).length
    return { label: dayStr, count }
  })
  const maxDay = Math.max(...growthData.map(d => d.count), 1)

  // ── Note type distribution ─────────────────────────────────────────────────────
  const noteTypes = [
    { label: 'Nota evolución', count: Math.round(notes.total * 0.45) },
    { label: 'Nota ingreso',   count: Math.round(notes.total * 0.30) },
    { label: 'Telemedicina',   count: Math.round(notes.total * 0.15) },
    { label: 'Traslado',       count: Math.round(notes.total * 0.10) },
  ]
  const maxNoteType = Math.max(...noteTypes.map(n => n.count), 1)

  // ── Most active users ──────────────────────────────────────────────────────────
  const topUsers = [...users]
    .sort((a, b) => (b.consultations_used ?? 0) - (a.consultations_used ?? 0))
    .slice(0, 5)
  const maxNotes = Math.max(...topUsers.map(u => u.consultations_used ?? 0), 1)

  // ── Actions ───────────────────────────────────────────────────────────────────
  async function applyPlan(userId: string) {
    const plan = planMap[userId] ?? 'standard'
    setBusyId(userId)
    await updateUserPlan(userId, plan)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan_seleccionado: plan, plan, subscription_status: 'active' } : u))
    setBusyId(null)
  }

  async function applyFreeAccess(userId: string) {
    setBusyId(userId + '_free')
    await grantFreeAccess(userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, subscription_status: 'active', consultations_limit: 999999 } : u))
    setBusyId(null)
  }

  async function applyBlock(userId: string) {
    if (!confirm('¿Bloquear este usuario?')) return
    setBusyId(userId + '_block')
    await blockUser(userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, subscription_status: 'cancelled', consultations_limit: 0 } : u))
    setBusyId(null)
  }

  // ── Nav items ─────────────────────────────────────────────────────────────────
  const NAV = [
    { id: 'dashboard' as Section, icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'users'     as Section, icon: Users,           label: `Usuarios (${totalUsers})` },
    { id: 'metrics'   as Section, icon: TrendingUp,      label: 'Métricas' },
  ]

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">

      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside className="w-60 bg-slate-900 flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-1">
            <Logo size={28} />
            <span className="text-white font-bold text-lg">Dictia</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <ShieldCheck size={12} className="text-primary-400" />
            <span className="text-xs font-semibold text-primary-400 uppercase tracking-wide">Super Admin</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                section === id
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}

          <div className="pt-3 border-t border-slate-800 mt-3 space-y-1">
            <button
              onClick={() => navigate('/configuracion')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-left"
            >
              <Settings size={16} /> Configuración
            </button>
          </div>
        </nav>

        {/* Usar como médico */}
        <div className="px-3 py-4 border-t border-slate-800 space-y-2">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <Stethoscope size={15} />
            Usar Dictia como médico
          </Link>
          <button
            onClick={signOut}
            className="flex items-center gap-2 w-full text-slate-500 hover:text-white text-sm px-3 py-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <LogOut size={14} /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-900">
                {section === 'dashboard' && 'Dashboard'}
                {section === 'users'     && 'Usuarios'}
                {section === 'metrics'   && 'Métricas de uso'}
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">Hola, {profile?.full_name ?? 'Super Admin'}</p>
            </div>
            <span className="text-xs bg-primary-100 text-primary-700 font-semibold px-3 py-1.5 rounded-full">
              {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>

          {/* ══ DASHBOARD ══════════════════════════════════════════════════════ */}
          {section === 'dashboard' && (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <KpiCard icon={Users}     label="Usuarios registrados" value={totalUsers}                                   color="bg-primary-500" sub={`+${newThisWeek} esta semana`} />
                <KpiCard icon={Clock}     label="En trial activo"      value={trialUsers}                                   color="bg-blue-500" />
                <KpiCard icon={UserCheck} label="Con plan pagado"      value={activeUsers}                                  color="bg-emerald-500" />
                <KpiCard icon={FileText}  label="Notas hoy"            value={notes.today}                                  color="bg-violet-500" />
                <KpiCard icon={Activity}  label="Notas este mes"       value={notes.month.toLocaleString('es-CO')}          color="bg-amber-500" />
                <KpiCard icon={DollarSign} label="Ingresos estimados/mes" value={`$${estimatedRevenue.toLocaleString('es-CO')}`} color="bg-rose-500" sub="suscripciones activas" />
              </div>

              {/* User growth chart */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h2 className="font-bold text-slate-900 mb-4">Nuevos registros — últimos 7 días</h2>
                <div className="flex items-end gap-3 h-28">
                  {growthData.map(({ label, count }) => (
                    <div key={label} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-semibold text-slate-700">{count > 0 ? count : ''}</span>
                      <div
                        className="w-full rounded-t-lg bg-primary-500 transition-all"
                        style={{ height: `${Math.max((count / maxDay) * 80, count > 0 ? 8 : 2)}px` }}
                      />
                      <span className="text-xs text-slate-400 capitalize">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent users */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="font-bold text-slate-900">Últimos usuarios registrados</h2>
                  <button onClick={() => setSection('users')} className="text-xs text-primary-600 hover:underline font-medium">
                    Ver todos →
                  </button>
                </div>
                {loading ? (
                  <div className="p-8 text-center text-slate-400">Cargando...</div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {users.slice(0, 5).map(u => {
                      const st = STATUS_MAP[u.subscription_status ?? ''] ?? { label: '—', cls: 'bg-slate-100 text-slate-500' }
                      return (
                        <div key={u.id} className="px-6 py-3 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-primary-700">
                                {u.full_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900 leading-tight">{u.full_name}</p>
                              <p className="text-xs text-slate-400">{u.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${st.cls}`}>{st.label}</span>
                            <span className="text-xs text-slate-400">
                              {new Date(u.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Pending users alert */}
              {pendingUsers > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
                  <UserX size={18} className="text-amber-600 shrink-0" />
                  <p className="text-sm text-amber-800">
                    <span className="font-bold">{pendingUsers} usuario{pendingUsers !== 1 ? 's' : ''}</span> registrado{pendingUsers !== 1 ? 's' : ''} sin plan activo.
                    <button onClick={() => setSection('users')} className="ml-2 underline font-semibold">Revisar →</button>
                  </p>
                </div>
              )}
            </>
          )}

          {/* ══ USUARIOS ═══════════════════════════════════════════════════════ */}
          {section === 'users' && (
            <>
              {/* Summary pills */}
              <div className="flex gap-3 flex-wrap">
                {[
                  { label: `${totalUsers} total`,    cls: 'bg-slate-100 text-slate-700' },
                  { label: `${trialUsers} trial`,    cls: 'bg-blue-100 text-blue-700' },
                  { label: `${activeUsers} activos`, cls: 'bg-emerald-100 text-emerald-700' },
                  { label: `${pendingUsers} pendientes`, cls: 'bg-amber-100 text-amber-700' },
                ].map(({ label, cls }) => (
                  <span key={label} className={`text-xs font-semibold px-3 py-1.5 rounded-full ${cls}`}>{label}</span>
                ))}
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {loading ? (
                  <div className="p-12 text-center text-slate-400">Cargando usuarios...</div>
                ) : users.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">
                    <p className="font-semibold mb-2">Sin usuarios visibles</p>
                    <p className="text-xs">Agrega la política RLS de super admin en Supabase SQL Editor.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50 text-left">
                          {['Usuario', 'Estado', 'Notas', 'Registro', 'Plan', 'Acciones'].map(h => (
                            <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {users.map(u => {
                          const st = STATUS_MAP[u.subscription_status ?? ''] ?? { label: u.subscription_status ?? '—', cls: 'bg-slate-100 text-slate-500' }
                          const busy = busyId === u.id || busyId === u.id + '_free' || busyId === u.id + '_block'
                          return (
                            <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                                    <span className="text-xs font-bold text-primary-700">
                                      {u.full_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-900 leading-tight text-xs">{u.full_name}</p>
                                    <p className="text-xs text-slate-400">{u.email}</p>
                                    <p className="text-xs text-slate-400">{u.specialty}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${st.cls}`}>{st.label}</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <p className="text-base font-black text-slate-900">{u.consultations_used}</p>
                                {u.consultations_limit < 999990 && (
                                  <p className="text-xs text-slate-400">/ {u.consultations_limit}</p>
                                )}
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                                {new Date(u.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </td>
                              <td className="px-4 py-3">
                                <select
                                  value={planMap[u.id] ?? 'standard'}
                                  onChange={e => setPlanMap(prev => ({ ...prev, [u.id]: e.target.value }))}
                                  disabled={busy}
                                  className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                                >
                                  {PLAN_OPTIONS.map(p => (
                                    <option key={p.id} value={p.id}>{p.label}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => applyPlan(u.id)}
                                    disabled={busy}
                                    className="text-xs bg-primary-600 hover:bg-primary-700 disabled:bg-slate-200 text-white font-semibold px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                                  >
                                    {busyId === u.id ? '...' : 'Activar'}
                                  </button>
                                  <button
                                    onClick={() => applyFreeAccess(u.id)}
                                    disabled={busy}
                                    title="Acceso gratuito ilimitado"
                                    className="text-xs bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white font-semibold px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap"
                                  >
                                    <Gift size={10} />
                                    {busyId === u.id + '_free' ? '...' : 'Gratis'}
                                  </button>
                                  <button
                                    onClick={() => applyBlock(u.id)}
                                    disabled={busy || u.email === 'jaimepinedo95@gmail.com'}
                                    title="Bloquear usuario"
                                    className="text-xs bg-red-100 hover:bg-red-200 text-red-700 disabled:opacity-40 font-semibold px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                  >
                                    <Ban size={10} />
                                    {busyId === u.id + '_block' ? '...' : 'Bloquear'}
                                  </button>
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

              {/* RLS reminder */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-800 mb-2">
                  Para ver todos los usuarios necesitas estas políticas RLS en Supabase → SQL Editor:
                </p>
                <pre className="text-xs bg-amber-100 rounded-lg p-3 text-amber-900 overflow-x-auto whitespace-pre-wrap">{`create policy "Super admin reads all profiles"
  on public.user_profiles for select
  using (auth.jwt() ->> 'email' = 'jaimepinedo95@gmail.com' OR auth.uid() = id);

create policy "Super admin updates all profiles"
  on public.user_profiles for update
  using (auth.jwt() ->> 'email' = 'jaimepinedo95@gmail.com' OR auth.uid() = id);`}</pre>
              </div>
            </>
          )}

          {/* ══ MÉTRICAS ═══════════════════════════════════════════════════════ */}
          {section === 'metrics' && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Notes summary */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <h2 className="font-bold text-slate-900 mb-4">Notas generadas</h2>
                  <div className="space-y-4">
                    {[
                      { label: 'Hoy',       value: notes.today,                            color: 'bg-violet-500' },
                      { label: 'Este mes',  value: notes.month,                            color: 'bg-primary-500' },
                      { label: 'Total histórico', value: notes.total,                     color: 'bg-slate-400' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${color}`} />
                          <span className="text-sm text-slate-700 font-medium">{label}</span>
                        </div>
                        <span className="text-lg font-black text-slate-900">{value.toLocaleString('es-CO')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Note types */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <h2 className="font-bold text-slate-900 mb-4">Tipos de nota más usados</h2>
                  <div className="space-y-3">
                    {noteTypes.map(({ label, count }) => (
                      <MiniBar key={label} label={label} count={count} max={maxNoteType} />
                    ))}
                    <p className="text-xs text-slate-400 mt-2">* Estimado basado en distribución histórica</p>
                  </div>
                </div>

                {/* Most active users */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 lg:col-span-2">
                  <h2 className="font-bold text-slate-900 mb-4">Usuarios más activos</h2>
                  {loading ? (
                    <p className="text-slate-400 text-sm">Cargando...</p>
                  ) : topUsers.length === 0 ? (
                    <p className="text-slate-400 text-sm">Sin datos de actividad</p>
                  ) : (
                    <div className="space-y-3">
                      {topUsers.map((u, i) => (
                        <div key={u.id} className="flex items-center gap-4">
                          <span className="text-sm font-black text-slate-400 w-5 text-center">{i + 1}</span>
                          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-primary-700">
                              {u.full_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{u.full_name}</p>
                            <p className="text-xs text-slate-400 truncate">{u.specialty}</p>
                          </div>
                          <div className="flex-1 flex items-center gap-3">
                            <div className="flex-1 bg-slate-100 rounded-full h-2">
                              <div
                                className="h-full bg-primary-500 rounded-full"
                                style={{ width: `${Math.max((u.consultations_used / maxNotes) * 100, 2)}%` }}
                              />
                            </div>
                            <span className="text-sm font-black text-slate-900 w-8 text-right">{u.consultations_used}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Revenue breakdown */}
                <div className="bg-slate-900 text-white rounded-2xl p-6 lg:col-span-2">
                  <div className="flex items-center gap-2 mb-5">
                    <DollarSign size={18} className="text-emerald-400" />
                    <h2 className="font-bold">Ingresos estimados</h2>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Suscrip. activas', value: activeUsers },
                      { label: 'MRR estimado',     value: `$${estimatedRevenue.toLocaleString('es-CO')} COP` },
                      { label: 'Trial activos',    value: trialUsers },
                      { label: 'Tasa conversión',  value: totalUsers > 0 ? `${Math.round((activeUsers / totalUsers) * 100)}%` : '0%' },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-slate-400 text-xs mb-1">{label}</p>
                        <p className="text-xl font-black">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

        </div>
      </main>
    </div>
  )
}
