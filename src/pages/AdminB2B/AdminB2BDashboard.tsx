import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import ipaddr from 'ipaddr.js'
import { supabase } from '../../lib/supabase'
import {
  getB2BSession,
  clearB2BSession,
  fetchClinicForB2B,
  fetchClinicStats,
  fetchClinicDoctorsB2B,
  fetchTransactionHistoryB2B,
  addDoctorToClinic,
  setDoctorActive,
  removeDoctorFromClinic,
  updateClinicIps,
  rechargeClinicCredits,
} from '../../lib/adminB2BDb'
import type { B2BSession, ClinicStats } from '../../lib/adminB2BDb'
import type { Clinica, CreditTransaction, ClinicUser } from '../../lib/supabase'

function formatCOP(amount: number) {
  return amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isValidIpOrCidr(str: string): boolean {
  const s = str.trim()
  if (!s) return false
  if (ipaddr.isValid(s)) return true
  try { ipaddr.parseCIDR(s); return true } catch { return false }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = 'blue' }: {
  label: string; value: string | number; sub?: string; color?: 'blue' | 'green' | 'violet' | 'orange'
}) {
  const colors = {
    blue:   'bg-blue-50 text-blue-700',
    green:  'bg-green-50 text-green-700',
    violet: 'bg-violet-50 text-violet-700',
    orange: 'bg-orange-50 text-orange-700',
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">{label}</p>
      <p className={`text-3xl font-bold ${colors[color].split(' ')[1]}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export default function AdminB2BDashboard() {
  const navigate = useNavigate()

  const [session, setSession] = useState<B2BSession | null>(null)
  const [clinic, setClinic] = useState<Clinica | null>(null)
  const [stats, setStats] = useState<ClinicStats | null>(null)
  const [doctors, setDoctors] = useState<ClinicUser[]>([])
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [ipText, setIpText] = useState('')
  const [loading, setLoading] = useState(true)

  // Add doctor modal
  const [showAddDoctor, setShowAddDoctor] = useState(false)
  const [newDoctorEmail, setNewDoctorEmail] = useState('')
  const [addDoctorLoading, setAddDoctorLoading] = useState(false)
  const [addDoctorMsg, setAddDoctorMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Recharge modal
  const [showRecharge, setShowRecharge] = useState(false)
  const [rechargeAmt, setRechargeAmt] = useState('')
  const [rechargeNota, setRechargeNota] = useState('')
  const [rechargeLoading, setRechargeLoading] = useState(false)

  // IP section
  const [ipSaving, setIpSaving] = useState(false)
  const [ipMsg, setIpMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Remove doctor confirm
  const [confirmRemove, setConfirmRemove] = useState<ClinicUser | null>(null)

  const loadAll = useCallback(async (clinicId: string) => {
    const [clinicData, doctorsData, txData] = await Promise.all([
      fetchClinicForB2B(clinicId),
      fetchClinicDoctorsB2B(clinicId),
      fetchTransactionHistoryB2B(clinicId),
    ])
    if (clinicData) {
      setClinic(clinicData)
      setIpText((clinicData.ips_autorizadas ?? []).join(', '))
    }
    const statsData = await fetchClinicStats(clinicId, doctorsData)
    setStats(statsData)
    setDoctors(doctorsData)
    setTransactions(txData)
    setLoading(false)
  }, [])

  useEffect(() => {
    const sess = getB2BSession()
    if (!sess) { navigate('/admin-b2b/login', { replace: true }); return }
    setSession(sess)
    loadAll(sess.clinicId)
  }, [navigate, loadAll])

  async function handleLogout() {
    clearB2BSession()
    await supabase.auth.signOut()
    navigate('/admin-b2b/login', { replace: true })
  }

  // ── Médicos actions ──
  async function handleAddDoctor(e: React.FormEvent) {
    e.preventDefault()
    if (!session) return
    setAddDoctorLoading(true)
    setAddDoctorMsg(null)
    const result = await addDoctorToClinic(session.clinicId, newDoctorEmail)
    if (result.success) {
      setAddDoctorMsg({ ok: true, text: 'Médico agregado correctamente.' })
      setNewDoctorEmail('')
      const updated = await fetchClinicDoctorsB2B(session.clinicId)
      setDoctors(updated)
      const updatedStats = await fetchClinicStats(session.clinicId, updated)
      setStats(updatedStats)
    } else {
      setAddDoctorMsg({ ok: false, text: result.error ?? 'Error al agregar médico.' })
    }
    setAddDoctorLoading(false)
  }

  async function handleToggleActive(doctor: ClinicUser) {
    await setDoctorActive(doctor.id, doctor.user_id, !doctor.activo)
    const updated = await fetchClinicDoctorsB2B(session!.clinicId)
    setDoctors(updated)
    const updatedStats = await fetchClinicStats(session!.clinicId, updated)
    setStats(updatedStats)
  }

  async function handleRemoveDoctor(doctor: ClinicUser) {
    await removeDoctorFromClinic(doctor.id, doctor.user_id)
    setConfirmRemove(null)
    const updated = await fetchClinicDoctorsB2B(session!.clinicId)
    setDoctors(updated)
    const updatedStats = await fetchClinicStats(session!.clinicId, updated)
    setStats(updatedStats)
  }

  // ── IP actions ──
  async function handleSaveIPs() {
    if (!session) return
    setIpMsg(null)
    const ips = ipText.split(',').map(s => s.trim()).filter(Boolean)
    const invalid = ips.filter(ip => !isValidIpOrCidr(ip))
    if (invalid.length > 0) {
      setIpMsg({ ok: false, text: `IPs/CIDRs inválidos: ${invalid.join(', ')}` })
      return
    }
    setIpSaving(true)
    await updateClinicIps(session.clinicId, ips)
    setIpMsg({ ok: true, text: `${ips.length === 0 ? 'Lista vaciada' : `${ips.length} entrada(s) guardada(s)`} correctamente.` })
    setIpSaving(false)
  }

  // ── Recharge actions ──
  async function handleRecharge(e: React.FormEvent) {
    e.preventDefault()
    if (!session) return
    const amt = parseInt(rechargeAmt, 10)
    if (!amt || amt < 1) return
    setRechargeLoading(true)
    await rechargeClinicCredits(session.clinicId, amt, rechargeNota)
    const [clinicData, txData] = await Promise.all([
      fetchClinicForB2B(session.clinicId),
      fetchTransactionHistoryB2B(session.clinicId),
    ])
    if (clinicData) setClinic(clinicData)
    setTransactions(txData)
    const updatedStats = await fetchClinicStats(session.clinicId, doctors)
    setStats(updatedStats)
    setRechargeAmt('')
    setRechargeNota('')
    setRechargeLoading(false)
    setShowRecharge(false)
  }

  // ── Excel export ──
  function handleExportExcel() {
    if (!transactions.length) return
    const rows = transactions.map(t => ({
      'Fecha': formatDate(t.created_at),
      'Tipo': t.tipo === 'recarga' ? 'Recarga' : 'Consumo',
      'HCs': t.creditos,
      'Descripción': t.descripcion,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Historial')
    XLSX.writeFile(wb, `historial-creditos-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Cargando panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-lg">🏥</span>
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">{session?.clinicName}</p>
              <p className="text-xs text-gray-400">Panel institucional</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-red-600 font-medium transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* ── Sección 1: Resumen ── */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Resumen del mes</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Médicos activos"
              value={stats?.doctors_active ?? 0}
              color="blue"
            />
            <StatCard
              label="HCs consumidas este mes"
              value={stats?.hc_used_this_month ?? 0}
              sub="notas generadas"
              color="violet"
            />
            <StatCard
              label="HCs disponibles"
              value={stats?.creditos_disponibles ?? 0}
              sub={clinic ? `de ${clinic.creditos_totales} totales` : undefined}
              color="green"
            />
            <StatCard
              label="Costo estimado mes"
              value={formatCOP(stats?.costo_estimado_cop ?? 0)}
              sub="a $350 COP/HC"
              color="orange"
            />
          </div>
        </section>

        {/* ── Sección 2: Gestión de Médicos ── */}
        <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">Gestión de Médicos</h2>
              <p className="text-xs text-gray-400 mt-0.5">{doctors.length} médico(s) vinculados</p>
            </div>
            <button
              onClick={() => { setShowAddDoctor(true); setAddDoctorMsg(null); setNewDoctorEmail('') }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              + Agregar médico
            </button>
          </div>

          {doctors.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-400 text-sm">
              No hay médicos vinculados a esta institución.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Especialidad</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {doctors.map(doctor => (
                    <tr key={doctor.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-gray-900">
                        {doctor.user?.full_name ?? '—'}
                      </td>
                      <td className="px-4 py-3.5 text-gray-500">{doctor.user?.email ?? '—'}</td>
                      <td className="px-4 py-3.5 text-gray-500 hidden md:table-cell">
                        {doctor.user?.specialty ?? '—'}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          doctor.activo
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {doctor.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleToggleActive(doctor)}
                            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                              doctor.activo
                                ? 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                                : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
                            }`}
                          >
                            {doctor.activo ? 'Desactivar' : 'Activar'}
                          </button>
                          <button
                            onClick={() => setConfirmRemove(doctor)}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Sección 3: IP Whitelist ── */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-base font-bold text-gray-900 mb-1">Restricción de IP</h2>
          <p className="text-sm text-gray-500 mb-4">
            Solo los médicos conectados desde estas IPs o rangos CIDR podrán acceder. Déjalo vacío para sin restricción.
          </p>
          <textarea
            value={ipText}
            onChange={e => { setIpText(e.target.value); setIpMsg(null) }}
            rows={4}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="192.168.1.0/24, 10.0.0.1, 201.235.10.0/16"
          />
          <p className="text-xs text-gray-400 mt-1.5 mb-3">
            Separados por coma. Acepta IPs individuales (ej. 192.168.1.1) o rangos CIDR (ej. 192.168.0.0/24).
          </p>

          {ipMsg && (
            <div className={`mb-3 px-4 py-2.5 rounded-xl text-sm ${
              ipMsg.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {ipMsg.text}
            </div>
          )}

          <button
            onClick={handleSaveIPs}
            disabled={ipSaving}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            {ipSaving ? 'Guardando...' : 'Guardar IPs'}
          </button>
        </section>

        {/* ── Sección 4: Créditos ── */}
        <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-base font-bold text-gray-900">Gestión de Créditos (HCs)</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Disponibles: <strong className="text-gray-700">{stats?.creditos_disponibles ?? 0} HCs</strong>
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExportExcel}
                disabled={transactions.length === 0}
                className="bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                Exportar Excel
              </button>
              <button
                onClick={() => { setShowRecharge(true); setRechargeAmt(''); setRechargeNota('') }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                + Recargar HCs
              </button>
            </div>
          </div>

          {transactions.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-400 text-sm">
              Sin movimientos de créditos aún.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">HCs</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Descripción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {transactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3.5 text-gray-500 whitespace-nowrap">{formatDate(tx.created_at)}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          tx.tipo === 'recarga'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-600'
                        }`}>
                          {tx.tipo === 'recarga' ? '↑ Recarga' : '↓ Consumo'}
                        </span>
                      </td>
                      <td className={`px-4 py-3.5 text-right font-semibold ${
                        tx.tipo === 'recarga' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {tx.tipo === 'recarga' ? '+' : '-'}{tx.creditos}
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 hidden md:table-cell">{tx.descripcion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </main>

      {/* ── Modal: Agregar Médico ── */}
      {showAddDoctor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Agregar médico</h3>
            <p className="text-sm text-gray-500 mb-4">
              El médico debe estar registrado en Dictia con el mismo email.
            </p>
            <form onSubmit={handleAddDoctor} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email del médico</label>
                <input
                  type="email"
                  required
                  value={newDoctorEmail}
                  onChange={e => setNewDoctorEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="dr.garcia@ejemplo.com"
                  autoFocus
                />
              </div>

              {addDoctorMsg && (
                <div className={`px-4 py-2.5 rounded-xl text-sm ${
                  addDoctorMsg.ok
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {addDoctorMsg.text}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddDoctor(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={addDoctorLoading || !newDoctorEmail}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors"
                >
                  {addDoctorLoading ? 'Agregando...' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Confirmar Eliminar ── */}
      {confirmRemove && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Eliminar médico</h3>
            <p className="text-sm text-gray-500 mb-6">
              ¿Eliminar a <strong className="text-gray-700">{confirmRemove.user?.full_name ?? confirmRemove.user?.email}</strong> de la institución? El usuario mantendrá su cuenta Dictia.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRemove(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleRemoveDoctor(confirmRemove)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Recargar HCs ── */}
      {showRecharge && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Recargar Historias Clínicas</h3>
            <form onSubmit={handleRecharge} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Cantidad de HCs
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="100000"
                  value={rechargeAmt}
                  onChange={e => setRechargeAmt(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: 500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nota / referencia <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={rechargeNota}
                  onChange={e => setRechargeNota(e.target.value)}
                  maxLength={200}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Factura #1234 · junio 2026"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRecharge(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={rechargeLoading || !rechargeAmt || parseInt(rechargeAmt) < 1}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors"
                >
                  {rechargeLoading ? 'Recargando...' : `Recargar ${rechargeAmt ? `${rechargeAmt} HCs` : ''}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
