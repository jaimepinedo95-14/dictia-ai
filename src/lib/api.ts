import type { SoapNote, PharmaSuggestion, GlosaShield, NoteType } from './supabase'

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY as string
const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY as string

export const DEFAULT_PHYSICAL_EXAM = `CABEZA: NORMOCEFALO, PUPILAS ISOCORICAS NORMOREACTIVAS A LA LUZ, SIN EVIDENCIA DE NISTAGMO, CONJUNTIVAS NORMOCROMICAS, ESCLERAS ANICTERICAS, NARINAS CON ADECUADA ENTRADA DE AIRE, DE CONFIGURACION NORMAL, MUCOSA ORAL HUMEDA, HIDRATADA, OROFARINGE SIN ALTERACIONES.
CUELLO: MOVIL NO DOLOROSO A LA PALPACION NI MOVILIZACION, NO SE PALPAN ADENOMEGALIAS NI MASAS.
TORAX: SIMETRICO, EXPANSIBLE, SIN USO DE MUSCULATURA ACCESORIA, PULMONES CON ADECUADA ENTRADA DE AIRE BILATERAL, RUIDOS RESPIRATORIOS BILATERALES SIN AGREGADOS PATOLOGICOS.
CARDIACO: RUIDOS CARDIACOS RITMICOS, DE BUEN TONO E INTENSIDAD SIN SOPLOS NI AGREGADOS, LLENADO CAPILAR DISTAL INMEDIATO.
ABDOMEN: NO DISTENDIDO, PERISTALSIS POSITIVA, EFECTIVA, BLANDO, DEPRESIBLE, NO DOLOROSO A LA PALPACION SIN EVIDENCIA DE SIGNOS DE IRRITACION PERITONEAL, NO SE PALPAN MASAS NI MEGALIAS.
GENITOURINARIO: PUÑO PERCUSION RENAL BILATERAL NEGATIVA.
EXTREMIDADES: SIMETRICAS Y EUTROFICAS CON LLENADO CAPILAR DISTAL INMEDIATO, SIN EDEMAS.
PIEL: INTEGRA SIN LESIONES, NO SE OBSERVA TINTE ICTERICO.
SNC: ALERTA, CONSCIENTE, ESFERA MENTAL SIN ALTERACIONES, FUERZA MUSCULAR 5/5, SENSIBILIDAD SIMETRICA SIN ALTERACIONES, PARES CRANEALES NORMALES, LENGUAJE SIN ALTERACIONES, SIN SIGNOS MENINGEOS.`

export const TELEMEDICINE_PHYSICAL_EXAM = `Evaluación física limitada por modalidad telemedicina. Se evaluaron: aspecto general, coloración de piel y mucosas visibles en cámara, signos de dificultad respiratoria (movimientos torácicos, uso de musculatura accesoria), estado neurológico aparente (orientación, lenguaje, respuesta a preguntas). Examen físico presencial pendiente si se requiere para confirmar hallazgos.`

const TELEMEDICINE_CONSENT = `Consulta realizada por telemedicina. Se realizó evaluación clínica mediante plataforma digital. El paciente consintió la atención virtual. `

