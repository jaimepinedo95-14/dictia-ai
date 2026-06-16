import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Calendar, Clock, Stethoscope, RefreshCw,
  FileText, Video, Activity, ChevronRight,
} from 'lucide-react'
import AppShell from '../components/AppShell'
import { useAuth } from '../contexts/AuthContext'
import { fetchConsultations } from '../lib/db'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Consultation, NoteType, SoapNote } from '../lib/supabase'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatExpiry(expiresAt: string | null | undefined): { text: string; color: string } | null {
  if (!expiresAt) return null
  const remaining = new Date(expiresAt).getTime() - Date.now()
  if (remaining <= 0) return null
  const hours = Math.floor(remaining / (1000 * 60 * 60))
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
  const text = hours > 0
    ? `Se elimina en ${hours}h${minutes > 0 ? ` ${minutes}min` : ''}`
    : `Se elimina en ${minutes}min`
  return { text, color: hours < 2 ? 'text-red-600' : 'text-amber-600' }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

const NOTE_TYPE_META: Record<NoteType, { label: string; color: string; Icon: typeof FileText }> = {
  ingreso:      { label: 'HC Ingreso',     color: 'bg-primary-50 text-primary-700', Icon: FileText },
  evolucion:    { label: 'Nota Evolución', color: 'bg-violet-50 text-violet-700',   Icon: Activity },
  telemedicina: { label: 'Telemedicina',   color: 'bg-sky-50 text-sky-700',         Icon: Video },
  traslado:     { label: 'Ing. Traslado',  color: 'bg-amber-50 text-amber-700',     Icon: FileText },
}

function loadLocalNote(id: string): SoapNote | null {
  try {
    const raw = localStorage.getItem(`dictia_note_${id}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { note: SoapNote; savedAt: number }
    if (Date.now() - parsed.savedAt > 90 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(`dictia_note_${id}`)
      return null
    }
    return parsed.note
  } catch { return null }
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function History() {
  const { user, isSupabaseMode } = useAuth()
  const navigate = useNavigate()
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    if (isSupabaseMode && user?.id) {
      const data = await fetchConsultations(user.id, 100)
      setConsultations(data)
    }
    setLoading(false)
  }, [user?.id, isSupabaseMode])

  useEffect(() => { load() }, [load])

  // Realtime: refresh when consultations change
  useEffect(() => {
    if (!isSupabaseConfigured || !user?.id) return
    const channel = supabase
      .channel(`history-${user.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'consultations', filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user?.id, load])

  function openConsultation(c: Consultation) {
    const note = (c.note_content as SoapNote | null) ?? loadLocalNote(c.id)
    navigate(`/historial/${c.id}`, { state: { consultation: c, note } })
  }

  const filtered = consultations.filter(c => {
    const q = search.toLowerCase()
    return (
      c.specialty?.toLowerCase().includes(q) ||
      (c.note_type && NOTE_TYPE_META[c.note_type]?.label.toLowerCase().includes(q))
    )
  })

  const totalDuration = filtered.reduce((sum, c) => sum + (c.recording_duration ?? 0), 0)
  const approvedCount = filtered.filter(c => c.status === 'approved').length
  const timeSaved     = approvedCount * 8

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Historial de consultas</h1>
          <p className="text-slate-500 text-sm mt-1">
            {loading
              ? 'Cargando...'
              : `${filtered.length} consulta${filtered.length !== 1 ? 's' : ''} · ${timeSaved} min ahorrados`}
          </p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-start gap-3">
          <span className="text-emerald-500 mt-0.5">🔒</span>
          <p className="text-xs text-emerald-700 leading-relaxed">
            <span className="font-semibold">Privacidad garantizada:</span> Las notas clínicas se almacenan de forma segura y solo son accesibles desde tu cuenta.
          </p>
        </div>

        <div className="relative">
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por especialidad o tipo de nota..."
            className="input-field pl-11"
          />
        </div>

        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Consultas',           value: filtered.length },
              { label: 'Minutos grabados',    value: Math.round(totalDuration / 60) },
              { label: 'Min. ahorrados doc.', value: timeSaved },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
                <p className="text-2xl font-black text-slate-900">{value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-100 rounded w-1/4" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <RefreshCw size={32} className="mx-auto mb-3 opacity-40" />
                <p>{search ? 'No se encontraron consultas con esa búsqueda' : 'No hay consultas aún'}</p>
              </div>
            )}

            {filtered.map((c: Consultation) => {
              const typeMeta  = c.note_type ? NOTE_TYPE_META[c.note_type] : null
              const TypeIcon  = typeMeta?.Icon ?? Stethoscope
              const isPending = c.status === 'completed'
              const expiry    = isPending ? formatExpiry(c.expires_at) : null
              const hasNote   = !!(c.note_content ?? loadLocalNote(c.id))

              return (
                <button
                  key={c.id}
                  onClick={() => openConsultation(c)}
                  className={`w-full text-left bg-white rounded-2xl border p-5 hover:shadow-md transition-all cursor-pointer group ${
                    isPending ? 'border-amber-200' : 'border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isPending ? 'bg-amber-50' : 'bg-primary-50'
                    }`}>
                      <TypeIcon size={18} className={isPending ? 'text-amber-600' : 'text-primary-600'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {typeMeta && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeMeta.color}`}>
                            {typeMeta.label}
                          </span>
                        )}
                        {c.specialty && (
                          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                            {c.specialty}
                          </span>
                        )}
                        {hasNote && (
                          <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-medium">
                            Ver nota
                          </span>
                        )}
                      </div>
                      {isPending ? (
                        <p className={`text-xs mt-1 font-semibold ${expiry ? expiry.color : 'text-amber-600'}`}>
                          Pendiente de aprobación{expiry ? ` — ${expiry.text}` : ''}
                        </p>
                      ) : (
                        <p className="text-xs text-emerald-600 mt-1 font-medium">Nota aprobada</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Calendar size={11} />
                        {formatDate(c.created_at)}
                      </div>
                      {c.recording_duration > 0 && (
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock size={11} />
                          {formatDuration(c.recording_duration)} grabado
                        </div>
                      )}
                      <ChevronRight size={14} className="text-slate-300 group-hover:text-primary-500 transition-colors mt-1" />
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
