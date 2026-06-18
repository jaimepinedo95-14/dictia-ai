import { useState, useEffect } from 'react'
import { useLocation, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Copy, Check, Clock, AlertTriangle, FileText } from 'lucide-react'
import AppShell from '../components/AppShell'
import { useAuth } from '../contexts/AuthContext'
import type { Consultation, SoapNote } from '../lib/supabase'
import { supabase } from '../lib/supabase'
import { fetchConsultationById } from '../lib/db'

// ── Helpers ────────────────────────────────────────────────────────────────────

function loadLocalNote(id: string): SoapNote | null {
  try {
    const raw = localStorage.getItem(`dictia_note_${id}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { note: SoapNote; savedAt: number }
    if (Date.now() - parsed.savedAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(`dictia_note_${id}`)
      return null
    }
    return parsed.note
  } catch { return null }
}

function formatExpiry(expiresAt: string | null | undefined): { text: string; urgent: boolean } | null {
  if (!expiresAt) return null
  const remaining = new Date(expiresAt).getTime() - Date.now()
  if (remaining <= 0) return null
  const hours = Math.floor(remaining / (1000 * 60 * 60))
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
  return {
    text: hours > 0
      ? `Se elimina en ${hours}h${minutes > 0 ? ` ${minutes}min` : ''}`
      : `Se elimina en ${minutes}min`,
    urgent: hours < 2,
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-CO', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function buildFullText(note: SoapNote): string {
  const parts: string[] = []
  if (note.chief_complaint)      parts.push(`MOTIVO DE CONSULTA\n${note.chief_complaint}`)
  if (note.current_illness)      parts.push(`ENFERMEDAD ACTUAL\n${note.current_illness}`)
  if (note.relevant_history)     parts.push(`ANTECEDENTES\n${note.relevant_history}`)
  if (note.vital_signs)          parts.push(`SIGNOS VITALES\n${note.vital_signs}`)
  if (note.physical_exam)        parts.push(`EXAMEN FÍSICO\n${note.physical_exam}`)
  if (note.analysis)             parts.push(`ANÁLISIS\n${note.analysis}`)
  if (note.diagnosis)            parts.push(`DIAGNÓSTICO\n${note.diagnosis}${note.cie10_code ? ` (${note.cie10_code})` : ''}`)
  if (note.management_plan)      parts.push(`PLAN DE MANEJO\n${note.management_plan}`)
  if (note.patient_instructions) parts.push(`INSTRUCCIONES AL PACIENTE\n${note.patient_instructions}`)
  if (note.referral_letter)      parts.push(`CARTA DE REMISIÓN\n${note.referral_letter}`)
  return parts.join('\n\n')
}

// ── CopyButton ─────────────────────────────────────────────────────────────────

function CopyBtn({ text, label = 'Copiar' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    })
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-primary-600 transition-colors shrink-0"
    >
      {copied
        ? <><Check size={12} className="text-emerald-500" /><span className="text-emerald-500">Copiado</span></>
        : <><Copy size={12} />{label}</>}
    </button>
  )
}

// ── NoteSection ────────────────────────────────────────────────────────────────

function NoteSection({ title, content }: { title: string; content?: string }) {
  if (!content?.trim()) return null
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</h3>
        <CopyBtn text={content} />
      </div>
      <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{content}</p>
    </div>
  )
}

// ── DiagnosisSection ───────────────────────────────────────────────────────────

function DiagnosisSection({ note }: { note: SoapNote }) {
  if (!note.diagnosis) return null
  const text = `${note.diagnosis}${note.cie10_code ? `\nCIE-10: ${note.cie10_code} — ${note.cie10_description}` : ''}`
  return (
    <div className="bg-primary-50 border-2 border-primary-200 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="text-xs font-bold text-primary-500 uppercase tracking-wider">Diagnóstico</h3>
        <CopyBtn text={text} />
      </div>
      <p className="text-xl font-black text-primary-900">{note.diagnosis}</p>
      {note.cie10_code && (
        <p className="text-sm text-primary-600 mt-1">
          {note.cie10_code} — {note.cie10_description}
        </p>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

type LocationState = { consultation: Consultation; note: SoapNote | null } | null

export default function NoteDetail() {
  const { id } = useParams<{ id: string }>()
  const { state } = useLocation() as { state: LocationState }
  const navigate = useNavigate()
  const { user, isSupabaseMode } = useAuth()

  // Start with whatever was passed via navigate state for instant display
  const [consultation, setConsultation] = useState<Consultation | null>(state?.consultation ?? null)
  const [note, setNote] = useState<SoapNote | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedAll, setCopiedAll] = useState(false)
  const [source, setSource] = useState<'supabase' | 'local' | null>(null)

  useEffect(() => {
    if (!id) { setLoading(false); return }

    async function loadNote() {
      setLoading(true)

      // 1. Fetch fresh from Supabase by ID (primary source — works cross-device)
      if (isSupabaseMode && user?.id) {
        const fresh = await fetchConsultationById(user.id, id as string)
        if (fresh) {
          setConsultation(fresh)
          const dbNote = fresh.note_content as SoapNote | null
          if (dbNote) {
            setNote(dbNote)
            setSource('supabase')
            setLoading(false)
            return
          }
        }
      }

      // 2. Fallback: localStorage (same browser where note was approved)
      const local = loadLocalNote(id as string)
      if (local) {
        setNote(local)
        setSource('local')
        // Silently backfill to Supabase — next open from any device will find it in DB
        if (isSupabaseMode && user?.id) {
          supabase.from('consultations')
            .update({ note_content: local })
            .eq('id', id as string)
            .eq('user_id', user.id)
            .then(() => { /* fire and forget */ })
        }
        setLoading(false)
        return
      }

      // 3. No note available anywhere
      setNote(null)
      setSource(null)
      setLoading(false)
    }

    loadNote()
  }, [id, user?.id, isSupabaseMode])

  function copyAll() {
    if (!note) return
    navigator.clipboard.writeText(buildFullText(note)).then(() => {
      setCopiedAll(true)
      setTimeout(() => setCopiedAll(false), 2000)
    })
  }

  const expiry    = consultation ? formatExpiry(consultation.expires_at) : null
  const isPending = consultation?.status === 'completed'

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-500">Cargando nota desde tu cuenta...</p>
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
              <div className="h-3 bg-slate-100 rounded w-1/4 mb-3" />
              <div className="h-4 bg-slate-100 rounded w-full mb-2" />
              <div className="h-4 bg-slate-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      </AppShell>
    )
  }

  if (!consultation) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <FileText size={36} className="mx-auto text-slate-300 mb-4" />
          <p className="font-semibold text-slate-600">Consulta no encontrada</p>
          <button onClick={() => navigate('/historial')} className="btn-primary mt-6 text-sm py-2 px-5">
            Volver al historial
          </button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">

        {/* Top bar */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft size={16} />
            Volver
          </button>
          {note && (
            <button
              onClick={copyAll}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
            >
              {copiedAll
                ? <><Check size={15} /> Copiado</>
                : <><Copy size={15} /> Copiar nota completa</>}
            </button>
          )}
        </div>

        {/* Meta */}
        <div className="bg-white rounded-2xl border border-slate-100 px-5 py-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs text-slate-400">{formatDate(consultation.created_at)}</p>
              {consultation.specialty && (
                <p className="text-sm font-semibold text-slate-700 mt-0.5">{consultation.specialty}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {isPending ? (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${expiry?.urgent ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>
                  ⚠ Pendiente de aprobación
                </span>
              ) : (
                <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">
                  ✓ Nota aprobada
                </span>
              )}
              {source === 'supabase' && (
                <span className="text-xs bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">
                  Desde tu cuenta
                </span>
              )}
            </div>
          </div>
          {expiry && (
            <div className={`flex items-center gap-2 mt-3 text-xs font-medium ${expiry.urgent ? 'text-red-600' : 'text-amber-600'}`}>
              <Clock size={12} />
              {expiry.text}
            </div>
          )}
        </div>

        {/* Note content */}
        {note ? (
          <>
            <DiagnosisSection note={note} />
            <NoteSection title="Motivo de consulta"        content={note.chief_complaint} />
            <NoteSection title="Enfermedad actual"          content={note.current_illness} />
            <NoteSection title="Antecedentes"               content={note.relevant_history} />
            {note.vital_signs && (
              <NoteSection title="Signos vitales"           content={note.vital_signs} />
            )}
            <NoteSection title="Examen físico"              content={note.physical_exam} />
            <NoteSection title="Análisis"                   content={note.analysis} />
            <NoteSection title="Plan de manejo"             content={note.management_plan} />
            <NoteSection title="Instrucciones al paciente"  content={note.patient_instructions} />
            {note.referral_letter && (
              <NoteSection title="Carta de remisión"        content={note.referral_letter} />
            )}

            {/* Bottom copy button */}
            <button
              onClick={copyAll}
              className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 rounded-2xl transition-colors text-sm"
            >
              {copiedAll
                ? <><Check size={16} /> ¡Nota copiada!</>
                : <><Copy size={16} /> Copiar nota completa</>}
            </button>

            <p className="text-xs text-slate-400 text-center pb-4">
              📋 Dictia AI — asistente de documentación. Juicio clínico final: médico tratante.
            </p>
          </>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
            <AlertTriangle size={32} className="mx-auto text-amber-400 mb-4" />
            <p className="font-semibold text-slate-700 text-sm">Nota no disponible</p>
            <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto leading-relaxed">
              Esta consulta no tiene nota guardada. Puede que fue aprobada antes de que Dictia guardara notas en tu cuenta, o desde un navegador diferente sin conexión.
            </p>
            <p className="text-xs text-slate-400 mt-3 leading-relaxed">
              Las notas aprobadas desde ahora se guardan en tu cuenta y están disponibles desde cualquier dispositivo.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  )
}
