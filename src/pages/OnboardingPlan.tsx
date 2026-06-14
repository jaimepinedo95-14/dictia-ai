import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ArrowRight, Zap } from 'lucide-react'
import Logo from '../components/Logo'
import { useAuth } from '../contexts/AuthContext'

const ONBOARDING_PLANS = [
  {
    id: 'basic',
    name: 'Básico',
    price: 39900,
    hcs: 130,
    features: ['Historia clínica SOAP completa', 'Nota de evolución hospitalaria', 'CIE-10 automático', 'Anti-glosas / documentación sólida'],
    highlight: false,
    badge: null,
  },
  {
    id: 'standard',
    name: 'Estándar',
    price: 54900,
    hcs: 250,
    features: ['Todo lo del Básico', 'Nota de ingreso por traslado', 'Nota de devolución de turno', 'AI Assistant dentro de la nota'],
    highlight: true,
    badge: 'Más popular',
  },
  {
    id: 'advanced',
    name: 'Avanzado',
    price: 69900,
    hcs: 440,
    features: ['Todo lo del Estándar', 'Evidencia clínica integrada', 'Sugerencias farmacológicas', 'Soporte prioritario'],
    highlight: false,
    badge: null,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99900,
    hcs: 800,
    features: ['Todo lo del Avanzado', 'Aprendizaje de estilo del médico', 'Acceso anticipado a nuevas funciones', 'Soporte directo por WhatsApp'],
    highlight: false,
    badge: 'Alto volumen',
  },
]

function formatCOP(amount: number) {
  return amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

export default function OnboardingPlan() {
  const { profile, updateProfile } = useAuth()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<string>(profile?.plan_seleccionado ?? 'standard')
  const [loading, setLoading] = useState(false)

  async function handleContinue() {
    if (!selected) return
    setLoading(true)
    try {
      await updateProfile({ plan_seleccionado: selected })
    } catch {
      // Don't block navigation if profile update fails
    }
    navigate('/onboarding/tarjeta')
  }

  const selectedPlan = ONBOARDING_PLANS.find(p => p.id === selected)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-primary-50 flex flex-col items-center justify-center p-4 py-12">
      <div className="w-full max-w-4xl">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-block mb-6">
            <Logo size="lg" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Elige tu plan</h1>
          <p className="text-slate-500">
            10 notas de prueba completamente gratis. Cancela cuando quieras.
          </p>
        </div>

        {/* Plan grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {ONBOARDING_PLANS.map(plan => {
            const isSelected = selected === plan.id
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelected(plan.id)}
                className={`relative flex flex-col text-left rounded-3xl border-2 p-5 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                  isSelected
                    ? plan.highlight
                      ? 'border-primary-600 bg-primary-600 text-white shadow-xl shadow-primary-200'
                      : 'border-primary-600 bg-white shadow-lg shadow-primary-100'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                {plan.badge && (
                  <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${
                    isSelected && plan.highlight ? 'bg-white text-primary-700' : 'bg-primary-600 text-white'
                  }`}>
                    {plan.badge}
                  </span>
                )}

                {/* Selected checkmark */}
                {isSelected && (
                  <span className={`absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center ${
                    plan.highlight ? 'bg-white' : 'bg-primary-600'
                  }`}>
                    <Check size={14} className={plan.highlight && isSelected ? 'text-primary-600' : 'text-white'} />
                  </span>
                )}

                <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                  isSelected && plan.highlight ? 'text-primary-200' : 'text-slate-400'
                }`}>
                  {plan.name}
                </p>

                <p className={`text-2xl font-black mb-0.5 ${isSelected && plan.highlight ? 'text-white' : 'text-slate-900'}`}>
                  {formatCOP(plan.price)}
                </p>
                <p className={`text-xs mb-4 ${isSelected && plan.highlight ? 'text-primary-200' : 'text-slate-400'}`}>
                  /mes · {plan.hcs} HCs
                </p>

                <ul className="space-y-1.5 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className={`text-xs flex items-start gap-1.5 ${isSelected && plan.highlight ? 'text-primary-100' : 'text-slate-600'}`}>
                      <Check size={12} className={`flex-shrink-0 mt-0.5 ${isSelected && plan.highlight ? 'text-white' : 'text-emerald-500'}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* Free trial badge */}
                <div className={`mt-4 pt-4 border-t text-center ${isSelected && plan.highlight ? 'border-primary-500' : 'border-slate-100'}`}>
                  <p className={`text-xs font-semibold ${isSelected && plan.highlight ? 'text-primary-200' : 'text-emerald-600'}`}>
                    🎯 10 notas gratis, luego {formatCOP(plan.price)}/mes
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Continue button */}
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={handleContinue}
            disabled={!selected || loading}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold px-10 py-4 rounded-2xl text-base transition-colors shadow-lg shadow-primary-200"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Zap size={18} />
                {selectedPlan ? `Continuar con el plan ${selectedPlan.name}` : 'Continuar'}
                <ArrowRight size={18} />
              </>
            )}
          </button>
          <p className="text-xs text-slate-400">
            Puedes cambiar de plan en cualquier momento · Sin permanencia mínima
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 justify-center mt-10">
          {['Cuenta', 'Plan', 'Tarjeta'].map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                i === 0 ? 'bg-emerald-500 text-white' :
                i === 1 ? 'bg-primary-600 text-white' :
                'bg-slate-200 text-slate-400'
              }`}>
                {i === 0 ? <Check size={12} /> : i + 1}
              </div>
              <span className={`text-xs ${i === 1 ? 'text-slate-700 font-semibold' : i === 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{step}</span>
              {i < 2 && <div className="w-8 h-px bg-slate-200" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
