import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, Building2, TrendingUp, Plus, ArrowLeft, Activity,
  AlertTriangle, Clock, ShieldCheck, CalendarDays, FileText,
} from 'lucide-react'
import AppShell from '../components/AppShell'
import { useAuth } from '../contexts/AuthContext'
import {
  fetchAllUsers, fetchAllClinics, fetchCreditHistory, updateUserPlan,
  fetchAllConsultationsList, fetchMonthlyConsultationCounts, fetchNotesStats,
  MOCK_CREDIT_TRANSACTIONS,
} from '../lib/adminDb'
import type { UserSummary, ConsultationSummary } from '../lib/adminDb'
import type { Clinica, CreditTransaction } from '../lib/supabase'

const PLAN_NAMES: Record<string, string> = {
  gratis: 'Free', basic: 'Básico', standard: 'Estándar', advanced: 'Avanzado', pro: 'Pro', free_trial: 'Trial',
}

const PLAN_PRICES_COP: Record<string, number> = {
  basic: 39900, standard: 64900, advanced: 89900, pro: 109900,
}

const NOTE_TYPE_LABELS: Record<string, string> = {
  ingreso: 'HC Ingreso', evolucion: 'Nota Evolución', telemedicina: 'Telemedicina', traslado: 'Ing. Traslado',
}

const NOTE_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  approved:   { label: 'Aprobada',   cls: 'bg-emerald-100 text-emerald-700' },
  completed:  { label: 'Pendiente',  cls: 'bg-amber-100 text-amber-700' },
  processing: { label: 'En proceso', cls: 'bg-blue-100 text-blue-700' },
  discarded:  { label: 'Descartada', cls: 'bg-red-100 text-red-600' },
}

const PLAN_OPTIONS = [
  { id: 'gratis', label: 'Free — $0/mes' },
  { id: 'basic', label: 'Básico — $39.900/mes' },
  { id: 'standard', label: 'Estándar — $64.900/mes' },
  { id: 'advanced', label: 'Avanzado — $89.900/mes' },
  { id: 'pro', label: 'Pro — $109.900/mes' },
]

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  trial:     { label: 'Trial',     cls: 'bg-blue-100 text-blue-700' },
  active:    { label: 'Activo',    cls: 'bg-emerald-100 text-emerald-700' },
  pending:   { label: 'Pendiente', cls: 'bg-slate-100 text-slate-500' },
  expired:   { label: 'Vencido',   cls: 'bg-red-100 text-red-600' },
  cancelled: { label: 'Cancelado', cls: 'bg-orange-100 text-orange-600' },
}

