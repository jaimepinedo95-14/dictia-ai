import { supabase, isSupabaseConfigured } from './supabase'
import type { Clinica, CreditTransaction, ClinicUser } from './supabase'

// ─── Super Admin functions ─────────────────────────────────────────────────────
// Todas las funciones de este archivo leen ÚNICAMENTE de Supabase. Si Supabase no
// está configurado o una consulta falla, devuelven vacío/cero y registran el error
// en consola — NUNCA datos inventados. Si el panel se ve vacío, revisa la consola
// del navegador para el error real (RLS, RPC no desplegado, etc.).
export async function fetchAllClinics(): Promise<Clinica[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase.from('clinicas').select('*').order('created_at', { ascending: false })
  if (error) { console.error('[Dictia] fetchAllClinics:', error.message); return [] }
  return (data as Clinica[]) ?? []
}

export async function createClinica(data: Partial<Clinica>): Promise<void> {
  if (!isSupabaseConfigured) return
  await supabase.from('clinicas').insert(data)
}

// ─── Clinic Admin functions ────────────────────────────────────────────────────
export async function fetchClinicById(clinicaId: string): Promise<Clinica | null> {
  if (!isSupabaseConfigured) return null
  const { data, error } = await supabase.from('clinicas').select('*').eq('id', clinicaId).single()
  if (error) { console.error('[Dictia] fetchClinicById:', error.message); return null }
  return (data as Clinica) ?? null
}

export async function fetchClinicDoctors(clinicaId: string): Promise<ClinicUser[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('clinic_users')
    .select('*, user:user_profiles(full_name, email, specialty)')
    .eq('clinica_id', clinicaId)
    .eq('activo', true)
  if (error) { console.error('[Dictia] fetchClinicDoctors:', error.message); return [] }
  return (data as ClinicUser[]) ?? []
}

export async function fetchCreditHistory(clinicaId: string): Promise<CreditTransaction[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('clinica_id', clinicaId)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) { console.error('[Dictia] fetchCreditHistory:', error.message); return [] }
  return (data as CreditTransaction[]) ?? []
}

export async function updateClinicIps(clinicaId: string, ips: string[]): Promise<void> {
  if (!isSupabaseConfigured) return
  await supabase.from('clinicas').update({ ips_autorizadas: ips }).eq('id', clinicaId)
}

export async function updateClinicModules(clinicaId: string, modules: string[]): Promise<void> {
  if (!isSupabaseConfigured) return
  await supabase.from('clinicas').update({ modulos_activos: modules }).eq('id', clinicaId)
}

export async function inviteDoctor(clinicaId: string, email: string): Promise<void> {
  if (!isSupabaseConfigured) return
  // In production: look up user by email, then insert clinic_users record
  const { data: user } = await supabase.from('user_profiles').select('id').eq('email', email).single()
  if (user?.id) {
    await supabase.from('clinic_users').insert({ clinica_id: clinicaId, user_id: user.id, rol: 'medico' })
  }
}

export async function removeDoctor(clinicUserId: string): Promise<void> {
  if (!isSupabaseConfigured) return
  await supabase.from('clinic_users').update({ activo: false }).eq('id', clinicUserId)
}

// ─── IP restriction check ──────────────────────────────────────────────────────
export async function getCurrentIp(): Promise<string> {
  try {
    const res = await fetch('https://api.ipify.org?format=json')
    const data = await res.json() as { ip: string }
    return data.ip
  } catch {
    return ''
  }
}

export async function fetchClinicCredits(clinicaId: string): Promise<number> {
  if (!isSupabaseConfigured) return 0
  const { data, error } = await supabase
    .from('clinicas')
    .select('creditos_disponibles')
    .eq('id', clinicaId)
    .single()
  if (error) { console.error('[Dictia] fetchClinicCredits:', error.message); return 0 }
  return (data as { creditos_disponibles: number } | null)?.creditos_disponibles ?? 0
}

