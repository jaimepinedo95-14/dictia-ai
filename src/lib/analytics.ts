import posthog from 'posthog-js'

const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined

export function initAnalytics() {
  if (!key) return
  posthog.init(key, {
    api_host: 'https://app.posthog.com',
    capture_pageview: true,
    autocapture: false,
  })
}

export function identifyUser(userId: string, props?: Record<string, string | number | boolean | null>) {
  if (!key) return
  posthog.identify(userId, props)
}

export function resetAnalytics() {
  if (!key) return
  posthog.reset()
}

export function track(event: string, props?: Record<string, string | number | boolean | null>) {
  if (!key) return
  posthog.capture(event, props)
}

// ── Named events ──────────────────────────────────────────────────────────────

export const Analytics = {
  usuarioRegistrado: (specialty: string, country: string) =>
    track('usuario_registrado', { specialty, country }),

  consultaGrabada: (durationSeconds: number, noteType: string | null) =>
    track('consulta_grabada', { duration_seconds: durationSeconds, note_type: noteType }),

  notaGenerada: (noteType: string | null, specialty: string | null) =>
    track('nota_generada', { note_type: noteType, specialty }),

  notaAprobada: (noteType: string | null, specialty: string | null) =>
    track('nota_aprobada', { note_type: noteType, specialty }),

  planActivado: (plan: string, userId: string) =>
    track('plan_activado', { plan, user_id: userId }),
}
