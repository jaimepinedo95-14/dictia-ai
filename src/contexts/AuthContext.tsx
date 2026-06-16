import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured, type UserProfile } from '../lib/supabase'
import { incrementConsultationsUsed } from '../lib/db'
import { fetchClinicById, getCurrentIp, isIpAuthorized } from '../lib/adminDb'

type CanRecordResult = { allowed: boolean; reason?: string }

type AuthContextType = {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  isSupabaseMode: boolean
  ipBlocked: boolean
  signUp: (email: string, password: string, data: Partial<UserProfile>) => Promise<{ error: Error | null; emailConfirmationRequired?: boolean }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  updateProfile: (data: Partial<UserProfile>) => Promise<void>
  canRecord: () => CanRecordResult
  incrementConsultations: () => Promise<void>
  cancelTrial: () => Promise<void>
  reactivateSubscription: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

// ─── Mock data (used when Supabase is not configured) ─────────────────────────
const MOCK_USER = {
  id: 'mock-user-id',
  email: 'dr.garcia@dictia.health',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as unknown as User

const buildMockProfile = (overrides?: Partial<UserProfile>): UserProfile => ({
  id: 'mock-user-id',
  full_name: 'Dr. Alejandro García',
  email: 'dr.garcia@dictia.health',
  country: 'Colombia',
  specialty: 'Medicina General',
  gender: 'doctor',
  plan: 'free_trial',
  consultations_used: 47,
  consultations_limit: 999999,
  trial_ends_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  created_at: new Date().toISOString(),
  // Subscription defaults for mock (simula usuario en trial con 2 días restantes)
  subscription_status: 'trial',
  plan_seleccionado: 'standard',
  trial_start_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  trial_end_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  card_registered_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  ...overrides,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [ipBlocked, setIpBlocked] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Mock mode: read stored mock session
      const stored = localStorage.getItem('dictia_mock_profile')
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as Partial<UserProfile>
          setUser({ ...MOCK_USER, email: parsed.email ?? MOCK_USER.email! })
          setProfile(buildMockProfile(parsed))
        } catch {
          localStorage.removeItem('dictia_mock_profile')
        }
      }
      setLoading(false)
      return
    }

    // Real Supabase mode
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) fetchProfile(s.user.id).finally(() => setLoading(false))
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        setSession(s)
        setUser(s?.user ?? null)
        if (s?.user) await fetchProfile(s.user.id)
        else { setProfile(null); setIpBlocked(false) }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (data) {
      const p = data as UserProfile
      if (p.email === 'jaimepinedo95@gmail.com') p.role = 'super_admin'
      setProfile(p)
      if (p.clinica_id) await checkIpAccess(p.clinica_id)
      return
    }

    // No profile found — user exists in auth.users but not in user_profiles.
    // Auto-create a minimal profile so FK constraints don't block saves.
    const { data: authUser } = await supabase.auth.getUser()
    const email = authUser?.user?.email ?? ''
    console.warn('[Dictia] fetchProfile: no profile found, auto-creating for', email)

    const { data: created, error } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        email,
        full_name: email.split('@')[0] ?? '',
        country: 'Colombia',
        specialty: 'Medicina General',
        gender: 'doctor',
        plan: 'free_trial',
        consultations_used: 0,
        consultations_limit: 999999,
        subscription_status: 'pending',
      })
      .select('*')
      .single()

    if (!error && created) {
      const p = created as UserProfile
      if (p.email === 'jaimepinedo95@gmail.com') p.role = 'super_admin'
      setProfile(p)
    } else {
      console.error('[Dictia] fetchProfile: auto-create failed:', error?.message)
    }
  }

  async function checkIpAccess(clinicaId: string) {
    try {
      const [clinica, currentIp] = await Promise.all([
        fetchClinicById(clinicaId),
        getCurrentIp(),
      ])
      if (clinica && clinica.ips_autorizadas.length > 0 && currentIp) {
        const authorized = isIpAuthorized(currentIp, clinica.ips_autorizadas)
        setIpBlocked(!authorized)
      }
    } catch {
      // On error, don't block access
    }
  }

  async function signUp(email: string, password: string, data: Partial<UserProfile>) {
    if (!isSupabaseConfigured) {
      const newProfile = buildMockProfile({
        email,
        full_name: data.full_name,
        country: data.country,
        specialty: data.specialty,
        gender: data.gender ?? 'doctor',
        consultations_used: 0,
        trial_ends_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      })
      localStorage.setItem('dictia_mock_profile', JSON.stringify(newProfile))
      setUser({ ...MOCK_USER, email })
      setProfile(newProfile)
      return { error: null }
    }

    const { data: authData, error } = await supabase.auth.signUp({ email, password })
    if (error) return { error }

    // Insert profile immediately — even when email confirmation is required,
    // auth.users gets the row but session is null. We must insert the profile now
    // because fetchProfile() runs on first login and finds nothing otherwise.
    if (authData.user) {
      const { error: insertError } = await supabase.from('user_profiles').insert({
        id: authData.user.id,
        email,
        full_name: data.full_name ?? '',
        country: data.country ?? 'Colombia',
        specialty: data.specialty ?? 'Medicina General',
        gender: data.gender ?? 'doctor',
        plan: 'free_trial',
        consultations_used: 0,
        consultations_limit: 999999,
        trial_ends_at: null,
        accepted_terms_at: data.accepted_terms_at ?? null,
        accepted_terms_version: data.accepted_terms_version ?? null,
        subscription_status: 'pending',
      })
      if (insertError) return { error: insertError }
    }

    // session is null when Supabase requires email confirmation
    if (!authData.session) {
      return { error: null, emailConfirmationRequired: true }
    }

    return { error: null }
  }

  async function signIn(email: string, password: string) {
    if (!isSupabaseConfigured) {
      const newProfile = buildMockProfile({
        email,
        role: email === 'jaimepinedo95@gmail.com' ? 'super_admin' : 'medico',
      })
      localStorage.setItem('dictia_mock_profile', JSON.stringify(newProfile))
      setUser({ ...MOCK_USER, email })
      setProfile(newProfile)
      return { error: null }
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error && data.user) {
      // Eagerly set state so ProtectedRoute sees the user before onAuthStateChange fires.
      // Without this, navigate('/dashboard') races onAuthStateChange on slow mobile connections,
      // causing ProtectedRoute to redirect back to /login and leave a blank page.
      setUser(data.user)
      setSession(data.session)
      await fetchProfile(data.user.id)
    }
    return { error }
  }

  async function signOut() {
    if (!isSupabaseConfigured) {
      localStorage.removeItem('dictia_mock_profile')
    } else {
      await supabase.auth.signOut()
    }
    setUser(null)
    setSession(null)
    setProfile(null)
    setIpBlocked(false)
  }

  async function updateProfile(data: Partial<UserProfile>) {
    if (!user) return

    // Functional update prevents stale-closure issues when called multiple times in sequence
    let snapshot: UserProfile | null = null
    setProfile(prev => {
      snapshot = prev ? { ...prev, ...data } : null
      return snapshot
    })

    if (!isSupabaseConfigured) {
      if (snapshot) localStorage.setItem('dictia_mock_profile', JSON.stringify(snapshot))
      return
    }

    const { error } = await supabase.from('user_profiles').update(data).eq('id', user.id)
    if (error) throw new Error(error.message)
  }

  function canRecord(): CanRecordResult {
    // Usuario autenticado sin perfil cargado (fetch aún pendiente o falló) → permitir
    // TODO: Reactivar verificación estricta cuando el perfil sea confiable
    if (!profile && user) return { allowed: true }
    if (!profile) return { allowed: false, reason: 'No hay sesión activa' }

    // Super admin: acceso permanente sin restricciones de suscripción
    if (profile.role === 'super_admin') return { allowed: true }

    // Dev mode (Wompi no configurado): acceso libre para todos los usuarios autenticados
    // TODO: Eliminar este bloque cuando Wompi esté configurado en producción
    if (!import.meta.env.VITE_WOMPI_PUBLIC_KEY) return { allowed: true }

    const isTrial = profile.subscription_status === 'trial' || profile.plan === 'free_trial'

    if (isTrial) {
      const endAt = profile.trial_end_at ?? profile.trial_ends_at
      if (endAt && new Date(endAt) < new Date()) {
        return { allowed: false, reason: 'Tu período de prueba ha terminado. Activa tu plan para continuar.' }
      }
      const notesUsed = profile.trial_notes_used ?? 0
      const notesLimit = profile.trial_notes_limit ?? 15
      if (notesUsed >= notesLimit) {
        return { allowed: false, reason: `Has usado tus ${notesLimit} notas de prueba. Activa tu plan para continuar.` }
      }
      return { allowed: true }
    }

    if (profile.consultations_used >= profile.consultations_limit) {
      return {
        allowed: false,
        reason: `Has alcanzado el límite de ${profile.consultations_limit} consultas de tu plan este mes. Actualiza tu plan para continuar.`,
      }
    }

    return { allowed: true }
  }

  async function cancelTrial() {
    await updateProfile({ subscription_status: 'cancelled' })
  }

  async function reactivateSubscription() {
    // Reset to pending so the user goes through onboarding again
    await updateProfile({ subscription_status: 'pending', wompi_customer_id: null, card_registered_at: null })
  }

  async function incrementConsultations() {
    if (!profile) return
    const newCount = profile.consultations_used + 1
    const isTrial = profile.subscription_status === 'trial' || profile.plan === 'free_trial'
    const newNotesUsed = (profile.trial_notes_used ?? 0) + 1
    const notesLimit = profile.trial_notes_limit ?? 15

    const stateUpdate: Partial<UserProfile> = { consultations_used: newCount }
    if (isTrial) {
      stateUpdate.trial_notes_used = newNotesUsed
      if (newNotesUsed >= notesLimit) stateUpdate.subscription_status = 'expired'
    }

    setProfile(prev => prev ? { ...prev, ...stateUpdate } : null)

    if (!isSupabaseConfigured) {
      const updated = profile ? { ...profile, ...stateUpdate } : null
      if (updated) localStorage.setItem('dictia_mock_profile', JSON.stringify(updated))
      return
    }

    await incrementConsultationsUsed(user?.id ?? '', profile.consultations_used)
    if (isTrial) {
      const trialUpdate: Partial<UserProfile> = { trial_notes_used: newNotesUsed }
      if (newNotesUsed >= notesLimit) trialUpdate.subscription_status = 'expired'
      const { error: trialErr } = await supabase.from('user_profiles').update(trialUpdate).eq('id', user?.id ?? '')
      if (trialErr) console.error('[Dictia] trial notes update failed:', trialErr.message)
    }
  }

  return (
    <AuthContext.Provider value={{
      user, session, profile, loading, ipBlocked,
      isSupabaseMode: isSupabaseConfigured,
      signUp, signIn, signOut, updateProfile,
      canRecord, incrementConsultations,
      cancelTrial, reactivateSubscription,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
