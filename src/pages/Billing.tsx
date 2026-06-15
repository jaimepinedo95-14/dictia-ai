import { useState, useEffect } from 'react'
import { Check, Zap, CheckCircle, AlertCircle } from 'lucide-react'
import AppShell from '../components/AppShell'
import { useAuth } from '../contexts/AuthContext'
import { PLANS } from '../lib/mockData'
import { fetchSavingsStats } from '../lib/db'
import { Link } from 'react-router-dom'
import type { UserProfile } from '../lib/supabase'

export default function Billing() {
  const { profile, updateProfile, isSupabaseMode, user } = useAuth()
  const [activatingPlan, setActivatingPlan] = useState<string | null>(null)
  const [successPlan, setSuccessPlan] = useState<string | null>(null)
  const [planError, setPlanError] = useState('')
  const [monthCount, setMonthCount] = useState<number | null>(null)

  useEffect(() => {
    if (isSupabaseMode && user?.id) {
      fetchSavingsStats(user.id).then(stats => setMonthCount(stats.month))
    }
  }, [user?.id, isSupabaseMode])

  async function handleActivatePlan(planId: string) {
    const planData = PLANS.find(p => p.id === planId)
    if (!planData) return
    setActivatingPlan(planId)
    setPlanError('')
    setSuccessPlan(null)
    try {
      await updateProfile({
        plan: planId as UserProfile['plan'],
        consultations_limit: planData.consultations,
        subscription_status: 'active',
      })
      setSuccessPlan(planId)
      setTimeout(() => setSuccessPlan(null), 4000)
    } catch {
      setPlanError('Error al actualizar el plan. Intenta de nuevo.')
    } finally {
      setActivatingPlan(null)
    }
  }

  const currentPlanData = PLANS.find(p => p.id === profile?.plan)
  const monthlyLimit = currentPlanData?.consultations ?? null

  const usageText = () => {
    if (profile?.plan === 'free_trial') {
      const used = profile?.trial_notes_used ?? profile?.consultations_used ?? 0
      const limit = profile?.trial_notes_limit ?? 10
      return `Período de prueba · ${used} / ${limit} notas usadas`
    }
    const used = monthCount ?? 0
    const limit = monthlyLimit
    return `${used} / ${limit !== null ? limit : '∞'} consultas usadas este mes`
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Planes y facturación</h1>
          <p className="text-slate-500 text-sm mt-1">Administra tu suscripción y métodos de pago</p>
        </div>

        {/* Feedback banners */}
        {successPlan && (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3">
            <CheckCircle size={18} className="text-emerald-600 flex-shrink-0" />
            <p className="text-sm font-semibold text-emerald-800">
              Plan actualizado correctamente a {PLANS.find(p => p.id === successPlan)?.name}.
            </p>
          </div>
        )}
        {planError && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-5 py-3">
            <AlertCircle size={18} className="text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700">{planError}</p>
          </div>
        )}

        {/* Current plan summary */}
        <div className="card border-2 border-primary-100 bg-primary-50">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs font-bold text-primary-600 uppercase tracking-wider mb-1">Plan actual</p>
              <h2 className="text-xl font-bold text-slate-900 capitalize">
                {profile?.plan === 'free_trial' ? 'Prueba gratuita' : currentPlanData?.name ?? profile?.plan}
              </h2>
              <p className="text-sm text-slate-500 mt-1">{usageText()}</p>
            </div>
            {profile?.plan === 'free_trial' && profile?.trial_ends_at && (
              <div className="bg-amber-100 border border-amber-200 rounded-xl px-4 py-2">
                <p className="text-sm font-bold text-amber-800">
                  Vence el {new Date(profile.trial_ends_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'long' })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Plans grid */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Elige tu plan</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {PLANS.filter(p => p.id !== 'free_trial').map((plan) => {
              const isCurrent = profile?.plan === plan.id
              const isLoading = activatingPlan === plan.id
              const isSuccess = successPlan === plan.id
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-3xl p-5 flex flex-col border-2 transition-all duration-200 ${
                    plan.highlight
                      ? 'border-primary-500 bg-primary-50 shadow-lg shadow-primary-100'
                      : isCurrent
                      ? 'border-emerald-400 bg-emerald-50'
                      : 'border-slate-200 bg-white hover:border-primary-200'
                  }`}
                >
                  {plan.badge && !isCurrent && (
                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${
                      plan.highlight ? 'bg-primary-600 text-white' : 'bg-amber-400 text-amber-900'
                    }`}>
                      {plan.badge}
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full bg-emerald-500 text-white whitespace-nowrap">
                      Plan actual
                    </div>
                  )}

                  <h3 className="font-bold text-slate-900 mb-1">{plan.name}</h3>
                  <div className="mb-3">
                    <span className="text-2xl font-black text-slate-900">
                      ${plan.price.toLocaleString('es-CO')}
                    </span>
                    <span className="text-xs text-slate-400 ml-1">COP/mes</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">{plan.consultations} consultas/mes</p>

                  <ul className="space-y-1.5 mb-5 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-1.5 text-xs">
                        <Check size={12} className="text-primary-600 mt-0.5 flex-shrink-0" />
                        <span className="text-slate-600">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    disabled={isCurrent || isLoading}
                    onClick={() => !isCurrent && handleActivatePlan(plan.id)}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      isCurrent
                        ? 'bg-emerald-100 text-emerald-700 cursor-default'
                        : isSuccess
                        ? 'bg-emerald-500 text-white'
                        : plan.highlight
                        ? 'bg-primary-600 text-white hover:bg-primary-700'
                        : 'bg-slate-900 text-white hover:bg-slate-700'
                    }`}
                  >
                    {isCurrent ? (
                      'Plan actual'
                    ) : isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Activando...
                      </span>
                    ) : isSuccess ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <CheckCircle size={14} /> Activado
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-1.5">
                        <Zap size={13} /> Activar
                      </span>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-slate-400 text-center mt-4">
            Pagos procesados de forma segura con Wompi · Cancela cuando quieras
          </p>
        </div>

        {/* Payment history placeholder */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Historial de pagos</h2>
          <div className="card text-center py-12">
            <p className="text-slate-400 text-sm">No hay pagos registrados aún.</p>
            <p className="text-slate-300 text-xs mt-1">Aparecerán aquí cuando actives un plan de pago.</p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-slate-400">
            ¿Necesitas un plan personalizado para tu clínica?{' '}
            <Link to="#" className="text-primary-600 font-semibold hover:text-primary-700">Contáctanos</Link>
          </p>
        </div>
      </div>
    </AppShell>
  )
}
