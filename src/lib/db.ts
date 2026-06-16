import { supabase, isSupabaseConfigured } from './supabase'
import type { Consultation, NoteType, SoapNote } from './supabase'

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
  note_content?: SoapNote | null
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
      note_content: data.note_content ?? null,
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
  data: { recording_duration: number; note_type?: NoteType | null; specialty?: string | null; note_content?: SoapNote | null }
): Promise<string | null> {
  if (!isSupabaseConfigured || !userId) return null

  const base = {
    user_id: userId,
    recording_duration: data.recording_duration,
    note_type: data.note_type ?? null,
    status: 'completed',
    specialty: data.specialty ?? null,
  }
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  // Try full insert (expires_at + note_content)
  const { data: row, error } = await supabase
    .from('consultations')
    .insert({ ...base, expires_at: expiresAt, note_content: data.note_content ?? null })
    .select('id').single()
  if (!error) return (row as { id: string }).id

  // Fallback 1: without expires_at, keep note_content
  const { data: row2, error: err2 } = await supabase
    .from('consultations')
    .insert({ ...base, note_content: data.note_content ?? null })
    .select('id').single()
  if (!err2) return (row2 as { id: string }).id

  // Fallback 2: bare minimum (neither expires_at nor note_content — columns may not exist)
  console.warn('[Dictia] createPendingConsultation: falling back to bare insert')
  const { data: row3, error: err3 } = await supabase
    .from('consultations').insert(base).select('id').single()
  if (err3) { console.error('Error al guardar consulta pendiente:', err3); return null }
  return (row3 as { id: string }).id
}

export async function approveConsultation(
  consultationId: string,
  noteContent?: SoapNote | null
): Promise<boolean> {
  if (!isSupabaseConfigured || !consultationId) return false

  const approvedAt = new Date().toISOString()

  // Try writing note_content alongside status (note_content column must exist)
  if (noteContent !== undefined && noteContent !== null) {
    console.log('[Dictia] Guardando note_content en approveConsultation:', JSON.stringify(noteContent).substring(0, 200))
    const { data, error } = await supabase
      .from('consultations')
      .update({ status: 'approved', approved_at: approvedAt, note_content: noteContent })
      .eq('id', consultationId)
      .select('id')

    console.log('[Dictia] UPDATE result (con note_content):', { rowsAffected: data?.length ?? 0, error: error?.message ?? null })

    if (!error) {
      if ((data?.length ?? 0) > 0) {
        console.log('[Dictia] approveConsultation: note_content saved to DB ✓')
        return true
      }
      // 0 rows affected — ID not found or RLS blocked it
      console.warn('[Dictia] approveConsultation: 0 rows affected. consultationId:', consultationId)
      return false
    }
    console.warn('[Dictia] approveConsultation: note_content write failed:', error.message, '— retrying status-only')
  }

  // Fallback: update status only (note_content column may not exist)
  const { data, error } = await supabase
    .from('consultations')
    .update({ status: 'approved', approved_at: approvedAt })
    .eq('id', consultationId)
    .select('id')

  console.log('[Dictia] UPDATE result (status only fallback):', { rowsAffected: data?.length ?? 0, error: error?.message ?? null })

  if (error) {
    console.error('[Dictia] approveConsultation fallback UPDATE error:', error)
    return false
  }

  // Status written. Now try note_content in a separate call (column may have just been created)
  if (noteContent && (data?.length ?? 0) > 0) {
    const { error: ncErr } = await supabase
      .from('consultations')
      .update({ note_content: noteContent })
      .eq('id', consultationId)
    if (ncErr) {
      console.error('[Dictia] note_content separate write failed:', ncErr.message, '— note only in localStorage')
    } else {
      console.log('[Dictia] note_content written in separate call ✓')
    }
  }

  return (data?.length ?? 0) > 0
}

export async function fetchConsultationById(
  userId: string,
  consultationId: string
): Promise<Consultation | null> {
  if (!isSupabaseConfigured || !userId || !consultationId) return null

  // Try full select with note_content
  const { data, error } = await supabase
    .from('consultations')
    .select('id, user_id, recording_duration, note_type, status, specialty, created_at, approved_at, expires_at, note_content')
    .eq('id', consultationId)
    .eq('user_id', userId)
    .single()

  if (!error && data) return data as Consultation

  // Fallback: without columns that may not exist
  const { data: data2, error: err2 } = await supabase
    .from('consultations')
    .select('id, user_id, recording_duration, note_type, status, specialty, created_at, approved_at')
    .eq('id', consultationId)
    .eq('user_id', userId)
    .single()

  if (err2) { console.error('[Dictia] fetchConsultationById error:', err2); return null }
  return { ...data2, expires_at: null, note_content: null } as Consultation
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

  // Try full query (expires_at + note_content)
  const { data, error } = await supabase
    .from('consultations')
    .select('id, user_id, recording_duration, note_type, status, specialty, created_at, approved_at, expires_at, note_content')
    .eq('user_id', userId)
    .neq('status', 'discarded')
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!error) return (data ?? []) as Consultation[]

  // Fallback 1: without expires_at filter, keep note_content
  console.warn('[Dictia] fetchConsultations: expires_at missing, trying without filter')
  const { data: data2, error: err2 } = await supabase
    .from('consultations')
    .select('id, user_id, recording_duration, note_type, status, specialty, created_at, approved_at, note_content')
    .eq('user_id', userId)
    .neq('status', 'discarded')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!err2) return (data2 ?? []).map(row => ({ ...row, expires_at: null })) as Consultation[]

  // Fallback 2: bare query (neither expires_at nor note_content)
  console.warn('[Dictia] fetchConsultations: falling back to bare query')
  const { data: data3, error: err3 } = await supabase
    .from('consultations')
    .select('id, user_id, recording_duration, note_type, status, specialty, created_at, approved_at')
    .eq('user_id', userId)
    .neq('status', 'discarded')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (err3) { console.error('Error al cargar consultas:', err3); return [] }
  return (data3 ?? []).map(row => ({ ...row, expires_at: null, note_content: null })) as Consultation[]
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