export async function deductClinicCredit(clinicaId: string, amount: number, descripcion: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false
  const { error } = await supabase.rpc('deduct_clinic_credit', {
    p_clinica_id: clinicaId,
    p_amount: amount,
    p_descripcion: descripcion,
  })
  if (error) {
    // Fallback: manual update
    const current = await fetchClinicCredits(clinicaId)
    if (current < amount) return false
    await supabase.from('clinicas').update({ creditos_disponibles: current - amount }).eq('id', clinicaId)
    await supabase.from('credit_transactions').insert({
      clinica_id: clinicaId, tipo: 'consumo', creditos: amount, descripcion,
    })
  }
  // Increment monthly usage counter
  const { data: cur } = await supabase.from('clinicas').select('hc_used_this_month').eq('id', clinicaId).single()
  const curMonth = (cur as { hc_used_this_month?: number } | null)?.hc_used_this_month ?? 0
  await supabase.from('clinicas').update({ hc_used_this_month: curMonth + amount }).eq('id', clinicaId)
  return true
}

// ─── User management (Super Admin) ────────────────────────────────────────────
// Requires these RLS policies in Supabase SQL editor:
//   create policy "Super admin reads all profiles" on public.user_profiles
//     for select using (auth.jwt() ->> 'email' = 'jaimepinedo95@gmail.com' OR auth.uid() = id);
//   create policy "Super admin updates all profiles" on public.user_profiles
//     for update using (auth.jwt() ->> 'email' = 'jaimepinedo95@gmail.com' OR auth.uid() = id);
//
// fetchAllConsultationsList (panel /admin/super, pestaña "Consultas") también necesita
// que el super admin pueda leer TODAS las filas de consultations (no solo las propias).
// Si la tabla solo tiene la policy "Users can view own consultations" (auth.uid() = user_id),
// agrega esta también en el SQL Editor de Supabase:
//   create policy "Super admin reads all consultations" on public.consultations
//     for select using (auth.jwt() ->> 'email' = 'jaimepinedo95@gmail.com' OR auth.uid() = user_id);

// full_name, specialty, plan, subscription_status pueden ser null: el usuario
// existe en auth.users (se registró) pero todavía no tiene fila en user_profiles
// (insert falló o quedó pendiente). El email SIEMPRE viene de auth.users, nunca falta.
export type UserSummary = {
  id: string
  full_name: string | null
  email: string
  specialty: string | null
  plan: string | null
  plan_seleccionado: string | null
  subscription_status: string | null
  consultations_used: number
  consultations_limit: number
  trial_start_at: string | null
  trial_end_at: string | null
  created_at: string
}

const PLAN_LIMITS: Record<string, number> = {
  basic: 100, standard: 250, advanced: 350, pro: 500, free_trial: 10, gratis: 999999,
}

// Usa el RPC admin_list_all_users (ver SQL en el comentario más abajo) en vez de
// consultar user_profiles directamente. auth.users es la fuente de verdad de
// "quién está registrado" — user_profiles puede tener filas faltantes si el
// insert automático falló (pasó con los bugs de 'gender' y de RLS recursivo).
// El RPC hace el LEFT JOIN server-side y devuelve TODOS los usuarios de
// auth.users, con los campos de perfil en null cuando no existe la fila.
//
// Requiere correr este SQL una vez en el SQL Editor de Supabase:
//
//   create or replace function public.admin_list_all_users()
//   returns table (
//     id uuid, email text, full_name text, specialty text, plan text,
//     plan_seleccionado text, subscription_status text,
//     consultations_used integer, consultations_limit integer,
//     trial_start_at timestamptz, trial_end_at timestamptz, created_at timestamptz
//   )
//   language plpgsql security definer set search_path = public, auth as $$
//   begin
//     if auth.jwt() ->> 'email' is distinct from 'jaimepinedo95@gmail.com' then
//       raise exception 'No autorizado';
//     end if;
//     return query
//     select u.id, u.email::text, p.full_name, p.specialty, p.plan, p.plan_seleccionado,
//            p.subscription_status, coalesce(p.consultations_used, 0), coalesce(p.consultations_limit, 0),
//            p.trial_start_at, p.trial_end_at, coalesce(p.created_at, u.created_at)
//     from auth.users u
//     left join public.user_profiles p on p.id = u.id
//     order by coalesce(p.created_at, u.created_at) desc;
//   end; $$;
//   grant execute on function public.admin_list_all_users() to authenticated;
export async function fetchAllUsers(): Promise<UserSummary[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase.rpc('admin_list_all_users')
  if (error) {
    console.error('[Dictia] fetchAllUsers (RPC admin_list_all_users) — ¿está desplegado el RPC en Supabase? Ver comentario arriba:', error.message)
    return []
  }
  console.log('[Dictia] fetchAllUsers: filas recibidas (auth.users LEFT JOIN user_profiles):', data?.length ?? 0)
  return (data as UserSummary[]) ?? []
}

