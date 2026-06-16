import { useState, useEffect } from 'react'
import {
  Search, Calendar, Clock, Stethoscope, RefreshCw,
  FileText, Video, Activity, X, Copy, Check, ChevronRight,
} from 'lucide-react'
import AppShell from '../components/AppShell'
import { useAuth } from '../contexts/AuthContext'
import { fetchConsultations } from '../lib/db'
import type { Consultation, NoteType, SoapNote } from '../lib/supabase'

function formatExpiry(expiresAt: string | null | undefined): { text: string; color: string } | null {
  if (!expiresAt) return null
  const remaining = new Date(expiresAt).getTime() - Date.now()
  if (remaining <= 0) return null
  const hours = Math.floor(remaining / (1000 * 60 * 60))
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
  const text = hours > 0
    ? `Expira en ${hours}h${minutes > 0 ? ` ${minutes}min` : ''}`
    : `Expira en ${minutes}min`
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

type StoredNote = { note: SoapNote; savedAt: number }

function loadStoredNote(consultationId: string): SoapNote | null {
  try {
    const raw = localStorage.getItem(`dictia_note_${consultationId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredNote
    // Discard notes older than 90 days
    if (Date.now() - parsed.savedAt > 90 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(`dictia_note_${consultationId}`)
      return null
    }
    return parsed.note
  } catch {
    return null
  }
}

function NoteSection({ title, content }: { title: string; content: string | undefined }) {
  if (!content?.trim()) return null
  return (
    <div>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{title}</p>
      <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{content}</p>
    </div>
  )
}

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

  function copyNote() {
    if (!note) return
    const lines = [
      note.chief_complaint && `MOTIVO DE CONSULTA:\n${note.chief_complaint}`,
      note.current_illness && `\nENFERMEDAD ACTUAL:\n${note.current_illness}`,
      note.relevant_history && `\nANTECEDENTES:\n${note.relevant_history}`,
      note.physical_exam && `\nEXAMEN FÍSICO:\n${note.physical_exam}`,
      note.analysis && `\nANÁLISIS:\n${note.analysis}`,
      note.diagnosis && `\nDIAGNÓSTICO:\n${note.diagnosis}`,
      note.cie10_code && `CIE-10: ${note.cie10_code} — ${note.cie10_description}`,
      note.management_plan && `\nPLAN DE MANEJO:\n${note.management_plan}`,
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
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-4">
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
                onClick={copyNote}
                className="flex items-center gap-1.5 text-xs font-semibold bg-primary-50 hover:bg-primary-100 text-primary-700 px-3 py-2 rounded-xl transition-colors"
              >
                {copied ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar nota</>}
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <X size={18} className="text-slate-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {note ? (
            <>
              <NoteSection title="Motivo de consulta"      content={note.chief_complaint} />
              <NoteSection title="Enfermedad actual"        content={note.current_illness} />
              <NoteSection title="Antecedentes"             content={note.relevant_history} />
              <NoteSection title="Examen físico"            content={note.physical_exam} />
              <NoteSection title="Análisis"                 content={note.analysis} />
              {note.diagnosis && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Diagnóstico</p>
                  <p className="text-sm font-semibold text-slate-900">{note.diagnosis}</p>
                  {note.cie10_code && (
                    <p className="text-xs text-slate-400 mt-0.5">{note.cie10_code} — {note.cie10_description}</p>
                  )}
                </div>
              )}
              <NoteSection title="Plan de manejo"           content={note.management_plan} />
              <NoteSection title="Instrucciones al paciente" content={note.patient_instructions} />
              {note.referral_letter && (
                <NoteSection title="Carta de remisión"      content={note.referral_letter} />
              )}
            </>
          ) : (
            <div className="text-center py-10 text-slate-400">
              <FileText size={32} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium text-slate-500">Nota no disponible en este dispositivo</p>
              <p className="text-xs mt-2 max-w-xs mx-auto leading-relaxed">
                Dictia no almacena notas en servidores. Las notas solo están disponibles en el dispositivo y navegador donde fueron aprobadas.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function History() {
  const { user, isSupabaseMode } = useAuth()
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<{ consultation: Consultation; note: SoapNote | null } | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      if (isSupabaseMode && user?.id) {
        const data = await fetchConsultations(user.id, 100)
        setConsultations(data)
      }
      setLoading(false)
    }
    load()
  }, [user, isSupabaseMode])

  function openNote(c: Consultation) {
    setSelected({ consultation: c, note: loadStoredNote(c.id) })
  }

  const filtered = consultations.filter(c => {
    const q = search.toLowerCase()
    return (
      c.specialty?.toLowerCase().includes(q) ||
      (c.note_type && NOTE_TYPE_META[c.note_type]?.label.toLowerCase().includes(q))
    )
  })

  const totalDuration = filtered.reduce((sum, c) => sum + (c.recording_duration ?? 0), 0)
  const timeSaved = Math.round(filtered.length * 7.5)

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Historial de consultas</h1>
          <p className="text-slate-500 text-sm mt-1">
            {loading ? 'Cargando...' : `${filtered.length} consulta${filtered.length !== 1 ? 's' : ''} · ${timeSaved} min ahorrados`}
          </p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-start gap-3">
          <span className="text-emerald-500 mt-0.5">🔒</span>
          <p className="text-xs text-emerald-700 leading-relaxed">
            <span className="font-semibold">Privacidad garantizada:</span> Dictia no almacena datos de pacientes en servidores. Las notas solo están disponibles en el dispositivo donde fueron aprobadas.
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
              { label: 'Consultas',        value: filtered.length },
              { label: 'Minutos grabados', value: Math.round(totalDuration / 60) },
              { label: 'Minutos ahorrados', value: timeSaved },
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
              const typeMeta = c.note_type ? NOTE_TYPE_META[c.note_type] : null
              const TypeIcon = typeMeta?.Icon ?? Stethoscope
              const isPending = c.status === 'completed'
              const expiry = isPending ? formatExpiry(c.expires_at) : null
              const hasNote = !!loadStoredNote(c.id)

              return (
                <button
                  key={c.id}
                  onClick={() => openNote(c)}
                  className={`w-full text-left bg-white rounded-2xl border p-5 hover:shadow-md transition-all cursor-pointer group ${isPending ? 'border-amber-200' : 'border-slate-100'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isPending ? 'bg-amber-50' : 'bg-primary-50'}`}>
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
                          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{c.specialty}</span>
                        )}
                        {hasNote && (
                          <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-medium">Ver nota</span>
                        )}
                      </div>
                      {isPending ? (
                        <p className={`text-xs mt-1 font-medium ${expiry ? expiry.color : 'text-amber-600'}`}>
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
                      <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors mt-1" />
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
