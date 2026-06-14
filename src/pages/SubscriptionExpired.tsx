import { useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowRight, RefreshCw } from 'lucide-react'
import Logo from '../components/Logo'
import { useAuth } from '../contexts/AuthContext'

export default function SubscriptionExpired() {
  const { reactivateSubscription, signOut, profile } = useAuth()
  const navigate = useNavigate()

  async function handleUpdateCard() {
    await reactivateSubscription()
    navigate('/onboarding/tarjeta')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>

        <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <AlertCircle size={36} className="text-red-500" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-3">Problema con tu pago</h1>
        <p className="text-slate-500 text-sm leading-relaxed mb-2">
          No pudimos procesar el cobro de tu plan <strong className="text-slate-700">
            {profile?.plan_seleccionado ?? 'Estándar'}
          </strong>.
        </p>
        <p className="text-slate-400 text-sm leading-relaxed mb-8">
          Actualiza tu tarjeta para recuperar el acceso. Tus datos y configuración están guardados.
        </p>

        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6 text-left">
          <p className="text-xs font-semibold text-red-700 mb-1">Razones habituales</p>
          <ul className="text-xs text-slate-600 space-y-1">
            <li>• Fondos insuficientes en el momento del cobro</li>
            <li>• Tarjeta vencida o bloqueada por el banco</li>
            <li>• Restricción de pagos internacionales</li>
          </ul>
          <p className="text-xs text-slate-400 mt-2">
            Si tienes dudas, contacta a tu banco o escríbenos a{' '}
            <a href="mailto:soporte@dictia.health" className="text-primary-600 underline">soporte@dictia.health</a>
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleUpdateCard}
            className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 rounded-2xl transition-colors"
          >
            <RefreshCw size={18} />
            Actualizar tarjeta
            <ArrowRight size={18} />
          </button>
          <button
            onClick={signOut}
            className="w-full py-3 text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}
