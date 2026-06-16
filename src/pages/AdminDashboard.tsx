import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, FileText, DollarSign, UserCheck,
  Gift, Ban, CheckCircle, Search, Trash2, Stethoscope, LogOut, ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import {
  fetchAllUsers, fetchNotesStats, updateUserPlan, grantFreeAccess,
  blockUser, reactivateUser, deleteUser,
} from '../lib/adminDb'
import type { UserSummary } from '../lib/adminDb'
import Logo from '../components/Logo'

const PLAN_OPTIONS = [
  { id: 'free_trial', label: 'Trial gratis' },
  { id: 'basic',      label: 'Básico — $39.900' },
  { id: 'standard',  label: 'Estándar — $54.900' },
  { id: 'advanced',  label: 'Avanzado — $69.900' },
  { id: 'pro',       label: 'Pro — $99.900' },
]

const PLAN_PRICES: Record<string, number> = {
  basic: 39900, standard: 54900, advanced: 69900, pro: 99900,
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  trial:     { label: 'Trial',      cls: 'bg-blue-100 text-blue-700' },
  active:    { label: 'Activo',     cls: 'bg-emerald-100 text-emerald-700' },
  pending:   { label: 'Pendiente',  cls: 'bg-slate-100 text-slate-500' },
  expired:   { label: 'Vencido',    cls: 'bg-red-100 text-red-600' },
  cancelled: { label: 'Bloqueado',  cls: 'bg-red-100 text-red-700' },
}

