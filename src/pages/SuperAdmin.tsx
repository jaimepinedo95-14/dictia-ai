import { useState, useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Building2, CreditCard, TrendingUp, Plus, ArrowLeft, Activity, AlertTriangle, Clock } from 'lucide-react'
import AppShell from '../components/AppShell'
import { useAuth } from '../contexts/AuthContext'
import { fetchAllClinics, fetchCreditHistory, MOCK_CLINICAS, MOCK_CREDIT_TRANSACTIONS } from '../lib/adminDb'
import type { Clinica, CreditTransaction } from '../lib/supabase'

const SUPER_ADMIN_EMAIL = 'jaimepinedo95@gmail.com'

function StatCard({ icon: Icon, label, value, color }: {
  icon: typeof Building2
  label: string
  value: string | number
  color: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      <p className="text-sm text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}

export default function SuperAdmin() {
  const { profile } = useAuth()
  const [clinicas, setClinicas] = useState<Clinica[]>([])
  const [activityLog, setActivityLog] = useState<CreditTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewClinic, setShowNewClinic] = useState(false)
  const [newClinicName, setNewClinicName] = useState('')
  const [newClinicEmail, setNewClinicEmail] = useState('')

  // Only accessible to super admin email
  if (profile && profile.email !== SUPER_ADMIN_EMAIL && profile.role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />
  }

  useEffect(() => {
    async function load() {
      const data = await fetchAllClinics()
      const clinicList = data.length > 0 ? data : MOCK_CLINICAS
      setClinicas(clinicList)
      // Load recent activity from first clinic (aggregated view in production)
      if (clinicList.length > 0) {
        const tx = await fetchCreditHistory(clinicList[0].id)
        setActivityLog(tx.length > 0 ? tx : MOCK_CREDIT_TRANSACTIONS)
      }
      setLoading(false)
    }
    load()
  }, [])

  const totalCredits = clinicas.reduce((sum, c) => sum + c.creditos_totales, 0)
  const totalUsed = clinicas.reduce((sum, c) => sum + (c.creditos_totales - c.creditos_disponibles), 0)
  const lowCreditClinics = clinicas.filter(c => c.creditos_disponibles / c.creditos_totales < 0.2)

  const moduleLabels: Record<string, string> = {
    urgencias: 'Urgencias',
    telemedicina: 'Telemedicina',
    evolucion_hospitalizacion: 'Nota Evolución',
    evolucion_uci: 'Nota UCI',
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Panel Super Admin</h1>
              <p className="text-slate-500 text-sm mt-0.5">Vista global de todas las clínicas e IPS</p>
            </div>
          </div>
          <button
            onClick={() => setShowNewClinic(true)}
            className="btn-primary text-sm"
          >
            <Plus size={15} /> Nueva clínica
          </button>
        </div>

        {/* Global stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Building2} label="Clínicas activas" value={clinicas.filter(c => c.activa).length} color="bg-primary-500" />
          <StatCard icon={CreditCard} label="Créditos vendidos" value={totalCredits.toLocaleString('es-CO')} color="bg-emerald-500" />
          <StatCard icon={Activity} label="HCs generadas" value={totalUsed.toLocaleString('es-CO')} color="bg-blue-500" />
          <StatCard icon={AlertTriangle} label="Créditos bajos" value={lowCreditClinics.length} color="bg-amber-500" />
        </div>

        {/* Low credit alert */}
        {lowCreditClinics.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">Clínicas con créditos bajos (&lt;20%)</p>
              <p className="text-amber-600 text-xs mt-1">
                {lowCreditClinics.map(c => c.nombre).join(' · ')}
              </p>
            </div>
          </div>
        )}

        {/* New clinic form */}
        {showNewClinic && (
          <div className="bg-white rounded-2xl border-2 border-primary-200 p-5 space-y-4">
            <h3 className="font-bold text-slate-900">Nueva clínica / IPS</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Nombre de la institución</label>
                <input
                  type="text"
                  value={newClinicName}
                  onChange={e => setNewClinicName(e.target.value)}
                  className="input-field"
                  placeholder="Ej: Clínica San Rafael"
                />
              </div>
              <div>
                <label className="label">Email del admin de clínica</label>
                <input
                  type="email"
                  value={newClinicEmail}
                  onChange={e => setNewClinicEmail(e.target.value)}
                  className="input-field"
                  placeholder="admin@clinica.com"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  // In production: call createClinica()
                  setShowNewClinic(false)
                  setNewClinicName('')
                  setNewClinicEmail('')
                }}
                className="btn-primary text-sm"
              >
                Crear clínica
              </button>
              <button
                onClick={() => setShowNewClinic(false)}
                className="btn-ghost text-sm border border-slate-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Clinics table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900">Clínicas e IPS ({clinicas.length})</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-slate-400">Cargando...</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {clinicas.map(clinica => {
                const usedPct = clinica.creditos_totales > 0
                  ? ((clinica.creditos_totales - clinica.creditos_disponibles) / clinica.creditos_totales) * 100
                  : 0
                const isLow = clinica.creditos_disponibles / clinica.creditos_totales < 0.2

                return (
                  <div key={clinica.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 size={15} className="text-primary-500 flex-shrink-0" />
                          <span className="font-semibold text-slate-900">{clinica.nombre}</span>
                          {isLow && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                              Créditos bajos
                            </span>
                          )}
                          {!clinica.activa && (
                            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Inactiva</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mb-2">{clinica.email_admin}</p>

                        {/* Credit bar */}
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex-1 bg-slate-100 rounded-full h-2">
                            <div
                              className={`h-full rounded-full transition-all ${isLow ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${usedPct}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-600 whitespace-nowrap font-medium">
                            {(clinica.creditos_totales - clinica.creditos_disponibles).toLocaleString('es-CO')} / {clinica.creditos_totales.toLocaleString('es-CO')} HCs
                          </span>
                        </div>

                        {/* Modules */}
                        <div className="flex flex-wrap gap-1.5">
                          {clinica.modulos_activos.map(m => (
                            <span key={m} className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">
                              {moduleLabels[m] ?? m}
                            </span>
                          ))}
                          {clinica.ips_autorizadas.length > 0 && (
                            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                              🔒 {clinica.ips_autorizadas.length} IP{clinica.ips_autorizadas.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-xl font-black text-slate-900">
                            {clinica.creditos_disponibles.toLocaleString('es-CO')}
                          </p>
                          <p className="text-xs text-slate-400">créditos restantes</p>
                        </div>
                        <Link
                          to={`/admin/clinica?id=${clinica.id}`}
                          className="ml-2 text-xs text-primary-600 hover:text-primary-700 font-medium px-3 py-1.5 rounded-lg hover:bg-primary-50 transition-colors whitespace-nowrap border border-primary-200"
                        >
                          Gestionar →
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Activity log */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Clock size={16} className="text-slate-400" />
            <h2 className="font-bold text-slate-900">Log de actividad reciente</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {activityLog.slice(0, 8).map(tx => (
              <div key={tx.id} className="px-6 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${tx.tipo === 'recarga' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                  <div>
                    <p className="text-sm text-slate-700">{tx.descripcion}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(tx.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-bold ${tx.tipo === 'recarga' ? 'text-emerald-600' : 'text-blue-600'}`}>
                  {tx.tipo === 'recarga' ? '+' : '-'}{tx.creditos.toLocaleString('es-CO')} cr
                </span>
              </div>
            ))}
            {activityLog.length === 0 && (
              <p className="px-6 py-6 text-sm text-slate-400 text-center">Sin actividad registrada</p>
            )}
          </div>
        </div>

        {/* Revenue estimate */}
        <div className="bg-slate-900 text-white rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-primary-400" />
            <h3 className="font-bold">Resumen de ingresos estimados</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'HCs procesadas', value: `${totalUsed.toLocaleString('es-CO')}` },
              { label: 'Ingresos estimados', value: `$${(totalUsed * 350).toLocaleString('es-CO')} COP` },
              { label: 'Tasa de uso promedio', value: `${totalCredits > 0 ? Math.round((totalUsed / totalCredits) * 100) : 0}%` },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-slate-400 text-xs mb-1">{label}</p>
                <p className="text-xl font-black">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