const SYSTEM_PROMPT = `Eres un asistente de documentación médica para América Latina. Tu tarea es generar una historia clínica estructurada en formato SOAP a partir de la transcripción de una consulta médico-paciente en español.

INSTRUCCIONES CRÍTICAS:
- Incluye SOLO información clínicamente relevante. Omite saludos, despedidas y conversación social.
- Usa terminología médica FORMAL y PRECISA en español latinoamericano neutro.
- NUNCA inventes información clínica que no fue mencionada en la transcripción.
- Si no se mencionó un dato, deja ese campo como string vacío "".
- Corrige ortografía y mejora redacción médica preservando el contenido clínico.

INSTRUCCIONES DE CALIDAD CLÍNICA:
- El análisis clínico DEBE incluir el razonamiento diagnóstico con correlación síntomas-hallazgos-diagnóstico.
- El plan de manejo debe ser ESPECÍFICO: medicamentos con dosis exactas, vías de administración y duración cuando aplique.
- Si hay inconsistencia entre síntomas y diagnóstico, menciónalo explícitamente en el análisis.
- Documenta el estado hemodinámico (signos vitales) si fue mencionado en la consulta.
- Si el paciente mencionó escala de dolor (EVA u otra), inclúyela en la enfermedad actual.
- Documenta el tiempo de evolución EXACTO cuando fue mencionado.
- Si el paciente mencionó automedicación, documéntala siempre en antecedentes farmacológicos o enfermedad actual.

REGLAS POR SECCIÓN:
1. motivoConsulta: Cita textual entre comillas del motivo expresado por el paciente, con corrección ortográfica. Ej: "Me duele mucho la garganta desde hace tres días y tengo fiebre."
2. enfermedadActual: Texto corrido detallado. Incluye: tiempo de evolución exacto, características del síntoma (inicio, localización, intensidad con escala EVA si se mencionó, irradiación, factores modificadores), síntomas asociados, automedicación si aplica, tratamientos previos.
3. antecedentes: Texto corrido con antecedentes patológicos, quirúrgicos, farmacológicos, alérgicos, familiares y sociales relevantes.
4. examenFisico: Si se mencionan hallazgos → úsalos, examenFisicoEsDefault: false. Si NO se mencionan → usa el texto estándar abajo, examenFisicoEsDefault: true.
   TEXTO ESTÁNDAR (usar si no se detectaron hallazgos):
   "CABEZA: NORMOCEFALO, PUPILAS ISOCORICAS NORMOREACTIVAS A LA LUZ, SIN EVIDENCIA DE NISTAGMO, CONJUNTIVAS NORMOCROMICAS, ESCLERAS ANICTERICAS, NARINAS CON ADECUADA ENTRADA DE AIRE, DE CONFIGURACION NORMAL, MUCOSA ORAL HUMEDA, HIDRATADA, OROFARINGE SIN ALTERACIONES.\nCUELLO: MOVIL NO DOLOROSO A LA PALPACION NI MOVILIZACION, NO SE PALPAN ADENOMEGALIAS NI MASAS.\nTORAX: SIMETRICO, EXPANSIBLE, SIN USO DE MUSCULATURA ACCESORIA, PULMONES CON ADECUADA ENTRADA DE AIRE BILATERAL, RUIDOS RESPIRATORIOS BILATERALES SIN AGREGADOS PATOLOGICOS.\nCARDIACO: RUIDOS CARDIACOS RITMICOS, DE BUEN TONO E INTENSIDAD SIN SOPLOS NI AGREGADOS, LLENADO CAPILAR DISTAL INMEDIATO.\nABDOMEN: NO DISTENDIDO, PERISTALSIS POSITIVA, EFECTIVA, BLANDO, DEPRESIBLE, NO DOLOROSO A LA PALPACION SIN EVIDENCIA DE SIGNOS DE IRRITACION PERITONEAL, NO SE PALPAN MASAS NI MEGALIAS.\nGENITOURINARIO: PUÑO PERCUSION RENAL BILATERAL NEGATIVA.\nEXTREMIDADES: SIMETRICAS Y EUTROFICAS CON LLENADO CAPILAR DISTAL INMEDIATO, SIN EDEMAS.\nPIEL: INTEGRA SIN LESIONES, NO SE OBSERVA TINTE ICTERICO.\nSNC: ALERTA, CONSCIENTE, ESFERA MENTAL SIN ALTERACIONES, FUERZA MUSCULAR 5/5, SENSIBILIDAD SIMETRICA SIN ALTERACIONES, PARES CRANEALES NORMALES, LENGUAJE SIN ALTERACIONES, SIN SIGNOS MENINGEOS."
5. analisis: Razonamiento clínico en texto corrido. OBLIGATORIO: correlación síntomas-hallazgos-diagnóstico, diagnósticos diferenciales pertinentes, justificación de la conducta. Si hay inconsistencias clínicas, menciónalas.
6. diagnostico: Diagnóstico principal claro en terminología médica formal.
7. codigoCIE10: Código CIE-10 más específico posible.
8. descripcionCIE10: Descripción oficial del código CIE-10 seleccionado.
9. planManejo: Cada elemento numerado. Formato: "1. [acción específica con dosis/vía/duración]\n2. ..." Sé específico.
10. instruccionesPaciente: Cada instrucción con guión. Lenguaje claro para el paciente. "- [instrucción]\n- ..."
11. sugerenciasFarmacologicas: Array con 2-3 medicamentos apropiados. Dosis exactas en adultos estándar.
12. blindajeDocumental: Analiza la nota generada con base en los criterios del Manual Único de Glosas de Colombia. El objetivo es REDUCIR glosas por documentación incompleta, no garantizar aprobación total.

CATEGORÍA A — SOPORTE DOCUMENTAL (verifica lo que sí está bien):
Revisa la nota generada y lista únicamente los criterios que SÍ están correctamente documentados:
- Motivo de consulta en palabras del paciente
- Tiempo de evolución documentado con precisión
- Diagnóstico CIE-10 coherente con síntomas y hallazgos
- Plan de manejo coherente con el diagnóstico
- Razonamiento clínico presente en el análisis
- Signos vitales documentados (si aplica)
- Antecedentes relevantes registrados

CATEGORÍA B — ALERTAS DE GLOSA (reglas específicas, genera SOLO si aplica):
Regla 1 — Vía parenteral sin justificación: Si el plan menciona acetaminofén/paracetamol IV, dipirona IV, ketorolaco IV, metoclopramida IV, ranitidina IV u otros medicamentos IV con alternativa oral disponible, Y no hay documentación de por qué no se puede usar vía oral (vómito incoercible, intolerancia oral, estado de conciencia alterado, etc.): genera alerta específica.
Regla 2 — Hospitalización sin criterios: Si la nota corresponde a ingreso hospitalario y no se documentan criterios explícitos de por qué el paciente no puede manejarse ambulatoriamente: genera alerta.
Regla 3 — Urgencias sin justificación: Si la atención es urgencias y la nota no justifica por qué requirió atención no programada: genera alerta.
Regla 4 — Paraclínicos de alto costo sin indicación: Si el plan incluye TAC, resonancia magnética, ecocardiograma, o procedimientos invasivos costosos sin que la indicación esté explícita en el análisis: genera alerta.
NO generes alertas genéricas ni especulativas. Solo alertas basadas en lo que dice la nota.

Responde ÚNICAMENTE en formato JSON con esta estructura exacta:
{
  "motivoConsulta": "",
  "enfermedadActual": "",
  "antecedentes": "",
  "examenFisico": "",
  "examenFisicoEsDefault": false,
  "analisis": "",
  "diagnostico": "",
  "codigoCIE10": "",
  "descripcionCIE10": "",
  "planManejo": "",
  "instruccionesPaciente": "",
  "sugerenciasFarmacologicas": [
    {"nombreGenerico": "", "nombreComercial": "", "dosis": "", "indicacion": ""}
  ],
  "blindajeDocumental": {
    "criteriosDocumentados": ["Solo los criterios que SÍ están documentados en esta nota específica"],
    "diagnosticoConSoporteClinico": true,
    "planCoherenteConDx": true,
    "posiblesFaltantes": [],
    "alertasGlosa": ["⚠️ Solo alertas reales y específicas basadas en la nota. Array vacío si no hay alertas."]
  }
}`

