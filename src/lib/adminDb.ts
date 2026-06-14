import { supabase, isSupabaseConfigured } from './supabase'
import type { Clinica, CreditTransaction, ClinicUser } from './supabase'

// ─── Mock data for demo mode ───────────────────────────────────────────────────
export const MOCK_CLINICAS: Clinica[] = [
  {
    id: 'clinica-001',
    nombre: 'Clínica Santa María',
    email_admin: 'admin@santamaria.com',
    creditos_disponibles: 850,
    creditos_totales: 1000,
    ips_autorizadas: ['192.168.1.0/24', '10.0.0.0/8'],
    modulos_activos: ['urgencias', 'telemedicina', 'evolucion_hospitalizacion'],
    activa: true,
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'clinica-002',
    nombre: 'IPS Saludvida Medellín',
    email_admin: 'admin@saludvida.com',
    creditos_disponibles: 4820,
    creditos_totales: 5000,
    ips_autorizadas: [],
    modulos_activos: ['urgencias', 'evolucion_hospitalizacion'],
    activa: true,
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'clinica-003',
    nombre: 'Centro Médico Especialidades Bogotá',
    email_admin: 'admin@especialidades.com',
    creditos_disponibles: 125,
    creditos_totales: 10000,
    ips_autorizadas: ['201.235.0.0/16'],
    modulos_activos: ['urgencias', 'telemedicina', 'evolucion_hospitalizacion', 'evolucion_uci'],
    activa: true,
    created_at: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

export const MOCK_CREDIT_TRANSACTIONS: CreditTransaction[] = [
  { id: 'tx-1', clinica_id: 'clinica-001', tipo: 'recarga', creditos: 1000, descripcion: 'Compra inicial 1,000 HCs', created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'tx-2', clinica_id: 'clinica-001', tipo: 'consumo', creditos: 80, descripcion: 'Consumo mensual — abril 2026', created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'tx-3', clinica_id: 'clinica-001', tipo: 'consumo', creditos: 70, descripcion: 'Consumo mensual — mayo 2026', created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
]

export const MOCK_CLINIC_DOCTORS: ClinicUser[] = [
  {
    id: 'cu-1',
    user_id: 'mock-user-id',
    clinica_id: 'clinica-001',
    rol: 'medico',
    activo: true,
    created_at: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000).toISOString(),
    user: { full_name: 'Dr. Alejandro García', email: 'dr.garcia@dictia.health', specialty: 'Medicina General' },
  },
  {
    id: 'cu-2',
    user_id: 'user-2',
    clinica_id: 'clinica-001',
    rol: 'medico',
    activo: true,
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    user: { full_name: 'Dra. Catalina Restrepo', email: 'dra.restrepo@santamaria.com', specialty: 'Medicina Interna' },
  },
  {
    id: 'cu-3',
    user_id: 'user-3',
    clinica_id: 'clinica-001',
    rol: 'medico',
    activo: true,
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    user: { full_name: 'Dr. Miguel Vargas', email: 'dr.vargas@santamaria.com', specialty: 'Urgencias y Emergencias' },
  },
]

// ─── Super Admin functions ─────────────────────────────────────────────────────
export async function fetchAllClinics(): Promise<Clinica[]> {
  if (!isSupabaseConfigured) return MOCK_CLINICAS
  const { data } = await supabase.from('clinicas').select('*').order('created_at', { ascending: false })
  return (data as Clinica[]) ?? []
}

export async function createClinica(data: Partial<Clinica>): Promise<void> {
  if (!isSupabaseConfigured) return
  await supabase.from('clinicas').insert(data)
}

// ─── Clinic Admin functions ────────────────────────────────────────────────────
export async function fetchClinicById(clinicaId: string): Promise<Clinica | null> {
  if (!isSupabaseConfigured) return MOCK_CLINICAS.find(c => c.id === clinicaId) ?? MOCK_CLINICAS[0]
  const { data } = await supabase.from('clinicas').select('*').eq('id', clinicaId).single()
  return (data as Clinica) ?? null
}

export async function fetchClinicDoctors(clinicaId: string): Promise<ClinicUser[]> {
  if (!isSupabaseConfigured) return MOCK_CLINIC_DOCTORS
  const { data } = await supabase
    .from('clinic_users')
    .select('*, user:user_profiles(full_name, email, specialty)')
    .eq('clinica_id', clinicaId)
    .eq('activo', true)
  return (data as ClinicUser[]) ?? []
}

export async function fetchCreditHistory(clinicaId: string): Promise<CreditTransaction[]> {
  if (!isSupabaseConfigured) return MOCK_CREDIT_TRANSACTIONS.filter(t => t.clinica_id === clinicaId)
  const { data } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('clinica_id', clinicaId)
    .order('created_at', { ascending: false })
    .limit(20)
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
  if (!isSupabaseConfigured) {
    const mock = MOCK_CLINICAS.find(c => c.id === clinicaId)
    return mock?.creditos_disponibles ?? 0
  }
  const { data } = await supabase
    .from('clinicas')
    .select('creditos_disponibles')
    .eq('id', clinicaId)
    .single()
  return (data as { creditos_disponibles: number } | null)?.creditos_disponibles ?? 0
}

export async function deductClinicCredit(clinicaId: string, amount: number, descripcion: string): Promise<boolean> {
  if (!isSupabaseConfigured) return true // mock success
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
  return true
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
