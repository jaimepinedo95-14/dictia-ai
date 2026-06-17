import { supabase } from './supabase'
import type { Clinica, CreditTransaction, ClinicUser } from './supabase'

export interface B2BSession {
  clinicId: string
  clinicName: string
  adminEmail: string
  sessionToken: string
}

export interface ClinicStats {
  hc_used_this_month: number
  creditos_disponibles: number
  doctors_active: number
  costo_estimado_cop: number
}

export function getB2BSession(): B2BSession | null {
  try {
    const raw = localStorage.getItem('adminB2BSession')
    return raw ? (JSON.parse(raw) as B2BSession) : null
  } catch {
    return null
  }
}

export function clearB2BSession() {
  localStorage.removeItem('adminB2BSession')
}

export async function fetchClinicForB2B(clinicId: string): Promise<Clinica | null> {
  const { data } = await supabase.from('clinicas').select('*').eq('id', clinicId).single()
  return (data as Clinica) ?? null
}

export async function fetchClinicByEmail(email: string): Promise<Clinica | null> {
  const { data } = await supabase
    .from('clinicas')
    .select('*')
    .eq('email_admin', email.toLowerCase().trim())
    .single()
  return (data as Clinica) ?? null
}

export async function fetchClinicStats(clinicId: string, doctors: ClinicUser[]): Promise<ClinicStats> {
  const { data: clinic } = await supabase
    .from('clinicas')
    .select('hc_used_this_month, creditos_disponibles')
    .eq('id', clinicId)
    .single()
  const hcUsed = (clinic as { hc_used_this_month?: number; creditos_disponibles?: number } | null)?.hc_used_this_month ?? 0
  const hcAvailable = (clinic as { hc_used_this_month?: number; creditos_disponibles?: number } | null)?.creditos_disponibles ?? 0
  return {
    hc_used_this_month: hcUsed,
    creditos_disponibles: hcAvailable,
    doctors_active: doctors.filter(d => d.activo).length,
    costo_estimado_cop: hcUsed * 350,
  }
}

export async function fetchClinicDoctorsB2B(clinicId: string): Promise<ClinicUser[]> {
  const { data } = await supabase
    .from('clinic_users')
    .select('*, user:user_profiles(full_name, email, specialty)')
    .eq('clinica_id', clinicId)
    .order('created_at', { ascending: false })
  return (data as ClinicUser[]) ?? []
}

export async function addDoctorToClinic(
  clinicId: string,
  email: string,
): Promise<{ success: boolean; error?: string }> {
  const { data: user } = await supabase
    .from('user_profiles')
    .select('id, email, full_name')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (!user) {
    return {
      success: false,
      error: 'No existe un usuario registrado con ese email. El médico debe registrarse primero en Dictia.',
    }
  }

  // Check if already linked
  const { data: existing } = await supabase
    .from('clinic_users')
    .select('id, activo')
    .eq('clinica_id', clinicId)
    .eq('user_id', (user as { id: string }).id)
    .single()

  if (existing) {
    if ((existing as { activo: boolean }).activo) {
      return { success: false, error: 'Este médico ya está vinculado a la institución.' }
    }
    // Reactivate
    await supabase.from('clinic_users').update({ activo: true }).eq('id', (existing as { id: string }).id)
    await supabase.from('user_profiles').update({ clinica_id: clinicId }).eq('id', (user as { id: string }).id)
    return { success: true }
  }

  const { error } = await supabase.from('clinic_users').insert({
    clinica_id: clinicId,
    user_id: (user as { id: string }).id,
    rol: 'medico',
    activo: true,
  })
  if (error) return { success: false, error: error.message }

  await supabase.from('user_profiles').update({ clinica_id: clinicId }).eq('id', (user as { id: string }).id)
  return { success: true }
}

export async function setDoctorActive(clinicUserId: string, userId: string, active: boolean): Promise<void> {
  await supabase.from('clinic_users').update({ activo: active }).eq('id', clinicUserId)
  if (!active) {
    await supabase.from('user_profiles').update({ clinica_id: null }).eq('id', userId)
  }
}

export async function removeDoctorFromClinic(clinicUserId: string, userId: string): Promise<void> {
  await supabase.from('clinic_users').delete().eq('id', clinicUserId)
  await supabase.from('user_profiles').update({ clinica_id: null }).eq('id', userId)
}

export async function updateClinicIps(clinicId: string, ips: string[]): Promise<void> {
  await supabase.from('clinicas').update({ ips_autorizadas: ips }).eq('id', clinicId)
}

export async function rechargeClinicCredits(clinicId: string, amount: number, nota: string): Promise<void> {
  const { data: clinic } = await supabase
    .from('clinicas')
    .select('creditos_disponibles, creditos_totales')
    .eq('id', clinicId)
    .single()
  const cur = clinic as { creditos_disponibles: number; creditos_totales: number } | null
  await supabase.from('clinicas').update({
    creditos_disponibles: (cur?.creditos_disponibles ?? 0) + amount,
    creditos_totales: (cur?.creditos_totales ?? 0) + amount,
  }).eq('id', clinicId)
  await supabase.from('credit_transactions').insert({
    clinica_id: clinicId,
    tipo: 'recarga',
    creditos: amount,
    descripcion: nota || `Recarga de ${amount} HCs`,
  })
}

export async function fetchTransactionHistoryB2B(clinicId: string): Promise<CreditTransaction[]> {
  const { data } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('clinica_id', clinicId)
    .order('created_at', { ascending: false })
    .limit(50)
  return (data as CreditTransaction[]) ?? []
}