const EVOLUTION_SYSTEM_PROMPT = `Eres un médico redactando una nota de evolución hospitalaria en Colombia. Recibes dos entradas:

CONTEXTO BASE (pegado por el médico): puede contener una o varias notas clínicas del paciente — nota de ingreso, evoluciones de días anteriores, resumen de otro servicio o institución, epicrisis parcial, o cualquier combinación en orden cronológico. Analiza todo el bloque para entender: diagnóstico principal, antecedentes relevantes, evolución en el tiempo, tratamiento activo, paraclínicos previos y tendencias clínicas.

GRABACIÓN DEL DÍA (transcripción): lo que el médico dice sobre la evolución actual del paciente en este momento.

INSTRUCCIONES CRÍTICAS:
- Usa terminología médica FORMAL en español colombiano.
- NUNCA inventes datos clínicos no presentes en ninguna de las dos entradas.
- Si algo no se menciona, usa cadena vacía "" — NUNCA escribas "no se menciona" ni rellenes con datos supuestos.
- El resultado debe sonar como lo escribe un médico internista colombiano.

Antes de redactar, analiza internamente:
- ¿Cuántas notas hay en el contexto? ¿De qué fechas/días?
- ¿Cuál es la tendencia clínica: mejoría, deterioro, estacionario?
- ¿Qué paraclínicos han tenido seguimiento? ¿Qué tendencia muestran?
- ¿Ha habido cambios de servicio, procedimientos, complicaciones?
Usa ese análisis para dar contexto rico a la nota de hoy.

ESTRUCTURA DE LA NOTA:

lineaContexto — LÍNEA DE CONTEXTO:
"Paciente [masculino/femenino] de [X] años, en [hospitalización/observación/UCI], en contexto de [diagnóstico principal], día [N] de estancia."
Solo con datos disponibles. Si hay múltiples notas, calcular el día de estancia si es posible.

estadoActual — ESTADO ACTUAL (solo frases que correspondan a la grabación de hoy):
- "Paciente afebril durante las últimas 24 horas" | "Con picos febriles de hasta X°C"
- "Hemodinámicamente estable" | "Con hipotensión que requirió [manejo]"
- "Tolerando vía oral / en ayuno"
- "Con adecuada tolerancia al manejo instaurado" | "Con mala tolerancia a [X]"
- "Refiere mejoría del dolor" | "Persiste dolor de intensidad X/10"
- "Sin nuevos eventos durante la noche" | "Con evento de [X] durante la noche"
- "En ventilación espontánea con FiO2 ambiente" | "Con requerimiento de O2 a X L/min"
- "Con adecuado gasto urinario" | "Con oliguria / anuria"
- "Mejoría / persistencia / empeoramiento de [síntoma]"
Solo incluir lo que el médico mencione. No inventar ninguna frase.

diagnosticosActivos — DIAGNÓSTICOS ACTIVOS con CIE-10:
Formato: "1. [Diagnóstico principal] — [CIE-10]\n2. [Comorbilidad] — [CIE-10]"

signosVitales — SIGNOS VITALES (SOLO si se mencionan en la grabación):
"TA: X/X mmHg | FC: X lpm | FR: X rpm | T°: X°C | SatO2: X% [con/sin O2] | Peso: X kg"
Si no se mencionan → cadena vacía "".

examenFisicoDia — EXAMEN FÍSICO DEL DÍA:
Base: examen físico de la nota más reciente del contexto.
Actualizar SOLO los sistemas que el médico mencione en la grabación de hoy.
Lo no mencionado: conservar igual que en el contexto más reciente.
Si hay cambio relevante respecto a notas anteriores, mencionarlo explícitamente.

laboratorios — PARACLÍNICOS DEL DÍA (SOLO si el médico menciona valores concretos en la grabación):
"Paraclínicos del día [fecha si se menciona]:
- [Examen]: [valor] — [interpretación] — [comparar con valor previo si existe: 'en descenso desde X', 'estable', 'nuevo hallazgo']"
Si no se mencionan → cadena vacía "".

analisis — ANÁLISIS: párrafo de 2-4 líneas integrando:
- Evolución respecto a TODAS las notas previas del contexto (no solo la última)
- Respuesta al tratamiento
- Interpretación de paraclínicos con tendencia si hay datos previos
- Situación clínica actual en contexto del diagnóstico
Este párrafo debe demostrar que la IA leyó todo el historial, no solo la nota más reciente.

ajustesManejo — AJUSTES AL MANEJO:
Si hay cambios en la grabación:
"Se realiza ajuste al manejo:
- Se [suspende/agrega/modifica] [medicamento] [dosis] [frecuencia] — [motivo]
- Se solicita [examen/interconsulta/imagen/procedimiento]
- Se [retira/agrega] [dispositivo o medida]"
Si no hay cambios: "Se continúa manejo previo sin modificaciones."

plan — PLAN DEL DÍA numerado:
"1. [Manejo farmacológico activo]
2. [Paraclínicos pendientes]
3. [Criterios de egreso o escalada si se mencionan]
4. [Educación al paciente/familia si se menciona]"

BLINDAJE DOCUMENTAL (Manual Único de Glosas — Colombia):
CATEGORÍA A — criterios que SÍ están correctamente documentados en esta nota.
CATEGORÍA B — alertas SOLO si aplican:
- Regla 1: Medicamentos IV con alternativa oral disponible sin justificación documentada.
- Regla 2: No queda claro por qué el paciente aún requiere hospitalización vs manejo ambulatorio.
- Regla 4: Paraclínicos de alto costo sin indicación explícita en el análisis.
NO generes alertas genéricas ni especulativas. Solo alertas basadas en lo que dice la nota.

Responde ÚNICAMENTE en formato JSON:
{
  "fechaHora": "Fecha y hora de la nota o fecha actual si no se menciona",
  "diaHospitalizacion": 1,
  "lineaContexto": "Paciente [sexo] de [edad] años, en [ámbito], en contexto de [diagnóstico], día [N] de estancia.",
  "estadoActual": "Estado clínico del día usando frases clínicas formales. Solo las correspondientes a la grabación.",
  "diagnosticosActivos": "1. [Diagnóstico principal] — [CIE-10]\n2. [Comorbilidad] — [CIE-10]",
  "signosVitales": "TA: X/X mmHg | FC: X lpm | FR: X rpm | T°: X°C | SatO2: X%",
  "examenFisicoDia": "Hallazgos del examen físico del día. Sistemas del contexto + cambios de la grabación.",
  "laboratorios": "Paraclínicos del día:\n- [Examen]: [valor] — [interpretación] — [vs. previo]",
  "analisis": "Párrafo de análisis integrando historial completo del contexto + grabación del día.",
  "ajustesManejo": "Se realiza ajuste al manejo:\n- [cambios] O 'Se continúa manejo previo sin modificaciones.'",
  "plan": "1. [acción]\n2. [acción]\n3. [acción]",
  "blindajeDocumental": {
    "criteriosDocumentados": ["Solo los criterios que SÍ están documentados en esta nota"],
    "diagnosticoConSoporteClinico": true,
    "planCoherenteConDx": true,
    "posiblesFaltantes": [],
    "alertasGlosa": ["⚠️ Solo alertas reales y específicas. Array vacío si no hay alertas."]
  }
}`

