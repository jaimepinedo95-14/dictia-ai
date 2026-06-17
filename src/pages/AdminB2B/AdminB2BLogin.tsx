import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { fetchClinicByEmail } from '../../lib/adminB2BDb'
import type { B2BSession } from '../../lib/adminB2BDb'

export default function AdminB2BLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (authError || !authData.session) {
        setError('Email o contraseña incorrectos.')
        return
      }

      const clinica = await fetchClinicByEmail(email.trim())
      if (!clinica) {
        await supabase.auth.signOut()
        setError('Este email no está registrado como administrador de ninguna institución en Dictia.')
        return
      }

      const session: B2BSession = {
        clinicId: clinica.id,
        clinicName: clinica.nombre,
        adminEmail: clinica.email_admin,
        sessionToken: authData.session.access_token,
      }
      localStorage.setItem('adminB2BSession', JSON.stringify(session))
      navigate('/admin-b2b/dashboard', { replace: true })
    } catch {
      setError('Error inesperado. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4">
            <span className="text-2xl">🏥</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Panel Institucional</h1>
          <p className="text-gray-500 text-sm mt-1">Acceso para administradores de clínicas e IPS</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email institucional
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              placeholder="admin@clinica.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Verificando...
              </span>
            ) : (
              'Ingresar al panel'
            )}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Dictia · Panel institucional · Acceso restringido
        </p>
      </div>
    </div>
  )
}
