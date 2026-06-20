import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, Users, CreditCard, Shield, Layers, Settings, Plus,
  Trash2, X, CheckCircle, AlertTriangle, Building2, BarChart2, Wifi, Download,
} from 'lucide-react'
import AppShell from '../components/AppShell'
import {
  fetchClinicById, fetchClinicDoctors, fetchCreditHistory,
  updateClinicIps, updateClinicModules, getCurrentIp,
} from '../lib/adminDb'
import type { Clinica, ClinicUser, CreditTransaction } from '../lib/supabase'

type Tab = 'overview' | 'doctors' | 'modules' | 'ips' | 'credits' | 'reportes'

const MODULE_OPTIONS = [
  { id: 'urgencias', label: 'Urgencias', desc: 'Historia clínica de urgencias — siempre activo', locked: true },
  { id: 'telemedicina', label: 'Telemedicina', desc: 'Consultas virtuales con audio del sistema', locked: false },
  { id: 'evolucion_hospitalizacion', label: 'Nota de evolución — Hospitalización', desc: 'Notas diarias de pacientes hospitalizados', locked: false },
  { id: 'evolucion_uci', label: 'Nota de evolución — UCI', desc: 'Notas intensivas para pacientes en UCI', locked: false },
]

const CREDIT_PACKAGES = [
  { hcs: 1000, price: 350000, label: '1,000 HCs', priceLabel: '$350,000 COP', pricePer: '$350/HC' },
  { hcs: 5000, price: 1750000, label: '5,000 HCs', priceLabel: '$1,750,000 COP', pricePer: '$350/HC', badge: 'Más económico' },
  { hcs: 10000, price: 3500000, label: '10,000 HCs', priceLabel: '$3,500,000 COP', pricePer: '$350/HC', badge: 'Mejor valor' },
]