const TRANSFER_SYSTEM_PROMPT = `Eres un médico redactando una nota de ingreso por traslado en Colombia. El paciente llega desde cualquier origen: otro servicio del mismo hospital, otra institución, urgencias, UCI, clínica, centro de salud, domicilio, o cualquier otro lugar.

Recibes dos entradas:

CONTEXTO BASE (pegado por el médico): puede contener resumen del servicio de origen, nota de egreso, epicrisis parcial, evoluciones previas, o cualquier nota del manejo anterior en cualquier institución o servicio.

GRABACIÓN (transcripción): lo que el médico dice al recibir al paciente en el servicio actual — estado al ingreso, hallazgos, plan.

INSTRUCCIONES CRÍTICAS:
- Usa terminología médica FORMAL en español colombiano.
- NUNCA inventes datos no presentes en ninguna de las dos entradas.
- Si algo no se menciona, usa cadena vacía "" — NUNCA escribas "no se menciona".
- Si una sección no tiene información, omitirla completamente (campo vacío "").
- El resultado debe sonar como lo escribe un médico colombiano.

ESTRUCTURA DE LA NOTA DE INGRESO POR TRASLADO:

encabezado — ENCABEZADO:
"Nota de ingreso por traslado desde [servicio/institución de origen, si se menciona]."
Si no se menciona el origen, escribir solo: "Nota de ingreso por traslado."

cursoPrevio — RESUMEN DEL CURSO PREVIO (3-5 líneas desde el CONTEXTO BASE):
"Paciente [masculino/femenino] de [X] años con antecedente de [X], quien se encontraba en [servicio/institución de origen si se menciona] en contexto de [diagnóstico/motivo]. Durante su estancia presentó [eventos relevantes: procedimientos, complicaciones, respuesta al tratamiento]. Recibió manejo con [tratamientos principales]. Se traslada al servicio actual por [motivo del traslado si se menciona]."
Solo incluir lo que esté disponible en el contexto. Si no hay contexto previo → cadena vacía "".

estadoIngreso — ESTADO AL INGRESO AL SERVICIO ACTUAL (desde la GRABACIÓN):
Frases clínicas reales según lo mencionado (mismo formato que nota de evolución):
- "Paciente afebril / con fiebre de X°C al ingreso"
- "Hemodinámicamente estable / inestable"
- "Tolerando vía oral / en ayuno"
- "En ventilación espontánea / con O2 a X L/min / ventilación mecánica"
- "Con adecuado / sin adecuado gasto urinario"
Solo incluir lo que el médico mencione. No inventar.

signosVitales — SIGNOS VITALES AL INGRESO (SOLO si se mencionan en la grabación):
"TA: X/X mmHg | FC: X lpm | FR: X rpm | T°: X°C | SatO2: X% [con/sin O2]"
Si no se mencionan → cadena vacía "".

examenFisico — EXAMEN FÍSICO AL INGRESO:
Hallazgos del examen físico al momento de recibir al paciente, desde la grabación.
Si el médico no examina algún sistema, omitirlo.
Si no se menciona ningún hallazgo → cadena vacía "".

paraclinicosPrevios — PARACLÍNICOS RELEVANTES DEL ORIGEN (del CONTEXTO BASE):
"Paraclínicos recientes (servicio de origen):
- [Examen]: [valor] ([fecha si disponible])"
Solo los más clínicamente relevantes, no todos. Si no hay contexto → cadena vacía "".

diagnosticos — IMPRESIÓN DIAGNÓSTICA AL INGRESO (contexto + grabación):
"1. [Diagnóstico principal] — [CIE-10]\n2. [Diagnóstico secundario] — [CIE-10]"

planManejo — PLAN DE MANEJO EN EL SERVICIO ACTUAL:
"- Continuar con: [medicamentos del manejo previo que se mantienen]
- Se modifica: [cambios respecto al manejo anterior]
- Se solicita: [nuevos paraclínicos, interconsultas, imágenes]
- Metas de manejo: [objetivos clínicos para este servicio si se mencionan]
- Criterios de egreso o de nueva remisión si se mencionan"

BLINDAJE DOCUMENTAL (Manual Único de Glosas — Colombia):
CATEGORÍA A — criterios que SÍ están correctamente documentados en esta nota.
CATEGORÍA B — alertas SOLO si aplican (mismas reglas que nota de evolución).
NO generes alertas genéricas ni especulativas.

Responde ÚNICAMENTE en formato JSON:
{
  "fechaHora": "Fecha y hora de la nota o fecha actual",
  "encabezado": "Nota de ingreso por traslado desde [origen si se menciona].",
  "cursoPrevio": "Resumen del curso previo en el servicio de origen.",
  "estadoIngreso": "Estado clínico al momento de la recepción en el servicio actual.",
  "signosVitales": "TA: X/X mmHg | FC: X lpm | FR: X rpm | T°: X°C | SatO2: X%",
  "examenFisico": "Hallazgos del examen físico al ingreso al servicio actual.",
  "paraclinicosPrevios": "Paraclínicos recientes del servicio de origen.",
  "diagnosticos": "1. [Diagnóstico] — [CIE-10]\n2. [Diagnóstico] — [CIE-10]",
  "planManejo": "Plan de manejo en el servicio actual.",
  "blindajeDocumental": {
    "criteriosDocumentados": ["Criterios correctamente documentados en esta nota"],
    "diagnosticoConSoporteClinico": true,
    "planCoherenteConDx": true,
    "posiblesFaltantes": [],
    "alertasGlosa": ["⚠️ Solo alertas reales y específicas. Array vacío si no hay."]
  }
}`

