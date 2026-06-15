import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Mic, Square, CheckCircle, Copy, Edit3, Trash2, AlertTriangle,
  ChevronDown, ChevronUp, Zap, RefreshCw, MicOff, Pill, Wifi, Shield,
  MessageCircle, BookOpen, Send, Monitor, ClipboardList, X,
} from 'lucide-react'
import AppShell from '../components/AppShell'
import { useAuth } from '../contexts/AuthContext'
import {
  transcribeAudio, generateSoapNote, formatNoteForClipboard,
  isGroqConfigured, isAnthropicConfigured, askAboutNote, generateClinicalEvidence,
  type ClinicalAnalysis,
} from '../lib/api'
import { saveConsultation, fetchRecentApprovedNotes } from '../lib/db'
import { fetchClinicCredits, deductClinicCredit } from '../lib/adminDb'
import type { SoapNote, NoteType } from '../lib/supabase'

type Stage = 'idle' | 'recording' | 'processing' | 'done' | 'error'
type ProcessingStep = 'transcribing' | 'generating' | null
type RecordingMode = 'consulta' | 'dictado'

type SoapSection = {
  key: keyof SoapNote
  label: string
  icon: string
  multiline: boolean
  placeholder: string
  alwaysShow?: boolean
}

const SPECIALTY_OPTIONS = [
  'Medicina General', 'Urgencias', 'Pediatría',
  'Medicina Interna', 'Ginecología y Obstetricia', 'Psiquiatría',
  'Medicina Familiar', 'Otra especialidad',
]

const SECTIONS_BEFORE_DX: SoapSection[] = [
  { key: 'chief_complaint', label: 'Motivo de consulta', icon: '🎯', multiline: false, placeholder: 'No registrado' },
  { key: 'current_illness', label: 'Enfermedad actual', icon: '📋', multiline: true, placeholder: 'No registrado' },
  { key: 'relevant_history', label: 'Antecedentes relevantes', icon: '📁', multiline: true, placeholder: 'No se mencionaron antecedentes' },
  { key: 'physical_exam', label: 'Examen físico', icon: '🩺', multiline: true, placeholder: 'No evaluado durante la consulta — completa manualmente', alwaysShow: true },
  { key: 'analysis', label: 'Análisis', icon: '🧠', multiline: true, placeholder: 'No registrado' },
]

const SECTIONS_AFTER_DX: SoapSection[] = [
  { key: 'management_plan', label: 'Plan de manejo', icon: '💊', multiline: true, placeholder: 'No registrado' },
  { key: 'patient_instructions', label: 'Instrucciones al paciente', icon: '📝', multiline: true, placeholder: 'No registrado' },
]

const EVOLUTION_SECTIONS: SoapSection[] = [
  { key: 'current_illness', label: 'Evolución clínica', icon: '📋', multiline: true, placeholder: 'Estado clínico del día', alwaysShow: true },
  { key: 'active_diagnoses', label: 'Diagnóstico(s) activos', icon: '🔬', multiline: true, placeholder: 'Sin diagnósticos registrados' },
  { key: 'vital_signs', label: 'Signos vitales', icon: '📊', multiline: false, placeholder: 'TA: _/_ mmHg · FC: _ lpm · FR: _ rpm · T°: _°C · SatO2: _%' },
  { key: 'physical_exam', label: 'Examen físico del día', icon: '🩺', multiline: true, placeholder: 'Hallazgos relevantes del día', alwaysShow: true },
  { key: 'labs', label: 'Laboratorios y paraclínicos', icon: '🧪', multiline: true, placeholder: 'Sin resultados del día' },
  { key: 'analysis', label: 'Análisis del día', icon: '🧠', multiline: true, placeholder: 'No registrado' },
  { key: 'management_plan', label: 'Plan del día', icon: '📋', multiline: true, placeholder: 'Sin plan registrado' },
]

const TRANSFER_SECTIONS: SoapSection[] = [
  { key: 'current_illness', label: 'Estado al ingreso', icon: '🚑', multiline: true, placeholder: 'Estado clínico al momento de la recepción', alwaysShow: true },
  { key: 'relevant_history', label: 'Resumen del curso previo', icon: '📁', multiline: true, placeholder: 'Manejo en el servicio de origen', alwaysShow: true },
  { key: 'vital_signs', label: 'Signos vitales al ingreso', icon: '📊', multiline: false, placeholder: 'TA: _/_ mmHg · FC: _ lpm · FR: _ rpm · T°: _°C · SatO2: _%' },
  { key: 'physical_exam', label: 'Examen físico al ingreso', icon: '🩺', multiline: true, placeholder: 'Hallazgos al recibir al paciente', alwaysShow: true },
  { key: 'labs', label: 'Paraclínicos del servicio de origen', icon: '🧪', multiline: true, placeholder: 'Sin resultados relevantes' },
  { key: 'analysis', label: 'Impresión diagnóstica', icon: '🧠', multiline: true, placeholder: 'No registrado' },
  { key: 'management_plan', label: 'Plan en el servicio actual', icon: '📋', multiline: true, placeholder: 'Sin plan registrado' },
]

// ─── SoapCard ─────────────────────────────────────────────────────────────────
type SoapCardProps = {
  section: SoapSection
  note: SoapNote
  editingKey: keyof SoapNote | null
  editValue: string
  expandedSection: keyof SoapNote | null
  onEdit: (key: keyof SoapNote) => void
  onSave: () => void
  onCancelEdit: () => void
  onEditValueChange: (val: string) => void
  onToggleExpand: (key: keyof SoapNote) => void
}