const MODULE_LABELS: Record<string, string> = {
  urgencias: 'Urgencias', telemedicina: 'Telemedicina',
  evolucion_hospitalizacion: 'Nota Evolución', evolucion_uci: 'Nota UCI',
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: typeof Users; label: string; value: string | number; color: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      <p className="text-sm text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}

export default function SuperAdmin() {
  const { profile } = useAuth()
  const [tab, setTab] = useState<'users' | 'consultas' | 'clinics'>('users')
  const [users, setUsers] = useState<UserSummary[]>([])
  const [clinicas, setClinicas] = useState<Clinica[]>([])
  const [consultas, setConsultas] = useState<ConsultationSummary[]>([])
  const [monthlyCounts, setMonthlyCounts] = useState<Record<string, number>>({})
  const [notesStats, setNotesStats] = useState({ today: 0, month: 0, total: 0 })
  const [activityLog, setActivityLog] = useState<CreditTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [planMap, setPlanMap] = useState<Record<string, string>>({})
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [showNewClinic, setShowNewClinic] = useState(false)
  const [newClinicName, setNewClinicName] = useState('')
  const [newClinicEmail, setNewClinicEmail] = useState('')

  useEffect(() => {
    Promise.all([
      fetchAllUsers(),
      fetchAllClinics(),
      fetchAllConsultationsList(),
      fetchMonthlyConsultationCounts(),
      fetchNotesStats(),
    ]).then(async ([usersData, clinicsData, consultasData, monthlyData, statsData]) => {
      setUsers(usersData)
      setClinicas(clinicsData)
      setConsultas(consultasData)
      setMonthlyCounts(monthlyData)
      setNotesStats(statsData)
      const map: Record<string, string> = {}
      usersData.forEach(u => { map[u.id] = u.plan_seleccionado ?? 'standard' })
      setPlanMap(map)
      if (clinicsData.length > 0) {
        const tx = await fetchCreditHistory(clinicsData[0].id)
        setActivityLog(tx.length > 0 ? tx : MOCK_CREDIT_TRANSACTIONS)
      }
      setLoading(false)
    })
  }, [])

  if (profile && profile.email !== 'jaimepinedo95@gmail.com' && profile.role !== 'super_admin') {
    return <AppShell><p className="p-8 text-slate-500">No autorizado.</p></AppShell>
  }

  // ── Derived stats ─────────────────────────────────────────────────────────────
  const totalUsers    = users.length
  const activeUsers   = users.filter(u => u.subscription_status === 'trial' || u.subscription_status === 'active').length
  const pendingUsers  = users.filter(u => !u.subscription_status || u.subscription_status === 'pending').length
  const newThisWeek   = users.filter(u => new Date(u.created_at) > new Date(Date.now() - 7 * 86400000)).length
  const estimatedRevenue = users
    .filter(u => u.subscription_status === 'active')
    .reduce((s, u) => s + (PLAN_PRICES_COP[u.plan_seleccionado ?? u.plan] ?? 0), 0)

  const totalCredits     = clinicas.reduce((s, c) => s + c.creditos_totales, 0)
  const totalUsedCredits = clinicas.reduce((s, c) => s + (c.creditos_totales - c.creditos_disponibles), 0)
  const lowCreditClinics = clinicas.filter(c => c.creditos_disponibles / Math.max(c.creditos_totales, 1) < 0.2)

  // ── Actions ───────────────────────────────────────────────────────────────────
  async function applyPlan(userId: string) {
    const plan = planMap[userId] ?? 'standard'
    setUpdatingId(userId)
    try {
      await updateUserPlan(userId, plan)
      setUsers(prev => prev.map(u => u.id === userId
        ? { ...u, plan_seleccionado: plan, plan, subscription_status: 'active', consultations_limit: plan === 'gratis' ? 999999 : u.consultations_limit } : u))
    } finally { setUpdatingId(null) }
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <ShieldCheck size={22} className="text-primary-600" />
          <h1 className="text-2xl font-bold text-slate-900">Panel Super Admin</h1>
          <span className="ml-2 text-xs bg-primary-100 text-primary-700 font-semibold px-2.5 py-1 rounded-full">
            {totalUsers} usuarios · {clinicas.length} clínicas
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          {([
            { id: 'users',    label: `Usuarios (${totalUsers})`,      Icon: Users },
            { id: 'consultas', label: `Consultas (${consultas.length})`, Icon: Activity },
            { id: 'clinics',  label: `Clínicas (${clinicas.length})`, Icon: Building2 },
          ] as const).map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* ══ USUARIOS TAB ══════════════════════════════════════════════════════ */}
        {tab === 'users' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard icon={Users}        label="Usuarios registrados" value={totalUsers}                                  color="bg-primary-500" />
              <StatCard icon={CalendarDays} label="Notas hoy"            value={notesStats.today.toLocaleString('es-CO')}    color="bg-emerald-500" />
              <StatCard icon={Activity}     label="Notas este mes"       value={notesStats.month.toLocaleString('es-CO')}    color="bg-blue-500" />
              <StatCard icon={FileText}     label="Notas históricas"     value={notesStats.total.toLocaleString('es-CO')}    color="bg-slate-500" />
              <StatCard icon={TrendingUp}   label="Ingresos estimados/mes" value={`$${estimatedRevenue.toLocaleString('es-CO')}`} color="bg-violet-500" />
            </div>

            {newThisWeek > 0 && (
              <p className="text-xs text-emerald-600 font-semibold">
                ✓ {newThisWeek} usuario{newThisWeek !== 1 ? 's' : ''} nuevo{newThisWeek !== 1 ? 's' : ''} esta semana
              </p>
            )}

            {/* Users table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-bold text-slate-900">Usuarios individuales</h2>
                <span className="text-xs text-slate-400">{activeUsers} activos · {pendingUsers} pendientes</span>
              </div>

              {loading ? (
                <div className="p-10 text-center text-slate-400">Cargando usuarios...</div>
              ) : users.length === 0 ? (
                <div className="p-10 text-center text-slate-400">
                  <p className="font-medium">Sin usuarios visibles</p>
                  <p className="text-xs mt-1">No hay usuarios registrados aún.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-left">
                        {['Usuario', 'Estado / Plan', 'Notas este mes', 'Total histórico', 'Registro', 'Acciones'].map(h => (
                          <th key={h} className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {users.map(u => {
                        const st = STATUS_MAP[u.subscription_status ?? ''] ?? { label: u.subscription_status ?? '—', cls: 'bg-slate-100 text-slate-500' }
                        const busy = updatingId === u.id
                        return (
                          <tr key={u.id} className="hover:bg-slate-50 transition-colors">

                            {/* Usuario */}
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-bold text-primary-700">
                                    {(u.full_name || '?').split(' ').map(n => n[0]).slice(0, 2).join('')}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-900 leading-tight">{u.full_name || '(sin nombre)'}</p>
                                  <p className="text-xs text-slate-400">{u.email}</p>
                                  <p className="text-xs text-slate-400">{u.specialty}</p>
                                </div>
                              </div>
                            </td>

                            {/* Estado / Plan */}
                            <td className="px-5 py-4">
                              <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full ${st.cls}`}>
                                {st.label}
                              </span>
                              {u.plan_seleccionado && (
                                <p className="text-xs text-slate-500 mt-1">
                                  {PLAN_NAMES[u.plan_seleccionado] ?? u.plan_seleccionado}
                                </p>
                              )}
                            </td>

                            {/* Notas este mes */}
                            <td className="px-5 py-4 text-center">
                              <p className="text-lg font-black text-slate-900">{monthlyCounts[u.id] ?? 0}</p>
                              {u.consultations_limit < 999990 && (
                                <p className="text-xs text-slate-400">/ {u.consultations_limit} del plan</p>
                              )}
                            </td>

                            {/* Total histórico */}
                            <td className="px-5 py-4 text-center">
                              <p className="text-lg font-black text-slate-900">{u.consultations_used}</p>
                              <p className="text-xs text-slate-400">notas totales</p>
                            </td>

                            {/* Registro */}
                            <td className="px-5 py-4 text-xs text-slate-500 whitespace-nowrap">
                              {new Date(u.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>

                            {/* Acciones */}
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
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
                                <button
                                  onClick={() => applyPlan(u.id)}
                                  disabled={busy}
                                  className="text-xs bg-primary-600 hover:bg-primary-700 disabled:bg-slate-200 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                                >
                                  {busy ? '...' : 'Cambiar plan'}
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

          </>
        )}

        {/* ══ CONSULTAS TAB ══════════════════════════════════════════════════════ */}
        {tab === 'consultas' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-900">Consultas generadas</h2>
              <span className="text-xs text-slate-400">{consultas.length} más recientes</span>
            </div>

            {loading ? (
              <div className="p-10 text-center text-slate-400">Cargando consultas...</div>
            ) : consultas.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                <p className="font-medium">Sin consultas registradas</p>
                <p className="text-xs mt-1">Aún no hay consultas generadas en la plataforma.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left">
                      {['Fecha', 'Médico (email)', 'Tipo de nota', 'Especialidad', 'Aprobada'].map(h => (
                        <th key={h} className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {consultas.map(c => {
                      const ns = NOTE_STATUS_MAP[c.status ?? ''] ?? { label: c.status ?? '—', cls: 'bg-slate-100 text-slate-500' }
                      return (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-4 text-xs text-slate-500 whitespace-nowrap">
                            {new Date(c.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-medium text-slate-900">{c.doctor_name}</p>
                            <p className="text-xs text-slate-400">{c.doctor_email}</p>
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex text-xs font-semibold px-2.5 py-1 rounded-full bg-primary-50 text-primary-700">
                              {NOTE_TYPE_LABELS[c.note_type ?? ''] ?? c.note_type ?? '—'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-600">{c.specialty || '—'}</td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full ${ns.cls}`}>
                              {ns.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══ CLÍNICAS TAB ══════════════════════════════════════════════════════ */}
        {tab === 'clinics' && (
          <>
            {/* Clinic stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Building2}    label="Clínicas activas"  value={clinicas.filter(c => c.activa).length}            color="bg-primary-500" />
              <StatCard icon={Activity}     label="Créditos vendidos" value={totalCredits.toLocaleString('es-CO')}              color="bg-emerald-500" />
              <StatCard icon={TrendingUp}   label="HCs generadas"     value={totalUsedCredits.toLocaleString('es-CO')}          color="bg-blue-500" />
              <StatCard icon={AlertTriangle} label="Créditos bajos"   value={lowCreditClinics.length}                           color="bg-amber-500" />
            </div>

            {lowCreditClinics.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-amber-800 text-sm">Clínicas con créditos bajos (&lt;20%)</p>
                  <p className="text-amber-600 text-xs mt-1">{lowCreditClinics.map(c => c.nombre).join(' · ')}</p>
                </div>
              </div>
            )}

            {/* New clinic form */}
            <div className="flex justify-end">
              <button onClick={() => setShowNewClinic(v => !v)} className="flex items-center gap-2 text-sm bg-primary-600 hover:bg-primary-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors">
                <Plus size={15} /> Nueva clínica
              </button>
            </div>

            {showNewClinic && (
              <div className="bg-white rounded-2xl border-2 border-primary-200 p-5 space-y-4">
                <h3 className="font-bold text-slate-900">Nueva clínica / IPS</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Nombre de la institución</label>
                    <input type="text" value={newClinicName} onChange={e => setNewClinicName(e.target.value)} className="input-field" placeholder="Ej: Clínica San Rafael" />
                  </div>
                  <div>
                    <label className="label">Email del admin</label>
                    <input type="email" value={newClinicEmail} onChange={e => setNewClinicEmail(e.target.value)} className="input-field" placeholder="admin@clinica.com" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setShowNewClinic(false); setNewClinicName(''); setNewClinicEmail('') }} className="btn-primary text-sm">
                    Crear clínica
                  </button>
                  <button onClick={() => setShowNewClinic(false)} className="btn-ghost text-sm border border-slate-200">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Clinics table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-bold text-slate-900">Clínicas e IPS ({clinicas.length})</h2>
              </div>
              {loading ? (
                <div className="p-8 text-center text-slate-400">Cargando...</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {clinicas.map(clinica => {
                    const usedPct = clinica.creditos_totales > 0
                      ? ((clinica.creditos_totales - clinica.creditos_disponibles) / clinica.creditos_totales) * 100
                      : 0
                    const isLow = clinica.creditos_disponibles / Math.max(clinica.creditos_totales, 1) < 0.2
                    return (
                      <div key={clinica.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Building2 size={15} className="text-primary-500 flex-shrink-0" />
                              <span className="font-semibold text-slate-900">{clinica.nombre}</span>
                              {isLow && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Créditos bajos</span>}
                              {!clinica.activa && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Inactiva</span>}
                            </div>
                            <p className="text-xs text-slate-400 mb-2">{clinica.email_admin}</p>
                            <div className="flex items-center gap-3 mb-2">
                              <div className="flex-1 bg-slate-100 rounded-full h-2">
                                <div className={`h-full rounded-full ${isLow ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${usedPct}%` }} />
                              </div>
                              <span className="text-xs text-slate-600 font-medium whitespace-nowrap">
                                {(clinica.creditos_totales - clinica.creditos_disponibles).toLocaleString('es-CO')} / {clinica.creditos_totales.toLocaleString('es-CO')} HCs
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {(clinica.modulos_activos ?? []).map(m => (
                                <span key={m} className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">{MODULE_LABELS[m] ?? m}</span>
                              ))}
                              {(clinica.ips_autorizadas ?? []).length > 0 && (
                                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                                  🔒 {clinica.ips_autorizadas.length} IP{clinica.ips_autorizadas.length > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="text-right">
                              <p className="text-xl font-black text-slate-900">{clinica.creditos_disponibles.toLocaleString('es-CO')}</p>
                              <p className="text-xs text-slate-400">créditos restantes</p>
                            </div>
                            <Link to={`/admin/clinica?id=${clinica.id}`} className="text-xs text-primary-600 hover:text-primary-700 font-medium px-3 py-1.5 rounded-lg hover:bg-primary-50 transition-colors whitespace-nowrap border border-primary-200">
                              Gestionar →
                            </Link>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Activity log */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <Clock size={16} className="text-slate-400" />
                <h2 className="font-bold text-slate-900">Log de actividad reciente</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {activityLog.slice(0, 8).map(tx => (
                  <div key={tx.id} className="px-6 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${tx.tipo === 'recarga' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                      <div>
                        <p className="text-sm text-slate-700">{tx.descripcion}</p>
                        <p className="text-xs text-slate-400">{new Date(tx.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${tx.tipo === 'recarga' ? 'text-emerald-600' : 'text-blue-600'}`}>
                      {tx.tipo === 'recarga' ? '+' : '-'}{tx.creditos.toLocaleString('es-CO')} cr
                    </span>
                  </div>
                ))}
                {activityLog.length === 0 && <p className="px-6 py-6 text-sm text-slate-400 text-center">Sin actividad registrada</p>}
              </div>
            </div>

            {/* Revenue estimate */}
            <div className="bg-slate-900 text-white rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={18} className="text-primary-400" />
                <h3 className="font-bold">Resumen de ingresos estimados (clínicas)</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'HCs procesadas',       value: totalUsedCredits.toLocaleString('es-CO') },
                  { label: 'Ingresos estimados',   value: `$${(totalUsedCredits * 350).toLocaleString('es-CO')} COP` },
                  { label: 'Tasa de uso promedio', value: `${totalCredits > 0 ? Math.round((totalUsedCredits / totalCredits) * 100) : 0}%` },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-slate-400 text-xs mb-1">{label}</p>
                    <p className="text-xl font-black">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

      </div>
    </AppShell>
  )
}
