import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Mic, Clock, TrendingUp, ChevronRight, Calendar,
  Stethoscope, AlertTriangle, RefreshCw, Shield, FileText,
} from 'lucide-react'
import AppShell from '../components/AppShell'
import { useAuth } from '../contexts/AuthContext'
import { fetchConsultations, fetchSavingsStats } from '../lib/db'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Consultation } from '../lib/supabase'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatExpiryCountdown(expiresAt: string | null | undefined): { text: string; urgent: boolean } | null {
  if (!expiresAt) return null
  const remaining = new Date(expiresAt).getTime() - Date.now()
  if (remaining <= 0) return null
  const hours = Math.floor(remaining / (1000 * 60 * 60))
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
  const text = hours > 0
    ? `Disponible ${hours}h${minutes > 0 ? ` ${minutes}min` : ''} más`
    : `Disponible ${minutes}min más`
  return { text, urgent: hours < 2 }
}

function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(hours / 24)
  if (days > 0) return `Hace ${days} día${days !== 1 ? 's' : ''}`
  if (hours > 0) return `Hace ${hours} hora${hours !== 1 ? 's' : ''}`
  const mins = Math.floor(diff / 60_000)
  if (mins > 0) return `Hace ${mins} min`
  return 'Ahora mismo'
}

const NOTE_TYPE_LABELS: Record<string, { label: string; color: string; badge: string }> = {
  ingreso:      { label: 'HC de Ingreso',       color: 'text-primary-600',  badge: 'bg-primary-50 text-primary-700' },
  evolucion:    { label: 'Nota de Evolución',   color: 'text-violet-600',   badge: 'bg-violet-50 text-violet-700' },
  telemedicina: { label: 'Teleconsulta',        color: 'text-sky-600',      badge: 'bg-sky-50 text-sky-700' },
  traslado:     { label: 'Ingreso Traslado',    color: 'text-amber-600',    badge: 'bg-amber-50 text-amber-700' },
}

