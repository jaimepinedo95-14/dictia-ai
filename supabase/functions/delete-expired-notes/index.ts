// Edge Function: delete-expired-notes
// Cron job que purga el contenido clínico (note_content) de las consultas
// cuyo expires_at ya pasó. Implementa la promesa de privacidad del landing:
// "la nota se elimina automáticamente a las 24 horas".
//
// No borra la fila completa — conserva metadata sin datos de paciente
// (recording_duration, note_type, specialty, created_at) para que el médico
// siga viendo su conteo de historial/estadísticas de uso.
//
// Configurar en Supabase Dashboard → Edge Functions → Secrets:
//   SUPABASE_URL              = https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY = eyJxxxxx (service role, no anon)
//
// Configurar el cron en Supabase Dashboard → Edge Functions → delete-expired-notes → Schedule:
//   Cron expression: 0 * * * *  (cada hora)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

serve(async () => {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('consultations')
    .update({ note_content: null })
    .lt('expires_at', now)
    .not('note_content', 'is', null)
    .select('id')

  if (error) {
    console.error('[delete-expired-notes] Error al purgar notas expiradas:', error)
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }

  const purgedCount = data?.length ?? 0
  console.log(`[delete-expired-notes] Notas purgadas: ${purgedCount}`)

  return new Response(JSON.stringify({ ok: true, purged: purgedCount }), {
    headers: { 'content-type': 'application/json' },
  })
})
