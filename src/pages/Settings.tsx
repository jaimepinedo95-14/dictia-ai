import { useState } from 'react'
import { Save, User, Lock, Bell } from 'lucide-react'
import AppShell from '../components/AppShell'
import { useAuth } from '../contexts/AuthContext'
import { COUNTRIES, SPECIALTIES } from '../lib/mockData'

type Tab = 'profile' | 'security' | 'preferences'

export default function Settings() {
  const { profile, updateProfile } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [saved, setSaved] = useState(false)
  const [prefSaved, setPrefSaved] = useState(false)
  const [form, setForm] = useState({
    fullName: profile?.full_name ?? '',
    country: profile?.country ?? '',
    specialty: profile?.specialty ?? '',
    docStyle: 'soap_standard',
    noteStyle: profile?.note_style ?? 'lowercase',
  })

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    await updateProfile({ full_name: form.fullName, country: form.country, specialty: form.specialty })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleSavePreferences() {
    await updateProfile({ note_style: form.noteStyle as 'uppercase' | 'lowercase' })
    setPrefSaved(true)
    setTimeout(() => setPrefSaved(false), 2000)
  }

  const tabs: { id: Tab; label: string; icon: typeof User }[] = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'security', label: 'Seguridad', icon: Lock },
    { id: 'preferences', label: 'Preferencias', icon: Bell },
  ]

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
          <p className="text-slate-500 text-sm mt-1">Administra tu cuenta y preferencias</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* Profile tab */}
        {activeTab === 'profile' && (
          <div className="card space-y-5">
            <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
              <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary-700">
                  {profile?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{profile?.full_name}</h3>
                <p className="text-sm text-slate-500">{profile?.email}</p>
                <p className="text-xs text-primary-600 font-medium mt-0.5 capitalize">
                  {profile?.plan === 'free_trial' ? 'Período de prueba' : `Plan ${profile?.plan}`}
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Nombre completo</label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={e => update('fullName', e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="label">País</label>
                <select
                  value={form.country}
                  onChange={e => update('country', e.target.value)}
                  className="input-field"
                >
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="label">Especialidad</label>
                <select
                  value={form.specialty}
                  onChange={e => update('specialty', e.target.value)}
                  className="input-field"
                >
                  {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <button
              onClick={handleSave}
              className={`btn-primary ${saved ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
            >
              <Save size={16} />
              {saved ? '¡Guardado!' : 'Guardar cambios'}
            </button>
          </div>
        )}

        {/* Security tab */}
        {activeTab === 'security' && (
          <div className="card space-y-5">
            <h3 className="font-bold text-slate-900">Cambiar contraseña</h3>
            <div>
              <label className="label">Contraseña actual</label>
              <input type="password" placeholder="••••••••" className="input-field" />
            </div>
            <div>
              <label className="label">Nueva contraseña</label>
              <input type="password" placeholder="Mínimo 8 caracteres" className="input-field" />
            </div>
            <div>
              <label className="label">Confirmar nueva contraseña</label>
              <input type="password" placeholder="Repite la contraseña" className="input-field" />
            </div>
            <button className="btn-primary">
              <Lock size={16} /> Cambiar contraseña
            </button>
          </div>
        )}

        {/* Preferences tab */}
        {activeTab === 'preferences' && (
          <div className="card space-y-8">

            {/* Formato del texto de las notas */}
            <div>
              <h3 className="font-bold text-slate-900 mb-1">Formato del texto de las notas</h3>
              <p className="text-sm text-slate-500 mb-4">
                Se aplica automáticamente a todas tus notas al momento de generarlas.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => update('noteStyle', 'uppercase')}
                  className={`flex-1 py-4 px-5 rounded-xl border-2 font-bold text-sm transition-all ${
                    form.noteStyle === 'uppercase'
                      ? 'border-primary-500 bg-primary-600 text-white shadow-md'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'
                  }`}
                >
                  <span className="block text-lg mb-1">AA</span>
                  MAYÚSCULAS
                  <span className="block text-xs font-normal mt-1 opacity-75">Toda la nota en MAYÚSCULAS</span>
                </button>
                <button
                  type="button"
                  onClick={() => update('noteStyle', 'lowercase')}
                  className={`flex-1 py-4 px-5 rounded-xl border-2 font-bold text-sm transition-all ${
                    form.noteStyle === 'lowercase'
                      ? 'border-primary-500 bg-primary-600 text-white shadow-md'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'
                  }`}
                >
                  <span className="block text-lg mb-1">aa</span>
                  minúsculas
                  <span className="block text-xs font-normal mt-1 opacity-75">Toda la nota en minúsculas</span>
                </button>
              </div>
              {form.noteStyle && (
                <p className="text-xs text-slate-400 mt-3">
                  Dictia generará tus notas en <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                    {form.noteStyle === 'uppercase'
                      ? '"Genera toda la respuesta JSON en MAYÚSCULAS. Sin excepción."'
                      : '"Genera toda la respuesta JSON en minúsculas. Sin excepción."'}
                  </span>
                </p>
              )}
            </div>

            {/* Estilo de documentación */}
            <div>
              <h3 className="font-bold text-slate-900 mb-1">Estructura de la historia clínica</h3>
              <p className="text-sm text-slate-500 mb-4">Define cómo se organizan las secciones de tu nota médica</p>
              <div className="space-y-3">
                {[
                  { value: 'soap_standard', label: 'SOAP estándar', desc: 'Subjetivo, Objetivo, Análisis, Plan — formato internacional' },
                  { value: 'soap_extended', label: 'SOAP extendido', desc: 'Incluye antecedentes detallados y revisión por sistemas' },
                  { value: 'narrative', label: 'Narrativo', desc: 'Texto libre estructurado, más natural y menos rígido' },
                ].map(({ value, label, desc }) => (
                  <label
                    key={value}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      form.docStyle === value ? 'border-primary-400 bg-primary-50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="docStyle"
                      value={value}
                      checked={form.docStyle === value}
                      onChange={e => update('docStyle', e.target.value)}
                      className="mt-0.5 accent-primary-600"
                    />
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Notificaciones */}
            <div>
              <h3 className="font-bold text-slate-900 mb-4">Notificaciones</h3>
              <div className="space-y-3">
                {[
                  { label: 'Resumen diario de consultas', sublabel: 'Recibe un resumen al final del día' },
                  { label: 'Alertas de límite de consultas', sublabel: 'Cuando queden menos del 20% de consultas' },
                  { label: 'Actualizaciones del producto', sublabel: 'Novedades y mejoras de Dictia AI' },
                ].map(({ label, sublabel }) => (
                  <div key={label} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{sublabel}</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-200 peer-checked:bg-primary-600 rounded-full transition-colors peer-checked:after:translate-x-5 after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm" />
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleSavePreferences}
              className={`btn-primary ${prefSaved ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
            >
              <Save size={16} />
              {prefSaved ? '¡Preferencias guardadas!' : 'Guardar preferencias'}
            </button>
          </div>
        )}
      </div>
    </AppShell>
  )
}