// El usuario puede no tener fila en user_profiles todavía (ver fetchAllUsers/
// admin_list_all_users) — un simple update() en ese caso afectaría 0 filas y el
// cambio de plan fallaría en silencio. Por eso: intenta UPDATE primero (no toca
// full_name si ya existe); si 0 filas fueron afectadas, crea la fila con INSERT
// usando el email como base del nombre. email es obligatorio porque la columna
// es NOT NULL y se necesita para crear la fila si no existe.
export async function updateUserPlan(userId: string, plan: string, email: string): Promise<void> {
  if (!isSupabaseConfigured) return
  const patch = {
    plan_seleccionado: plan,
    plan,
    subscription_status: 'active',
    consultations_limit: PLAN_LIMITS[plan] ?? 250,
  }
  const { data, error } = await supabase.from('user_profiles').update(patch).eq('id', userId).select('id')
  if (error) { console.error('[Dictia] updateUserPlan (update):', error.message); return }
  if ((data?.length ?? 0) > 0) return

  // No existing row — create it now
  const { error: insertError } = await supabase.from('user_profiles').insert({
    id: userId,
    email,
    full_name: email.split('@')[0],
    ...patch,
  })
  if (insertError) console.error('[Dictia] updateUserPlan (insert fallback):', insertError.message)
}

export async function grantFreeAccess(userId: string): Promise<void> {
  if (!isSupabaseConfigured) return
  const { error } = await supabase.from('user_profiles').update({
    plan: 'gratis',
    plan_seleccionado: 'gratis',
    subscription_status: 'active',
    consultations_limit: 999999,
  }).eq('id', userId)
  if (error) console.error('[Dictia] grantFreeAccess:', error.message)
}

// Cuenta SOLO consultas 'approved' — debe coincidir con profile.consultations_used
// (que solo se incrementa al aprobar, ver incrementConsultations en AuthContext) y
// con fetchSavingsStats en db.ts (usado por el Dashboard del médico). Antes esta
// función contaba TODAS las filas sin filtrar por status, lo que hacía que el
// número del panel super admin no coincidiera con el del dashboard del médico
// (incluía notas 'processing'/'discarded' que nunca consumieron un crédito real).
export async function fetchNotesStats(): Promise<{ today: number; month: number; total: number }> {
  if (!isSupabaseConfigured) return { today: 0, month: 0, total: 0 }
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const [t, m, all] = await Promise.all([
    supabase.from('consultations').select('*', { count: 'exact', head: true }).eq('status', 'approved').gte('created_at', `${todayStr}T00:00:00`),
    supabase.from('consultations').select('*', { count: 'exact', head: true }).eq('status', 'approved').gte('created_at', firstOfMonth),
    supabase.from('consultations').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
  ])
  return { today: t.count ?? 0, month: m.count ?? 0, total: all.count ?? 0 }
}

export async function blockUser(userId: string): Promise<void> {
  if (!isSupabaseConfigured) return
  const { error } = await supabase.from('user_profiles').update({
    subscription_status: 'cancelled',
    consultations_limit: 0,
  }).eq('id', userId)
  if (error) console.error('[Dictia] blockUser:', error.message)
}

export async function reactivateUser(userId: string): Promise<void> {
  if (!isSupabaseConfigured) return
  const { error } = await supabase.from('user_profiles').update({
    subscription_status: 'active',
    consultations_limit: 250,  // default to standard on reactivate
  }).eq('id', userId)
  if (error) console.error('[Dictia] reactivateUser:', error.message)
}

export async function deleteUser(userId: string): Promise<void> {
  if (!isSupabaseConfigured) return
  const { error } = await supabase.from('user_profiles').delete().eq('id', userId)
  if (error) console.error('[Dictia] deleteUser:', error.message)
}

export type NoteTypeCount = { type: string; count: number }
export type SpecialtyCount = { specialty: string; count: number }
export type DayCount = { day: string; count: number }

