import { useNavigate } from 'react-router-dom'
import { XCircle, ArrowRight, HeartHandshake } from 'lucide-react'
import Logo from '../components/Logo'
import { useAuth } from '../contexts/AuthContext'

export default function SubscriptionCancelled() {
  const { reactivateSubscription, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleReactivate() {
    await reactivateSubscription()
    navigate('/onboarding/plan')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>

        <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <XCircle size={36} className="text-slate-400" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-3">Prueba cancelada</h1>
        <p className="text-slate-500 text-sm leading-relaxed mb-2">
          Cancelaste tu prueba gratuita. <strong className="text-slate-700">No se realizó ningún cobro.</strong>
        </p>
        <p className="text-slate-400 text-sm leading-relaxed mb-8">
          Puedes volver cuando quieras — tu cuenta sigue aquí.
        </p>

        <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4 mb-6 text-left">
          <div className="flex items-center gap-2 mb-2">
            <HeartHandshake size={16} className="text-primary-600" />
            <p className="text-sm font-semibold text-primary-700">¿Cambias de opinión?</p>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Reactiva tu cuenta en segundos. Los 3 días de prueba gratuita aplican de nuevo al reingresar tu tarjeta.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleReactivate}
            className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 rounded-2xl transition-colors"
          >
            Reactivar mi cuenta
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
