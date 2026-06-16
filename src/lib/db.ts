import { supabase, isSupabaseConfigured } from './supabase'
import type { Consultation, NoteType } from './supabase'

export type SavingsStats = {
  today: number
  week: number
  month: number
  total: number
}

// Clinical notes are NEVER stored in the DB — privacy by design.
// This function always returns [] so callers remain compatible.
export async function fetchRecentApprovedNotes(): Promise<never[]> {
  return []
}

type SaveConsultationInput = {
  recording_duration: number
  note_type?: NoteType | null
  status: 'approved' | 'discarded'
  specialty?: string | null
}

export async function saveConsultation(
  userId: string,
  data: SaveConsultationInput
): Promise<string | null> {
  if (!isSupabaseConfigured || !userId) return null

  const { data: row, error } = await supabase
    .from('consultations')
    .insert({
      user_id: userId,
      recording_duration: data.recording_duration,
      note_type: data.note_type ?? null,
      status: data.status,
      specialty: data.specialty ?? null,
      approved_at: data.status === 'approved' ? new Date().toISOString() : null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error al guardar consulta:', error)
    return null
  }

  return (row as { id: string }).id
}

export async function createPendingConsultation(
  userId: string,
  data: { recording_duration: number; note_type?: NoteType | null; specialty?: string | null }
): Promise<string | null> {
  if (!isSupabaseConfigured || !userId) return null

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const { data: row, error } = await supabase
    .from('consultations')
    .insert({
      user_id: userId,
      recording_duration: data.recording_duration,
      note_type: data.note_type ?? null,
      status: 'completed',
      specialty: data.specialty ?? null,
      expires_at: expiresAt,
    })
    .select('id')
    .single()

  if (!error) return (row as { id: string }).id

  // Fallback: expires_at column doesn't exist yet
  console.warn('[Dictia] createPendingConsultation: expires_at missing, inserting without it')
  const { data: row2, error: err2 } = await supabase
    .from('consultations')
    .insert({
      user_id: userId,
      recording_duration: data.recording_duration,
      note_type: data.note_type ?? null,
      status: 'completed',
      specialty: data.specialty ?? null,
    })
    .select('id')
    .single()

  if (err2) {
    console.error('Error al guardar consulta pendiente (fallback):', err2)
    return null
  }

  return (row2 as { id: string }).id
}

export async function approveConsultation(consultationId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !consultationId) return false

  // Do NOT set expires_at here — column may not exist yet.
  // expires_at cleanup happens separately once the SQL migration is confirmed.
  const { data, error } = await supabase
    .from('consultations')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', consultationId)
    .select('id')

  if (error) {
    console.error('[Dictia] approveConsultation UPDATE error:', error)
    return false
  }

  return (data?.length ?? 0) > 0
}

export async function discardConsultation(consultationId: string): Promise<void> {
  if (!isSupabaseConfigured || !consultationId) return

  const { error } = await supabase
    .from('consultations')
    .update({ status: 'discarded' })
    .eq('id', consultationId)

  if (error) console.error('Error al descartar consulta:', error)
}

export async function fetchConsultations(
  userId: string,
  limit = 20
): Promise<Consultation[]> {
  if (!isSupabaseConfigured || !userId) return []

  const now = new Date().toISOString()

  // Try with expires_at column (available after SQL migration)
  const { data, error } = await supabase
    .from('consultations')
    .select('id, user_id, recording_duration, note_type, status, specialty, created_at, approved_at, expires_at')
    .eq('user_id', userId)
    .neq('status', 'discarded')
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!error) return (data ?? []) as Consultation[]

  // Fallback: expires_at column doesn't exist yet — run the SQL migration in Supabase
  console.warn('[Dictia] fetchConsultations: expires_at column missing, using fallback query')
  const { data: data2, error: err2 } = await supabase
    .from('consultations')
    .select('id, user_id, recording_duration, note_type, status, specialty, created_at, approved_at')
    .eq('user_id', userId)
    .neq('status', 'discarded')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (err2) {
    console.error('Error al cargar consultas:', err2)
    return []
  }

  return (data2 ?? []).map(row => ({ ...row, expires_at: null })) as Consultation[]
}

export async function getMonthlyConsultationCount(userId: string): Promise<number> {
  if (!isSupabaseConfigured || !userId) return 0

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count, error } = await supabase
    .from('consultations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'approved')
    .gte('created_at', startOfMonth.toISOString())

  if (error) return 0
  return count ?? 0
}

export async function incrementConsultationsUsed(userId: string, currentCount: number): Promise<void> {
  if (!isSupabaseConfigured || !userId) return

  await supabase
    .from('user_profiles')
    .update({ consultations_used: currentCount + 1 })
    .eq('id', userId)
}

export async function fetchSavingsStats(userId: string): Promise<SavingsStats> {
  if (!isSupabaseConfigured || !userId) {
    return { today: 3, week: 12, month: 47, total: 247 }
  }

  const { data, error } = await supabase
    .from('consultations')
    .select('created_at')
    .eq('user_id', userId)
    .eq('status', 'approved')

  if (error || !data) return { today: 0, week: 0, month: 0, total: 0 }

  const now = new Date()

  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)

  const startOfWeek = new Date(now)
  const dow = now.getDay()
  startOfWeek.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1))
  startOfWeek.setHours(0, 0, 0, 0)

  const startOfMonth = new Date(now)
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const todayStr = startOfDay.toISOString()
  const weekStr = startOfWeek.toISOString()
  const monthStr = startOfMonth.toISOString()

  return {
    today: data.filter(c => c.created_at >= todayStr).length,
    week: data.filter(c => c.created_at >= weekStr).length,
    month: data.filter(c => c.created_at >= monthStr).length,
    total: data.length,
  }
}

export async function updateHourlyRate(userId: string, rate: number): Promise<void> {
  if (!isSupabaseConfigured || !userId) return
  await supabase
    .from('user_profiles')
    .update({ hourly_rate_cop: rate })
    .eq('id', userId)
}

type DemoRequestInput = {
  nombre_completo: string
  nombre_institucion: string
  email_institucional: string
  numero_medicos: number | null
  telefono: string
}

export async function saveDemoRequest(data: DemoRequestInput): Promise<boolean> {
  if (!isSupabaseConfigured) return true // mock success in demo mode

  const { error } = await supabase
    .from('demos_solicitados')
    .insert(data)

  if (error) {
    console.error('Error al guardar demo:', error)
    return false
  }

  return true
}
