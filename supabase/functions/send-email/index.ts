// Edge Function: send-email
// Envía emails transaccionales via Resend.
// Configurar en Supabase Dashboard → Edge Functions → Secrets:
//   RESEND_API_KEY = re_xxxx
//   APP_URL = https://dictia.health

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const APP_URL = Deno.env.get('APP_URL') ?? 'https://dictia.health'
const FROM = 'Dictia AI <noreply@dictia.health>'

interface EmailPayload {
  type: 'trial_active' | 'trial_reminder' | 'payment_success' | 'payment_failed'
  email: string
  full_name: string
  plan_name: string
  plan_price: number  // COP
  trial_end_date?: string  // ISO string
  charge_date?: string
}

function formatCOP(amount: number) {
  return `$${amount.toLocaleString('es-CO')}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}

function getSubjectAndHtml(payload: EmailPayload): { subject: string; html: string } {
  const { type, full_name, plan_name, plan_price, trial_end_date, charge_date } = payload
  const firstName = full_name.split(' ').find(w => !w.match(/^Dr\.?$/i)) ?? full_name.split(' ')[0]
  const priceStr = formatCOP(plan_price)
  const endStr = trial_end_date ? formatDate(trial_end_date) : ''
  const chargeStr = charge_date ? formatDate(charge_date) : endStr

  const baseStyle = `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #334155;`
  const card = (content: string) =>
    `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;margin:24px 0;">${content}</div>`
  const btn = (href: string, text: string) =>
    `<a href="${href}" style="display:inline-block;background:#14B8A6;color:#fff;font-weight:700;padding:14px 28px;border-radius:12px;text-decoration:none;margin-top:16px;">${text}</a>`
  const small = (text: string) =>
    `<p style="font-size:12px;color:#94a3b8;margin-top:24px;">${text}</p>`

  if (type === 'trial_active') {
    return {
      subject: '¡Tu prueba gratuita de Dictia AI está activa!',
      html: `<div style="${baseStyle}">
        <h2 style="color:#14B8A6;">¡Hola, ${firstName}!</h2>
        <p>Tu prueba gratuita de <strong>3 días</strong> está activa. Tienes acceso completo a todas las funciones de Dictia AI.</p>
        ${card(`
          <p style="margin:0 0 8px 0;font-size:13px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Resumen de tu prueba</p>
          <p style="margin:4px 0;"><strong>Plan elegido:</strong> ${plan_name}</p>
          <p style="margin:4px 0;"><strong>Precio al activarse:</strong> ${priceStr}/mes</p>
          <p style="margin:4px 0;"><strong>Primer cobro:</strong> ${chargeStr}</p>
          <p style="margin:4px 0;font-size:13px;color:#64748b;margin-top:12px;">Si cancelas antes de esa fecha, no se realizará ningún cobro.</p>
        `)}
        ${btn(`${APP_URL}/dashboard`, 'Abrir Dictia AI')}
        <p style="margin-top:16px;font-size:13px;color:#64748b;">¿Quieres cancelar? Puedes hacerlo desde la barra en la parte superior de la app o escribiéndonos a <a href="mailto:soporte@dictia.health">soporte@dictia.health</a>.</p>
        ${small('Dictia AI · dictia.health · Procesado por Wompi (Bancolombia)')}
      </div>`,
    }
  }

  if (type === 'trial_reminder') {
    return {
      subject: `Mañana se activa tu plan Dictia AI ${plan_name}`,
      html: `<div style="${baseStyle}">
        <h2 style="color:#d97706;">Recordatorio, ${firstName}</h2>
        <p>Mañana, <strong>${chargeStr}</strong>, se realizará el primer cobro de tu plan <strong>${plan_name}</strong> por <strong>${priceStr}/mes</strong>.</p>
        ${card(`
          <p style="margin:0;font-size:14px;">Si ya revisaste tu nota del día con Dictia, ya sabes que vale cada peso. Si aún no la has probado, hoy es el día ideal para hacerlo.</p>
          ${btn(`${APP_URL}/nueva-consulta`, 'Generar mi primera nota')}
        `)}
        <p style="font-size:13px;color:#64748b;">¿Deseas cancelar antes del cobro? Entra a la app y toca <strong>"Cancelar prueba"</strong> en la barra superior.</p>
        ${small('Dictia AI · dictia.health')}
      </div>`,
    }
  }

  if (type === 'payment_success') {
    return {
      subject: `¡Bienvenido a Dictia AI ${plan_name}!`,
      html: `<div style="${baseStyle}">
        <h2 style="color:#059669;">¡Pago confirmado, ${firstName}!</h2>
        <p>Tu plan <strong>${plan_name}</strong> está activo. Gracias por confiar en Dictia AI.</p>
        ${card(`
          <p style="margin:0 0 8px 0;font-size:13px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Confirmación de pago</p>
          <p style="margin:4px 0;"><strong>Plan:</strong> ${plan_name}</p>
          <p style="margin:4px 0;"><strong>Importe:</strong> ${priceStr}/mes</p>
          <p style="margin:4px 0;"><strong>Fecha:</strong> ${chargeStr}</p>
        `)}
        ${btn(`${APP_URL}/dashboard`, 'Abrir Dictia AI')}
        ${small('Puedes cancelar en cualquier momento desde Facturación → Cancelar suscripción. Sin penalidad. · Dictia AI')}
      </div>`,
    }
  }

  // payment_failed
  return {
    subject: 'Problema con tu pago en Dictia AI',
    html: `<div style="${baseStyle}">
      <h2 style="color:#dc2626;">No pudimos procesar tu pago</h2>
      <p>Hola ${firstName}, no logramos cobrar tu plan <strong>${plan_name}</strong> (${priceStr}/mes). Tu acceso a Dictia AI ha sido suspendido temporalmente.</p>
      ${card(`
        <p style="margin:0 0 12px 0;"><strong>¿Qué hacer?</strong></p>
        <ul style="margin:0;padding-left:20px;font-size:14px;color:#475569;">
          <li>Verifica que tu tarjeta tiene fondos suficientes</li>
          <li>Confirma que la tarjeta no ha vencido</li>
          <li>Si tu banco bloqueó el pago, autoriza cargos recurrentes</li>
        </ul>
        ${btn(`${APP_URL}/subscription/vencido`, 'Actualizar mi tarjeta')}
      `)}
      <p style="font-size:13px;color:#64748b;">¿Necesitas ayuda? Escríbenos a <a href="mailto:soporte@dictia.health">soporte@dictia.health</a> y te ayudamos en minutos.</p>
      ${small('Dictia AI · dictia.health')}
    </div>`,
  }
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const payload: EmailPayload = await req.json()
    const { subject, html } = getSubjectAndHtml(payload)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM,
        to: [payload.email],
        subject,
        html,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Resend error ${res.status}: ${body}`)
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
