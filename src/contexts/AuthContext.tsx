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
      .single()
    if (data) {
      const p = data as UserProfile
      setProfile(p)
      // IP check for institutional users
      if (p.clinica_id) {
        await checkIpAccess(p.clinica_id)
      }
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

    // session is null when Supabase requires email confirmation
    if (!authData.session) {
      return { error: null, emailConfirmationRequired: true }
    }

    if (authData.user) {
      const { error: insertError } = await supabase.from('user_profiles').insert({
        id: authData.user.id,
        email,
        full_name: data.full_name ?? '',
        country: data.country ?? 'Colombia',
        specialty: data.specialty ?? 'Medicina General',
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

    return { error: null }
  }

  async function signIn(email: string, password: string) {
    if (!isSupabaseConfigured) {
      const newProfile = buildMockProfile({ email })
      localStorage.setItem('dictia_mock_profile', JSON.stringify(newProfile))
      setUser({ ...MOCK_USER, email })
      setProfile(newProfile)
      return { error: null }
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
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
    const updated = profile ? { ...profile, ...data } : null
    setProfile(updated)

    if (!isSupabaseConfigured) {
      if (updated) localStorage.setItem('dictia_mock_profile', JSON.stringify(updated))
      return
    }

    await supabase.from('user_profiles').update(data).eq('id', user.id)
  }

  function canRecord(): CanRecordResult {
    if (!profile) return { allowed: false, reason: 'No hay sesión activa' }

    if (profile.plan === 'free_trial') {
      if (profile.trial_ends_at && new Date(profile.trial_ends_at) < new Date()) {
        return {
          allowed: false,
          reason: 'Tu período de prueba gratuita ha terminado. Activa un plan para continuar.',
        }
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
    setProfile(prev => prev ? { ...prev, consultations_used: newCount } : null)

    if (!isSupabaseConfigured) {
      const updated = profile ? { ...profile, consultations_used: newCount } : null
      if (updated) localStorage.setItem('dictia_mock_profile', JSON.stringify(updated))
      return
    }

    await incrementConsultationsUsed(user?.id ?? '', profile.consultations_used)
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
