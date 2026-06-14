import { useState } from 'react'
import { X, Zap, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const PLAN_NAMES: Record<string, string> = {
  basic: 'Básico',
  standard: 'Estándar',
  advanced: 'Avanzado',
  pro: 'Pro',
}

export default function TrialBanner() {
  const { profile, cancelTrial } = useAuth()
  const navigate = useNavigate()
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)

  if (profile?.subscription_status !== 'trial') return null

  const trialEndDate = profile.trial_end_at ? new Date(profile.trial_end_at) : null
  const msLeft = trialEndDate ? trialEndDate.getTime() - Date.now() : 0
  const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)))
  const isLastDay = daysLeft <= 1
  const planName = PLAN_NAMES[profile.plan_seleccionado ?? ''] ?? 'seleccionado'

  const formattedDate = trialEndDate?.toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long',
  }) ?? ''

  async function handleConfirmCancel() {
    setCancelLoading(true)
    await cancelTrial()
    setCancelLoading(false)
    setShowCancelModal(false)
    navigate('/subscription/cancelado')
  }

  return (
    <>
      {/* Banner */}
      <div className={`px-4 py-2.5 flex items-center gap-3 text-sm ${
        isLastDay
          ? 'bg-amber-500 text-white'
          : 'bg-primary-600 text-white'
      }`}>
        <Zap size={15} className="flex-shrink-0 opacity-90" />
        <p className="flex-1 text-xs sm:text-sm leading-snug">
          {daysLeft === 0 ? (
            <>Hoy vence tu prueba gratuita. Tu plan <strong>{planName}</strong> se activa hoy.</>
          ) : (
            <>
              Prueba gratuita: {' '}
              <strong>{daysLeft} día{daysLeft !== 1 ? 's' : ''} restante{daysLeft !== 1 ? 's' : ''}</strong>.
              {' '}Tu plan <strong>{planName}</strong> se activará el <strong>{formattedDate}</strong>.
            </>
          )}
        </p>
        <button
          onClick={() => setShowCancelModal(true)}
          className="text-xs opacity-70 hover:opacity-100 underline whitespace-nowrap flex-shrink-0 transition-opacity"
        >
          Cancelar prueba
        </button>
        <button
          onClick={() => setShowCancelModal(true)}
          className="p-1 rounded hover:bg-white/20 transition-colors flex-shrink-0"
          aria-label="Más opciones"
        >
          <X size={14} />
        </button>
      </div>

      {/* Cancel confirmation modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowCancelModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm">
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mb-4 mx-auto">
              <AlertTriangle size={22} className="text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">¿Cancelar la prueba gratuita?</h3>
            <p className="text-sm text-slate-500 text-center leading-relaxed mb-6">
              No se te cobrará nada. Perderás el acceso a Dictia al confirmar.
              Podrás volver a registrarte en cualquier momento.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleConfirmCancel}
                disabled={cancelLoading}
                className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-semibold rounded-2xl transition-colors text-sm"
              >
                {cancelLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Cancelando...
                  </span>
                ) : 'Sí, cancelar sin cargo'}
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-2xl transition-colors text-sm"
              >
                No, seguir con mi prueba
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