const PLAN_LABELS: Record<string, string> = {
  free_trial: 'Prueba gratis',
  basic:      'Básico',
  standard:   'Estándar',
  advanced:   'Avanzado',
  pro:        'Pro',
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, profile, isSupabaseMode } = useAuth()
  const navigate = useNavigate()
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [monthCount, setMonthCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!isSupabaseMode || !user?.id) { setLoading(false); return }
    setLoading(true)
    const [list, stats] = await Promise.all([
      fetchConsultations(user.id, 20),
      fetchSavingsStats(user.id),
    ])
    setConsultations(list)
    setMonthCount(stats.month)
    setLoading(false)
  }, [user?.id, isSupabaseMode])

  useEffect(() => { load() }, [load])

  // Realtime: refresh when any consultation is inserted (cross-device sync)
  useEffect(() => {
    if (!isSupabaseConfigured || !user?.id) return
    const channel = supabase
      .channel(`dashboard-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'consultations', filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user?.id, load])

  // ── Derived values ─────────────────────────────────────────────────────────
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'

  const MINS_PER_NOTE = 8
  const timeSavedMin = monthCount * MINS_PER_NOTE
  const timeSavedDisplay = timeSavedMin >= 60
    ? `${Math.floor(timeSavedMin / 60)}h ${timeSavedMin % 60 > 0 ? `${timeSavedMin % 60}min` : ''}`.trim()
    : `${timeSavedMin} min`

  const totalHistoricMin  = (profile?.consultations_used ?? 0) * MINS_PER_NOTE
  const totalHistoricDisplay = totalHistoricMin >= 60
    ? `${Math.floor(totalHistoricMin / 60)}h ${totalHistoricMin % 60 > 0 ? `${totalHistoricMin % 60}min` : ''}`.trim()
    : `${totalHistoricMin} min`
  const daysEquivalent = (timeSavedMin / 480).toFixed(1)

  const planLabel = PLAN_LABELS[profile?.plan ?? ''] ?? (profile?.plan ?? '—')

  const trialDaysLeft = profile?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / 86_400_000))
    : null

  const trialNotesLeft = profile?.trial_notes_limit != null && profile?.trial_notes_used != null
    ? Math.max(0, profile.trial_notes_limit - profile.trial_notes_used)
    : null

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Super admin shortcut */}
        {profile?.role === 'super_admin' && (
          <Link
            to="/admin"
            className="flex items-center gap-3 bg-slate-900 text-white rounded-2xl px-5 py-3 hover:bg-slate-800 transition-colors"
          >
            <Shield size={16} className="text-primary-400 flex-shrink-0" />
            <span className="text-sm font-semibold">Panel Super Admin — Dictia</span>
            <ChevronRight size={14} className="text-slate-400 ml-auto" />
          </Link>
        )}

        {/* Trial warning */}
        {profile?.plan === 'free_trial' && (
          (trialDaysLeft !== null && trialDaysLeft <= 2) ||
          (trialNotesLeft !== null && trialNotesLeft <= 3)
        ) && (
          <div className="flex items-center justify-between gap-4 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-amber-800 text-sm">
                  {trialNotesLeft !== null && trialNotesLeft <= 3
                    ? `Te ${trialNotesLeft === 1 ? 'queda' : 'quedan'} ${trialNotesLeft} nota${trialNotesLeft !== 1 ? 's' : ''} de prueba`
                    : trialDaysLeft === 0
                    ? 'Tu prueba gratuita vence hoy'
                    : `Te queda${trialDaysLeft === 1 ? '' : 'n'} ${trialDaysLeft} día${trialDaysLeft !== 1 ? 's' : ''} de prueba`}
                </p>
                <p className="text-amber-600 text-xs mt-0.5">
                  Activa tu plan para continuar sin interrupciones.
                </p>
              </div>
            </div>
            <Link to="/facturacion" className="btn-primary text-sm py-2 px-4 whitespace-nowrap">
              Activar plan
            </Link>
          </div>
        )}

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-slate-500 text-sm">
              {greeting}, {profile?.gender === 'doctora' ? 'Doctora' : 'Doctor'}
            </p>
            <h1 className="text-2xl font-bold text-slate-900">{profile?.full_name ?? ''}</h1>
            {profile?.specialty && (
              <p className="text-sm text-slate-400 mt-0.5">{profile.specialty}</p>
            )}
          </div>
          <Link to="/nueva-consulta" className="btn-primary text-sm py-3 px-6 self-start sm:self-auto">
            <Mic size={18} />
            Nueva consulta
          </Link>
        </div>

        {/* ── 3 KPI cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Consultas este mes */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-500">Consultas este mes</p>
              <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center">
                <Stethoscope size={15} className="text-primary-600" />
              </div>
            </div>
            {loading ? (
              <div className="h-8 bg-slate-100 rounded-lg animate-pulse w-16" />
            ) : (
              <>
                <div className="text-3xl font-black text-slate-900">{monthCount}</div>
                <p className="text-xs text-slate-400 mt-1">
                  {consultations.length} en total · {consultations.filter(c => c.note_type === 'telemedicina').length} teleconsultas
                </p>
              </>
            )}
          </div>

          {/* Tiempo ahorrado este mes */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-500">Tiempo ahorrado</p>
              <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                <Clock size={15} className="text-emerald-600" />
              </div>
            </div>
            {loading ? (
              <div className="h-8 bg-slate-100 rounded-lg animate-pulse w-20" />
            ) : (
              <>
                <div className="text-3xl font-black text-slate-900">{timeSavedDisplay}</div>
                <p className="text-xs text-slate-400 mt-1">~8 min por consulta que ya no escribes</p>
              </>
            )}
          </div>

          {/* Plan actual */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-500">Plan actual</p>
              <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
                <TrendingUp size={15} className="text-violet-600" />
              </div>
            </div>
            <div className="text-xl font-black text-slate-900">{planLabel}</div>
            {profile?.plan === 'free_trial' && trialNotesLeft !== null ? (
              <p className={`text-xs mt-1 font-medium ${trialNotesLeft <= 3 ? 'text-red-500' : 'text-slate-400'}`}>
                {trialNotesLeft} nota{trialNotesLeft !== 1 ? 's' : ''} restante{trialNotesLeft !== 1 ? 's' : ''}
              </p>
            ) : (
              <Link to="/facturacion" className="text-xs text-primary-600 font-semibold hover:text-primary-700 mt-1 inline-flex items-center gap-0.5">
                {profile?.plan === 'free_trial' ? 'Activar plan' : 'Administrar'} <ChevronRight size={12} />
              </Link>
            )}
          </div>
        </div>

        {/* ── Mi impacto ── */}
        {!loading && monthCount > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <h2 className="font-bold text-slate-900 mb-4">Mi impacto este mes</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 rounded-xl p-4">
                <p className="text-2xl font-black text-emerald-700">{timeSavedDisplay}</p>
                <p className="text-xs text-emerald-600 font-medium mt-1">ahorrados en documentación</p>
                <p className="text-xs text-emerald-500 mt-0.5">~8 min × {monthCount} nota{monthCount !== 1 ? 's' : ''} aprobada{monthCount !== 1 ? 's' : ''}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-2xl font-black text-slate-700">{daysEquivalent}</p>
                <p className="text-xs text-slate-600 font-medium mt-1">días laborales equivalentes</p>
                <p className="text-xs text-slate-400 mt-0.5">calculado sobre jornadas de 8 horas</p>
              </div>
            </div>
            {(profile?.consultations_used ?? 0) > monthCount && (
              <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
                Tiempo total ahorrado desde que usas Dictia: <span className="font-semibold text-slate-600">{totalHistoricDisplay}</span>
              </p>
            )}
          </div>
        )}

        {/* ── Recent consultations ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900 text-lg">Consultas recientes</h2>
            <Link to="/historial" className="text-sm text-primary-600 font-semibold hover:text-primary-700 flex items-center gap-0.5">
              Ver todo <ChevronRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="card animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-100 rounded w-1/3" />
                      <div className="h-3 bg-slate-100 rounded w-1/2" />
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
              <Link to="/nueva-consulta" className="btn-primary text-sm py-2 px-5 mt-4 inline-flex">
                <Mic size={15} /> Grabar primera consulta
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {consultations.slice(0, 8).map(c => {
                const typeInfo = NOTE_TYPE_LABELS[c.note_type ?? ''] ?? { label: 'Consulta', color: 'text-slate-600', badge: 'bg-slate-100 text-slate-600' }
                const isPending  = c.status === 'completed'
                const countdown  = isPending ? formatExpiryCountdown(c.expires_at) : null
                return (
                  <button
                    key={c.id}
                    onClick={() => navigate('/historial')}
                    className={`w-full text-left card hover:shadow-md transition-all duration-200 cursor-pointer group ${
                      isPending ? 'border-amber-200 hover:border-amber-300' : 'hover:border-primary-200'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isPending ? 'bg-amber-50' : typeInfo.badge
                      }`}>
                        <Stethoscope size={18} className={isPending ? 'text-amber-600' : typeInfo.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeInfo.badge}`}>
                            {typeInfo.label}
                          </span>
                          {c.specialty && (
                            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{c.specialty}</span>
                          )}
                          {!isPending && (
                            <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                              <FileText size={9} /> Ver nota
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {isPending ? (
                            <span className={`text-xs font-semibold ${countdown?.urgent ? 'text-red-600' : 'text-amber-600'}`}>
                              Pendiente de aprobación{countdown ? ` — ${countdown.text}` : ''}
                            </span>
                          ) : (
                            <span className="text-xs text-emerald-600 font-medium">Nota aprobada</span>
                          )}
                          {c.recording_duration > 0 && (
                            <span className="text-xs text-slate-400">
                              · {Math.floor(c.recording_duration / 60)}:{String(c.recording_duration % 60).padStart(2, '0')} min
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1 text-xs text-slate-400 justify-end">
                          <Calendar size={11} />
                          {formatTimeAgo(c.created_at)}
                        </div>
                        <p className="text-xs text-slate-300">
                          {new Date(c.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                        </p>
                        <ChevronRight size={13} className="text-slate-200 group-hover:text-primary-400 transition-colors" />
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </AppShell>
  )
}
