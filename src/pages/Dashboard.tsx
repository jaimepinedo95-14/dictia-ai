import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Mic, Clock, TrendingUp, ChevronRight, Calendar, Stethoscope, AlertTriangle, RefreshCw, BarChart2, Eye, Shield } from 'lucide-react'
import AppShell from '../components/AppShell'
import SavingsDashboard from '../components/SavingsDashboard'
import { useAuth } from '../contexts/AuthContext'
import { fetchConsultations } from '../lib/db'
import { MOCK_CONSULTATIONS } from '../lib/mockData'
import type { Consultation } from '../lib/supabase'

function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  if (days > 0) return `Hace ${days} día${days !== 1 ? 's' : ''}`
  if (hours > 0) return `Hace ${hours} hora${hours !== 1 ? 's' : ''}`
  const mins = Math.floor(diff / (1000 * 60))
  if (mins > 0) return `Hace ${mins} min`
  return 'Ahora mismo'
}

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function WeeklyChart({ consultations }: { consultations: Consultation[] }) {
  const today = new Date()
  const counts = Array(7).fill(0)
  consultations.forEach(c => {
    const d = new Date(c.created_at)
    const diffDays = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays < 7) {
      const idx = 6 - diffDays
      counts[idx]++
    }
  })
  const max = Math.max(...counts, 1)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (6 - i))
    return { label: DAY_LABELS[d.getDay()], count: counts[i], isToday: i === 6 }
  })

  return (
    <div className="flex items-end gap-2 h-24">
      {days.map(({ label, count, isToday }, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
          <span className="text-xs font-bold text-slate-700">{count > 0 ? count : ''}</span>
          <div className="w-full flex items-end" style={{ height: '60px' }}>
            <div
              className={`w-full rounded-t-lg transition-all duration-500 ${
                isToday ? 'bg-primary-600' : 'bg-primary-200'
              }`}
              style={{ height: `${Math.max((count / max) * 60, count > 0 ? 6 : 3)}px` }}
            />
          </div>
          <span className={`text-xs ${isToday ? 'font-bold text-primary-600' : 'text-slate-400'}`}>
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}

function NoteTypeSummary({ consultations }: { consultations: Consultation[] }) {
  const types = [
    { key: 'ingreso', label: 'HC Ingreso', color: 'bg-primary-500' },
    { key: 'evolucion', label: 'Evolución', color: 'bg-violet-500' },
    { key: 'telemedicina', label: 'Telemedicina', color: 'bg-sky-500' },
  ]
  const total = consultations.length || 1
  const counts = types.map(t => ({ ...t, count: consultations.filter(c => c.note_type === t.key).length }))
  const nonEmpty = counts.filter(t => t.count > 0)
  if (nonEmpty.length === 0) return null

  return (
    <div className="space-y-2.5">
      {nonEmpty.map(({ label, color, count }) => (
        <div key={label}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-600 font-medium">{label}</span>
            <span className="text-xs text-slate-400">{count} nota{count !== 1 ? 's' : ''}</span>
          </div>
          <div className="bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${(count / total) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { user, profile, isSupabaseMode } = useAuth()
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [loadingConsultations, setLoadingConsultations] = useState(true)

  useEffect(() => {
    async function load() {
      setLoadingConsultations(true)
      if (isSupabaseMode && user?.id) {
        const real = await fetchConsultations(user.id, 20)
        setConsultations(real.length > 0 ? real : MOCK_CONSULTATIONS)
      } else {
        setConsultations(MOCK_CONSULTATIONS)
      }
      setLoadingConsultations(false)
    }
    load()
  }, [user, isSupabaseMode])

  const trialDaysLeft = profile?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  const usedPct = profile && profile.consultations_limit < 999999
    ? Math.min(100, (profile.consultations_used / profile.consultations_limit) * 100)
    : 0

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'

  const consultationsLeft = profile && profile.consultations_limit < 999999
    ? profile.consultations_limit - profile.consultations_used
    : null

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Super Admin shortcut */}
        {(profile?.email === 'jaimepinedo95@gmail.com' || profile?.role === 'super_admin') && (
          <Link to="/admin/super" className="flex items-center gap-3 bg-slate-900 text-white rounded-2xl px-5 py-3 hover:bg-slate-800 transition-colors">
            <Shield size={16} className="text-primary-400 flex-shrink-0" />
            <span className="text-sm font-semibold">Panel Super Admin — Dictia</span>
            <ChevronRight size={14} className="text-slate-400 ml-auto" />
          </Link>
        )}

        {/* Clinic Admin shortcut */}
        {profile?.role === 'admin_clinica' && profile.clinica_id && (
          <Link to={`/admin/clinica?id=${profile.clinica_id}`} className="flex items-center gap-3 bg-primary-50 border border-primary-200 rounded-2xl px-5 py-3 hover:bg-primary-100 transition-colors">
            <Shield size={16} className="text-primary-600 flex-shrink-0" />
            <span className="text-sm font-semibold text-primary-800">Panel de administración — tu clínica</span>
            <ChevronRight size={14} className="text-primary-400 ml-auto" />
          </Link>
        )}

        {/* Trial banner */}
        {profile?.plan === 'free_trial' && trialDaysLeft !== null && trialDaysLeft <= 2 && (
          <div className="flex items-center justify-between gap-4 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-amber-800 text-sm">
                  {trialDaysLeft === 0
                    ? 'Tu prueba gratuita vence hoy'
                    : `Te queda${trialDaysLeft === 1 ? '' : 'n'} ${trialDaysLeft} día${trialDaysLeft !== 1 ? 's' : ''} de prueba`}
                </p>
                <p className="text-amber-600 text-xs mt-0.5">
                  Activa tu plan para continuar documentando sin interrupciones.
                </p>
              </div>
            </div>
            <Link to="/facturacion" className="btn-primary text-sm py-2 px-4 whitespace-nowrap">
              Activar plan
            </Link>
          </div>
        )}

        {!isSupabaseMode && (
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs text-slate-400">
            <span className="w-2 h-2 bg-amber-400 rounded-full" />
            Modo demo — Supabase no configurado. Los datos son de ejemplo.
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-slate-500 text-sm">{greeting},</p>
            <h1 className="text-2xl font-bold text-slate-900">{profile?.full_name ?? 'Doctor'}</h1>
            <p className="text-sm text-slate-400 mt-0.5">{profile?.specialty} · {profile?.country}</p>
          </div>
          <Link to="/nueva-consulta" className="btn-primary text-sm py-3 px-6">
            <Mic size={18} />
            Nueva consulta
          </Link>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-500">Consultas este mes</p>
              <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center">
                <Stethoscope size={15} className="text-primary-600" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900">{profile?.consultations_used ?? 0}</div>
            {consultationsLeft !== null ? (
              <>
                <p className="text-xs text-slate-400 mt-1">
                  {consultationsLeft > 0
                    ? `Quedan ${consultationsLeft} de ${profile?.consultations_limit}`
                    : 'Límite alcanzado'}
                </p>
                <div className="mt-3 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      usedPct > 80 ? 'bg-red-500' : usedPct > 60 ? 'bg-amber-500' : 'bg-primary-600'
                    }`}
                    style={{ width: `${usedPct}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="text-xs text-emerald-600 mt-1 font-medium">
                {profile?.plan === 'free_trial' ? 'Ilimitadas durante la prueba' : 'Plan Pro — sin límite mensual'}
              </p>
            )}
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-500">Tiempo ahorrado estimado</p>
              <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                <Clock size={15} className="text-emerald-600" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900">
              {((profile?.consultations_used ?? 0) * 7.5 / 60).toFixed(1)}h
            </div>
            <p className="text-xs text-slate-400 mt-1">~7.5 min ahorrados por consulta</p>
            <p className="text-xs text-emerald-600 font-medium mt-1">
              ≈ {((profile?.consultations_used ?? 0) * 7.5 / 60 / 8).toFixed(1)} días laborales liberados
            </p>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-500">Plan actual</p>
              <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
                <TrendingUp size={15} className="text-violet-600" />
              </div>
            </div>
            <div className="text-xl font-black text-slate-900 capitalize">
              {profile?.plan === 'free_trial' ? 'Prueba gratis' : profile?.plan}
            </div>
            {profile?.plan === 'free_trial' && trialDaysLeft !== null && (
              <p className={`text-xs mt-1 font-medium ${trialDaysLeft <= 1 ? 'text-red-500' : 'text-amber-600'}`}>
                {trialDaysLeft === 0 ? 'Vence hoy' : `${trialDaysLeft} día${trialDaysLeft !== 1 ? 's' : ''} restante${trialDaysLeft !== 1 ? 's' : ''}`}
              </p>
            )}
            <Link to="/facturacion" className="text-xs text-primary-600 font-semibold hover:text-primary-700 mt-1 inline-flex items-center gap-0.5">
              {profile?.plan === 'free_trial' ? 'Activar plan' : 'Administrar'}
              <ChevronRight size={12} />
            </Link>
          </div>

          {/* Telemedicina count */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-500">Teleconsultas</p>
              <div className="w-8 h-8 bg-sky-50 rounded-lg flex items-center justify-center">
                <Stethoscope size={15} className="text-sky-600" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900">
              {consultations.filter(c => c.note_type === 'telemedicina').length}
            </p>
            <p className="text-xs text-slate-400 mt-1">de {consultations.length} consultas totales</p>
          </div>
        </div>

        {/* Analytics row */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Weekly chart */}
          <div className="card">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Consultas esta semana</h3>
                <p className="text-xs text-slate-400 mt-0.5">Últimos 7 días</p>
              </div>
              <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center">
                <BarChart2 size={15} className="text-primary-600" />
              </div>
            </div>
            {loadingConsultations ? (
              <div className="h-24 bg-slate-50 rounded-xl animate-pulse" />
            ) : (
              <WeeklyChart consultations={consultations} />
            )}
          </div>

          {/* Top diagnoses */}
          <div className="card">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Diagnósticos frecuentes</h3>
                <p className="text-xs text-slate-400 mt-0.5">Basado en consultas registradas</p>
              </div>
              <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
                <Stethoscope size={15} className="text-violet-600" />
              </div>
            </div>
            {loadingConsultations ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-8 bg-slate-50 rounded-lg animate-pulse" />)}
              </div>
            ) : (
              <NoteTypeSummary consultations={consultations} />
            )}
          </div>
        </div>

        {/* Savings / impact widget */}
        <SavingsDashboard />

        {/* New consultation CTA */}
        <Link
          to="/nueva-consulta"
          className="block bg-gradient-to-r from-primary-600 to-primary-500 rounded-3xl p-7 text-white group hover:from-primary-700 hover:to-primary-600 transition-all duration-200 shadow-lg shadow-primary-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Mic size={24} />
                </div>
                <h2 className="text-xl font-bold">Iniciar nueva consulta</h2>
              </div>
              <p className="text-primary-200 text-sm">
                Atiende a tu paciente con normalidad. Dictia documenta por ti en segundos.
              </p>
            </div>
            <ChevronRight size={28} className="opacity-60 group-hover:translate-x-1 transition-transform flex-shrink-0" />
          </div>
        </Link>

        {/* Recent consultations */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900 text-lg">Consultas recientes</h2>
            <Link to="/historial" className="text-sm text-primary-600 font-semibold hover:text-primary-700 flex items-center gap-0.5">
              Ver todo <ChevronRight size={14} />
            </Link>
          </div>

          {loadingConsultations ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="card animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-100 rounded w-1/3" />
                      <div className="h-3 bg-slate-100 rounded w-2/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : consultations.length === 0 ? (
            <div className="card text-center py-12">
              <RefreshCw size={28} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium text-sm">No hay consultas aún</p>
              <p className="text-slate-400 text-xs mt-1">Tu primera consulta aparecerá aquí</p>
            </div>
          ) : (
            <div className="space-y-3">
              {consultations.slice(0, 5).map((c) => {
                const isEvolucion = c.note_type === 'evolucion'
                const isTelemed = c.note_type === 'telemedicina'
                return (
                  <div key={c.id} className="card hover:border-primary-200 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isEvolucion ? 'bg-violet-50' : isTelemed ? 'bg-sky-50' : 'bg-primary-50'
                      }`}>
                        <Stethoscope size={18} className={
                          isEvolucion ? 'text-violet-600' : isTelemed ? 'text-sky-600' : 'text-primary-600'
                        } />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {c.specialty && (
                            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{c.specialty}</span>
                          )}
                          {isTelemed && (
                            <span className="text-xs bg-sky-100 text-sky-600 px-2 py-0.5 rounded-full">📡 Telemedicina</span>
                          )}
                          {isEvolucion && (
                            <span className="text-xs bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full">🏥 Evolución</span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5 italic text-xs">
                          Nota aprobada · contenido no almacenado
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 space-y-1">
                        <div className="flex items-center gap-1 text-xs text-slate-400 justify-end">
                          <Calendar size={11} />
                          {formatTimeAgo(c.created_at)}
                        </div>
                        <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-medium px-2 py-0.5 rounded-full">
                          Aprobada
                        </div>
                        <Link
                          to="/historial"
                          className="flex items-center gap-1 text-xs text-primary-600 font-medium hover:text-primary-700 justify-end"
                        >
                          <Eye size={11} /> Ver nota
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