export default function ClinicAdmin() {
  const [searchParams] = useSearchParams()
  const clinicaId = searchParams.get('id') ?? ''
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [clinica, setClinica] = useState<Clinica | null>(null)
  const [doctors, setDoctors] = useState<ClinicUser[]>([])
  const [creditHistory, setCreditHistory] = useState<CreditTransaction[]>([])
  const [loading, setLoading] = useState(true)

  // IP management
  const [newIp, setNewIp] = useState('')
  const [ips, setIps] = useState<string[]>([])
  const [ipSaved, setIpSaved] = useState(false)

  // Modules
  const [modules, setModules] = useState<string[]>([])
  const [moduleSaved, setModuleSaved] = useState(false)

  // Doctor invite
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteSent, setInviteSent] = useState(false)

  // IP detector
  const [myIp, setMyIp] = useState('')
  const [loadingIp, setLoadingIp] = useState(false)

  useEffect(() => {
    async function load() {
      if (!clinicaId) { setLoading(false); return }
      const [c, d, tx] = await Promise.all([
        fetchClinicById(clinicaId),
        fetchClinicDoctors(clinicaId),
        fetchCreditHistory(clinicaId),
      ])
      setClinica(c)
      setIps(c?.ips_autorizadas ?? [])
      setModules(c?.modulos_activos ?? [])
      setDoctors(d)
      setCreditHistory(tx)
      setLoading(false)
    }
    load()
  }, [clinicaId])

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </AppShell>
    )
  }

  if (!clinica) return null

  const usedCredits = clinica.creditos_totales - clinica.creditos_disponibles
  const usedPct = clinica.creditos_totales > 0 ? (usedCredits / clinica.creditos_totales) * 100 : 0
  const isLow = clinica.creditos_disponibles / clinica.creditos_totales < 0.2

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: 'overview', label: 'Resumen', icon: Building2 },
    { id: 'doctors', label: 'Médicos', icon: Users },
    { id: 'modules', label: 'Módulos', icon: Layers },
    { id: 'ips', label: 'IPs', icon: Shield },
    { id: 'credits', label: 'Créditos', icon: CreditCard },
    { id: 'reportes', label: 'Reportes', icon: BarChart2 },
  ]

  function exportCSV() {
    if (!clinica) return
    const rows = [
      ['Fecha', 'Tipo', 'Créditos', 'Descripción'],
      ...creditHistory.map(tx => [
        new Date(tx.created_at).toLocaleDateString('es-CO'),
        tx.tipo,
        tx.creditos.toString(),
        tx.descripcion,
      ]),
    ]
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-${clinica.nombre.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleSaveIps() {
    await updateClinicIps(clinicaId, ips)
    setIpSaved(true)
    setTimeout(() => setIpSaved(false), 2000)
  }

  async function handleSaveModules() {
    await updateClinicModules(clinicaId, modules)
    setModuleSaved(true)
    setTimeout(() => setModuleSaved(false), 2000)
  }

  function toggleModule(moduleId: string) {
    if (moduleId === 'urgencias') return // always on
    setModules(prev =>
      prev.includes(moduleId) ? prev.filter(m => m !== moduleId) : [...prev, moduleId]
    )
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/admin/super" className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{clinica.nombre}</h1>
            <p className="text-slate-500 text-sm mt-0.5">Panel de administración de clínica</p>
          </div>
        </div>

        {/* Credit alert */}
        {isLow && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">Créditos bajos — quedan {clinica.creditos_disponibles} HCs</p>
              <p className="text-amber-600 text-xs mt-1">
                Menos del 20% de créditos disponibles. Recarga para evitar interrupciones del servicio.
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Créditos disponibles', value: clinica.creditos_disponibles.toLocaleString('es-CO'), sub: `de ${clinica.creditos_totales.toLocaleString('es-CO')} totales`, accent: isLow },
                { label: 'HCs este mes', value: doctors.length * 12, sub: 'estimado', accent: false },
                { label: 'Médicos activos', value: doctors.length, sub: 'en la plataforma', accent: false },
                { label: 'Módulos activos', value: modules.length, sub: 'de 4 disponibles', accent: false },
              ].map(({ label, value, sub, accent }) => (
                <div key={label} className={`bg-white rounded-2xl border p-4 ${accent ? 'border-amber-200 bg-amber-50' : 'border-slate-100'} shadow-sm`}>
                  <p className={`text-2xl font-black ${accent ? 'text-amber-700' : 'text-slate-900'}`}>{value}</p>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5">{label}</p>
                  <p className="text-xs text-slate-400">{sub}</p>
                </div>
              ))}
            </div>

            {/* Credit bar */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-slate-700">Uso de créditos</p>
                <p className="text-xs text-slate-500">{Math.round(usedPct)}% utilizado</p>
              </div>
              <div className="bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isLow ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${usedPct}%` }}
                />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-xs text-slate-500">{usedCredits.toLocaleString('es-CO')} usados</span>
                <span className="text-xs text-slate-500">{clinica.creditos_disponibles.toLocaleString('es-CO')} disponibles</span>
              </div>
            </div>
          </div>
        )}

        {/* Doctors */}
        {activeTab === 'doctors' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="font-bold text-slate-900 mb-3">Invitar médico por email</h3>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="dr.nombre@correo.com"
                  className="input-field flex-1"
                />
                <button
                  onClick={() => {
                    if (!inviteEmail.trim()) return
                    setInviteSent(true)
                    setInviteEmail('')
                    setTimeout(() => setInviteSent(false), 2000)
                  }}
                  className={`btn-primary text-sm whitespace-nowrap ${inviteSent ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                >
                  {inviteSent ? <><CheckCircle size={14} /> Invitación enviada</> : <><Plus size={14} /> Invitar</>}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-900">Médicos activos ({doctors.length})</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {doctors.map(d => (
                  <div key={d.id} className="px-5 py-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center">
                        <span className="text-sm font-bold text-primary-700">
                          {d.user?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('') ?? '?'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{d.user?.full_name ?? 'Sin nombre'}</p>
                        <p className="text-xs text-slate-400">{d.user?.email} · {d.user?.specialty}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        d.rol === 'admin_clinica' ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {d.rol === 'admin_clinica' ? 'Admin' : 'Médico'}
                      </span>
                      <button
                        onClick={() => setDoctors(prev => prev.filter(doc => doc.id !== d.id))}
                        className="text-slate-300 hover:text-red-500 transition-colors p-1"
                        title="Remover médico"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modules */}
        {activeTab === 'modules' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Activa o desactiva los módulos disponibles para los médicos de esta institución.
            </p>
            <div className="space-y-3">
              {MODULE_OPTIONS.map(({ id, label, desc, locked }) => {
                const active = modules.includes(id)
                return (
                  <div
                    key={id}
                    onClick={() => !locked && toggleModule(id)}
                    className={`flex items-center justify-between gap-4 p-4 rounded-2xl border-2 transition-all ${
                      active ? 'border-primary-300 bg-primary-50' : 'border-slate-200 bg-white'
                    } ${!locked ? 'cursor-pointer hover:border-slate-300' : 'cursor-default'}`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900">{label}</p>
                        {locked && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Siempre activo</span>}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                    </div>
                    <div className={`w-11 h-6 rounded-full flex items-center transition-colors ${
                      active ? 'bg-primary-600' : 'bg-slate-300'
                    } ${locked ? 'opacity-50' : ''}`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform mx-0.5 ${
                        active ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </div>
                  </div>
                )
              })}
            </div>
            <button
              onClick={handleSaveModules}
              className={`btn-primary ${moduleSaved ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
            >
              <Settings size={15} />
              {moduleSaved ? '¡Guardado!' : 'Guardar módulos'}
            </button>
          </div>
        )}

        {/* IP Restriction */}
        {activeTab === 'ips' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
              <Shield size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-blue-800 text-sm">Restricción por IP institucional</p>
                <p className="text-blue-700 text-xs mt-1">
                  Si configuras IPs autorizadas, solo los médicos que accedan desde esas redes podrán usar Dictia.
                  Deja vacío para acceso desde cualquier IP. Soporta notación CIDR (ej: 192.168.1.0/24).
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
              {/* IP detector */}
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    setLoadingIp(true)
                    const ip = await getCurrentIp()
                    setMyIp(ip)
                    setLoadingIp(false)
                  }}
                  className="btn-ghost text-sm border border-slate-200 flex items-center gap-1.5"
                >
                  <Wifi size={13} />
                  {loadingIp ? 'Detectando...' : '¿Cuál es mi IP?'}
                </button>
                {myIp && (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">{myIp}</span>
                    <button
                      onClick={() => { setIps(prev => [...prev, myIp]); setMyIp('') }}
                      className="text-xs text-primary-600 font-semibold hover:text-primary-700"
                    >
                      + Agregar
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newIp}
                  onChange={e => setNewIp(e.target.value)}
                  placeholder="Ej: 192.168.1.0/24 o 201.235.0.1"
                  className="input-field flex-1"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newIp.trim()) {
                      setIps(prev => [...prev, newIp.trim()])
                      setNewIp('')
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (!newIp.trim()) return
                    setIps(prev => [...prev, newIp.trim()])
                    setNewIp('')
                  }}
                  className="btn-primary text-sm whitespace-nowrap"
                >
                  <Plus size={14} /> Agregar IP
                </button>
              </div>

              {ips.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4 italic">
                  Sin restricciones — acceso desde cualquier IP
                </p>
              ) : (
                <div className="space-y-2">
                  {ips.map((ip, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-2.5">
                      <span className="font-mono text-sm text-slate-700">{ip}</span>
                      <button
                        onClick={() => setIps(prev => prev.filter((_, j) => j !== i))}
                        className="text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleSaveIps}
                className={`btn-primary text-sm w-full justify-center ${ipSaved ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
              >
                <Shield size={14} />
                {ipSaved ? '¡IPs guardadas!' : 'Guardar lista de IPs'}
              </button>
            </div>
          </div>
        )}

        {/* Credits */}
        {activeTab === 'credits' && (
          <div className="space-y-4">
            <div className={`rounded-2xl p-5 border-2 ${isLow ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <p className={`text-sm font-bold mb-1 ${isLow ? 'text-amber-800' : 'text-emerald-800'}`}>Créditos disponibles</p>
              <p className={`text-4xl font-black ${isLow ? 'text-amber-700' : 'text-emerald-700'}`}>
                {clinica.creditos_disponibles.toLocaleString('es-CO')}
              </p>
              <p className={`text-xs mt-1 ${isLow ? 'text-amber-600' : 'text-emerald-600'}`}>
                HCs de ingreso = 1 crédito · Nota de evolución = 0.5 créditos
              </p>
            </div>

            {/* Buy credits */}
            <div>
              <h3 className="font-bold text-slate-900 mb-3">Recargar créditos — pago con Wompi</h3>
              <div className="grid sm:grid-cols-3 gap-3">
                {CREDIT_PACKAGES.map(pkg => (
                  <div key={pkg.hcs} className="bg-white rounded-2xl border-2 border-slate-200 p-4 hover:border-primary-300 transition-all cursor-pointer group relative">
                    {pkg.badge && (
                      <span className="absolute -top-2 left-4 text-xs bg-primary-600 text-white px-2 py-0.5 rounded-full font-bold">
                        {pkg.badge}
                      </span>
                    )}
                    <p className="text-xl font-black text-slate-900">{pkg.label}</p>
                    <p className="text-lg font-bold text-primary-600 mt-1">{pkg.priceLabel}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{pkg.pricePer}</p>
                    <button className="mt-3 w-full text-xs font-semibold py-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-colors">
                      Comprar con Wompi
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Transaction history */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-900">Historial de créditos</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {creditHistory.map(tx => (
                  <div key={tx.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{tx.descripcion}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(tx.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <span className={`text-sm font-bold ${tx.tipo === 'recarga' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {tx.tipo === 'recarga' ? '+' : '-'}{tx.creditos.toLocaleString('es-CO')}
                    </span>
                  </div>
                ))}
                {creditHistory.length === 0 && (
                  <p className="px-5 py-6 text-sm text-slate-400 text-center">Sin transacciones registradas</p>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Reportes */}
        {activeTab === 'reportes' && (
          <div className="space-y-4">
            {/* Savings summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'HCs generadas', value: usedCredits.toLocaleString('es-CO') },
                { label: 'Créditos disponibles', value: clinica.creditos_disponibles.toLocaleString('es-CO') },
                { label: 'Minutos ahorrados', value: `${(usedCredits * 7.5).toLocaleString('es-CO')} min` },
                { label: 'Médicos activos', value: doctors.filter(d => d.activo).length },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
                  <p className="text-2xl font-black text-slate-900">{value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Credit transactions table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900">Historial de transacciones</h3>
                <button
                  onClick={exportCSV}
                  className="btn-ghost text-sm border border-slate-200 flex items-center gap-1.5"
                >
                  <Download size={13} /> Exportar CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3 text-left">Fecha</th>
                      <th className="px-5 py-3 text-left">Tipo</th>
                      <th className="px-5 py-3 text-left">Descripción</th>
                      <th className="px-5 py-3 text-right">Créditos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {creditHistory.map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                          {new Date(tx.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            tx.tipo === 'recarga' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-600'
                          }`}>
                            {tx.tipo === 'recarga' ? 'Recarga' : 'Consumo'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-700">{tx.descripcion}</td>
                        <td className={`px-5 py-3 text-right font-bold ${tx.tipo === 'recarga' ? 'text-emerald-600' : 'text-red-500'}`}>
                          {tx.tipo === 'recarga' ? '+' : '-'}{tx.creditos.toLocaleString('es-CO')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {creditHistory.length === 0 && (
                  <p className="px-5 py-6 text-sm text-slate-400 text-center">Sin transacciones registradas</p>
                )}
              </div>
            </div>

            {/* Savings value summary */}
            <div className="bg-slate-900 text-white rounded-2xl p-5">
              <p className="text-sm font-semibold text-slate-400 mb-3">Valor generado por Dictia</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-400 text-xs mb-1">Tiempo ahorrado (a $80,000/hr médico)</p>
                  <p className="text-xl font-black">
                    ${Math.round(usedCredits * 7.5 / 60 * 80000).toLocaleString('es-CO')} COP
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1">Ahorro vs documentación manual</p>
                  <p className="text-xl font-black text-emerald-400">
                    {usedCredits > 0 ? `${Math.round(usedCredits * 7.5)} min` : '0 min'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
