import { Users, Search, Plus, Lock } from 'lucide-react'
import AppShell from '../components/AppShell'

export default function Patients() {
  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Pacientes</h1>
            <p className="text-slate-500 text-sm mt-1">Módulo próximamente disponible</p>
          </div>
          <button className="btn-primary text-sm py-2.5">
            <Plus size={16} /> Nuevo paciente
          </button>
        </div>

        <div className="relative">
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar paciente..."
            className="input-field pl-11"
            disabled
          />
        </div>

        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock size={24} className="text-slate-400" />
          </div>
          <p className="text-slate-700 text-sm font-semibold">Módulo en desarrollo</p>
          <p className="text-slate-400 text-xs mt-1 max-w-xs mx-auto leading-relaxed">
            Dictia no almacena datos de pacientes por diseño de privacidad. Este módulo permitirá gestionar citas sin guardar información clínica.
          </p>
          <Users size={20} className="mx-auto text-slate-300 mt-4" />
        </div>
      </div>
    </AppShell>
  )
}
