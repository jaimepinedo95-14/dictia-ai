import { useState, useEffect, useCallback } from 'react'
import {
  Search, Calendar, Clock, Stethoscope, RefreshCw,
  FileText, Video, Activity, X, Copy, Check, ChevronRight,
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

// localStorage fallback for notes approved before DB column was added
function loadLocalNote(consultationId: string): SoapNote | null {
  try {
    const raw = localStorage.getItem(`dictia_note_${consultationId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { note: SoapNote; savedAt: number }
    if (Date.now() - parsed.savedAt > 90 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(`dictia_note_${consultationId}`)
      return null
    }
    return parsed.note
  } catch { return null }
}

function resolveNote(c: Consultation): SoapNote | null {
  return c.note_content ?? loadLocalNote(c.id)
}

// ── NoteSection ───────────────────────────────────────────────────────────────

function NoteSection({ title, content }: { title: string; content: string | undefined }) {
  const [copied, setCopied] = useState(false)
  if (!content?.trim()) return null

  function copy() {
    navigator.clipboard.writeText(content!).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</p>
        <button
          onClick={copy}
          className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-slate-400 hover:text-primary-600 transition-all"
        >
          {copied ? <><Check size={11} className="text-emerald-500" /> Copiado</> : <><Copy size={11} /> Copiar</>}
        </button>
      </div>
      <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{content}</p>
    </div>
  )
}

// ── NoteModal ─────────────────────────────────────────────────────────────────

function NoteModal({
  consultation,
  note,
  onClose,
}: {
  consultation: Consultation
  note: SoapNote | null
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  const typeMeta = consultation.note_type ? NOTE_TYPE_META[consultation.note_type] : null

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function copyAll() {
    if (!note) return
    const lines = [
      note.chief_complaint      && `MOTIVO DE CONSULTA:\n${note.chief_complaint}`,
      note.current_illness      && `\nENFERMEDAD ACTUAL:\n${note.current_illness}`,
      note.relevant_history     && `\nANTECEDENTES:\n${note.relevant_history}`,
      note.physical_exam        && `\nEXAMEN FÍSICO:\n${note.physical_exam}`,
      note.analysis             && `\nANÁLISIS:\n${note.analysis}`,
      note.diagnosis            && `\nDIAGNÓSTICO:\n${note.diagnosis}`,
      note.cie10_code           && `CIE-10: ${note.cie10_code} — ${note.cie10_description}`,
      note.management_plan      && `\nPLAN DE MANEJO:\n${note.management_plan}`,
      note.patient_instructions && `\nINSTRUCCIONES AL PACIENTE:\n${note.patient_instructions}`,
    ].filter(Boolean).join('\n')
    navigator.clipboard.writeText(lines).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-2xl bg-white sm:rounded-3xl shadow-2xl flex flex-col max-h-screen sm:max-h-[90vh]">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-4 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {typeMeta && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeMeta.color}`}>
                  {typeMeta.label}
                </span>
              )}
              {consultation.specialty && (
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                  {consultation.specialty}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">{formatDate(consultation.created_at)}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {note && (
              <button
                onClick={copyAll}
                className="flex items-center gap-1.5 text-sm font-bold bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl transition-colors"
              >
                {copied ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar nota completa</>}
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <X size={18} className="text-slate-500" />
            </button>
          </div>
        </div>

        {/* Sections */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {note ? (
            <>
              <NoteSection title="Motivo de consulta"       content={note.chief_complaint} />
              <NoteSection title="Enfermedad actual"         content={note.current_illness} />
              <NoteSection title="Antecedentes"              content={note.relevant_history} />
              <NoteSection title="Examen físico"             content={note.physical_exam} />
              <NoteSection title="Análisis"                  content={note.analysis} />
              {note.diagnosis && (
                <div className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Diagnóstico</p>
                    <button
                      onClick={() => navigator.clipboard.writeText(`${note.diagnosis}\nCIE-10: ${note.cie10_code} — ${note.cie10_description}`)}
                      className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-slate-400 hover:text-primary-600 transition-all"
                    >
                      <Copy size={11} /> Copiar
                    </button>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{note.diagnosis}</p>
                  {note.cie10_code && (
                    <p className="text-xs text-slate-400 mt-0.5">{note.cie10_code} — {note.cie10_description}</p>
                  )}
                </div>
              )}
              <NoteSection title="Plan de manejo"            content={note.management_plan} />
              <NoteSection title="Instrucciones al paciente"  content={note.patient_instructions} />
              {note.referral_letter && (
                <NoteSection title="Carta de remisión"        content={note.referral_letter} />
              )}
              {note.vital_signs && (
                <NoteSection title="Signos vitales"           content={note.vital_signs} />
              )}
            </>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <FileText size={36} className="mx-auto mb-3 opacity-25" />
              <p className="font-semibold text-slate-600 text-sm">Nota no disponible en este dispositivo</p>
              <p className="text-xs mt-2 max-w-xs mx-auto leading-relaxed text-slate-400">
                Por privacidad, las notas se guardan en este navegador. Si aprobaste esta nota en otro dispositivo o navegador, no es posible recuperarla aquí.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function History() {
  const { user, isSupabaseMode } = useAuth()
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<{ consultation: Consultation; note: SoapNote | null } | null>(null)

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

  function openNote(c: Consultation) {
    setSelected({ consultation: c, note: resolveNote(c) })
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
            {loading ? 'Cargando...' : `${filtered.length} consulta${filtered.length !== 1 ? 's' : ''} · ${timeSaved} min ahorrados en documentación`}
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
                  onClick={() => openNote(c)}
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

      {selected && (
        <NoteModal
          consultation={selected.consultation}
          note={selected.note}
          onClose={() => setSelected(null)}
        />
      )}
    </AppShell>
  )
}
