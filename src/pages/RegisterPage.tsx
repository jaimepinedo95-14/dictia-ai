import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, AlertCircle, CheckSquare, Square } from 'lucide-react'
import Logo from '../components/Logo'
import { useAuth } from '../contexts/AuthContext'
import { COUNTRIES, SPECIALTIES } from '../lib/mockData'

const TERMS_VERSION = 'v1.0-2025'

export default function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    country: '',
    specialty: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedResponsibility, setAcceptedResponsibility] = useState(false)

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const { fullName, email, password, country, specialty } = form

    if (!fullName || !email || !password || !country || !specialty) {
      setError('Por favor completa todos los campos.')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (!acceptedTerms || !acceptedResponsibility) {
      setError('Debes aceptar los términos y confirmar tu responsabilidad como tratante de datos.')
      return
    }

    setLoading(true)
    setError('')

    const { error: authError } = await signUp(email, password, {
      full_name: fullName,
      country,
      specialty,
      accepted_terms_at: new Date().toISOString(),
      accepted_terms_version: TERMS_VERSION,
    })

    if (authError) {
      setError('Error al crear la cuenta. Intenta de nuevo.')
      setLoading(false)
    } else {
      navigate('/onboarding/plan')
    }
  }

  const passwordStrength = form.password.length === 0 ? 0
    : form.password.length < 6 ? 1
    : form.password.length < 10 ? 2
    : 3

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-primary-50 flex flex-col items-center justify-center p-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-6">
            <Logo size="lg" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Crea tu cuenta</h1>
          <p className="text-sm text-slate-500 mt-2">
            Elige tu plan y registra tu tarjeta en el siguiente paso
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-sm">
                <AlertCircle size={16} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="label" htmlFor="fullName">Nombre completo</label>
              <input
                id="fullName"
                type="text"
                value={form.fullName}
                onChange={e => update('fullName', e.target.value)}
                placeholder="Dr. Juan García"
                className="input-field"
                autoComplete="name"
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={e => update('email', e.target.value)}
                placeholder="tu@correo.com"
                className="input-field"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="password">Contraseña</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => update('password', e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="input-field pr-12"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {form.password.length > 0 && (
                <div className="flex gap-1.5 mt-2">
                  {[1, 2, 3].map(level => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        passwordStrength >= level
                          ? level === 1 ? 'bg-red-400' : level === 2 ? 'bg-amber-400' : 'bg-emerald-400'
                          : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="label" htmlFor="country">País</label>
              <select
                id="country"
                value={form.country}
                onChange={e => update('country', e.target.value)}
                className="input-field"
                required
              >
                <option value="">Selecciona tu país</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="specialty">Especialidad médica</label>
              <select
                id="specialty"
                value={form.specialty}
                onChange={e => update('specialty', e.target.value)}
                className="input-field"
                required
              >
                <option value="">Selecciona tu especialidad</option>
                {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Consentimientos */}
            <div className="space-y-3 pt-1">
              <button
                type="button"
                onClick={() => setAcceptedTerms(v => !v)}
                className="flex items-start gap-3 text-left w-full group"
              >
                <span className={`flex-shrink-0 mt-0.5 transition-colors ${acceptedTerms ? 'text-primary-600' : 'text-slate-300 group-hover:text-slate-400'}`}>
                  {acceptedTerms ? <CheckSquare size={18} /> : <Square size={18} />}
                </span>
                <span className="text-xs text-slate-600 leading-relaxed">
                  He leído y acepto los{' '}
                  <Link to="/terminos" target="_blank" className="text-primary-600 underline hover:text-primary-700" onClick={e => e.stopPropagation()}>Términos de Uso</Link>
                  {' '}y la{' '}
                  <Link to="/privacidad" target="_blank" className="text-primary-600 underline hover:text-primary-700" onClick={e => e.stopPropagation()}>Política de Privacidad</Link>
                  {' '}de Dictia AI.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAcceptedResponsibility(v => !v)}
                className="flex items-start gap-3 text-left w-full group"
              >
                <span className={`flex-shrink-0 mt-0.5 transition-colors ${acceptedResponsibility ? 'text-primary-600' : 'text-slate-300 group-hover:text-slate-400'}`}>
                  {acceptedResponsibility ? <CheckSquare size={18} /> : <Square size={18} />}
                </span>
                <span className="text-xs text-slate-600 leading-relaxed">
                  Entiendo que soy el <strong>responsable del tratamiento</strong> de datos de mis pacientes y que debo contar con su consentimiento informado para el uso de herramientas de documentación.
                </span>
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || !acceptedTerms || !acceptedResponsibility}
              className="btn-primary w-full justify-center py-3.5 text-base mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>Continuar <ArrowRight size={18} /></>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-700">
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 justify-center mt-6">
          {['Cuenta', 'Plan', 'Tarjeta'].map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                i === 0 ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-400'
              }`}>
                {i + 1}
              </div>
              <span className={`text-xs ${i === 0 ? 'text-slate-700 font-semibold' : 'text-slate-400'}`}>{step}</span>
              {i < 2 && <div className="w-8 h-px bg-slate-200" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
