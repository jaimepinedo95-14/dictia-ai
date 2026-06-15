import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Mic, FileText, CheckCircle, Shield,
  ChevronRight, Play, Zap, Globe, Lock, Users,
  Stethoscope, Baby, Heart, Brain, Activity, Pill,
  Menu, X, ArrowRight, Check, ChevronDown, ChevronUp,
  TrendingUp,
} from 'lucide-react'
import Logo from '../components/Logo'
import { PLANS } from '../lib/mockData'
import { saveDemoRequest } from '../lib/db'

const FEATURES = [
  { icon: FileText, title: 'Historia clínica SOAP', desc: 'Motivo de consulta, examen físico, diagnóstico CIE-10, plan de manejo, medicamentos e instrucciones al paciente. Todo en una nota.' },
  { icon: Activity, title: 'Nota de evolución hospitalaria', desc: 'Para rondas, UCI y hospitalización. Pega las notas previas del paciente y Dictia genera la evolución del día con contexto completo.' },
  { icon: Shield, title: 'Documentación que reduce glosas', desc: 'Notas clínicas que reducen la probabilidad de glosas en auditorías. Menos devoluciones, menos reprocesos.' },
  { icon: Mic, title: 'Graba desde el celular', desc: 'La nota aparece en tu computador en tiempo real. Instala Dictia en tu celular en un tap — gratis.' },
  { icon: Zap, title: 'Silencio inteligente', desc: 'Si llevas 5 minutos sin hablar, la grabación se detiene sola. Sin perder lo que ya grabaste.' },
  { icon: Lock, title: 'Cero datos de pacientes', desc: 'El audio se transcribe en tiempo real y se descarta inmediatamente. Nunca guardamos información de tus pacientes. Cumplimiento Ley 1581 de 2012.' },
]

const SPECIALTIES = [
  { icon: Stethoscope, name: 'Medicina General' },
  { icon: Activity, name: 'Urgencias' },
  { icon: Baby, name: 'Pediatría' },
  { icon: Heart, name: 'Medicina Interna' },
  { icon: Users, name: 'Ginecología' },
  { icon: Zap, name: 'Cirugía' },
  { icon: Brain, name: 'Psiquiatría' },
  { icon: Pill, name: 'Medicina Familiar' },
]

const STATS_DATA = [
  { value: '4-8 min', label: 'perdidos por consulta solo en documentación*' },
  { value: '2+ horas', label: 'de papeleo al día con 20 pacientes' },
  { value: '0 datos', label: 'de pacientes almacenados. Nunca.' },
]


