import { createClient } from '@supabase/supabase-js'

// ─── Supabase config ───────────────────────────────────────────────────────────
// Set these in .env.local:
//   VITE_SUPABASE_URL=https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=your-anon-key
// Fallback hardcoded for production while env vars are being debugged — safe because
// Supabase anon key is intentionally public; security is enforced by RLS policies.
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://rggncanavwbbbjrjpins.supabase.co'
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnZ25jYW5hdndiYmJqcmpwaW5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2NzQwNjksImV4cCI6MjA2NTI1MDA2OX0.Am4eLt2U58wIoSc0_qnR2hmnFV0jgah8oqbJ_bM_2vY'

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  !supabaseUrl.includes('aqui_va') &&
  supabaseUrl.startsWith('https://') &&
  supabaseAnonKey &&
  !supabaseAnonKey.includes('aqui_va')
)

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder',
  {
    global: {
      headers: {
        'Accept': 'application/json',
      },
    },
  }
)

// ─── Database types ────────────────────────────────────────────────────────────
export type SubscriptionStatus = 'pending' | 'trial' | 'active' | 'cancelled' | 'expired'

export type UserProfile = {
  id: string
  full_name: string
  email: string
  country: string
  specialty: string
  plan: 'free_trial' | 'basic' | 'standard' | 'advanced' | 'pro'
  consultations_used: number
  consultations_limit: number
  trial_ends_at: string | null
  created_at: string
  note_style?: 'uppercase' | 'lowercase'
  role?: 'medico' | 'admin_clinica' | 'super_admin'
  clinica_id?: string | null
  accepted_terms_at?: string | null
  accepted_terms_version?: string | null
  hourly_rate_cop?: number | null
  // Subscription / billing
  subscription_status?: SubscriptionStatus | null
  plan_seleccionado?: string | null
  trial_start_at?: string | null
  trial_end_at?: string | null
  trial_notes_limit?: number | null
  trial_notes_used?: number | null
  wompi_customer_id?: string | null
  wompi_subscription_id?: string | null
  card_registered_at?: string | null
}

export type GlosaShield = {
  criterios_documentados: string[]
  diagnostico_con_soporte: boolean
  plan_coherente: boolean
  posibles_faltantes: string[]
  alertas_glosa?: string[]
}

export type Clinica = {
  id: string
  nombre: string
  email_admin: string
  creditos_disponibles: number
  creditos_totales: number
  ips_autorizadas: string[]
  modulos_activos: string[]
  activa: boolean
  created_at: string
  hc_used_this_month?: number
}

export type CreditTransaction = {
  id: string
  clinica_id: string
  tipo: 'recarga' | 'consumo'
  creditos: number
  descripcion: string
  created_at: string
}

export type ClinicUser = {
  id: string
  user_id: string
  clinica_id: string
  rol: 'admin_clinica' | 'medico'
  activo: boolean
  created_at: string
  user?: Partial<UserProfile>
}

export type NoteType = 'ingreso' | 'evolucion' | 'telemedicina' | 'traslado'

export type Consultation = {
  id: string
  user_id: string
  recording_duration: number
  note_type: NoteType | null
  status: 'processing' | 'completed' | 'approved' | 'discarded'
  specialty: string | null
  created_at: string
  approved_at: string | null
  expires_at: string | null
  note_content: SoapNote | null
}

export type PharmaSuggestion = {
  nombre_generico: string
  nombre_comercial: string
  dosis: string
  indicacion: string
}

export type SoapNote = {
  // Common fields
  note_type?: NoteType
  chief_complaint: string
  current_illness: string
  relevant_history: string
  review_of_systems?: string
  physical_exam: string
  paraclinical_results?: string
  physical_exam_is_default: boolean
  analysis: string
  diagnosis: string
  cie10_code: string
  cie10_description: string
  management_plan: string
  patient_instructions: string
  pharma_suggestions?: PharmaSuggestion[]
  glosa_shield?: GlosaShield
  is_telemedicine?: boolean
  referral_letter?: string
  disability_certificate?: string
  // Evolution note specific fields
  vital_signs?: string
  labs?: string
  active_diagnoses?: string
  hospitalization_day?: number
  evolution_date?: string
}

