import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Lock, CheckCircle, AlertCircle, Check, RefreshCw } from 'lucide-react'
import Logo from '../components/Logo'
import { useAuth } from '../contexts/AuthContext'

const WOMPI_API_URL = import.meta.env.VITE_WOMPI_API_URL ?? 'https://sandbox.wompi.co/v1'
const WOMPI_PUBLIC_KEY = import.meta.env.VITE_WOMPI_PUBLIC_KEY as string

const PLAN_NAMES: Record<string, string> = {
  basic: 'Básico',
  standard: 'Estándar',
  advanced: 'Avanzado',
  pro: 'Pro',
}

const PLAN_PRICES: Record<string, number> = {
  basic: 39900,
  standard: 54900,
  advanced: 69900,
  pro: 99900,
}

function formatCOP(amount: number) {
  return amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

type Stage = 'widget' | 'processing' | 'success' | 'error'

export default function OnboardingCard() {
  const { profile, updateProfile, user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const widgetContainerRef = useRef<HTMLDivElement>(null)

  // Start in 'processing' immediately when Wompi is not configured (dev mode bypass)
  const [stage, setStage] = useState<Stage>(WOMPI_PUBLIC_KEY ? 'widget' : 'processing')
  const [errorMsg, setErrorMsg] = useState('')
  const [reference] = useState(() => `dictia_${user?.id ?? 'u'}_${Date.now()}`)

  const planId = profile?.plan_seleccionado ?? 'standard'
  const planName = PLAN_NAMES[planId] ?? planId
  const planPrice = PLAN_PRICES[planId] ?? 54900

  // ── Handle redirect back from Wompi ───────────────────────────────────────────
  useEffect(() => {
    const transactionId = searchParams.get('id')

    if (!transactionId) return // Initial view — show widget

    // Already processed (e.g. page refresh after success)
    if (profile?.subscription_status === 'trial') {
      navigate('/dashboard', { replace: true })
      return
    }

    setStage('processing')

    async function processWompiTransaction() {
      try {
        // Fetch transaction from Wompi (public key is safe for GET)
        const res = await fetch(`${WOMPI_API_URL}/transactions/${transactionId}`, {
          headers: { Authorization: `Bearer ${WOMPI_PUBLIC_KEY}` },
        })
        const json = await res.json()
        const txn = json.data

        if (!txn || txn.status !== 'APPROVED') {
          setErrorMsg(
            txn?.status === 'DECLINED'
              ? 'Tu tarjeta fue rechazada. Intenta con otra tarjeta o contacta a tu banco.'
              : 'El pago no fue aprobado. Por favor intenta de nuevo.'
          )
          setStage('error')
          return
        }

        // payment_source_id lives in payment_method.extra.payment_source_id
        // or directly in txn.payment_method.payment_source
        const paymentSourceId =
          txn.payment_method?.payment_source_id ??
          txn.payment_method?.extra?.payment_source_id ??
          String(txn.id) // fallback: use transaction ID if source not exposed

        const now = new Date().toISOString()
        const trialEndAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

        // Core subscription fields — columns are guaranteed to exist in Supabase
        await updateProfile({
          subscription_status: 'trial',
          wompi_customer_id: String(paymentSourceId),
          wompi_subscription_id: txn.reference ?? reference,
          card_registered_at: now,
          trial_start_at: now,
          trial_end_at: trialEndAt,
          trial_ends_at: trialEndAt,
        })

        // Trial notes counters — separate call so a missing-column DB error
        // doesn't prevent subscription_status from being saved.
        // Run the migration in supabase.ts comments if this fails.
        try {
          await updateProfile({ trial_notes_limit: 15, trial_notes_used: 0 })
        } catch { /* non-critical: canRecord() uses safe defaults */ }

        setStage('success')
        setTimeout(() => navigate('/dashboard', { replace: true }), 2000)
      } catch {
        setErrorMsg('No pudimos procesar tu tarjeta. Revisa tu conexión e intenta de nuevo.')
        setStage('error')
      }
    }

    processWompiTransaction()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // ── Render Wompi checkout widget ──────────────────────────────────────────────
  useEffect(() => {
    if (stage !== 'widget' || !user?.email || !widgetContainerRef.current) return
    if (!WOMPI_PUBLIC_KEY) return // no key configured

    widgetContainerRef.current.innerHTML = ''

    const script = document.createElement('script')
    script.src = 'https://checkout.wompi.co/widget.js'
    script.setAttribute('data-render', 'button')
    script.setAttribute('data-public-key', WOMPI_PUBLIC_KEY)
    script.setAttribute('data-currency', 'COP')
    // 100 centavos = 1 COP: mínimo requerido para verificar la tarjeta y crear payment_source
    script.setAttribute('data-amount-in-cents', '100')
    script.setAttribute('data-reference', reference)
    script.setAttribute('data-redirect-url', `${window.location.origin}/onboarding/tarjeta`)
    script.setAttribute('data-customer-email', user.email)

    widgetContainerRef.current.appendChild(script)

    return () => { if (widgetContainerRef.current) widgetContainerRef.current.innerHTML = '' }
  }, [stage, user?.email, reference])

  // ── Dev-mode bypass: auto-activate trial when Wompi is not configured ─────────
  useEffect(() => {
    if (WOMPI_PUBLIC_KEY) return            // Wompi configured: use the widget
    if (searchParams.get('id')) return      // Wompi redirect: handled by the first effect

    const now = new Date().toISOString()
    const trialEndAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

    updateProfile({
      subscription_status: 'trial',
      card_registered_at: now,
      trial_start_at: now,
      trial_end_at: trialEndAt,
      trial_ends_at: trialEndAt,
    })
      .then(() => updateProfile({ trial_notes_limit: 15, trial_notes_used: 0 }).catch(() => {}))
      .then(() => { setStage('success'); setTimeout(() => navigate('/dashboard', { replace: true }), 1500) })
      .catch(() => {
        setErrorMsg('Error al activar el período de prueba. Por favor recarga la página.')
        setStage('error')
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Success screen ─────────────────────────────────────────────────────────────
  if (stage === 'success') {
    return (
      <Screen>
        <div className="text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">¡Todo listo!</h2>
          <p className="text-slate-500 mb-2">Tus 3 días / 15 notas de prueba gratis están activos.</p>
          <p className="text-sm text-slate-400">
            El plan <strong className="text-slate-700">{planName}</strong> se activará luego de usar tus notas de prueba.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-slate-400 text-sm">
            <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            Entrando a Dictia...
          </div>
        </div>
      </Screen>
    )
  }

  // ── Processing screen ──────────────────────────────────────────────────────────
  if (stage === 'processing') {
    return (
      <Screen>
        <div className="text-center">
          <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <RefreshCw size={36} className="text-primary-600 animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            {WOMPI_PUBLIC_KEY ? 'Verificando tu tarjeta…' : 'Activando período de prueba…'}
          </h2>
          <p className="text-slate-500 text-sm">
            {WOMPI_PUBLIC_KEY ? 'Esto tarda unos segundos.' : 'Modo desarrollo — sin cargo.'}
          </p>
        </div>
      </Screen>
    )
  }

  // ── Error screen ───────────────────────────────────────────────────────────────
  if (stage === 'error') {
    return (
      <Screen>
        <div className="text-center">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={36} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Hubo un problema</h2>
          <p className="text-slate-500 text-sm mb-6">{errorMsg}</p>
          <button
            onClick={() => {
              window.history.replaceState({}, '', '/onboarding/tarjeta')
              setStage('widget')
              setErrorMsg('')
            }}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors mx-auto"
          >
            <RefreshCw size={16} />
            Intentar de nuevo
          </button>
        </div>
      </Screen>
    )
  }

  // ── Main widget view ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-primary-50 flex flex-col items-center justify-center p-4 py-12">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-6">
            <Logo size="lg" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Registra tu tarjeta</h1>
          <p className="text-slate-500 text-sm">
            No se realizará ningún cobro durante 3 días o 15 notas de prueba.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
          {/* Plan summary */}
          <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4 mb-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-primary-600 uppercase tracking-wider mb-1">Plan seleccionado</p>
                <p className="font-bold text-slate-900">{planName}</p>
                <p className="text-sm text-slate-500 mt-0.5">
                  {formatCOP(planPrice)}/mes · luego de tus 3 días / 15 notas gratis
                </p>
              </div>
              <Link
                to="/onboarding/plan"
                className="text-xs text-primary-600 hover:text-primary-700 font-semibold whitespace-nowrap mt-1"
              >
                Cambiar
              </Link>
            </div>
          </div>

          {/* Trust points */}
          <ul className="space-y-2 mb-6">
            {[
              '3 días o 15 notas gratis — lo que ocurra primero',
              'Cancela cuando quieras sin ningún cargo',
              'Pago procesado de forma segura por Wompi (Bancolombia)',
              'No almacenamos datos de tu tarjeta en nuestros servidores',
            ].map(item => (
              <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                <Check size={15} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>

          {/* Wompi button container */}
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs text-slate-400 text-center">
              Al hacer clic serás redirigido al portal seguro de Wompi para ingresar los datos de tu tarjeta.
            </p>
            {/* Wompi renders its button inside this div */}
            <div ref={widgetContainerRef} className="w-full flex justify-center min-h-[48px]" />
          </div>

          <div className="flex items-center justify-center gap-1.5 mt-4">
            <Lock size={12} className="text-slate-300" />
            <p className="text-xs text-slate-300">Conexión segura · TLS 1.3</p>
          </div>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 justify-center mt-8">
          {['Cuenta', 'Plan', 'Tarjeta'].map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                i < 2 ? 'bg-emerald-500 text-white' : 'bg-primary-600 text-white'
              }`}>
                {i < 2 ? <Check size={12} /> : '3'}
              </div>
              <span className={`text-xs ${i === 2 ? 'text-slate-700 font-semibold' : 'text-emerald-600'}`}>{step}</span>
              {i < 2 && <div className="w-8 h-px bg-slate-200" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-primary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-slate-100 p-10">
        {children}
      </div>
    </div>
  )
}
