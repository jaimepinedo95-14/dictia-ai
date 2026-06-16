import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckSquare, Square, Shield, FileText } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const TERMS_VERSION = 'v1.0-2025'

export default function TermsConsentModal() {
  const { profile, updateProfile } = useAuth()
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedResponsibility, setAcceptedResponsibility] = useState(false)
  const [loading, setLoading] = useState(false)

  // Show only when column exists (accepted_terms_at === null) and user hasn't accepted.
  // If accepted_terms_at is undefined (column not yet created in Supabase), skip modal.
  if (!profile || profile.accepted_terms_at !== null) return null

  const canAccept = acceptedTerms && acceptedResponsibility

  async function handleAccept() {
    if (!canAccept) return
    setLoading(true)
    await updateProfile({
      accepted_terms_at: new Date().toISOString(),
      accepted_terms_version: TERMS_VERSION,
    })
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full sm:max-w-lg bg-white sm:rounded-3xl shadow-2xl flex flex-col max-h-screen sm:max-h-[90vh]">

        {/* Header */}
        <div className="px-6 pt-8 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-50 flex items-center justify-center flex-shrink-0">
              <Shield size={20} className="text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Antes de continuar</h2>
              <p className="text-xs text-slate-500">Hemos actualizado nuestros términos legales</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Para seguir usando Dictia necesitas aceptar los términos de uso y la política de privacidad en su versión actualizada ({TERMS_VERSION}).
          </p>
        </div>

        {/* Scrollable content */}
        <div className="px-6 py-5 flex-1 overflow-y-auto space-y-4">

          {/* Key privacy commitment */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Nuestro compromiso de privacidad</p>
            <ul className="space-y-1.5">
              {[
                'El audio se elimina automáticamente al transcribir',
                'Las notas generadas no se guardan en nuestros servidores',
                'No almacenamos nombres ni datos de tus pacientes',
                'Solo guardamos tus datos de cuenta y metadatos de uso',
              ].map(item => (
                <li key={item} className="flex items-start gap-2 text-xs text-emerald-800">
                  <span className="font-bold flex-shrink-0 mt-0.5">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Checkboxes */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setAcceptedTerms(v => !v)}
              className="w-full flex items-start gap-3 p-4 rounded-2xl border-2 transition-all text-left
                hover:bg-slate-50 active:scale-[0.98]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500
                border-slate-200"
            >
              <span className={`flex-shrink-0 mt-0.5 transition-colors ${acceptedTerms ? 'text-primary-600' : 'text-slate-300'}`}>
                {acceptedTerms ? <CheckSquare size={20} /> : <Square size={20} />}
              </span>
              <span className="text-sm text-slate-700 leading-relaxed">
                He leído y acepto los{' '}
                <Link
                  to="/terminos"
                  target="_blank"
                  onClick={e => e.stopPropagation()}
                  className="text-primary-600 underline hover:text-primary-700 font-semibold"
                >
                  Términos de uso
                </Link>{' '}
                y la{' '}
                <Link
                  to="/privacidad"
                  target="_blank"
                  onClick={e => e.stopPropagation()}
                  className="text-primary-600 underline hover:text-primary-700 font-semibold"
                >
                  Política de privacidad
                </Link>{' '}
                de Dictia AI.
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAcceptedResponsibility(v => !v)}
              className="w-full flex items-start gap-3 p-4 rounded-2xl border-2 transition-all text-left
                hover:bg-slate-50 active:scale-[0.98]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500
                border-slate-200"
            >
              <span className={`flex-shrink-0 mt-0.5 transition-colors ${acceptedResponsibility ? 'text-primary-600' : 'text-slate-300'}`}>
                {acceptedResponsibility ? <CheckSquare size={20} /> : <Square size={20} />}
              </span>
              <span className="text-sm text-slate-700 leading-relaxed">
                Entiendo que soy el <strong>responsable del tratamiento</strong> de datos de mis pacientes y que debo contar con su <strong>consentimiento informado</strong> para usar herramientas de documentación asistida por IA.
              </span>
            </button>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 pb-6 pt-4 border-t border-slate-100">
          <button
            onClick={handleAccept}
            disabled={!canAccept || loading}
            className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700
              disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed
              text-white font-bold py-3.5 rounded-2xl transition-all text-sm"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <FileText size={16} />
            )}
            {loading ? 'Guardando...' : 'Aceptar y continuar'}
          </button>
          {!canAccept && (
            <p className="text-center text-xs text-slate-400 mt-2.5">
              Debes marcar ambas casillas para continuar
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
