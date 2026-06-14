// Edge Function: billing-cron
// Cron job diario que gestiona el ciclo de vida de los trials.
//
// Configurar en Supabase Dashboard → Edge Functions → Secrets:
//   WOMPI_PRIVATE_KEY  = prv_prod_xxxx (clave privada de Wompi)
//   WOMPI_PUBLIC_KEY   = pub_prod_xxxx  (clave pública de Wompi)
//   WOMPI_API_URL      = https://production.wompi.co/v1
//   SUPABASE_URL       = https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY = eyJxxxxx (service role, no anon)
//
// Configurar el cron en Supabase Dashboard → Edge Functions → billing-cron → Schedule:
//   Cron expression: 0 6 * * *  (diario a las 6am UTC = 1am Colombia)
//
// También envía emails via la función send-email.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WOMPI_PRIVATE_KEY = Deno.env.get('WOMPI_PRIVATE_KEY')!
const WOMPI_PUBLIC_KEY = Deno.env.get('WOMPI_PUBLIC_KEY')!
const WOMPI_API_URL = Deno.env.get('WOMPI_API_URL') ?? 'https://production.wompi.co/v1'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// Precios en centavos de COP (1 COP = 100 centavos)
const PLAN_PRICES_CENTS: Record<string, number> = {
  basic: 3_990_000,
  standard: 4_990_000,
  advanced: 6_490_000,
  pro: 8_990_000,
}

const PLAN_PRICES_COP: Record<string, number> = {
  basic: 39_900,
  standard: 49_900,
  advanced: 64_900,
  pro: 89_900,
}

const PLAN_NAMES: Record<string, string> = {
  basic: 'Básico',
  standard: 'Estándar',
  advanced: 'Avanzado',
  pro: 'Pro',
}

// ── Get Wompi acceptance token (required for transactions) ────────────────────
async function getAcceptanceToken(): Promise<{ acceptance_token: string; personal_auth_token: string }> {
  const res = await fetch(`${WOMPI_API_URL}/merchants/${WOMPI_PUBLIC_KEY}`)
  const json = await res.json()
  const presigned = json.data?.presigned_acceptance
  const personal = json.data?.presigned_personal_data_auth
  return {
    acceptance_token: presigned?.acceptance_token ?? '',
    personal_auth_token: personal?.acceptance_token ?? '',
  }
}

// ── Charge a saved payment source via Wompi ───────────────────────────────────
async function chargePaymentSource(
  paymentSourceId: string,
  amountInCents: number,
  email: string,
  reference: string,
): Promise<{ success: boolean; transactionId?: string; status?: string }> {
  const { acceptance_token, personal_auth_token } = await getAcceptanceToken()

  const body = {
    amount_in_cents: amountInCents,
    currency: 'COP',
    customer_email: email,
    reference,
    acceptance_token,
    accept_personal_auth: personal_auth_token,
    payment_method: {
      type: 'CARD',
      payment_source_id: Number(paymentSourceId),
    },
  }

  const res = await fetch(`${WOMPI_API_URL}/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${WOMPI_PRIVATE_KEY}`,
    },
    body: JSON.stringify(body),
  })

  const json = await res.json()
  const txn = json.data

  if (!txn) return { success: false, status: 'NO_RESPONSE' }
  return { success: txn.status === 'APPROVED', transactionId: txn.id, status: txn.status }
}

// ── Send email via the send-email Edge Function ───────────────────────────────
async function sendEmail(payload: Record<string, unknown>) {
  await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify(payload),
  })
}

// ── Main handler ──────────────────────────────────────────────────────────────
serve(async () => {
  const now = new Date()
  const results: string[] = []

  // ── 1. Send reminder to users whose trial ends TOMORROW ──────────────────────
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const tomorrowStart = new Date(tomorrow)
  tomorrowStart.setUTCHours(0, 0, 0, 0)
  const tomorrowEnd = new Date(tomorrow)
  tomorrowEnd.setUTCHours(23, 59, 59, 999)

  const { data: reminderUsers } = await supabase
    .from('user_profiles')
    .select('id, email, full_name, plan_seleccionado, trial_end_at')
    .eq('subscription_status', 'trial')
    .gte('trial_end_at', tomorrowStart.toISOString())
    .lte('trial_end_at', tomorrowEnd.toISOString())

  for (const user of reminderUsers ?? []) {
    const planId = user.plan_seleccionado ?? 'standard'
    await sendEmail({
      type: 'trial_reminder',
      email: user.email,
      full_name: user.full_name,
      plan_name: PLAN_NAMES[planId] ?? planId,
      plan_price: PLAN_PRICES_COP[planId] ?? 49_900,
      trial_end_date: user.trial_end_at,
      charge_date: user.trial_end_at,
    })
    results.push(`reminder:${user.email}`)
  }

  // ── 2. Charge users whose trial ends TODAY or is overdue ──────────────────────
  const { data: expiredTrials } = await supabase
    .from('user_profiles')
    .select('id, email, full_name, plan_seleccionado, wompi_customer_id, trial_end_at')
    .eq('subscription_status', 'trial')
    .not('wompi_customer_id', 'is', null)
    .lte('trial_end_at', now.toISOString())

  for (const user of expiredTrials ?? []) {
    const planId = user.plan_seleccionado ?? 'standard'
    const amountCents = PLAN_PRICES_CENTS[planId] ?? 4_990_000
    const planCOP = PLAN_PRICES_COP[planId] ?? 49_900
    const planName = PLAN_NAMES[planId] ?? planId
    const reference = `dictia_sub_${user.id}_${Date.now()}`

    const { success, status } = await chargePaymentSource(
      user.wompi_customer_id,
      amountCents,
      user.email,
      reference,
    )

    if (success) {
      // Activate subscription
      await supabase
        .from('user_profiles')
        .update({
          subscription_status: 'active',
          plan: planId,
          consultations_limit: { basic: 130, standard: 250, advanced: 440, pro: 900 }[planId] ?? 250,
          // Reset trial_ends_at so canRecord() switches to plan-based limit
          trial_ends_at: null,
        })
        .eq('id', user.id)

      await sendEmail({
        type: 'payment_success',
        email: user.email,
        full_name: user.full_name,
        plan_name: planName,
        plan_price: planCOP,
        charge_date: now.toISOString(),
      })
      results.push(`charged:${user.email}:OK`)
    } else {
      // Mark as expired
      await supabase
        .from('user_profiles')
        .update({ subscription_status: 'expired' })
        .eq('id', user.id)

      await sendEmail({
        type: 'payment_failed',
        email: user.email,
        full_name: user.full_name,
        plan_name: planName,
        plan_price: planCOP,
        charge_date: now.toISOString(),
      })
      results.push(`charged:${user.email}:FAILED(${status})`)
    }
  }

  console.log('billing-cron completed:', results)

  return new Response(JSON.stringify({ ok: true, processed: results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