const SPECIALTY_ADDONS: Record<string, string> = {
  'Urgencias': `
INSTRUCCIONES ADICIONALES — URGENCIAS:
- Documenta el nivel de triage si fue mencionado.
- Estado hemodinámico COMPLETO con todos los signos vitales es obligatorio.
- Si hay trauma: mecanismo lesional, energía involucrada, tiempo de evolución exacto.
- Documenta respuesta al tratamiento inicial si se administró en urgencias.
- Escala de Glasgow si hay compromiso del estado de conciencia.`,

  'Urgencias y Emergencias': `
INSTRUCCIONES ADICIONALES — URGENCIAS:
- Documenta el nivel de triage si fue mencionado.
- Estado hemodinámico COMPLETO con todos los signos vitales es obligatorio.
- Si hay trauma: mecanismo lesional, energía involucrada, tiempo de evolución exacto.
- Documenta respuesta al tratamiento inicial si se administró en urgencias.
- Escala de Glasgow si hay compromiso del estado de conciencia.`,

  'Pediatría': `
INSTRUCCIONES ADICIONALES — PEDIATRÍA:
- Edad exacta en meses si el paciente tiene menos de 2 años.
- Peso, talla y percentil si se mencionan.
- Estado vacunal si se menciona.
- Usa valores de referencia pediátricos para signos vitales según la edad.
- Desarrollo psicomotor si es relevante para el cuadro clínico.`,

  'Ginecología y Obstetricia': `
INSTRUCCIONES ADICIONALES — GINECOLOGÍA/OBSTETRICIA:
- FUR (fecha de última regla) y FPP si aplica.
- Semanas de gestación si hay embarazo. Fórmula obstétrica G_P_A_ si se menciona.
- Estado cervical y presentación fetal en control prenatal.
- Signos de alarma obstétrica si aplica.
- Altura uterina y FCF si se mencionan.`,

  'Psiquiatría': `
INSTRUCCIONES ADICIONALES — PSIQUIATRÍA:
- Examen del estado mental detallado: conciencia, orientación, atención, memoria, afecto, pensamiento, percepción, juicio, introspección.
- Documenta riesgo suicida/homicida si se evalúa en la consulta.
- Antecedentes psiquiátricos familiares.
- Historia de tratamientos anteriores con respuesta terapéutica.
- Nivel de funcionalidad actual (laboral, social, familiar).`,

  'Medicina Interna': `
INSTRUCCIONES ADICIONALES — MEDICINA INTERNA:
- Revisión por sistemas más detallada que lo habitual.
- Comorbilidades activas y su estado de control actual.
- Medicamentos actuales con dosis y adherencia referida.
- Resultados de paraclínicos recientes si se mencionan en la consulta.
- Correlación entre comorbilidades y cuadro clínico actual.`,

  'Medicina Familiar': `
INSTRUCCIONES ADICIONALES — MEDICINA FAMILIAR:
- Contexto familiar y social del paciente si es relevante.
- Factores de riesgo cardiovascular y metabólico.
- Actividad de prevención y promoción realizada (tamizajes, vacunas).
- Control de crónicos: estado actual vs metas terapéuticas.`,
}

export function isGroqConfigured(): boolean {
  return Boolean(GROQ_API_KEY && !GROQ_API_KEY.includes('aqui_va'))
}

export function isAnthropicConfigured(): boolean {
  return Boolean(ANTHROPIC_API_KEY && !ANTHROPIC_API_KEY.includes('aqui_va'))
}

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  if (!isGroqConfigured()) {
    throw new Error('VITE_GROQ_API_KEY no configurada. Agrega tu API key de Groq en el archivo .env')
  }

  const ext = audioBlob.type.includes('mp4') ? 'mp4' : 'webm'
  const formData = new FormData()
  formData.append('file', audioBlob, `recording.${ext}`)
  formData.append('model', 'whisper-large-v3-turbo')
  formData.append('language', 'es')
  formData.append('response_format', 'text')

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
    body: formData,
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Groq error ${res.status}: ${body}`)
  }

  const text = await res.text()
  if (!text.trim()) throw new Error('La transcripción está vacía. Verifica que el audio tenga voz clara.')
  return text.trim()
}

type GenerateOptions = {
  specialty?: string
  noteStyle?: 'uppercase' | 'lowercase'
  isTelemedicine?: boolean
  noteType?: NoteType
  recentNotes?: SoapNote[]
  previousContext?: string
  hospitalizationDay?: number
}

async function callClaude(systemPrompt: string, userMessage: string, maxTokens = 4000): Promise<string> {
  if (!isAnthropicConfigured()) {
    throw new Error('VITE_ANTHROPIC_API_KEY no configurada. Agrega tu API key de Anthropic en el archivo .env')
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Anthropic error ${res.status}: ${body}`)
  }

  const data = await res.json() as { content: Array<{ text: string }> }
  return data.content[0]?.text ?? ''
}