export default function AdminDashboard() {
  const { signOut } = useAuth()
  const [users, setUsers]       = useState<UserSummary[]>([])
  const [notes, setNotes]       = useState({ today: 0, month: 0, total: 0 })
  const [loading, setLoading]   = useState(true)
  const [planMap, setPlanMap]   = useState<Record<string, string>>({})
  const [busyId, setBusyId]     = useState<string | null>(null)
  const [search, setSearch]     = useState('')

  useEffect(() => {
    Promise.all([fetchAllUsers(), fetchNotesStats()]).then(([u, n]) => {
      setUsers(u)
      setNotes(n)
      const map: Record<string, string> = {}
      u.forEach(usr => { map[usr.id] = usr.plan_seleccionado ?? 'standard' })
      setPlanMap(map)
      setLoading(false)
    })
  }, [])

  // ── Derived KPIs ──────────────────────────────────────────────────────────────
  const totalUsers  = users.length
  const activeThisMonth = users.filter(u =>
    u.subscription_status === 'active' || u.subscription_status === 'trial'
  ).length
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
    setBusyId(null)
  }

  async function applyFreeAccess(userId: string) {
    setBusyId(userId + '_free')
    await grantFreeAccess(userId)
    setUsers(prev => prev.map(u => u.id === userId
      ? { ...u, subscription_status: 'active', consultations_limit: 999999 }
      : u))
    setBusyId(null)
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
  }

  async function applyDelete(userId: string, name: string) {
    if (!confirm(`¿Eliminar permanentemente a ${name}? No se puede deshacer.`)) return
    setBusyId(userId + '_del')
    await deleteUser(userId)
    setUsers(prev => prev.filter(u => u.id !== userId))
    setBusyId(null)
  }

  const initials = (name: string) =>
    name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="font-bold text-slate-900">Dictia</span>
            <span className="flex items-center gap-1 text-xs font-semibold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-full">
              <ShieldCheck size={11} /> Super Admin
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition-colors"
            >
              <Stethoscope size={14} /> Usar como médico
            </Link>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <LogOut size={14} /> Salir
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* ── Page title ───────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-black text-slate-900">Panel de administración</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* ── 4 KPI cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: Users,
              label: 'Usuarios totales',
              value: loading ? '—' : totalUsers,
              color: 'text-primary-600',
              bg: 'bg-primary-50',
            },
            {
              icon: UserCheck,
              label: 'Activos este mes',
              value: loading ? '—' : activeThisMonth,
              color: 'text-emerald-600',
              bg: 'bg-emerald-50',
            },
            {
              icon: FileText,
              label: 'Notas generadas',
              value: loading ? '—' : notes.total.toLocaleString('es-CO'),
              color: 'text-violet-600',
              bg: 'bg-violet-50',
            },
            {
              icon: DollarSign,
              label: 'Ingresos estimados',
              value: loading ? '—' : `$${estimatedRevenue.toLocaleString('es-CO')}`,
              color: 'text-amber-600',
              bg: 'bg-amber-50',
            },
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

        {/* ── Users table ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100">

          {/* Table header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
            <h2 className="font-bold text-slate-900">
              Usuarios
              {!loading && <span className="ml-2 text-slate-400 font-normal text-sm">({filteredUsers.length})</span>}
            </h2>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre o email..."
                className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 w-72"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >×</button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400">Cargando usuarios...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              {search ? 'Sin resultados para esa búsqueda' : 'No hay usuarios aún'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left">
                    {['Usuario', 'Plan', 'Notas', 'Registro', 'Estado', 'Acciones'].map(h => (
                      <th key={h} className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredUsers.map(u => {
                    const st = STATUS_MAP[u.subscription_status ?? ''] ?? { label: u.subscription_status ?? '—', cls: 'bg-slate-100 text-slate-500' }
                    const busy = busyId?.startsWith(u.id) ?? false
                    const isBlocked = u.subscription_status === 'cancelled'
                    const isSelf = u.email === 'jaimepinedo95@gmail.com'

                    return (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">

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

                        {/* Plan dropdown */}
                        <td className="px-5 py-4">
                          <select
                            value={planMap[u.id] ?? 'standard'}
                            onChange={e => setPlanMap(prev => ({ ...prev, [u.id]: e.target.value }))}
                            disabled={busy}
                            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 cursor-pointer"
                          >
                            {PLAN_OPTIONS.map(p => (
                              <option key={p.id} value={p.id}>{p.label}</option>
                            ))}
                          </select>
                        </td>

                        {/* Notes used */}
                        <td className="px-5 py-4 text-center">
                          <span className="text-base font-black text-slate-900">{u.consultations_used}</span>
                        </td>

                        {/* Registration date */}
                        <td className="px-5 py-4 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(u.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>

                        {/* Status badge */}
                        <td className="px-5 py-4">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${st.cls}`}>
                            {st.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Activate with selected plan */}
                            <button
                              onClick={() => applyPlan(u.id)}
                              disabled={busy}
                              className="text-xs bg-primary-600 hover:bg-primary-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                            >
                              {busyId === u.id ? '...' : 'Activar'}
                            </button>

                            {/* Free unlimited access */}
                            <button
                              onClick={() => applyFreeAccess(u.id)}
                              disabled={busy}
                              title="Dar acceso gratuito ilimitado"
                              className="flex items-center gap-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 disabled:opacity-40 font-semibold px-3 py-1.5 rounded-lg transition-colors"
                            >
                              <Gift size={11} />
                              {busyId === u.id + '_free' ? '...' : 'Gratis'}
                            </button>

                            {/* Block / Reactivate toggle */}
                            {isBlocked ? (
                              <button
                                onClick={() => applyReactivate(u.id)}
                                disabled={busy}
                                className="flex items-center gap-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 disabled:opacity-40 font-semibold px-3 py-1.5 rounded-lg transition-colors"
                              >
                                <CheckCircle size={11} />
                                {busyId === u.id + '_react' ? '...' : 'Reactivar'}
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

                            {/* Delete (hidden for self) */}
                            {!isSelf && (
                              <button
                                onClick={() => applyDelete(u.id, u.full_name)}
                                disabled={busy}
                                title="Eliminar usuario permanentemente"
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
    </div>
  )
}