function SoapCard({
  section, note, editingKey, editValue, expandedSection,
  onEdit, onSave, onCancelEdit, onEditValueChange, onToggleExpand,
}: SoapCardProps) {
  const { key, label, icon, multiline, placeholder } = section
  const value = (note[key] as string) ?? ''
  const isEmpty = !value || value.trim() === ''
  const isEditing = editingKey === key
  const isExpanded = expandedSection === key
  const isLong = value.length > 220
  const isPhysicalExam = key === 'physical_exam'
const isTelemed = isPhysicalExam && note.is_telemedicine

  return (
    <div className={`bg-white rounded-2xl border-2 p-5 transition-all duration-200 shadow-sm ${
      isEmpty
        ? 'border-amber-200 bg-amber-50'
        : isTelemed
        ? 'border-slate-100 hover:border-slate-200 hover:shadow-md'
        : 'border-slate-100 hover:border-slate-200 hover:shadow-md'
    }`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">{icon}</span>
          <p className={`text-xs font-bold uppercase tracking-wider ${isEmpty ? 'text-amber-600' : 'text-slate-400'}`}>
            {label}
          </p>
          {isEmpty && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-600">
              No detectado
            </span>
          )}
          {isTelemed && !isEmpty && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-sky-100 text-sky-600">
              Telemedicina
            </span>
          )}
        </div>
        <button
          onClick={() => onEdit(key)}
          className="text-slate-300 hover:text-primary-600 transition-colors p-1.5 rounded-lg hover:bg-primary-50 flex-shrink-0"
          title="Editar"
        >
          <Edit3 size={14} />
        </button>
      </div>

      {isTelemed && !isEditing && (
        <div className="flex items-start gap-2 bg-sky-50 border border-sky-200 rounded-xl px-3 py-2.5 mb-3">
          <Wifi size={14} className="text-sky-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-sky-700 leading-relaxed">
            <span className="font-bold">Evaluación por telemedicina</span> — examen físico limitado a valoración visual por cámara
          </p>
        </div>
      )}

      {isEditing ? (
        <div>
          {multiline ? (
            <textarea
              value={editValue}
              onChange={e => onEditValueChange(e.target.value)}
              className="input-field resize-none text-sm w-full"
              rows={isPhysicalExam ? 10 : 5}
              autoFocus
            />
          ) : (
            <input
              type="text"
              value={editValue}
              onChange={e => onEditValueChange(e.target.value)}
              className="input-field text-sm w-full"
              autoFocus
            />
          )}
          <div className="flex gap-2 mt-2">
            <button onClick={onSave} className="btn-primary text-xs py-1.5 px-3">Guardar</button>
            <button onClick={onCancelEdit} className="btn-ghost text-xs py-1.5 px-3">Cancelar</button>
          </div>
        </div>
      ) : isEmpty ? (
        <p className="text-sm italic text-amber-400">{placeholder}</p>
      ) : (
        <div>
          <p className={`text-sm leading-relaxed whitespace-pre-line text-slate-700 ${
            isLong && !isExpanded ? 'line-clamp-4' : ''
          }`}>
            {value}
          </p>
          {isLong && (
            <button
              onClick={() => onToggleExpand(key)}
              className="flex items-center gap-1 text-xs text-primary-600 font-medium mt-2 hover:text-primary-700"
            >
              {isExpanded
                ? <><ChevronUp size={12} /> Ver menos</>
                : <><ChevronDown size={12} /> Ver más</>}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── GlosaShieldCard ──────────────────────────────────────────────────────────
function GlosaShieldCard({ shield }: { shield: NonNullable<SoapNote['glosa_shield']> }) {
  const [open, setOpen] = useState(true)
  const alertas = shield.alertas_glosa ?? shield.posibles_faltantes
  const hasAlerts = alertas.length > 0

  return (
    <div className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden ${
      hasAlerts ? 'border-amber-200' : 'border-emerald-200'
    }`}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-3 px-5 py-4 transition-colors ${
          hasAlerts ? 'hover:bg-amber-50' : 'hover:bg-emerald-50'
        }`}
      >
        <div className="flex items-center gap-2">
          <Shield size={16} className={hasAlerts ? 'text-amber-500' : 'text-emerald-600'} />
          <span className="text-sm font-bold text-slate-700">Blindaje documental</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            hasAlerts ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
          }`}>
            {hasAlerts ? `${alertas.length} alerta${alertas.length > 1 ? 's' : ''}` : '✓ Sin alertas'}
          </span>
        </div>
        {open ? <ChevronUp size={16} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4">

          {/* Sección 1: Lo que está bien documentado */}
          {shield.criterios_documentados.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">✅ Lo que está bien documentado</p>
              <div className="space-y-1.5">
                {shield.criterios_documentados.map((c, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
                    <span className="flex-shrink-0 mt-0.5 font-bold">✓</span>
                    <span>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sección 2: Lo que puede causar glosa */}
          {hasAlerts && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">⚠️ Lo que puede causar glosa</p>
              <div className="space-y-1.5">
                {alertas.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                    <span className="flex-shrink-0 mt-0.5">⚠️</span>
                    <span>{a}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sección 3: Lo que Dictia no puede verificar */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">ℹ️ Lo que Dictia no puede verificar</p>
            <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg leading-relaxed">
              Códigos CUPS, tarifas de la EPS, autorizaciones previas, pertinencia según contrato específico y criterios de auditoría interna de su institución requieren revisión manual.
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-100 pt-3">
            Dictia ayuda a reducir glosas por documentación. No garantiza la aprobación de cuentas médicas ni reemplaza la auditoría interna de su institución.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── AI Assistant Chat ────────────────────────────────────────────────────────
type ChatMessage = { role: 'user' | 'assistant'; text: string }

function AIAssistant({ note }: { note: SoapNote }) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  async function handleSend() {
    if (!input.trim() || loading) return
    const question = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: question }])
    setLoading(true)
    try {
      const answer = await askAboutNote(note, question)
      setMessages(prev => [...prev, { role: 'assistant', text: answer }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Error al consultar. Inténtalo de nuevo.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-indigo-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-indigo-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageCircle size={16} className="text-indigo-500" />
          <span className="text-sm font-bold text-slate-700">Pregúntale a Dictia sobre esta nota</span>
          <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
            Incluido en tu plan
          </span>
        </div>
        {open ? <ChevronUp size={16} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="px-5 pb-5">
          {messages.length === 0 && (
            <div className="text-xs text-slate-400 italic mb-3 bg-indigo-50 rounded-xl px-3 py-2.5">
              Puedes preguntar: "¿Qué diagnósticos diferenciales debería considerar?", "¿El plan de manejo es coherente?", "¿Qué exámenes adicionales sugeriría?"
            </div>
          )}
          <div className="space-y-3 max-h-64 overflow-y-auto mb-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] text-xs px-3 py-2 rounded-xl leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-slate-100 text-slate-700 rounded-bl-sm'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 text-slate-500 text-xs px-3 py-2 rounded-xl rounded-bl-sm flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  Consultando...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Escribe tu pregunta..."
              className="flex-1 text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex-shrink-0"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Clinical Evidence ─────────────────────────────────────────────────────────
const CLINICAL_TABS = [
  { key: 'diferenciales', label: 'Diferenciales', color: 'violet', icon: '⚖️' },
  { key: 'criterios',     label: 'Criterios Dx',  color: 'blue',   icon: '📋' },
  { key: 'paraclínicos',  label: 'Paraclínicos',  color: 'amber',  icon: '🔬' },
  { key: 'alertas',       label: 'Alertas',        color: 'red',    icon: '🚨' },
  { key: 'tratamiento',   label: 'Tratamiento',    color: 'emerald',icon: '💊' },
  { key: 'complicaciones',label: 'Complicaciones', color: 'orange', icon: '⚠️' },
] as const

type TabKey = typeof CLINICAL_TABS[number]['key']

const TAB_STYLES: Record<string, { active: string; item: string }> = {
  violet:  { active: 'bg-violet-600 text-white',  item: 'bg-violet-50 border-violet-200 text-violet-800' },
  blue:    { active: 'bg-blue-600 text-white',     item: 'bg-blue-50 border-blue-200 text-blue-800' },
  amber:   { active: 'bg-amber-500 text-white',    item: 'bg-amber-50 border-amber-200 text-amber-800' },
  red:     { active: 'bg-red-600 text-white',      item: 'bg-red-50 border-red-200 text-red-800' },
  emerald: { active: 'bg-emerald-600 text-white',  item: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
  orange:  { active: 'bg-orange-500 text-white',   item: 'bg-orange-50 border-orange-200 text-orange-800' },
}

function ClinicalEvidence({ diagnosis }: { diagnosis: string }) {
  const [open, setOpen] = useState(false)
  const [analysis, setAnalysis] = useState<ClinicalAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('diferenciales')

  async function handleOpen() {
    if (!open && !loaded) {
      setLoading(true)
      try {
        const result = await generateClinicalEvidence(diagnosis)
        setAnalysis(result)
        setLoaded(true)
      } catch {
        setAnalysis({ diferenciales: ['No se pudo cargar el análisis.'], criterios: [], 'paraclínicos': [], alertas: [], tratamiento: [], complicaciones: [] })
        setLoaded(true)
      } finally {
        setLoading(false)
      }
    }
    setOpen(o => !o)
  }

  const activeItems = analysis ? (analysis[activeTab] ?? []) : []
  const activeColor = CLINICAL_TABS.find(t => t.key === activeTab)?.color ?? 'blue'

  return (
    <div className="bg-white rounded-2xl border-2 border-teal-100 shadow-sm overflow-hidden">
      <button
        onClick={handleOpen}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-teal-50 transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <BookOpen size={16} className="text-teal-600" />
          <span className="text-sm font-bold text-slate-700">
            Análisis clínico — <span className="text-teal-700">{diagnosis || 'diagnóstico'}</span>
          </span>
          {!loaded && !loading && (
            <span className="text-xs text-slate-400">· 6 secciones · se carga al abrir</span>
          )}
          {loaded && (
            <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium">
              {CLINICAL_TABS.length} secciones
            </span>
          )}
        </div>
        {open ? <ChevronUp size={16} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-slate-100">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-10 text-slate-500">
              <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Analizando diagnóstico en profundidad...</p>
            </div>
          ) : analysis && (
            <>
              {/* Tabs */}
              <div className="flex overflow-x-auto gap-1.5 px-4 pt-4 pb-2 scrollbar-hide">
                {CLINICAL_TABS.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
                      activeTab === tab.key
                        ? TAB_STYLES[tab.color].active
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="px-4 pb-5 pt-2 space-y-2">
                {activeItems.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">Sin datos para esta sección.</p>
                ) : (
                  activeItems.map((item, i) => (
                    <div key={i} className={`flex items-start gap-2.5 text-xs px-3 py-2.5 rounded-xl border ${TAB_STYLES[activeColor].item}`}>
                      <span className="font-bold flex-shrink-0 mt-0.5 opacity-60">{i + 1}.</span>
                      <span className="leading-relaxed">{item}</span>
                    </div>
                  ))
                )}
                <p className="text-xs text-slate-400 pt-2 leading-relaxed">
                  Análisis generado por IA con base en guías internacionales. Siempre contrasta con fuentes primarias y el contexto clínico del paciente.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Full Note Preview ─────────────────────────────────────────────────────────
function FullNotePreview({ note, patientName, onCopy, copied }: {
  note: SoapNote
  patientName: string
  onCopy: (text: string) => void
  copied: boolean
}) {
  const baseText = useMemo(() => formatNoteForClipboard(note, patientName || undefined), [note, patientName])
  const [editedText, setEditedText] = useState(baseText)
  const [isEditing, setIsEditing] = useState(false)
  const [dirty, setDirty] = useState(false)

  // Sync when note regenerates (only if user hasn't manually edited)
  useEffect(() => {
    if (!dirty) setEditedText(baseText)
  }, [baseText, dirty])

  function handleChange(val: string) {
    setEditedText(val)
    setDirty(val !== baseText)
  }

  function handleReset() {
    setEditedText(baseText)
    setDirty(false)
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base">📋</span>
          <span className="text-sm font-bold text-slate-700">Vista previa de la nota completa</span>
          {dirty && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Editada</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <button
              onClick={handleReset}
              className="text-xs text-slate-400 hover:text-slate-700 transition-colors px-2 py-1"
            >
              Restaurar original
            </button>
          )}
          <button
            onClick={() => setIsEditing(e => !e)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
              isEditing
                ? 'bg-primary-100 text-primary-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Edit3 size={12} />
            {isEditing ? 'Listo' : 'Editar'}
          </button>
          <button
            onClick={() => onCopy(editedText)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
              copied
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-100 text-slate-600 hover:bg-primary-50 hover:text-primary-700'
            }`}
          >
            {copied ? <><CheckCircle size={12} /> Copiado</> : <><Copy size={12} /> Copiar nota</>}
          </button>
        </div>
      </div>
      <div className="p-5">
        {isEditing ? (
          <textarea
            value={editedText}
            onChange={e => handleChange(e.target.value)}
            className="w-full text-xs text-slate-700 font-mono leading-relaxed bg-slate-50 rounded-xl p-4 border border-primary-200 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-none transition-all"
            rows={Math.max(20, editedText.split('\n').length + 2)}
            spellCheck={false}
            autoFocus
          />
        ) : (
          <pre
            className="text-xs text-slate-600 whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto bg-slate-50 rounded-xl p-4 border border-slate-100 cursor-text"
            onClick={() => setIsEditing(true)}
            title="Haz clic para editar"
          >
            {editedText}
          </pre>
        )}
        {!isEditing && (
          <p className="text-xs text-slate-400 mt-2 text-center">Haz clic en la nota para editarla directamente</p>
        )}
      </div>
    </div>
  )
}

// ─── Note Type Selector ────────────────────────────────────────────────────────
type NoteTypeOption = {
  type: NoteType
  label: string
  sublabel: string
  icon: string
  color: string
  credit: string
}

const NOTE_TYPE_OPTIONS: NoteTypeOption[] = [
  {
    type: 'ingreso',
    label: 'HC de ingreso',
    sublabel: 'Historia clínica completa SOAP',
    icon: '📋',
    color: 'primary',
    credit: '1 crédito',
  },
  {
    type: 'evolucion',
    label: 'Nota de evolución',
    sublabel: 'Hospitalización — día a día',
    icon: '🏥',
    color: 'violet',
    credit: '0.5 créditos',
  },
  {
    type: 'traslado',
    label: 'Ingreso por traslado',
    sublabel: 'Desde UCI, urgencias u otro servicio',
    icon: '🚑',
    color: 'amber',
    credit: '1 crédito',
  },
  {
    type: 'telemedicina',
    label: 'Telemedicina',
    sublabel: 'Consulta virtual — audio del sistema',
    icon: '📡',
    color: 'sky',
    credit: '1 crédito',
  },
]

// ─── Recording constants ───────────────────────────────────────────────────────
const CHUNK_INTERVAL_MS = 30_000
const SILENCE_THRESHOLD_BYTE = 10      // RMS mínimo en datos de frecuencia (0-255) para considerar voz
const SILENCE_CHECK_MS = 500
const SILENCE_AUTO_STOP_MS = 300_000   // 5 minutos en ms
const SILENCE_WARNING_MS = 60_000      // mostrar countdown al último minuto
const MAX_SESSION_S = 5_400            // 90 min
const SESSION_WARNING_S = 4_800        // 80 min

// ─── Main component ───────────────────────────────────────────────────────────
export default function NewConsultation() {
  const navigate = useNavigate()
  const { user, profile, canRecord, incrementConsultations, isSupabaseMode } = useAuth()

  const [stage, setStage] = useState<Stage>('idle')
  const [processingStep, setProcessingStep] = useState<ProcessingStep>(null)
  const [seconds, setSeconds] = useState(0)
  const [patientName, setPatientName] = useState('')
  const [transcript, setTranscript] = useState('')
  const [note, setNote] = useState<SoapNote | null>(null)
  const [error, setError] = useState('')
  const [editingKey, setEditingKey] = useState<keyof SoapNote | null>(null)
  const [editValue, setEditValue] = useState('')
  const [expandedSection, setExpandedSection] = useState<keyof SoapNote | null>(null)
  const [copied, setCopied] = useState(false)
  const [previewCopied, setPreviewCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [creditBlocked, setCreditBlocked] = useState(false)
  const [lowCreditWarning, setLowCreditWarning] = useState(false)
  const [pharmaOpen, setPharmaOpen] = useState(false)
  const [noteType, setNoteType] = useState<NoteType>('ingreso')
  const [specialtyOverride, setSpecialtyOverride] = useState(profile?.specialty ?? '')
  const [previousContext, setPreviousContext] = useState('')
  const [hospitalizationDay, setHospitalizationDay] = useState(1)
  const [voiceLevel, setVoiceLevel] = useState(0)
  const [silenceCountdown, setSilenceCountdown] = useState<number | null>(null)
  const [sessionWarning, setSessionWarning] = useState(false)
  const [stoppedByInactivity, setStoppedByInactivity] = useState(false)
  const [wakeLockBanner, setWakeLockBanner] = useState(true)
  const [backgroundNotice, setBackgroundNotice] = useState<'continued' | 'paused' | null>(null)
  const [recordingMode, setRecordingMode] = useState<RecordingMode>('consulta')
  const [emptyTranscript, setEmptyTranscript] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const recordingDurationRef = useRef(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const silenceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const silenceStartRef = useRef<number | null>(null)   // timestamp when consecutive silence started
  const pendingChunkCountRef = useRef(0)
  const isStoppingRef = useRef(false)
  const accumulatedTranscriptRef = useRef('')
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const mimeTypeRef = useRef('')
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const stageRef = useRef<Stage>('idle')

  // Keep stageRef in sync for use inside event listeners with [] deps
  useEffect(() => { stageRef.current = stage }, [stage])

  async function requestWakeLock() {
    if (!('wakeLock' in navigator)) return
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen')
      wakeLockRef.current.addEventListener('release', () => { wakeLockRef.current = null })
    } catch { /* Wake Lock not available on this device/browser — silent fallback */ }
  }

  async function releaseWakeLock() {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release().catch(() => {})
      wakeLockRef.current = null
    }
  }

  function cleanupRecording() {
    // Used for: component unmount, permission errors.
    // NOT called during normal stop flow (stopRecordingInternal handles that via onstop).
    releaseWakeLock()
    if (timerRef.current) clearInterval(timerRef.current)
    if (silenceIntervalRef.current) clearInterval(silenceIntervalRef.current)
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    analyserRef.current = null
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  useEffect(() => {
    return () => cleanupRecording()
  }, [])

  // Visibility change: resume AudioContext + show background notice + re-acquire wake lock
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) return
      if (stageRef.current !== 'recording') return

      const ctxSuspended = audioContextRef.current?.state === 'suspended'
      if (ctxSuspended) {
        audioContextRef.current!.resume().catch(() => {})
        setBackgroundNotice('paused')
      } else {
        setBackgroundNotice('continued')
      }
      // Re-acquire wake lock if the browser released it while screen was off
      if (!wakeLockRef.current) requestWakeLock()
      // Auto-dismiss the notice after 4 seconds
      setTimeout(() => setBackgroundNotice(null), 4000)
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  const groqOk = isGroqConfigured()
  const anthropicOk = isAnthropicConfigured()
  const apisConfigured = groqOk && anthropicOk
  const { allowed: canStartRecording, reason: limitReason } = canRecord()

  async function startRecording() {
    if (!canStartRecording) { setError(limitReason ?? ''); return }
    setError('')

    // Refresh service worker to prevent stale SW intercepting Groq/Anthropic fetches
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (const reg of registrations) { await reg.update() }
      } catch { /* non-fatal */ }
    }

    // Credit check for institutional users
    if (profile?.clinica_id) {
      const credits = await fetchClinicCredits(profile.clinica_id)
      if (credits <= 0) { setCreditBlocked(true); return }
      const creditCost = noteType === 'evolucion' ? 0.5 : 1
      if (credits / creditCost < 0.2 * credits) setLowCreditWarning(true)
    }

    // Reset accumulated state
    accumulatedTranscriptRef.current = ''
    audioChunksRef.current = []
    setVoiceLevel(0)
    setSilenceCountdown(null)
    setSessionWarning(false)
    setStoppedByInactivity(false)
    setEmptyTranscript(false)
    isStoppingRef.current = false
    pendingChunkCountRef.current = 0
    silenceStartRef.current = null

    try {
      let stream: MediaStream

      if (noteType === 'telemedicina') {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: { width: 1, height: 1 }, audio: true })
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
          const ctx = new AudioContext()
          const dest = ctx.createMediaStreamDestination()
          ctx.createMediaStreamSource(stream).connect(dest)
          ctx.createMediaStreamSource(micStream).connect(dest)
          stream = dest.stream
        } catch { /* Use only display audio if mic fails */ }
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000,
            channelCount: 1,
          },
          video: false,
        })
      }
      streamRef.current = stream

      // ── Web Audio API: silence detection ───────────────────────────────────
      const audioCtx = new AudioContext()
      audioContextRef.current = audioCtx

      // Silent keepalive node — prevents iOS/Android from suspending AudioContext
      // when screen turns off or app goes to background
      const keepAliveGain = audioCtx.createGain()
      keepAliveGain.gain.value = 0
      const keepAliveOsc = audioCtx.createOscillator()
      keepAliveOsc.frequency.value = 1
      keepAliveOsc.connect(keepAliveGain)
      keepAliveGain.connect(audioCtx.destination)
      keepAliveOsc.start()

      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      analyserRef.current = analyser

      const micSource = audioCtx.createMediaStreamSource(stream)
      micSource.connect(analyser)

      // ── Audio processing chain: HighPass + Compressor (non-telemedicine only) ──
      let recordingStream = stream
      if (noteType !== 'telemedicina') {
        const highPassFilter = audioCtx.createBiquadFilter()
        highPassFilter.type = 'highpass'
        highPassFilter.frequency.value = 80

        const compressor = audioCtx.createDynamicsCompressor()
        compressor.threshold.value = -24
        compressor.knee.value = 30
        compressor.ratio.value = 12
        compressor.attack.value = 0.003
        compressor.release.value = 0.25

        const processedDest = audioCtx.createMediaStreamDestination()
        micSource.connect(highPassFilter)
        highPassFilter.connect(compressor)
        compressor.connect(processedDest)
        recordingStream = processedDest.stream
      }

      const freqData = new Uint8Array(analyser.frequencyBinCount)
      silenceStartRef.current = null

      silenceIntervalRef.current = setInterval(() => {
        if (!analyserRef.current || isStoppingRef.current) return
        analyserRef.current.getByteFrequencyData(freqData)
        const rms = Math.sqrt(freqData.reduce((s, v) => s + v * v, 0) / freqData.length)
        setVoiceLevel(Math.min(1, rms / 60))  // 60 = typical voice peak for display

        if (rms < SILENCE_THRESHOLD_BYTE) {
          // Silence detected — start or continue timer
          if (!silenceStartRef.current) silenceStartRef.current = Date.now()
          const silenceDuration = Date.now() - silenceStartRef.current
          const remaining = SILENCE_AUTO_STOP_MS - silenceDuration

          if (remaining <= 0) {
            setStoppedByInactivity(true)
            stopRecordingInternal()
          } else if (remaining <= SILENCE_WARNING_MS) {
            setSilenceCountdown(Math.ceil(remaining / 1000))
          }
        } else {
          // Voice detected — reset silence timer
          silenceStartRef.current = null
          setSilenceCountdown(null)
        }
      }, SILENCE_CHECK_MS)

      // ── MediaRecorder: 30-second chunks ────────────────────────────────────
      const mimeType =
        MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' :
        MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' :
        MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : ''
      mimeTypeRef.current = mimeType

      const recorder = new MediaRecorder(recordingStream, mimeType ? { mimeType } : undefined)

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      recorder.onerror = () => {
        // On mobile: tab going to background or screen locking fires onerror — ignore it
        if (isStoppingRef.current || document.hidden) return
        isStoppingRef.current = true
        setError('El micrófono se interrumpió. Verifica los permisos e intenta de nuevo.')
        cleanupRecording()
        setStage('error')
      }

      recorder.onstop = () => {
        // onstop fires after the final ondataavailable — all chunks are collected at this point.
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(() => {})
          audioContextRef.current = null
        }
        analyserRef.current = null
        finalizeRecording()
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setStage('recording')
      requestWakeLock()
      setSeconds(0)
      recordingDurationRef.current = 0

      timerRef.current = setInterval(() => {
        setSeconds(s => {
          const next = s + 1
          recordingDurationRef.current = next
          if (next === SESSION_WARNING_S) setSessionWarning(true)
          if (next >= MAX_SESSION_S) stopRecordingInternal()
          return next
        })
      }, 1000)

    } catch (err) {
      const msg = err instanceof Error && err.name === 'NotAllowedError'
        ? noteType === 'telemedicina'
          ? 'Debes compartir la pantalla con audio para grabar telemedicina. Activa el audio del sistema al compartir.'
          : 'No se pudo acceder al micrófono. Verifica los permisos del navegador.'
        : 'No se pudo iniciar la grabación. Verifica los permisos del navegador.'
      setError(msg)
      cleanupRecording()
    }
  }

  function stopRecordingInternal() {
    if (isStoppingRef.current) return
    isStoppingRef.current = true   // ← SET FIRST — prevents any re-entry or double finalize

    releaseWakeLock()
    // Clear timers immediately — safe to do before stopping MediaRecorder
    if (timerRef.current) clearInterval(timerRef.current)
    if (silenceIntervalRef.current) clearInterval(silenceIntervalRef.current)
    setStage('processing')
    setSilenceCountdown(null)

    if (mediaRecorderRef.current?.state === 'recording') {
      // Call stop() FIRST — this triggers the final ondataavailable then onstop.
      // Stream tracks and AudioContext are cleaned up inside onstop (after final data arrives).
      // Previously cleanupRecording() was called here first, which killed the stream BEFORE
      // stop() triggered the final chunk — that was Bug #1.
      mediaRecorderRef.current.stop()
    } else {
      // MediaRecorder already stopped — clean up directly
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
        audioContextRef.current = null
      }
      analyserRef.current = null
      finalizeRecording()
    }
  }

  function stopRecording() {
    stopRecordingInternal()
  }

  async function finalizeRecording() {
    const chunks = audioChunksRef.current
    if (chunks.length === 0) {
      setEmptyTranscript(true)
      setError('No se detectó audio en la grabación.')
      setStage('error')
      return
    }
    const audioBlob = new Blob(chunks, { type: mimeTypeRef.current || 'audio/webm' })
    console.log('[Dictia] chunks acumulados:', chunks.length)
    console.log('[Dictia] blob size:', audioBlob.size)
    console.log('[Dictia] blob type:', audioBlob.type)
    if (audioBlob.size < 1000) {
      setEmptyTranscript(true)
      setError('No se detectó audio. Verifica que el micrófono esté funcionando y vuelve a intentarlo.')
      setStage('error')
      return
    }
    setEmptyTranscript(false)
    setProcessingStep('transcribing')
    try {
      const fullTranscript = await transcribeAudio(audioBlob)
      if (!fullTranscript.trim()) {
        setEmptyTranscript(true)
        setError('No se detectó voz en la grabación. Verifica que el micrófono esté funcionando.')
        setStage('error')
        setProcessingStep(null)
        return
      }
      setTranscript(fullTranscript)
      await processTranscript(fullTranscript)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al procesar el audio'
      setError(msg)
      setStage('error')
      setProcessingStep(null)
    }
  }

  async function processTranscript(transcriptText: string) {
    setError('')
    setProcessingStep('generating')
    const MAX_ATTEMPTS = 3
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const recentNotes = await fetchRecentApprovedNotes()
        const generatedNote = await generateSoapNote(transcriptText, {
          specialty: (specialtyOverride || profile?.specialty) ?? undefined,
          noteStyle: profile?.note_style,
          noteType,
          isTelemedicine: noteType === 'telemedicina',
          recentNotes: recentNotes.length > 0 ? recentNotes : undefined,
          previousContext: previousContext || undefined,
          hospitalizationDay: noteType === 'evolucion' ? hospitalizationDay : undefined,
          isDictation: recordingMode === 'dictado',
        })
        setNote(generatedNote)
        setTranscript('')
        setStage('done')
        setProcessingStep(null)
        return
      } catch (err) {
        if (attempt < MAX_ATTEMPTS - 1) {
          await new Promise(r => setTimeout(r, attempt === 0 ? 1500 : 2500))
          continue
        }
        const raw = err instanceof Error ? err.message : ''
        const msg = raw.includes('429')
          ? 'Límite de solicitudes alcanzado. Espera un momento y vuelve a intentar.'
          : raw.includes('Anthropic')
          ? 'Error al conectar con Anthropic. Revisa tu conexión e intenta de nuevo.'
          : raw.includes('Groq')
          ? 'Error en la transcripción (Groq). Verifica tu API key.'
          : raw || 'Error inesperado al generar la nota'
        setError(msg)
        setStage('error')
        setProcessingStep(null)
      }
    }
  }

  async function retryProcessing() {
    const t = transcript
    if (!t) { setStage('idle'); return }
    setStage('processing')
    await processTranscript(t)
  }

  function startEdit(key: keyof SoapNote) {
    setEditingKey(key)
    setEditValue((note?.[key] as string) ?? '')
  }

  function saveEdit() {
    if (!note || !editingKey) return
    setNote({ ...note, [editingKey]: editValue })
    setEditingKey(null)
  }

  function handleCopyPreview(text: string) {
    navigator.clipboard.writeText(text).catch(() => {})
    setPreviewCopied(true)
    setTimeout(() => setPreviewCopied(false), 2000)
  }

  async function handleApprove() {
    if (!note) return
    setSaving(true)
    try {
      await saveConsultation(user?.id ?? '', {
        recording_duration: recordingDurationRef.current,
        note_type: noteType,
        status: 'approved',
        specialty: (specialtyOverride || profile?.specialty) ?? null,
      })

      // Deduct credits for institutional users
      if (profile?.clinica_id) {
        const creditCost = noteType === 'evolucion' ? 0.5 : 1
        const desc = noteType === 'evolucion'
          ? `Nota de evolución — ${profile.full_name}`
          : noteType === 'traslado'
          ? `Ingreso por traslado — ${profile.full_name}`
          : `HC Ingreso — ${profile.full_name}`
        await deductClinicCredit(profile.clinica_id, creditCost, desc)
        const remaining = await fetchClinicCredits(profile.clinica_id)
        const total = remaining + creditCost
        if (remaining / total < 0.2) setLowCreditWarning(true)
      }

      await incrementConsultations()
      const text = formatNoteForClipboard(note, patientName || undefined)
      await navigator.clipboard.writeText(text).catch(() => {})
      setCopied(true)
      setTimeout(() => navigate('/dashboard'), 1800)
    } catch (err) {
      console.error('Error al guardar:', err)
      setCopied(true)
      setTimeout(() => navigate('/dashboard'), 1800)
    } finally {
      setSaving(false)
    }
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60)
    return `${m.toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
  }

  // ── Credit block screen ───────────────────────────────────────────────────
  if (creditBlocked) {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">💳</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">Sin créditos disponibles</h1>
          <p className="text-slate-500 leading-relaxed mb-8">
            Tu institución no tiene créditos disponibles para generar nuevas notas. Contacta al administrador de tu clínica para recargar.
          </p>
          <Link to="/dashboard" className="btn-ghost border border-slate-200">Volver al inicio</Link>
        </div>
      </AppShell>
    )
  }

  // ── Upgrade screen ────────────────────────────────────────────────────────
  if (!canStartRecording && stage === 'idle') {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 text-center">
          <div className="w-20 h-20 bg-amber-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Zap size={36} className="text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">Límite alcanzado</h1>
          <p className="text-slate-500 leading-relaxed mb-8">{limitReason}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/facturacion" className="btn-primary"><Zap size={16} /> Ver planes disponibles</Link>
            <Link to="/dashboard" className="btn-ghost border border-slate-200">Volver al inicio</Link>
          </div>
        </div>
      </AppShell>
    )
  }

  const ConfigBanner = () => {
    if (apisConfigured) return null
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <p className="font-semibold text-amber-800">APIs no configuradas — modo demo</p>
          <p className="text-amber-600 mt-0.5">
            Configura el archivo <code className="font-mono bg-amber-100 px-1 rounded">.env</code> con las API keys necesarias.
          </p>
        </div>
      </div>
    )
  }

  const isEvolution = note?.note_type === 'evolucion'
  const isTransfer = note?.note_type === 'traslado'

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">

        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nueva consulta</h1>
          <p className="text-slate-500 text-sm mt-1">
            {stage === 'idle' && 'Selecciona el tipo de nota y graba la consulta'}
            {stage === 'recording' && 'Atiende a tu paciente con normalidad'}
            {stage === 'processing' && (
              processingStep === 'transcribing'
                ? 'Procesando audio...'
                : 'Generando nota médica...'
            )}
            {stage === 'done' && 'Nota generada — revisa y aprueba'}
            {stage === 'error' && 'Ocurrió un error al procesar'}
          </p>
        </div>

        <ConfigBanner />

        {/* Mobile pre-recording banner — dismissable, only on touch devices */}
        {stage === 'idle' && wakeLockBanner && window.matchMedia('(pointer: coarse)').matches && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-3">
            <span className="text-lg flex-shrink-0">📱</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">Mantén la pantalla visible</p>
              <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                Para garantizar la grabación continua, mantén esta pantalla activa. En iOS la grabación puede pausarse si la pantalla se bloquea.
              </p>
            </div>
            <button
              onClick={() => setWakeLockBanner(false)}
              className="text-amber-400 hover:text-amber-700 transition-colors flex-shrink-0 p-0.5"
              aria-label="Cerrar aviso"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {lowCreditWarning && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-3">
            <span className="text-amber-500 flex-shrink-0">⚠️</span>
            <p className="text-sm text-amber-800">
              <span className="font-semibold">Créditos bajos:</span> Tu institución tiene menos del 20% de créditos disponibles. Contacta al administrador para recargar y evitar interrupciones.
            </p>
          </div>
        )}

        {/* ── Recording card ── */}
        {(stage === 'idle' || stage === 'recording' || stage === 'processing') && (
          <div className="card py-8 text-center">

            {stage === 'idle' && (
              <div className="max-w-md mx-auto mb-8 space-y-5">

                {/* Tipo de nota selector */}
                <div>
                  <label className="label text-center mb-3">Tipo de nota</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {NOTE_TYPE_OPTIONS.map(({ type, label, sublabel, icon, color, credit }) => {
                      const active = noteType === type
                      const colorMap: Record<string, string> = {
                        primary: active ? 'border-primary-500 bg-primary-600 text-white' : 'border-slate-200 text-slate-700 hover:border-primary-200 hover:bg-primary-50',
                        violet: active ? 'border-violet-500 bg-violet-600 text-white' : 'border-slate-200 text-slate-700 hover:border-violet-200 hover:bg-violet-50',
                        amber: active ? 'border-amber-500 bg-amber-600 text-white' : 'border-slate-200 text-slate-700 hover:border-amber-200 hover:bg-amber-50',
                        sky: active ? 'border-sky-500 bg-sky-600 text-white' : 'border-slate-200 text-slate-700 hover:border-sky-200 hover:bg-sky-50',
                      }
                      return (
                        <button
                          key={type}
                          onClick={() => setNoteType(type)}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${colorMap[color]}`}
                        >
                          <span className="text-xl">{icon}</span>
                          <span className="text-xs font-bold leading-tight">{label}</span>
                          <span className={`text-xs leading-tight ${active ? 'opacity-75' : 'text-slate-400'}`}>{sublabel}</span>
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full mt-0.5 ${
                            active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                          }`}>{credit}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Recording mode selector */}
                <div>
                  <label className="label text-center mb-3">Tipo de grabación</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { mode: 'consulta' as RecordingMode, icon: '🎙️', label: 'Consulta con paciente', sublabel: 'El paciente habla durante la consulta' },
                      { mode: 'dictado' as RecordingMode, icon: '📝', label: 'Dictado por médico', sublabel: 'Solo habla el médico' },
                    ]).map(({ mode, icon, label, sublabel }) => {
                      const active = recordingMode === mode
                      return (
                        <button
                          key={mode}
                          onClick={() => setRecordingMode(mode)}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                            active
                              ? 'border-primary-500 bg-primary-50 text-primary-700'
                              : 'border-slate-200 text-slate-700 hover:border-primary-200 hover:bg-primary-50'
                          }`}
                        >
                          <span className="text-xl">{icon}</span>
                          <span className="text-xs font-bold leading-tight">{label}</span>
                          <span className={`text-xs leading-tight ${active ? 'text-primary-500' : 'text-slate-400'}`}>{sublabel}</span>
                        </button>
                      )
                    })}
                  </div>
                  {recordingMode === 'dictado' && (
                    <div className="flex items-start gap-2 bg-primary-50 border border-primary-200 rounded-xl px-3 py-2.5 mt-2">
                      <span className="text-sm flex-shrink-0">💡</span>
                      <p className="text-xs text-primary-700 leading-relaxed">
                        Dicta el caso en voz alta como si se lo contaras a un colega. Incluye: datos del paciente, síntomas, diagnóstico y plan.
                      </p>
                    </div>
                  )}
                </div>

                {/* Telemedicina instruction */}
                {noteType === 'telemedicina' && (
                  <div className="flex items-start gap-2 bg-sky-50 border border-sky-200 rounded-xl px-3 py-2.5">
                    <Monitor size={14} className="text-sky-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-sky-700 leading-relaxed">
                      <span className="font-bold">Primeros en LatAm en documentar teleconsultas automáticamente.</span>{' '}
                      Al grabar, comparte tu pantalla con <span className="font-bold">audio del sistema activado</span> (funciona con Zoom, Teams, Google Meet).
                    </p>
                  </div>
                )}

                {/* Hospitalization day (evolution notes) */}
                {noteType === 'evolucion' && (
                  <div className="flex items-center gap-3 bg-violet-50 border border-violet-200 rounded-xl px-4 py-3">
                    <span className="text-xl">🏥</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-violet-800">Día de hospitalización</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setHospitalizationDay(d => Math.max(1, d - 1))}
                        className="w-7 h-7 rounded-lg bg-violet-200 text-violet-700 font-bold flex items-center justify-center hover:bg-violet-300 transition-colors"
                      >−</button>
                      <span className="text-lg font-bold text-violet-700 w-6 text-center">{hospitalizationDay}</span>
                      <button
                        onClick={() => setHospitalizationDay(d => d + 1)}
                        className="w-7 h-7 rounded-lg bg-violet-200 text-violet-700 font-bold flex items-center justify-center hover:bg-violet-300 transition-colors"
                      >+</button>
                    </div>
                  </div>
                )}

                {/* Patient name */}
                <div>
                  <label className="label text-center">Nombre o código del paciente (opcional)</label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={e => setPatientName(e.target.value)}
                    placeholder="Ej: Paciente 001 o Juan P."
                    className="input-field text-center"
                  />
                </div>

                {/* Specialty selector */}
                <div>
                  <label className="label text-center">Especialidad para esta consulta</label>
                  <div className="flex flex-wrap gap-2 justify-center mt-1">
                    {SPECIALTY_OPTIONS.map(sp => (
                      <button
                        key={sp}
                        onClick={() => setSpecialtyOverride(sp)}
                        className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                          specialtyOverride === sp
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'border-slate-200 text-slate-600 hover:border-primary-300 hover:text-primary-700 hover:bg-primary-50'
                        }`}
                      >
                        {sp}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notas previas del paciente (evolución y traslado) */}
                {(noteType === 'evolucion' || noteType === 'traslado') && (
                  <div className="rounded-2xl border-2 border-violet-200 bg-violet-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-violet-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ClipboardList size={15} className="text-violet-600" />
                        <span className="text-sm font-semibold text-violet-800">
                          {noteType === 'traslado' ? 'Notas del servicio de origen' : 'Notas previas del paciente'}
                        </span>
                        {previousContext.trim() && (
                          <span className="text-xs bg-violet-600 text-white px-2 py-0.5 rounded-full font-medium">Lista</span>
                        )}
                      </div>
                      {previousContext.trim() && (
                        <button
                          onClick={() => setPreviousContext('')}
                          className="text-xs text-violet-400 hover:text-violet-700 transition-colors"
                        >
                          Limpiar
                        </button>
                      )}
                    </div>
                    <div className="p-4 space-y-3">
                      <textarea
                        value={previousContext}
                        onChange={e => setPreviousContext(e.target.value)}
                        placeholder={noteType === 'traslado'
                          ? 'Pegue aquí notas del servicio de origen: nota de egreso, resumen de UCI, epicrisis parcial, evoluciones previas, o cualquier nota del manejo anterior. Puede pegar varias notas seguidas.'
                          : 'Pegue aquí notas previas de este paciente: evoluciones, nota de ingreso, resumen de otro servicio o institución, o cualquier nota anterior. Puede pegar varias notas seguidas.'}
                        className="w-full px-3 py-2.5 rounded-xl border border-violet-200 bg-white text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-all text-xs leading-relaxed resize-none font-mono"
                        rows={10}
                        maxLength={50000}
                      />
                      <p className="text-xs text-violet-600 leading-relaxed">
                        💡 Entre más contexto pegue, más completa será la nota generada. Puede pegar notas de varios días o de distintos servicios.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Recording button */}
            <div className="flex flex-col items-center gap-6">
              {stage === 'processing' ? (
                <div className="w-28 h-28 rounded-full bg-primary-50 border-4 border-primary-200 flex items-center justify-center">
                  <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <button
                  onClick={stage === 'idle' ? startRecording : stopRecording}
                  className={`relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl focus:outline-none focus:ring-4 ${
                    stage === 'recording'
                      ? 'bg-red-500 hover:bg-red-600 focus:ring-red-200 recording-active'
                      : noteType === 'telemedicina'
                      ? 'bg-sky-600 hover:bg-sky-700 focus:ring-sky-200'
                      : noteType === 'evolucion'
                      ? 'bg-violet-600 hover:bg-violet-700 focus:ring-violet-200'
                      : 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-200'
                  }`}
                >
                  {stage === 'recording'
                    ? <Square size={32} className="text-white fill-white" />
                    : noteType === 'telemedicina'
                    ? <Monitor size={36} className="text-white" />
                    : <Mic size={36} className="text-white" />
                  }
                </button>
              )}

              <div>
                {stage === 'recording' && (
                  <div className="text-4xl font-mono font-black text-red-500 mb-1 tabular-nums">
                    {formatTime(seconds)}
                  </div>
                )}
                <p className="text-slate-600 font-medium text-lg">
                  {stage === 'idle' && 'Presiona para iniciar la grabación'}
                  {stage === 'recording' && 'Grabando — presiona para detener'}
                  {stage === 'processing' && (processingStep === 'transcribing' ? 'Procesando audio...' : 'Generando nota médica...')}
                </p>
                {stage === 'recording' && noteType === 'telemedicina' && (
                  <p className="text-sm text-sky-600 mt-1 font-medium">📡 Grabando audio del sistema</p>
                )}
                {stage === 'recording' && noteType === 'evolucion' && (
                  <p className="text-sm text-violet-600 mt-1 font-medium">🏥 Nota de evolución — Día {hospitalizationDay}</p>
                )}
              </div>
            </div>

            {stage === 'recording' && (
              <div className="w-full max-w-sm mx-auto space-y-3 mt-6">
                {/* Voice level bar */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-xs text-red-600 font-semibold">LIVE</span>
                  </div>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-100"
                      style={{
                        width: `${Math.round(voiceLevel * 100)}%`,
                        backgroundColor: voiceLevel > 0.15 ? '#22c55e' : '#cbd5e1',
                      }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0 w-8 text-right">
                    {voiceLevel > 0.15 ? '🎙️' : '🔇'}
                  </span>
                </div>

                {/* Mobile screen-active reminder (only on touch devices) */}
                {window.matchMedia('(pointer: coarse)').matches && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    <span className="text-sm flex-shrink-0">⚠️</span>
                    <p className="text-xs text-amber-800 font-medium leading-snug">
                      Mantén la pantalla activa durante la grabación para mejores resultados
                    </p>
                  </div>
                )}

                {/* Background resume notice */}
                {backgroundNotice && (
                  <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${
                    backgroundNotice === 'continued'
                      ? 'bg-emerald-50 border border-emerald-200'
                      : 'bg-amber-50 border border-amber-200'
                  }`}>
                    <span className="text-sm flex-shrink-0">
                      {backgroundNotice === 'continued' ? '✅' : '⚠️'}
                    </span>
                    <p className={`text-xs font-medium flex-1 ${
                      backgroundNotice === 'continued' ? 'text-emerald-800' : 'text-amber-800'
                    }`}>
                      {backgroundNotice === 'continued'
                        ? 'La grabación continuó en segundo plano'
                        : 'La grabación se pausó. Toca para continuar.'}
                    </p>
                    <button
                      onClick={() => setBackgroundNotice(null)}
                      className="text-slate-400 hover:text-slate-600 flex-shrink-0"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}

                {/* Silence countdown warning */}
                {silenceCountdown !== null && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    <span className="text-sm">⚠️</span>
                    <p className="text-xs text-amber-800 font-medium">
                      Sin voz detectada — deteniendo en{' '}
                      <span className="font-black tabular-nums">
                        {String(Math.floor(silenceCountdown / 60)).padStart(2, '0')}:{String(silenceCountdown % 60).padStart(2, '0')}
                      </span>
                    </p>
                  </div>
                )}

                {/* 80-min session warning */}
                {sessionWarning && (
                  <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
                    <span className="text-sm">⏱️</span>
                    <p className="text-xs text-orange-800 font-medium">La sesión termina en 10 minutos (límite 90 min)</p>
                  </div>
                )}

              </div>
            )}

            {stage === 'processing' && (
              <div className="mt-8 space-y-3 max-w-xs mx-auto text-left">
                {stoppedByInactivity && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    <span className="text-sm">🔇</span>
                    <p className="text-xs text-amber-800 font-medium">Grabación detenida por inactividad de voz</p>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-primary-600">
                    <div className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                  <span className="font-medium text-primary-700">
                    {processingStep === 'transcribing'
                      ? 'Procesando audio...'
                      : noteType === 'evolucion' ? 'Generando nota de evolución...' : 'Generando historia clínica SOAP...'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Error state ── */}
        {stage === 'error' && (
          <div className="card border-2 border-red-200 bg-red-50 py-8 text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
              <MicOff size={28} className="text-red-500" />
            </div>
            <div>
              <h3 className="font-bold text-red-800 text-lg">
                {emptyTranscript ? 'No se detectó audio suficiente' : 'Error al procesar la consulta'}
              </h3>
              <p className="text-red-600 text-sm mt-2 max-w-sm mx-auto leading-relaxed">
                {emptyTranscript
                  ? 'No se captó voz en la grabación. Verifica el micrófono o dicta el caso manualmente.'
                  : error}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              {emptyTranscript && (
                <button
                  onClick={() => { setStage('idle'); setError(''); setEmptyTranscript(false); setRecordingMode('dictado') }}
                  className="btn-primary text-sm py-2.5 px-5"
                >
                  📝 Dictar manualmente
                </button>
              )}
              {!emptyTranscript && transcript && (
                <button onClick={retryProcessing} className="btn-primary text-sm py-2.5 px-5">
                  <RefreshCw size={15} /> Reintentar
                </button>
              )}
              <button onClick={() => { setStage('idle'); setError(''); setEmptyTranscript(false) }} className="btn-ghost text-sm py-2.5 px-5 border border-slate-200">
                Grabar de nuevo
              </button>
            </div>
            {!emptyTranscript && transcript && (
              <div className="mt-4 border-t border-red-200 pt-4 text-left">
                <p className="text-xs font-semibold text-red-700 mb-2">
                  No pudimos generar la nota. Aquí está tu transcripción:
                </p>
                <div className="bg-white border border-red-100 rounded-xl p-3 max-h-40 overflow-y-auto">
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{transcript}</p>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(transcript)}
                  className="mt-2 text-xs text-red-600 hover:text-red-800 font-medium underline"
                >
                  Copiar transcripción
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── SOAP/Evolution Note display ── */}
        {stage === 'done' && note && (
          <>
            {/* Success header */}
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-4">
              <CheckCircle size={20} className="text-emerald-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-emerald-800 text-sm">
                  {isEvolution
                    ? `Nota de evolución generada · Día ${note.hospitalization_day} de hospitalización`
                    : isTransfer
                    ? `Nota de ingreso por traslado generada`
                    : `Historia clínica generada · ${formatTime(recordingDurationRef.current)} de consulta`}
                  {note.note_type === 'telemedicina' && <span className="ml-2 text-sky-600">· 📡 Telemedicina</span>}
                </p>
                <p className="text-emerald-600 text-xs mt-0.5">
                  Generada por Dictia AI
                  {specialtyOverride && ` · ${specialtyOverride}`}
                </p>
              </div>
              <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full font-medium whitespace-nowrap">
                Requiere revisión
              </span>
            </div>

            {/* Transcript preview */}
            {transcript && (
              <details className="group">
                <summary className="cursor-pointer text-sm text-slate-500 font-medium flex items-center gap-2 select-none">
                  <ChevronDown size={14} className="group-open:rotate-180 transition-transform" />
                  Ver transcripción completa
                </summary>
                <div className="mt-2 p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-600 leading-relaxed italic max-h-48 overflow-y-auto">
                  "{transcript}"
                </div>
              </details>
            )}

            {/* ── EVOLUTION NOTE LAYOUT ── */}
            {(isEvolution || isTransfer) ? (
              <>
                {/* Header */}
                <div className={`text-white rounded-2xl p-5 ${isTransfer ? 'bg-amber-600' : 'bg-violet-600'}`}>
                  {isTransfer ? (
                    <>
                      <p className="text-amber-200 text-xs font-bold uppercase tracking-wider mb-1">🚑 Ingreso por traslado</p>
                      <h2 className="text-xl font-bold">Nota de ingreso por traslado</h2>
                      {note.evolution_date && (
                        <p className="text-amber-200 text-sm mt-1">{note.evolution_date}</p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-violet-200 text-xs font-bold uppercase tracking-wider mb-1">🏥 Nota de evolución</p>
                      <h2 className="text-xl font-bold">Día {note.hospitalization_day} de hospitalización</h2>
                      {note.evolution_date && (
                        <p className="text-violet-200 text-sm mt-1">{note.evolution_date}</p>
                      )}
                    </>
                  )}
                </div>

                {/* Sections */}
                <div className="space-y-3">
                  {(isTransfer ? TRANSFER_SECTIONS : EVOLUTION_SECTIONS).map(section => (
                    <SoapCard
                      key={section.key}
                      section={section}
                      note={note}
                      editingKey={editingKey}
                      editValue={editValue}
                      expandedSection={expandedSection}
                      onEdit={startEdit}
                      onSave={saveEdit}
                      onCancelEdit={() => setEditingKey(null)}
                      onEditValueChange={setEditValue}
                      onToggleExpand={(key) => setExpandedSection(expandedSection === key ? null : key)}
                    />
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* Standard SOAP layout */}
                <div className="space-y-3">
                  {SECTIONS_BEFORE_DX.map((section) => (
                    <SoapCard
                      key={section.key}
                      section={section}
                      note={note}
                      editingKey={editingKey}
                      editValue={editValue}
                      expandedSection={expandedSection}
                      onEdit={startEdit}
                      onSave={saveEdit}
                      onCancelEdit={() => setEditingKey(null)}
                      onEditValueChange={setEditValue}
                      onToggleExpand={(key) => setExpandedSection(expandedSection === key ? null : key)}
                    />
                  ))}
                </div>

                {/* Diagnosis banner */}
                <div className="bg-primary-600 text-white rounded-2xl p-5 border border-primary-700">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-primary-200 text-xs font-bold uppercase tracking-wider mb-1">🔬 Diagnóstico</p>
                      <h2 className="text-xl font-bold leading-snug">{note.diagnosis || 'No determinado'}</h2>
                      {note.cie10_code && (
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="bg-white/20 text-white text-sm font-bold px-3 py-0.5 rounded-full">
                            CIE-10: {note.cie10_code}
                          </span>
                          {note.cie10_description && (
                            <span className="text-primary-200 text-sm">{note.cie10_description}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => startEdit('diagnosis')}
                      className="text-primary-300 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10 flex-shrink-0"
                      title="Editar diagnóstico"
                    >
                      <Edit3 size={15} />
                    </button>
                  </div>
                  {editingKey === 'diagnosis' && (
                    <div className="mt-3">
                      <input
                        type="text"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white/20 text-white placeholder-primary-300 border border-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-white/40"
                        autoFocus
                        placeholder="Diagnóstico principal"
                      />
                      <div className="flex gap-2 mt-2">
                        <button onClick={saveEdit} className="text-xs font-semibold bg-white text-primary-700 px-3 py-1.5 rounded-lg hover:bg-primary-50">Guardar</button>
                        <button onClick={() => setEditingKey(null)} className="text-xs font-semibold text-primary-200 hover:text-white px-3 py-1.5">Cancelar</button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {SECTIONS_AFTER_DX.map((section) => (
                    <SoapCard
                      key={section.key}
                      section={section}
                      note={note}
                      editingKey={editingKey}
                      editValue={editValue}
                      expandedSection={expandedSection}
                      onEdit={startEdit}
                      onSave={saveEdit}
                      onCancelEdit={() => setEditingKey(null)}
                      onEditValueChange={setEditValue}
                      onToggleExpand={(key) => setExpandedSection(expandedSection === key ? null : key)}
                    />
                  ))}
                </div>

                {/* Pharma suggestions */}
                {note.pharma_suggestions && note.pharma_suggestions.length > 0 && (
                  <div className="bg-white rounded-2xl border-2 border-blue-100 shadow-sm overflow-hidden">
                    <button
                      onClick={() => setPharmaOpen(o => !o)}
                      className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Pill size={16} className="text-blue-500" />
                        <span className="text-sm font-bold text-slate-700">Sugerencias farmacológicas</span>
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                          {note.pharma_suggestions.length} medicamentos
                        </span>
                      </div>
                      {pharmaOpen ? <ChevronUp size={16} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />}
                    </button>
                    {pharmaOpen && (
                      <div className="px-5 pb-5 space-y-3">
                        <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5">
                          <span className="text-sm flex-shrink-0">💊</span>
                          <p className="text-xs text-blue-700 leading-relaxed">
                            <span className="font-bold">Sugerencias basadas en el diagnóstico</span> — el médico decide y es responsable de toda prescripción
                          </p>
                        </div>
                        <div className="space-y-2">
                          {note.pharma_suggestions.map((s, i) => (
                            <div key={i} className="flex items-start gap-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                              <Pill size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-semibold text-slate-800">
                                  {s.nombre_generico}
                                  {s.nombre_comercial && <span className="text-slate-400 font-normal"> ({s.nombre_comercial})</span>}
                                </p>
                                <p className="text-xs text-slate-600 mt-0.5">{s.dosis}</p>
                                <p className="text-xs text-slate-400 mt-0.5 italic">{s.indicacion}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Clinical evidence (only for standard notes with a diagnosis) */}
                {note.diagnosis && <ClinicalEvidence diagnosis={note.diagnosis} />}
              </>
            )}

            {/* Glosa shield (all note types) */}
            {note.glosa_shield && <GlosaShieldCard shield={note.glosa_shield} />}

            {/* AI Assistant */}
            <AIAssistant note={note} />

            {/* Full note preview — Mejora 1 */}
            <FullNotePreview
              note={note}
              patientName={patientName}
              onCopy={handleCopyPreview}
              copied={previewCopied}
            />

            {/* Disclaimer */}
            <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-500">
              <AlertTriangle size={13} className="flex-shrink-0 text-slate-400 mt-0.5" />
              <span>📋 Esta nota fue preparada con el apoyo de Dictia AI como asistente de documentación. El médico tratante ha revisado y aprobado su contenido. El juicio clínico final pertenece al médico tratante.</span>
            </div>

            {!isSupabaseMode && (
              <div className="text-xs text-slate-400 text-center bg-slate-50 rounded-xl py-2 px-4">
                Modo demo — configura Supabase en .env para guardar consultas en la base de datos
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pb-8">
              <button
                onClick={handleApprove}
                disabled={saving || copied}
                className={`btn-primary flex-1 justify-center py-3.5 text-base disabled:opacity-70 ${
                  copied ? 'bg-emerald-600 hover:bg-emerald-600' : ''
                }`}
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : copied ? (
                  <><CheckCircle size={18} /> ¡Guardado y copiado!</>
                ) : (
                  <><CheckCircle size={18} /> Aprobar y guardar</>
                )}
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center justify-center gap-2 px-6 py-3.5 text-base font-semibold text-red-600 border-2 border-red-200 rounded-xl hover:bg-red-50 transition-all"
              >
                <Trash2 size={18} />
                Descartar
              </button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