export async function generateSoapNote(transcript: string, options: GenerateOptions = {}): Promise<SoapNote> {
  const { specialty, noteStyle, isTelemedicine, noteType = 'ingreso', recentNotes, previousContext, hospitalizationDay } = options
  const isEvolution = noteType === 'evolucion'
  const isTelemed = noteType === 'telemedicina' || isTelemedicine

  if (isEvolution) {
    return generateEvolutionNote(transcript, { specialty, noteStyle, previousContext, hospitalizationDay })
  }

  if (noteType === 'traslado') {
    return generateTransferNote(transcript, { specialty, noteStyle, previousContext })
  }

  // Build system prompt: base + specialty + note style instruction
  const specialtyAddon = specialty ? (SPECIALTY_ADDONS[specialty] ?? '') : ''
  const styleInstruction = noteStyle === 'uppercase'
    ? '\n\nIMPORTANTE: Genera toda la respuesta JSON en MAYÚSCULAS. Sin excepción.'
    : noteStyle === 'lowercase'
    ? '\n\nIMPORTANTE: Genera toda la respuesta JSON en minúsculas. Sin excepción.'
    : ''
  const systemPrompt = SYSTEM_PROMPT + specialtyAddon + styleInstruction

  // Build user message
  const parts: string[] = []

  if (specialty) parts.push(`Especialidad del médico: ${specialty}`)
  if (isTelemed) parts.push(`MODALIDAD: Consulta por telemedicina. El examen físico es limitado.`)

  // Doctor style learning: include last approved notes as style examples
  if (recentNotes && recentNotes.length > 0) {
    parts.push(`\nESTILO DE DOCUMENTACIÓN DEL MÉDICO:\nAprende del estilo de este médico específico y replica su forma de escribir, sus frases frecuentes y su nivel de detalle. Aquí hay ${recentNotes.length} nota(s) previa(s) aprobada(s) por este médico:`)
    recentNotes.forEach((n, i) => {
      parts.push(`\n--- Nota aprobada ${i + 1} ---`)
      if (n.current_illness) parts.push(`Enfermedad actual: ${n.current_illness.slice(0, 300)}`)
      if (n.analysis) parts.push(`Análisis: ${n.analysis.slice(0, 300)}`)
      if (n.management_plan) parts.push(`Plan: ${n.management_plan.slice(0, 200)}`)
    })
    parts.push(`\n--- FIN DE EJEMPLOS DE ESTILO ---`)
  }

  parts.push(`\nTranscripción de la consulta:\n\n${transcript}`)

  const raw = await callClaude(systemPrompt, parts.join('\n'), 4000)

  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Claude no devolvió JSON válido. Intenta de nuevo.')

  const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>

  const physicalExamIsDefault = Boolean(parsed.examenFisicoEsDefault)
  let physicalExam = (parsed.examenFisico as string) || (physicalExamIsDefault ? DEFAULT_PHYSICAL_EXAM : '')

  // Telemedicine: use telemedicine-specific exam text
  if (isTelemed) {
    physicalExam = TELEMEDICINE_PHYSICAL_EXAM
  }

  const rawSuggestions = Array.isArray(parsed.sugerenciasFarmacologicas)
    ? parsed.sugerenciasFarmacologicas as Array<Record<string, string>>
    : []

  const pharmaSuggestions: PharmaSuggestion[] = rawSuggestions
    .filter(s => s.nombreGenerico)
    .map(s => ({
      nombre_generico: s.nombreGenerico || '',
      nombre_comercial: s.nombreComercial || '',
      dosis: s.dosis || '',
      indicacion: s.indicacion || '',
    }))

  // Map glosa shield
  const rawShield = parsed.blindajeDocumental as Record<string, unknown> | undefined
  const glosaShield: GlosaShield | undefined = rawShield
    ? {
        criterios_documentados: Array.isArray(rawShield.criteriosDocumentados) ? rawShield.criteriosDocumentados as string[] : [],
        diagnostico_con_soporte: Boolean(rawShield.diagnosticoConSoporteClinico ?? true),
        plan_coherente: Boolean(rawShield.planCoherenteConDx ?? true),
        posibles_faltantes: Array.isArray(rawShield.posiblesFaltantes) ? rawShield.posiblesFaltantes as string[] : [],
        alertas_glosa: Array.isArray(rawShield.alertasGlosa) ? rawShield.alertasGlosa as string[] : [],
      }
    : undefined

  // Telemedicine: prepend consent to current illness
  let currentIllness = (parsed.enfermedadActual as string) || ''
  if (isTelemed && currentIllness) {
    currentIllness = TELEMEDICINE_CONSENT + currentIllness
  }

  const note: SoapNote = {
    note_type: isTelemed ? 'telemedicina' : 'ingreso',
    chief_complaint: (parsed.motivoConsulta as string) || '',
    current_illness: currentIllness,
    relevant_history: (parsed.antecedentes as string) || '',
    physical_exam: physicalExam,
    physical_exam_is_default: isTelemed ? false : physicalExamIsDefault,
    analysis: (parsed.analisis as string) || '',
    diagnosis: (parsed.diagnostico as string) || '',
    cie10_code: (parsed.codigoCIE10 as string) || '',
    cie10_description: (parsed.descripcionCIE10 as string) || '',
    management_plan: (parsed.planManejo as string) || '',
    patient_instructions: (parsed.instruccionesPaciente as string) || '',
    pharma_suggestions: pharmaSuggestions.length > 0 ? pharmaSuggestions : undefined,
    glosa_shield: glosaShield,
    is_telemedicine: isTelemed,
  }

  return note
}

async function generateEvolutionNote(
  transcript: string,
  options: { specialty?: string; noteStyle?: string; previousContext?: string; hospitalizationDay?: number }
): Promise<SoapNote> {
  const { noteStyle, previousContext, hospitalizationDay } = options

  const styleInstruction = noteStyle === 'uppercase'
    ? '\n\nIMPORTANTE: Genera toda la respuesta JSON en MAYÚSCULAS. Sin excepción.'
    : noteStyle === 'lowercase'
    ? '\n\nIMPORTANTE: Genera toda la respuesta JSON en minúsculas. Sin excepción.'
    : ''

  const systemPrompt = EVOLUTION_SYSTEM_PROMPT + styleInstruction

  const parts: string[] = []

  if (hospitalizationDay) {
    parts.push(`Día de hospitalización: ${hospitalizationDay}`)
  }

  if (previousContext) {
    parts.push(`\nCONTEXTO BASE (notas previas del paciente — puede contener una o varias notas):\n${previousContext}\n--- FIN CONTEXTO BASE ---`)
  }

  parts.push(`\nGRABACIÓN DEL DÍA (transcripción del médico hoy):\n\n${transcript}`)

  const raw = await callClaude(systemPrompt, parts.join('\n'), 4500)

  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Claude no devolvió JSON válido para nota de evolución.')

  const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>

  const rawShield = parsed.blindajeDocumental as Record<string, unknown> | undefined
  const glosaShield: GlosaShield | undefined = rawShield
    ? {
        criterios_documentados: Array.isArray(rawShield.criteriosDocumentados) ? rawShield.criteriosDocumentados as string[] : [],
        diagnostico_con_soporte: Boolean(rawShield.diagnosticoConSoporteClinico ?? true),
        plan_coherente: Boolean(rawShield.planCoherenteConDx ?? true),
        posibles_faltantes: Array.isArray(rawShield.posiblesFaltantes) ? rawShield.posiblesFaltantes as string[] : [],
        alertas_glosa: Array.isArray(rawShield.alertasGlosa) ? rawShield.alertasGlosa as string[] : [],
      }
    : undefined

  // Combine lineaContexto + estadoActual into current_illness (shown as "Evolución clínica")
  const lineaContexto = (parsed.lineaContexto as string) || ''
  const estadoActual = (parsed.estadoActual as string) || ''
  const evolucionClinica = [lineaContexto, estadoActual].filter(Boolean).join('\n\n')

  // Combine ajustesManejo + plan into management_plan
  const ajustesManejo = (parsed.ajustesManejo as string) || ''
  const planDia = (parsed.plan as string) || ''
  const managementFull = [ajustesManejo, planDia].filter(Boolean).join('\n\n')

  const note: SoapNote = {
    note_type: 'evolucion',
    chief_complaint: '',
    current_illness: evolucionClinica,
    relevant_history: '',
    physical_exam: (parsed.examenFisicoDia as string) || '',
    physical_exam_is_default: false,
    analysis: (parsed.analisis as string) || '',
    diagnosis: (parsed.diagnosticosActivos as string) || '',
    cie10_code: '',
    cie10_description: '',
    management_plan: managementFull,
    patient_instructions: '',
    glosa_shield: glosaShield,
    is_telemedicine: false,
    // Evolution-specific fields
    active_diagnoses: (parsed.diagnosticosActivos as string) || '',
    vital_signs: (parsed.signosVitales as string) || '',
    labs: (parsed.laboratorios as string) || '',
    hospitalization_day: typeof parsed.diaHospitalizacion === 'number' ? parsed.diaHospitalizacion : hospitalizationDay ?? 1,
    evolution_date: (parsed.fechaHora as string) || new Date().toLocaleDateString('es-CO'),
  }

  return note
}

