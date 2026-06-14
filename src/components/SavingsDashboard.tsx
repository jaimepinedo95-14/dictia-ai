import { useState, useEffect } from 'react'
import { Clock, TrendingUp, Pencil, Check, X, ChevronDown, DollarSign } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { fetchSavingsStats, updateHourlyRate } from '../lib/db'
import type { SavingsStats } from '../lib/db'

const MINS_PER_HC = 12
const DEFAULT_HOURLY_RATE = 150_000

function formatCOP(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-CO')
}

function getMotivationalPhrase(total: number, totalHours: number): string {
  if (total <= 10) {
    return 'Estás empezando. Cada consulta que documentas con Dictia es tiempo que recuperas.'
  }
  if (total <= 50) {
    return `Ya van ${totalHours.toFixed(1)} horas de tu vida de vuelta. Sigue así.`
  }
  if (total <= 200) {
    const days = (totalHours / 8).toFixed(1)
    return `Dictia ya te ahorró ${days} días completos de trabajo administrativo.`
  }
  const weeks = (totalHours / 8 / 5).toFixed(1)
  return `Eres un usuario power. Dictia te ha devuelto más de ${weeks} semanas.`
}

export default function SavingsDashboard() {
  const { user, profile, updateProfile } = useAuth()
  const [stats, setStats] = useState<SavingsStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [editingRate, setEditingRate] = useState(false)
  const [rateInput, setRateInput] = useState('')
  const [savingRate, setSavingRate] = useState(false)

  const hourlyRate = profile?.hourly_rate_cop ?? DEFAULT_HOURLY_RATE

  useEffect(() => {
    if (!user?.id) return
    setLoading(true)
    fetchSavingsStats(user.id).then(s => {
      setStats(s)
      setLoading(false)
    })
  }, [user?.id])

  async function handleSaveRate() {
    const val = parseInt(rateInput.replace(/\D/g, ''), 10)
    if (!val || val < 1_000) return
    setSavingRate(true)
    await updateProfile({ hourly_rate_cop: val })
    if (user?.id) await updateHourlyRate(user.id, val)
    setSavingRate(false)
    setEditingRate(false)
  }

  const total = stats?.total ?? profile?.consultations_used ?? 0
  const monthHCs = stats?.month ?? profile?.consultations_used ?? 0
  const totalHours = (total * MINS_PER_HC) / 60
  const monthHours = (monthHCs * MINS_PER_HC) / 60
  const monthMoney = monthHours * hourlyRate

  const periods = [
    { label: 'Hoy', hcs: stats?.today ?? 0 },
    { label: 'Esta semana', hcs: stats?.week ?? 0 },
    { label: 'Este mes', hcs: stats?.month ?? 0 },
    { label: 'Histórico', hcs: stats?.total ?? 0 },
  ]

  return (
    <div className="card overflow-hidden">
      {/* Header / toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <TrendingUp size={17} className="text-emerald-600" />
          </div>
          <div className="text-left">
            <p className="font-bold text-slate-900 text-sm">Mi impacto</p>
            <p className="text-xs text-slate-400">Tiempo y dinero recuperados con Dictia</p>
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ${collapsed ? '' : 'rotate-180'}`}
        />
      </button>

      {!collapsed && (
        <div className="mt-5 space-y-4">
          {/* Main hero stat */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-6 py-5 text-center">
            {loading ? (
              <div className="space-y-2">
                <div className="h-10 bg-emerald-100 rounded-xl animate-pulse w-32 mx-auto" />
                <div className="h-4 bg-emerald-100 rounded-lg animate-pulse w-48 mx-auto" />
              </div>
            ) : (
              <>
                <div className="text-4xl font-black text-emerald-700 tracking-tight">
                  {monthHours >= 1 ? `${monthHours.toFixed(1)}h` : `${monthHCs * MINS_PER_HC} min`}
                </div>
                <p className="text-emerald-800 font-semibold text-sm mt-1">ahorradas este mes</p>
                <p className="text-emerald-600 text-xs mt-2">
                  Equivale a{' '}
                  <strong className="font-bold text-emerald-700">{formatCOP(monthMoney)}</strong>{' '}
                  COP recuperados
                </p>
              </>
            )}
          </div>

          {/* 4 period cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {periods.map(({ label, hcs }) => (
              <div key={label} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                {loading ? (
                  <div className="space-y-1.5">
                    <div className="h-7 bg-slate-200 rounded-lg animate-pulse" />
                    <div className="h-3 bg-slate-100 rounded animate-pulse" />
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-black text-slate-900">{hcs}</div>
                    <div className="text-xs text-slate-500 font-medium mt-0.5 leading-tight">{label}</div>
                    <div className="text-xs text-emerald-600 font-semibold mt-1">
                      {hcs > 0 ? `${hcs * MINS_PER_HC} min` : '—'}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Hourly rate editor */}
          <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 flex-shrink-0">
              <DollarSign size={14} className="text-slate-400" />
              <span className="text-xs text-slate-600 font-medium">Mi valor hora</span>
            </div>
            {editingRate ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400">$</span>
                <input
                  type="text"
                  value={rateInput}
                  onChange={e => setRateInput(e.target.value)}
                  className="w-24 text-xs font-bold text-slate-900 border border-primary-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-400 bg-white"
                  placeholder="150000"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveRate()
                    if (e.key === 'Escape') setEditingRate(false)
                  }}
                />
                <span className="text-xs text-slate-400">COP/h</span>
                <button
                  onClick={handleSaveRate}
                  disabled={savingRate}
                  className="w-6 h-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md flex items-center justify-center flex-shrink-0 transition-colors"
                >
                  {savingRate
                    ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                    : <Check size={11} />}
                </button>
                <button
                  onClick={() => setEditingRate(false)}
                  className="w-6 h-6 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-md flex items-center justify-center flex-shrink-0 transition-colors"
                >
                  <X size={11} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">{formatCOP(hourlyRate)} COP/h</span>
                <button
                  onClick={() => { setRateInput(String(hourlyRate)); setEditingRate(true) }}
                  className="w-6 h-6 bg-slate-200 hover:bg-slate-300 rounded-md flex items-center justify-center transition-colors"
                  title="Editar valor hora"
                >
                  <Pencil size={11} className="text-slate-500" />
                </button>
              </div>
            )}
          </div>

          {/* Motivational phrase */}
          {!loading && total > 0 && (
            <div className="flex items-start gap-2.5 bg-primary-50 border border-primary-100 rounded-xl px-4 py-3">
              <Clock size={14} className="text-primary-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-primary-700 leading-relaxed italic">
                {getMotivationalPhrase(total, totalHours)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