/*
── Supabase SQL schema (run once in SQL editor) ──────────────────────────────

create table public.user_profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  email text not null,
  country text not null default 'Colombia',
  specialty text not null default 'Medicina General',
  plan text not null default 'free_trial',
  consultations_used integer not null default 0,
  consultations_limit integer not null default 999999,
  trial_ends_at timestamptz,
  created_at timestamptz default now(),
  note_style text,
  role text not null default 'medico',
  clinica_id uuid,
  accepted_terms_at timestamptz,
  accepted_terms_version text,
  subscription_status text default 'pending',
  plan_seleccionado text,
  trial_start_at timestamptz,
  trial_end_at timestamptz,
  wompi_customer_id text,
  wompi_subscription_id text,
  card_registered_at timestamptz
);

-- Migration for existing tables (run if user_profiles already exists):
-- alter table public.user_profiles add column if not exists accepted_terms_at timestamptz;
-- alter table public.user_profiles add column if not exists accepted_terms_version text;
-- alter table public.user_profiles add column if not exists hourly_rate_cop integer default 150000;
-- alter table public.user_profiles add column if not exists subscription_status text default 'pending';
-- alter table public.user_profiles add column if not exists plan_seleccionado text;
-- alter table public.user_profiles add column if not exists trial_start_at timestamptz;
-- alter table public.user_profiles add column if not exists trial_end_at timestamptz;
-- alter table public.user_profiles add column if not exists wompi_customer_id text;
-- alter table public.user_profiles add column if not exists wompi_subscription_id text;
-- alter table public.user_profiles add column if not exists card_registered_at timestamptz;
-- alter table public.user_profiles add column if not exists trial_notes_limit integer default 15;
-- alter table public.user_profiles add column if not exists trial_notes_used integer default 0;
-- Para usuarios existentes que ya estaban activos antes de este sistema:
-- update public.user_profiles set subscription_status = 'active' where created_at < '2026-06-14';

create table public.consultations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.user_profiles(id) on delete cascade not null,
  recording_duration integer default 0,
  note_type text,
  status text not null default 'processing',
  specialty text,
  created_at timestamptz default now(),
  approved_at timestamptz
  -- NO patient_name, NO transcript, NO soap_note: zero clinical content stored
);

create table public.demos_solicitados (
  id uuid default gen_random_uuid() primary key,
  nombre_completo text not null,
  nombre_institucion text not null,
  email_institucional text not null,
  numero_medicos integer,
  telefono text,
  created_at timestamptz default now()
);

create table public.clinicas (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  email_admin text not null,
  creditos_disponibles decimal not null default 0,
  creditos_totales decimal not null default 0,
  ips_autorizadas text[] default '{}',
  modulos_activos text[] default ARRAY['urgencias'],
  activa boolean default true,
  created_at timestamptz default now()
);

create table public.clinic_users (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.user_profiles(id) on delete cascade,
  clinica_id uuid references public.clinicas(id) on delete cascade,
  rol text not null default 'medico',
  activo boolean default true,
  created_at timestamptz default now()
);

create table public.credit_transactions (
  id uuid default gen_random_uuid() primary key,
  clinica_id uuid references public.clinicas(id),
  tipo text not null,
  creditos decimal not null,
  descripcion text,
  created_at timestamptz default now()
);

alter table public.user_profiles enable row level security;
alter table public.consultations enable row level security;
alter table public.clinicas enable row level security;

create policy "Users can insert own profile" on public.user_profiles
  for insert with check (auth.uid() = id);
create policy "Users can view own profile" on public.user_profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.user_profiles
  for update using (auth.uid() = id);

create policy "Users can view own consultations" on public.consultations
  for all using (auth.uid() = user_id);
*/