const FAQ_ITEMS = [
  {
    q: '¿Mis datos de pacientes están seguros?',
    a: 'Dictia no guarda ningún dato de tus pacientes. El audio se transcribe en tiempo real y se descarta inmediatamente. Nunca pasa por nuestros servidores de almacenamiento. Cumplimos la Ley 1581 de 2012 (Colombia) y las leyes equivalentes de protección de datos en México, Argentina, Chile, Brasil y Perú.',
  },
  {
    q: '¿Necesito descargar algo?',
    a: 'No. Dictia funciona desde cualquier navegador en computador o celular. Si quieres instalarlo como app en tu celular, puedes hacerlo en un tap desde el navegador — gratis.',
  },
  {
    q: '¿Funciona para hospitalización y urgencias?',
    a: 'Sí. Dictia tiene nota de evolución hospitalaria con contexto de notas previas, nota de ingreso por traslado desde cualquier servicio o institución, y nota de devolución de turno. También funciona para consulta ambulatoria, teleconsulta y urgencias.',
  },
  {
    q: '¿Cómo funciona la prueba gratuita?',
    a: 'Recibes 10 historias clínicas completamente gratis para probar Dictia. Se requiere registrar una tarjeta de crédito para activar la prueba — no se realiza ningún cobro hasta que uses tus 10 notas gratuitas y decidas continuar con un plan de pago.',
  },
  {
    q: '¿Puedo cancelar en cualquier momento?',
    a: 'Sí, sin penalización. Tienes 10 notas gratuitas para probar Dictia. Si cancelas antes de agotar las 10 notas, no se te cobra nada.',
  },
  {
    q: '¿Funciona con cualquier especialidad?',
    a: 'Sí. Dictia aprende el estilo de cada médico con el tiempo y se adapta al vocabulario de cada especialidad.',
  },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`border rounded-2xl overflow-hidden transition-colors ${open ? 'border-primary-200 bg-primary-50/30' : 'border-slate-100 bg-white'}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span className="font-semibold text-slate-900 text-sm leading-snug">{q}</span>
        <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${open ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-400'}`}>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>
      {open && (
        <div className="px-6 pb-5 -mt-1">
          <p className="text-sm text-slate-600 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  )
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const [showDemoModal, setShowDemoModal] = useState(false)
  const [demoForm, setDemoForm] = useState({ nombre: '', institucion: '', ciudad: '', medicos: '', whatsapp: '' })
  const [demoSubmitting, setDemoSubmitting] = useState(false)
  const [demoSuccess, setDemoSuccess] = useState(false)
  const [cookieBannerDismissed, setCookieBannerDismissed] = useState(
    () => localStorage.getItem('dictia_cookies_accepted') === '1'
  )

  function dismissCookieBanner() {
    localStorage.setItem('dictia_cookies_accepted', '1')
    setCookieBannerDismissed(true)
  }

  async function handleDemoSubmit(e: React.FormEvent) {
    e.preventDefault()
    setDemoSubmitting(true)
    await saveDemoRequest({
      nombre_completo: demoForm.nombre,
      nombre_institucion: `${demoForm.institucion} — ${demoForm.ciudad}`,
      email_institucional: demoForm.whatsapp,
      numero_medicos: demoForm.medicos ? parseInt(demoForm.medicos) : null,
      telefono: demoForm.ciudad,
    })
    setDemoSubmitting(false)
    setDemoSuccess(true)
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">

      {/* ── COOKIE BANNER ── */}
      {!cookieBannerDismissed && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-800 px-4 py-3 sm:py-4">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
            <p className="text-xs text-slate-400 leading-relaxed">
              Usamos cookies esenciales para el funcionamiento de la plataforma.{' '}
              <Link to="/privacidad#cookies" className="text-primary-400 underline hover:text-primary-300">Ver política de privacidad</Link>.
            </p>
            <button
              onClick={dismissCookieBanner}
              className="flex-shrink-0 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-900 px-4 py-2 rounded-lg transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo size="md" />
            <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-500">
              <a href="#como-funciona" className="hover:text-slate-900 transition-colors">Cómo funciona</a>
              <a href="#por-que-dictia" className="hover:text-slate-900 transition-colors">¿Por qué Dictia?</a>
              <a href="#precios" className="hover:text-slate-900 transition-colors">Precios</a>
              <a href="#faq" className="hover:text-slate-900 transition-colors">FAQ</a>
            </nav>
            <div className="hidden md:flex items-center gap-2">
              <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg transition-colors">
                Iniciar sesión
              </Link>
              <Link to="/registro" className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
                Prueba gratis <ArrowRight size={14} />
              </Link>
            </div>
            {/* Mobile: CTAs always visible + hamburger for nav links */}
            <div className="md:hidden flex items-center gap-2">
              <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-1">
                Iniciar sesión
              </Link>
              <Link to="/registro" className="inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors whitespace-nowrap">
                Prueba gratis
              </Link>
              <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-1">
            {['#como-funciona', '#por-que-dictia', '#precios', '#faq'].map((href, i) => (
              <a key={href} href={href} onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-xl transition-colors">
                {['Cómo funciona', '¿Por qué Dictia?', 'Precios', 'FAQ'][i]}
              </a>
            ))}
          </div>
        )}
      </header>

      {/* ── HERO ── */}
      <section className="pt-32 pb-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">

          <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 text-slate-600 text-xs font-semibold px-4 py-2 rounded-full mb-10">
            <Globe size={12} className="text-primary-600" />
            Para médicos latinoamericanos
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-[80px] font-black text-slate-900 leading-[1.05] tracking-tight mb-7">
            Tu consulta,<br />
            <span className="text-primary-600">documentada</span><br />
            en segundos.
          </h1>

          <p className="text-xl text-slate-500 leading-relaxed max-w-2xl mx-auto mb-10">
            Los médicos pierden entre 4 y 8 minutos escribiendo cada nota clínica. Con 20 pacientes al día, son más de 2 horas de papeleo. Dictia las elimina.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-14">
            <Link to="/registro" className="inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold px-8 py-4 rounded-2xl text-base transition-colors shadow-lg shadow-primary-200">
              Empieza gratis — 10 notas de prueba gratis <ArrowRight size={18} />
            </Link>
            <a href="#como-funciona" className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold px-8 py-4 rounded-2xl text-base transition-colors">
              <Play size={16} className="text-primary-600" />
              Ver cómo funciona
            </a>
          </div>

          {/* Trust row */}
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-400">
            <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-emerald-500" /> Sin compromisos</span>
            <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-emerald-500" /> Cancela cuando quieras</span>
            <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-emerald-500" /> Cero datos de pacientes guardados</span>
          </div>

        </div>
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section id="como-funciona" className="py-28 bg-slate-50/60 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <p className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-4">Proceso</p>
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-5">Así de simple</h2>
            <p className="text-lg text-slate-500 max-w-lg mx-auto">
              Sin cambiar tu flujo de trabajo. Sin aprender nuevos sistemas.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-10 left-[calc(33%+2rem)] right-[calc(33%+2rem)] h-px bg-slate-200" />

            {[
              {
                step: '01',
                icon: Mic,
                title: 'Graba',
                desc: 'Abre Dictia y presiona grabar. Habla con tu paciente como siempre. Sin cambiar nada de tu consulta.',
                color: 'text-primary-600',
                bg: 'bg-primary-50',
              },
              {
                step: '02',
                icon: Zap,
                title: 'Escucha',
                desc: 'Dictia transcribe la consulta en tiempo real, entiende el contexto clínico y aplica los estándares de documentación clínica.',
                color: 'text-violet-600',
                bg: 'bg-violet-50',
              },
              {
                step: '03',
                icon: CheckCircle,
                title: 'Listo',
                desc: 'En segundos tienes la historia clínica completa. Lista para revisar, ajustar y pegar donde la necesites.',
                color: 'text-emerald-600',
                bg: 'bg-emerald-50',
              },
            ].map(({ step, icon: Icon, title, desc, color, bg }) => (
              <div key={step} className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative">
                <div className="flex items-center justify-between mb-6">
                  <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center`}>
                    <Icon size={22} className={color} />
                  </div>
                  <span className="text-5xl font-black text-slate-50 select-none leading-none">{step}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
                <p className="text-slate-500 leading-relaxed text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── IMPACTO ── */}
      <section id="por-que-dictia" className="py-28 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-6">El problema</p>
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-8 leading-tight">
            El tiempo que pierdes documentando<br />es tiempo que le quitas a tus pacientes
          </h2>
          <p className="text-lg text-slate-500 leading-relaxed max-w-3xl mx-auto mb-10">
            Los médicos pierden 16 minutos por paciente solo en documentación. Dictia los elimina.
          </p>
          <div className="flex flex-col items-center gap-6">
            <div className="bg-primary-600 rounded-3xl p-7 inline-block w-full max-w-[300px]">
              <p className="text-6xl font-black text-white mb-2 tracking-tight">16 min</p>
              <p className="text-primary-200 text-sm leading-relaxed">
                es el tiempo promedio de una consulta médica. Entre 4 y 8 de esos minutos se van solo en escribir la nota.
              </p>
            </div>
            <Link to="/registro" className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold px-8 py-4 rounded-2xl text-base transition-colors shadow-lg shadow-primary-200">
              Recupera tu tiempo hoy <ArrowRight size={18} />
            </Link>
          </div>
          <p className="mt-8 text-slate-400 text-xs leading-relaxed">
            Fuentes: Overhage et al., Annals of Internal Medicine, 2020. Romano et al., PMC, 2021.
          </p>
        </div>
      </section>

      {/* ── FUNCIONALIDADES ── */}
      <section id="funcionalidades" className="py-28 bg-slate-50/60 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-4">Funcionalidades</p>
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-5">Todo lo que necesitas,<br />nada de lo que no.</h2>
            <p className="text-lg text-slate-500 max-w-lg mx-auto">
              Diseñado con médicos latinoamericanos para su consulta diaria.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="group bg-white rounded-2xl p-7 border border-slate-100 shadow-sm hover:border-primary-200 hover:shadow-md transition-all duration-200">
                <div className="w-11 h-11 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center mb-5 group-hover:bg-primary-100 transition-colors">
                  <Icon size={20} className="text-primary-600" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2 text-base">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ESPECIALIDADES ── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-slate-900 mb-3">Para todas las especialidades</h2>
            <p className="text-slate-500 text-sm">Prompts especializados que adaptan la nota al lenguaje de cada especialidad</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {SPECIALTIES.map(({ icon: Icon, name }) => (
              <div key={name} className="group flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-slate-50 hover:bg-primary-50 border border-slate-100 hover:border-primary-100 transition-all duration-200">
                <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 group-hover:border-primary-100 flex items-center justify-center flex-shrink-0 transition-colors">
                  <Icon size={15} className="text-primary-600" />
                </div>
                <span className="text-sm font-semibold text-slate-700">{name}</span>
              </div>
            ))}
            <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
              <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center flex-shrink-0">
                <ChevronRight size={14} className="text-slate-300" />
              </div>
              <span className="text-sm font-medium text-slate-400">Y muchas más</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── ESTADÍSTICAS ── */}
      <section className="py-24 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">El impacto es real</h2>
            <p className="text-slate-400 text-lg">Datos de médicos que ya usan Dictia AI en su práctica diaria</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {STATS_DATA.map(({ value, label }) => (
              <div key={value} className="bg-white/[0.07] border border-white/[0.12] rounded-2xl p-8 hover:bg-white/10 transition-colors">
                <div className="text-5xl lg:text-6xl font-black text-white mb-4 tracking-tight">{value}</div>
                <p className="text-slate-300 text-sm leading-relaxed">{label}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-slate-600 text-xs mt-10 max-w-xl mx-auto leading-relaxed">
            *Basado en estudios publicados en PubMed sobre tiempo de documentación clínica en médicos de atención primaria e interna. (Rotenstein et al., JAMA Network Open, 2023)
          </p>
        </div>
      </section>

      {/* ── PRECIOS ── */}
      <section id="precios" className="py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-4">Precios</p>
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-5">Planes simples, sin letra pequeña</h2>
            <p className="text-lg text-slate-500 mb-8">10 notas gratis para probar. Requiere tarjeta de crédito. Sin cobro hasta agotar las 10 notas.</p>

            <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  billingCycle === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Mensual
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                  billingCycle === 'annual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Anual
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">-20%</span>
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {PLANS.map((plan) => {
              const displayPrice = billingCycle === 'annual' && plan.price > 0
                ? Math.round(plan.price * 0.8)
                : plan.price
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-3xl p-6 flex flex-col ${
                    plan.highlight
                      ? 'bg-primary-600 text-white shadow-xl shadow-primary-200 scale-[1.02]'
                      : 'bg-white border border-slate-100 shadow-sm'
                  }`}
                >
                  {plan.badge && (
                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${
                      plan.highlight ? 'bg-amber-400 text-amber-900' : 'bg-slate-900 text-white'
                    }`}>
                      {plan.badge}
                    </div>
                  )}
                  <div className="mb-4">
                    <h3 className={`font-bold text-lg mb-1 ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>
                      {plan.name}
                    </h3>
                    {plan.price === 0 ? (
                      <div className={`text-3xl font-black ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>Gratis</div>
                    ) : (
                      <div>
                        <span className={`text-3xl font-black ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>
                          ${displayPrice.toLocaleString('es-CO')}
                        </span>
                        <span className={`text-sm ml-1 ${plan.highlight ? 'text-primary-200' : 'text-slate-400'}`}>COP/mes</span>
                        {billingCycle === 'annual' && plan.price > 0 && (
                          <>
                            <p className={`text-xs mt-0.5 ${plan.highlight ? 'text-primary-200' : 'text-emerald-600'}`}>
                              Total anual ${Math.round(plan.price * 0.8 * 12).toLocaleString('es-CO')} COP
                            </p>
                            <span className={`inline-block text-xs font-bold mt-1 px-2 py-0.5 rounded-full ${plan.highlight ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                              Ahorras 2 meses
                            </span>
                          </>
                        )}
                      </div>
                    )}
                    <p className={`text-sm mt-1 ${plan.highlight ? 'text-primary-200' : 'text-slate-500'}`}>
                      {typeof plan.consultations === 'number' ? `${plan.consultations} consultas` : plan.consultations}
                      {plan.price === 0 ? ' · prueba gratuita' : '/mes'}
                    </p>
                  </div>
                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check size={13} className={`mt-0.5 flex-shrink-0 ${plan.highlight ? 'text-primary-200' : 'text-primary-600'}`} />
                        <span className={plan.highlight ? 'text-primary-100' : 'text-slate-600'}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/registro"
                    className={`text-center text-sm font-bold py-2.5 px-4 rounded-xl transition-all duration-200 ${
                      plan.highlight
                        ? 'bg-white text-primary-700 hover:bg-primary-50'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              )
            })}
          </div>
          <p className="text-center text-slate-500 text-sm mt-10">
            ¿Eres una clínica u hospital? Tenemos planes B2B por historia clínica generada, con panel administrativo y control por sede.{' '}
            <button onClick={() => { setShowDemoModal(true); setDemoSuccess(false) }} className="text-primary-600 hover:underline font-semibold">
              Solicitar información B2B →
            </button>
          </p>
        </div>
      </section>

      {/* ── SEGURIDAD ── */}
      <section id="seguridad" className="py-28 bg-slate-50/60 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <p className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-4">Privacidad</p>
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-5">Privacidad por diseño,<br />no por promesa.</h2>
            <p className="text-lg text-slate-500">
              Los datos de tus pacientes nunca salen de tu pantalla. Dictia no los almacena, procesa ni retiene.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 max-w-3xl mx-auto">
            {[
              { icon: Lock, title: 'Audio eliminado automáticamente', desc: 'El audio de la consulta se borra permanentemente una vez que se completa la transcripción. Nunca almacenamos grabaciones.' },
              { icon: Shield, title: 'Cero datos clínicos almacenados', desc: 'La transcripción y la nota generada nunca llegan a nuestros servidores. Solo guardamos datos del médico para gestionar su cuenta.' },
              { icon: Globe, title: 'Cumple regulaciones locales', desc: 'Diseñado para cumplir con las leyes de protección de datos de Colombia, México, Argentina, Chile y más países.' },
              { icon: CheckCircle, title: 'El médico siempre aprueba', desc: 'Ninguna nota se guarda sin tu revisión y aprobación explícita. Tú tienes el control total en todo momento.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4 p-6 bg-white rounded-2xl border border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className="text-primary-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1 text-sm">{title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-28 bg-slate-50/60 border-y border-slate-100">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-4">FAQ</p>
            <h2 className="text-4xl font-black text-slate-900 mb-4">Todo lo que necesitas saber</h2>
            <p className="text-slate-500 text-sm">¿Tienes más preguntas? Escríbenos a <a href="mailto:hola@dictia.health" className="text-primary-600 hover:underline">hola@dictia.health</a></p>
          </div>
          <div className="space-y-2">
            {FAQ_ITEMS.map(({ q, a }) => (
              <FaqItem key={q} q={q} a={a} />
            ))}
          </div>
          <div className="mt-10 text-center">
            <p className="text-slate-400 text-sm mb-4">¿No encontraste lo que buscabas?</p>
            <a href="mailto:hola@dictia.health" className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-colors">
              Contáctanos <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-28 bg-[#0F172A]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-5xl sm:text-6xl font-black text-white mb-6 leading-tight tracking-tight">
            Empieza hoy. Tus primeras<br />10 notas son gratis.
          </h2>
          <p className="text-slate-400 text-lg mb-10 leading-relaxed">
            Únete a los médicos que ya dejaron de perder<br />horas al día escribiendo notas clínicas.
          </p>
          <Link to="/registro" className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-bold px-10 py-4 rounded-2xl text-lg transition-colors shadow-xl shadow-primary-900/30">
            Crear cuenta gratis <ArrowRight size={20} />
          </Link>
          <p className="mt-5 text-slate-600 text-sm">10 notas de prueba · Sin compromisos · Cancela cuando quieras</p>
        </div>
      </section>

      {/* ── B2B / CLÍNICAS ── */}
      <section id="clinicas" className="py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold tracking-widest uppercase text-primary-400 mb-4 bg-primary-500/10 px-4 py-1.5 rounded-full border border-primary-500/20">
              Para instituciones
            </span>
            <h2 className="text-4xl font-black text-white mb-4">Solución para clínicas y hospitales</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Paga solo por las historias clínicas generadas. Sin usuarios inactivos, sin costos fijos innecesarios.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mb-14">
            {[
              { icon: '🏥', title: 'Control total', desc: 'Panel jerárquico con Super Admin, Admin por sede y médicos asignados. Tú decides quién accede y desde dónde.' },
              { icon: '💳', title: 'Precio justo', desc: 'Modelo por historia clínica generada. No pagas por médicos que no están atendiendo.' },
              { icon: '🔒', title: 'Seguridad por sede', desc: 'Restricción por IP por sede física. Solo accede el médico que está en tu clínica.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700/60 hover:border-slate-600 transition-colors">
                <span className="text-2xl mb-3 block">{icon}</span>
                <h3 className="font-bold text-white mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={() => { setShowDemoModal(true); setDemoSuccess(false) }}
              className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-bold px-8 py-4 rounded-2xl text-lg transition-all hover:shadow-lg hover:shadow-primary-500/20"
            >
              Solicitar demo para mi institución <ArrowRight size={18} />
            </button>
            <p className="text-slate-500 text-sm mt-3">Respondemos en menos de 24 horas · Sin compromiso</p>
          </div>
        </div>
      </section>

      {/* ── DEMO MODAL ── */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowDemoModal(false)}>
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 z-10"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowDemoModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={18} />
            </button>

            {demoSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">¡Solicitud recibida!</h3>
                <p className="text-slate-500">Gracias. Le contactaremos en menos de 24 horas.</p>
                <button
                  onClick={() => setShowDemoModal(false)}
                  className="mt-6 inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h3 className="text-2xl font-black text-slate-900">Solicitar información</h3>
                  <p className="text-slate-500 text-sm mt-1">Te contactaremos en menos de 24 horas.</p>
                </div>
                <form onSubmit={handleDemoSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Nombre completo</label>
                      <input
                        type="text"
                        value={demoForm.nombre}
                        onChange={e => setDemoForm(p => ({ ...p, nombre: e.target.value }))}
                        placeholder="Dr. Juan Pérez"
                        className="input-field"
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Clínica u hospital</label>
                      <input
                        type="text"
                        value={demoForm.institucion}
                        onChange={e => setDemoForm(p => ({ ...p, institucion: e.target.value }))}
                        placeholder="Clínica San Rafael"
                        className="input-field"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Ciudad y país</label>
                      <input
                        type="text"
                        value={demoForm.ciudad}
                        onChange={e => setDemoForm(p => ({ ...p, ciudad: e.target.value }))}
                        placeholder="Bogotá, Colombia"
                        className="input-field"
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Número aproximado de médicos</label>
                      <select
                        value={demoForm.medicos}
                        onChange={e => setDemoForm(p => ({ ...p, medicos: e.target.value }))}
                        className="input-field"
                        required
                      >
                        <option value="">Seleccionar</option>
                        <option value="5">1–10 médicos</option>
                        <option value="20">11–30 médicos</option>
                        <option value="65">31–100 médicos</option>
                        <option value="150">Más de 100</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="label">WhatsApp o email de contacto</label>
                    <input
                      type="text"
                      value={demoForm.whatsapp}
                      onChange={e => setDemoForm(p => ({ ...p, whatsapp: e.target.value }))}
                      placeholder="+57 300 000 0000 o admin@clinica.com"
                      className="input-field"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={demoSubmitting}
                    className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold py-3.5 rounded-2xl text-sm transition-colors mt-2 disabled:opacity-60"
                  >
                    {demoSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>Solicitar información <ArrowRight size={16} /></>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer className="bg-slate-950 text-slate-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
            <div className="lg:col-span-2">
              <Logo variant="light" size="md" />
              <p className="mt-4 text-sm leading-relaxed text-slate-500 max-w-xs">
                El primer escriba médico con IA para América Latina. Diseñado por y para médicos que quieren enfocarse en sus pacientes, no en el papeleo.
              </p>
              <div className="flex items-center gap-2 mt-5">
                {['CO', 'MX', 'AR', 'CL'].map(c => (
                  <span key={c} className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-md font-mono">{c}</span>
                ))}
                <span className="text-xs text-slate-700">y más países</span>
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">Producto</h4>
              <ul className="space-y-2.5 text-sm">
                {[['#como-funciona', 'Cómo funciona'], ['#funcionalidades', 'Funcionalidades'], ['#precios', 'Precios'], ['#seguridad', 'Seguridad'], ['#faq', 'FAQ']].map(([href, label]) => (
                  <li key={label}><a href={href} className="hover:text-white transition-colors">{label}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">Especialidades</h4>
              <ul className="space-y-2.5 text-sm">
                {['Medicina General', 'Urgencias', 'Pediatría', 'Medicina Interna', 'Ginecología'].map(sp => (
                  <li key={sp}><a href="#" className="hover:text-white transition-colors">{sp}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">Legal</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/terminos" className="hover:text-white transition-colors">Términos de servicio</Link></li>
                <li><Link to="/privacidad" className="hover:text-white transition-colors">Política de privacidad</Link></li>
                <li><Link to="/privacidad" className="hover:text-white transition-colors">Política de datos médicos</Link></li>
                <li><Link to="/privacidad#cookies" className="hover:text-white transition-colors">Cookies</Link></li>
              </ul>
              <div className="mt-6">
                <h4 className="text-white font-semibold mb-3 text-sm">Contacto</h4>
                <a href="mailto:hola@dictia.health" className="text-sm hover:text-white transition-colors">hola@dictia.health</a>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <p className="text-sm text-slate-600">© 2025 Dictia AI. Todos los derechos reservados.</p>
              <div className="flex items-center gap-1">
                <TrendingUp size={11} className="text-emerald-600" />
                <span className="text-xs text-emerald-700 font-medium">Disponible 24/7</span>
              </div>
            </div>
            <p className="text-sm text-slate-700">Hecho con ❤️ para los médicos de América Latina</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