export async function fetchNotesByType(): Promise<NoteTypeCount[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase.from('consultations').select('note_type')
  if (error) { console.error('[Dictia] fetchNotesByType:', error.message); return [] }
  const counts: Record<string, number> = {}
  ;(data as { note_type: string }[]).forEach(r => {
    const t = r.note_type || 'ingreso'
    counts[t] = (counts[t] ?? 0) + 1
  })
  return Object.entries(counts).map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
}

export async function fetchNotesBySpecialty(): Promise<SpecialtyCount[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase.from('consultations').select('specialty')
  if (error) { console.error('[Dictia] fetchNotesBySpecialty:', error.message); return [] }
  const counts: Record<string, number> = {}
  ;(data as { specialty: string | null }[]).forEach(r => {
    const s = r.specialty || 'Sin especialidad'
    counts[s] = (counts[s] ?? 0) + 1
  })
  return Object.entries(counts).map(([specialty, count]) => ({ specialty, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
}

export type ConsultationSummary = {
  id: string
  created_at: string
  note_type: string | null
  specialty: string | null
  status: string | null
  doctor_name: string
  doctor_email: string
}

export async function fetchAllConsultationsList(limit = 200): Promise<ConsultationSummary[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('consultations')
    .select('id, created_at, note_type, specialty, status, user:user_profiles(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    console.error('[Dictia] fetchAllConsultationsList:', error.message)
    return []
  }
  type Row = {
    id: string
    created_at: string
    note_type: string | null
    specialty: string | null
    status: string | null
    user: { full_name: string | null; email: string | null } | { full_name: string | null; email: string | null }[] | null
  }
  return ((data ?? []) as Row[]).map(row => {
    const u = Array.isArray(row.user) ? row.user[0] : row.user
    return {
      id: row.id,
      created_at: row.created_at,
      note_type: row.note_type,
      specialty: row.specialty,
      status: row.status,
      doctor_name: u?.full_name || '(sin nombre)',
      doctor_email: u?.email || '—',
    }
  })
}

// Conteo de consultas del mes en curso por usuario — para la columna
// "Notas usadas este mes" del panel Super Admin (separado del contador
// histórico consultations_used que vive en user_profiles).
export async function fetchMonthlyConsultationCounts(): Promise<Record<string, number>> {
  if (!isSupabaseConfigured) return {}
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const { data, error } = await supabase
    .from('consultations')
    .select('user_id')
    .eq('status', 'approved')
    .gte('created_at', firstOfMonth)
  if (error) {
    console.error('[Dictia] fetchMonthlyConsultationCounts:', error.message)
    return {}
  }
  const counts: Record<string, number> = {}
  ;((data ?? []) as { user_id: string }[]).forEach(r => {
    counts[r.user_id] = (counts[r.user_id] ?? 0) + 1
  })
  return counts
}

export async function fetchNotesByDay(): Promise<DayCount[]> {
  const days: DayCount[] = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400000)
    return { day: d.toISOString().split('T')[0], count: 0 }
  })
  if (!isSupabaseConfigured) return days
  const since = days[0].day + 'T00:00:00'
  const { data, error } = await supabase
    .from('consultations')
    .select('created_at')
    .gte('created_at', since)
  if (error) { console.error('[Dictia] fetchNotesByDay:', error.message); return days }
  ;(data as { created_at: string }[]).forEach(r => {
    const day = r.created_at.split('T')[0]
    const found = days.find(d => d.day === day)
    if (found) found.count++
  })
  return days
}

export function isIpAuthorized(currentIp: string, authorizedIps: string[]): boolean {
  if (authorizedIps.length === 0) return true // No restriction
  return authorizedIps.some(cidr => {
    if (!cidr.includes('/')) return currentIp === cidr
    // Simple CIDR check for /16 and /24 subnets
    const [network, prefix] = cidr.split('/')
    const prefixLen = parseInt(prefix)
    const netParts = network.split('.').map(Number)
    const ipParts = currentIp.split('.').map(Number)
    if (prefixLen === 24) return netParts[0] === ipParts[0] && netParts[1] === ipParts[1] && netParts[2] === ipParts[2]
    if (prefixLen === 16) return netParts[0] === ipParts[0] && netParts[1] === ipParts[1]
    if (prefixLen === 8) return netParts[0] === ipParts[0]
    return false
  })
}