async function generateTransferNote(
  transcript: string,
  options: { specialty?: string; noteStyle?: string; previousContext?: string }
): Promise<SoapNote> {
  const { noteStyle, previousContext } = options

  const styleInstruction = noteStyle === 'uppercase'
    ? '\n\nIMPORTANTE: Genera toda la respuesta JSON en MAYÚSCULAS. Sin excepción.'
    : noteStyle === 'lowercase'
    ? '\n\nIMPORTANTE: Genera toda la respuesta JSON en minúsculas. Sin excepción.'
    : ''

  const systemPrompt = TRANSFER_SYSTEM_PROMPT + styleInstruction

  const parts: string[] = []

  if (previousContext) {
    parts.push(`CONTEXTO BASE (notas del servicio de origen):\n${previousContext}\n--- FIN CONTEXTO BASE ---`)
  }

  parts.push(`\nGRABACIÓN AL INGRESO (transcripción del médico al recibir al paciente):\n\n${transcript}`)

  const raw = await callClaude(systemPrompt, parts.join('\n'), 4500)

  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Claude no devolvió JSON válido para nota de traslado.')

  const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>

  const rawShield = parsed.blindajeDocumental as Record<string, unknown> | undefined
  const glosaShield: GlosaShield | undefined = rawShield
    ? {
        criterios_documentados: Array.isArray(rawShield.criteriosDocumentados) ? rawShield.criteriosDocumentados as string[] : [],
        diagnostico_con_soporte: Boolean(rawShield.diagnosticoConSoporteClinico ?? true),
        plan_coherente: Boolean(rawShield.planCoherenteConDx ?? true),
        posibles_faltantes: Array.isArray(rawShield.posiblesFaltantes) ? rawShield.posiblesFaltantes as string[] : [],
        alertas_glosa: Array.isArray(rawShield.alertasGlosa) ? rawShield.alertasGlosa as string[] : [],
      }
    : undefined

  const encabezado = (parsed.encabezado as string) || ''
  const estadoIngreso = (parsed.estadoIngreso as string) || ''
  const currentIllnessFull = [encabezado, estadoIngreso].filter(Boolean).join('\n\n')

  const note: SoapNote = {
    note_type: 'traslado',
    chief_complaint: '',
    current_illness: currentIllnessFull,
    relevant_history: (parsed.cursoPrevio as string) || '',
    physical_exam: (parsed.examenFisico as string) || '',
    physical_exam_is_default: false,
    analysis: (parsed.diagnosticos as string) || '',
    diagnosis: (parsed.diagnosticos as string) || '',
    cie10_code: '',
    cie10_description: '',
    management_plan: (parsed.planManejo as string) || '',
    patient_instructions: '',
    glosa_shield: glosaShield,
    is_telemedicine: false,
    active_diagnoses: (parsed.diagnosticos as string) || '',
    vital_signs: (parsed.signosVitales as string) || '',
    labs: (parsed.paraclinicosPrevios as string) || '',
    evolution_date: (parsed.fechaHora as string) || new Date().toLocaleDateString('es-CO'),
  }

  return note
}

export async function askAboutNote(note: SoapNote, question: string): Promise<string> {
  const noteText = formatNoteForClipboard(note)
  const systemPrompt = `Eres un asistente médico de Dictia AI. Tienes acceso a la siguiente historia clínica generada automáticamente y debes responder preguntas del médico sobre ella. Responde de forma concisa, clara y en español. Si la pregunta requiere juicio clínico, puedes opinar pero siempre indica que la decisión final es del médico. No repitas la nota completa en tus respuestas.

HISTORIA CLÍNICA ACTUAL:
${noteText}`

  return callClaude(systemPrompt, question, 1000)
}

export type ClinicalAnalysis = {
  diferenciales: string[]
  criterios: string[]
  paraclínicos: string[]
  alertas: string[]
  tratamiento: string[]
  complicaciones: string[]
}

export async function generateClinicalEvidence(diagnosis: string): Promise<ClinicalAnalysis> {
  const systemPrompt = `Eres un internista experto en medicina basada en evidencia para América Latina. Para el diagnóstico dado, genera un análisis clínico profundo y práctico en 6 secciones. Usa terminología médica estándar en español latinoamericano. Sé específico, concreto y clínicamente útil — no genérico.

Responde ÚNICAMENTE en formato JSON con esta estructura exacta:
{
  "diferenciales": [
    "Diagnóstico diferencial 1 — característica clave que lo distingue del diagnóstico principal",
    "Diagnóstico diferencial 2 — hallazgo o dato que sugiere considerar este",
    "Diagnóstico diferencial 3 — cuándo sospechar y cómo descartar"
  ],
  "criterios": [
    "Criterio o escala diagnóstica específica con valores (ej: Centor ≥3, Wells score, CURB-65)",
    "Criterio diagnóstico de guía principal (AHA, OMS, NICE, AUGE, IETS según país)",
    "Hallazgo físico o de laboratorio que confirma o descarta"
  ],
  "paraclínicos": [
    "Examen 1 — qué buscar y valor de corte (ej: PCR >10 mg/L sugiere etiología bacteriana)",
    "Examen 2 — indicación específica y sensibilidad/especificidad si es relevante",
    "Examen 3 — cuándo ordenarlo y qué cambia en el manejo según resultado"
  ],
  "alertas": [
    "Signo o síntoma de alarma que requiere escalada urgente o remisión",
    "Criterio de hospitalización específico con parámetro numérico si aplica",
    "Comorbilidad o contexto que cambia el nivel de urgencia"
  ],
  "tratamiento": [
    "Fármaco de primera línea con dosis exacta, vía, frecuencia y duración (adulto estándar, ajustar según peso/función renal)",
    "Segunda línea o alternativa en caso de alergia o falla terapéutica con dosis",
    "Medida no farmacológica o coadyuvante basada en evidencia"
  ],
  "complicaciones": [
    "Complicación más frecuente — incidencia aproximada y cuándo vigilarla",
    "Complicación más grave — factor de riesgo y señal de alerta temprana",
    "Seguimiento recomendado — tiempo y criterio de alta o referencia"
  ]
}`

  const raw = await callClaude(systemPrompt, `Diagnóstico: ${diagnosis}`, 1800)

  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return {
    diferenciales: ['No se pudo generar el análisis en este momento.'],
    criterios: [], paraclínicos: [], alertas: [], tratamiento: [], complicaciones: [],
  }

  const parsed = JSON.parse(jsonMatch[0]) as Partial<ClinicalAnalysis>
  return {
    diferenciales: parsed.diferenciales ?? [],
    criterios: parsed.criterios ?? [],
    paraclínicos: parsed.paraclínicos ?? [],
    alertas: parsed.alertas ?? [],
    tratamiento: parsed.tratamiento ?? [],
    complicaciones: parsed.complicaciones ?? [],
  }
}

export function formatNoteForClipboard(note: SoapNote, patientName?: string): string {
  const date = new Date().toLocaleDateString('es-CO', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })

  // Evolution note format
  if (note.note_type === 'evolucion') {
    const lines = [
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'NOTA DE EVOLUCIÓN — DICTIA AI',
      `${note.evolution_date || date}${note.hospitalization_day ? ` — Día ${note.hospitalization_day} de hospitalización` : ''}`,
      patientName ? `Paciente: ${patientName}` : '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    ]

    if (note.current_illness) {
      lines.push('', 'EVOLUCIÓN CLÍNICA', note.current_illness)
    }

    lines.push(
      '',
      'DIAGNÓSTICO(S) ACTIVOS',
      note.active_diagnoses || note.diagnosis || '(Sin diagnósticos registrados)',
      '',
      'SIGNOS VITALES',
      note.vital_signs || '(No registrados)',
      '',
      'EXAMEN FÍSICO DEL DÍA',
      note.physical_exam || '(Sin hallazgos registrados)',
    )

    if (note.labs) {
      lines.push('', 'LABORATORIOS Y PARACLÍNICOS', note.labs)
    }

    lines.push(
      '',
      'ANÁLISIS',
      note.analysis || '(Sin análisis)',
      '',
      'PLAN DEL DÍA',
      note.management_plan || '(Sin plan registrado)',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '📋 Esta nota fue preparada con el apoyo de Dictia AI como asistente de documentación. El médico tratante ha revisado y aprobado su contenido. El juicio clínico final pertenece al médico tratante.',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    )
    return lines.filter(l => l !== undefined).join('\n')
  }

  // Transfer note format
  if (note.note_type === 'traslado') {
    const lines = [
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'NOTA DE INGRESO POR TRASLADO — DICTIA AI',
      `${note.evolution_date || date}`,
      patientName ? `Paciente: ${patientName}` : '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    ]

    if (note.current_illness) {
      lines.push('', 'ESTADO AL INGRESO', note.current_illness)
    }

    if (note.relevant_history) {
      lines.push('', 'RESUMEN DEL CURSO PREVIO', note.relevant_history)
    }

    if (note.vital_signs) {
      lines.push('', 'SIGNOS VITALES AL INGRESO', note.vital_signs)
    }

    if (note.physical_exam) {
      lines.push('', 'EXAMEN FÍSICO AL INGRESO', note.physical_exam)
    }

    if (note.labs) {
      lines.push('', 'PARACLÍNICOS DEL SERVICIO DE ORIGEN', note.labs)
    }

    lines.push(
      '',
      'IMPRESIÓN DIAGNÓSTICA',
      note.active_diagnoses || note.diagnosis || '(Sin diagnósticos registrados)',
      '',
      'PLAN EN EL SERVICIO ACTUAL',
      note.management_plan || '(Sin plan registrado)',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '📋 Esta nota fue preparada con el apoyo de Dictia AI como asistente de documentación. El médico tratante ha revisado y aprobado su contenido. El juicio clínico final pertenece al médico tratante.',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    )
    return lines.filter(l => l !== undefined).join('\n')
  }

  // Standard SOAP note format
  const lines = [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    note.is_telemedicine ? 'HISTORIA CLÍNICA — DICTIA AI (TELEMEDICINA)' : 'HISTORIA CLÍNICA — DICTIA AI',
    `Fecha: ${date}`,
    patientName ? `Paciente: ${patientName}` : '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    'MOTIVO DE CONSULTA',
    note.chief_complaint,
    '',
    'ENFERMEDAD ACTUAL',
    note.current_illness,
    '',
    'ANTECEDENTES RELEVANTES',
    note.relevant_history,
    '',
    note.is_telemedicine
      ? 'EXAMEN FÍSICO (Evaluación por telemedicina — limitada)'
      : note.physical_exam_is_default
      ? 'EXAMEN FÍSICO (Normal — sugerido por defecto, verificar con hallazgos reales)'
      : 'EXAMEN FÍSICO',
    note.physical_exam || '(No evaluado)',
    '',
    'ANÁLISIS',
    note.analysis,
    '',
    'DIAGNÓSTICO',
    `${note.diagnosis}${note.cie10_code ? ` (${note.cie10_code})` : ''}`,
    note.cie10_description || '',
    '',
    'PLAN DE MANEJO',
    note.management_plan,
    '',
    'INSTRUCCIONES AL PACIENTE',
    note.patient_instructions,
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '📋 Esta nota fue preparada con el apoyo de Dictia AI como asistente de documentación. El médico tratante ha revisado y aprobado su contenido. El juicio clínico final pertenece al médico tratante.',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  ]

  if (note.pharma_suggestions && note.pharma_suggestions.length > 0) {
    lines.push(
      '',
      '── SUGERENCIAS FARMACOLÓGICAS (referencia) ──',
      '⚠ El médico decide y es responsable de toda prescripción.',
      ...note.pharma_suggestions.map(s =>
        `• ${s.nombre_generico}${s.nombre_comercial ? ` (${s.nombre_comercial})` : ''}: ${s.dosis} — ${s.indicacion}`
      ),
    )
  }

  return lines.filter(l => l !== undefined).join('\n')
}
