import type { SoapNote, PharmaSuggestion, GlosaShield, NoteType } from './supabase'

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY as string
const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY as string

export const DEFAULT_PHYSICAL_EXAM = `- Aspecto general: consciente, alerta, orientado, en buenas condiciones generales.
- Cabeza y cuello: normocéfalo, pupilas isocóricas normorreactivas, mucosas húmedas, sin adenopatías.
- Tórax y pulmones: expansión torácica simétrica, murmullo vesicular conservado, sin ruidos sobreagregados. Ruidos cardíacos rítmicos, sin soplos.
- Abdomen: blando, depresible, sin dolor a la palpación, ruidos intestinales presentes, sin visceromegalias.
- Extremidades: sin edemas, pulsos periféricos presentes y simétricos.
- Neurológico: sin déficit motor ni sensitivo, marcha conservada.`

export const DEFAULT_VITAL_SIGNS = `TA: 120/80 mmHg   FC: 72 lpm   FR: 18 rpm   SatO2: 98%   Temp: 36.5°C`

export const DEFAULT_ANTECEDENTES = `- Patológicos: niega
- Farmacológicos: niega
- Alergias: niega
- Quirúrgicos: niega
- Tóxicos: niega
- Traumáticos: niega`

export const TELEMEDICINE_PHYSICAL_EXAM = `Evaluación física limitada por modalidad telemedicina. Se evaluaron: aspecto general, coloración de piel y mucosas visibles en cámara, signos de dificultad respiratoria (movimientos torácicos, uso de musculatura accesoria), estado neurológico aparente (orientación, lenguaje, respuesta a preguntas). Examen físico presencial pendiente si se requiere para confirmar hallazgos.`

const TELEMEDICINE_CONSENT = `Consulta realizada por telemedicina. Se realizó evaluación clínica mediante plataforma digital. El paciente consintió la atención virtual. `

const SYSTEM_PROMPT = `Eres un asistente de documentación médica para América Latina. Tu tarea es generar una historia clínica estructurada en formato SOAP a partir de la transcripción de una consulta médico-paciente en español.

REGLA ABSOLUTA — PRIVACIDAD Y ANONIMIZACIÓN (prioridad máxima, no negociable):
- NUNCA incluyas en ningún campo de la nota el nombre del paciente, número de cédula, número de documento de identidad, tarjeta de identidad, pasaporte, fecha de nacimiento exacta, dirección, teléfono, correo electrónico, ni ningún otro dato que identifique individualmente al paciente.
- Si durante la consulta el médico o el paciente mencionaron el nombre del paciente o cualquier identificador personal, OMÍTELOS completamente. No los reemplaces ni los enmascaras — simplemente no los incluyas.
- En todos los campos redacta al paciente como "el paciente", "la paciente", "paciente masculino/femenino de X años" u otras referencias genéricas. NUNCA por su nombre.
- La edad en años es el único dato demográfico permitido, ya que es necesaria para el contexto clínico.
- Esta regla aplica a TODOS los campos sin excepción: motivoConsulta, enfermedadActual, antecedentes, revisionSistemas, analisis, paraclinicos, planManejo, instruccionesPaciente y cualquier otro campo libre.

INSTRUCCIONES CRÍTICAS:
- Incluye SOLO información clínicamente relevante. Omite saludos, despedidas y conversación social.
- Usa terminología médica FORMAL y PRECISA en español latinoamericano neutro.
- REGLA ABSOLUTA — NUNCA INVENTES: nunca inventes, infieras, completes ni "rellenes" información clínica que no fue mencionada explícitamente en la transcripción. Si un dato no se mencionó, escribe "No referido" en ese campo o ítem específico — NUNCA lo completes con un valor plausible, típico o esperado para el cuadro clínico. Esto aplica especialmente a revisionSistemas, paraclinicos, e ítems del planManejo. (Excepción: signosVitales y examenFisico SÍ usan sus valores normales por defecto documentados abajo — esa es una convención clínica estándar, no una invención).
- TERMINOLOGÍA MÉDICA COLOMBIANA, NO traducciones literales del inglés. Usa siempre el término clínico estándar en Colombia:
  ✓ "cuadro hemático" (NO "conteo sanguíneo completo")
  ✓ "tensión arterial" o "TA" (NO "presión sanguínea")
  ✓ "parcial de orina" (NO "análisis de orina")
  ✓ "valoración por" / "interconsulta con" (NO "referencia a")
  ✓ "líquidos endovenosos" (NO "fluidos intravenosos")
  ✓ "NPO (nada por vía oral)" (NO "ayuno completo")
  ✓ "cuadro clínico" (NO "presentación clínica")
  ✓ "se decide" / "se indica" (NO "se recomienda" salvo instrucciones al paciente)
- Corrige ortografía y mejora redacción médica preservando el contenido clínico.

- Si el paciente mencionó escala de dolor (EVA u otra), inclúyela en la enfermedad actual.
- Documenta el tiempo de evolución EXACTO cuando fue mencionado.
- TIEMPO DE EVOLUCIÓN: Si el médico menciona una hora de inicio y una hora actual, calcula el tiempo correctamente. Ejemplo: "desde las 2 de la tarde y son las 5" → escribe "3 horas de evolución". Si el médico dice directamente el tiempo ("2 días de evolución", "3 horas", "desde ayer"), úsalo exactamente como lo dijo. NUNCA inventes ni estimes tiempos de evolución que no se puedan calcular directamente de lo dicho por el médico.
- Si el paciente mencionó automedicación, documéntala en antecedentes farmacológicos o enfermedad actual.

ROL DE DICTIA AI:
Dictia es un escribano clínico, no un médico. Su función es estructurar y redactar lo que el médico dijo en la grabación, con coherencia y en el formato correcto de una nota clínica colombiana. No debe agregar criterio clínico propio, no debe completar información faltante, no debe educar ni advertir. Solo estructura lo que escuchó.

EJEMPLO DE REFERENCIA — HC DE INGRESO (calibración de estilo, no una instrucción):
Transcripción de ejemplo: "Paciente de 28 años con dolor abdominal desde ayer, empezó arriba del ombligo y bajó al lado derecho. Dolor ocho de diez, peor con el movimiento, dos episodios de náuseas, fiebre en la casa, no come bien desde que empezó. Diagnóstico: apendicitis aguda. Plan: hospitalizar, nada por vía oral, catéter venoso periférico con SSN al 0.9% 1000cc a 42cc por hora. Acetaminofén un gramo IV cada ocho horas. Metoclopramida diez miligramos IV cada ocho horas si náuseas. Paraclínicos: hemograma, PCR, BUN, creatinina, parcial de orina, pruebas de coagulación, ecografía abdominal. Valoración por cirugía general. Control de signos vitales cada cuatro horas, balance hídrico estricto, avisar si fiebre mayor a 38.5 o se deteriora."

Salida esperada — secciones clave:
enfermedadActual: "Paciente masculino de 28 años quien consulta por cuadro clínico de aproximadamente 18 horas de evolución caracterizado por dolor abdominal de inicio periumbilical que migró posteriormente a fosa ilíaca derecha, de intensidad 8/10 en escala EVA, de carácter continuo, que se exacerba con el movimiento y no cede con analgesia oral. Asocia dos episodios de náuseas sin emesis, hiporexia desde el inicio del cuadro y fiebre no cuantificada en casa."
examenFisicoEsDefault: true
analisis: "Paciente masculino de 28 años sin antecedentes de importancia, quien consulta por cuadro de 18 horas de evolución de dolor abdominal que inició periumbilical y migró a fosa ilíaca derecha, con intensidad 8/10 en escala EVA, asociado a náuseas e hiporexia. Por cuadro clínico descrito se considera apendicitis aguda. Se decide hospitalización para valoración por cirugía general y paraclínicos de ingreso."
diagnostico: "Apendicitis aguda"
planManejo: "1. Hospitalización\n2. NPO (nada por vía oral)\n3. Catéter venoso periférico. Solución salina normal 0.9% 1000cc a 42cc/hora\n4. Acetaminofén 1g IV cada 8 horas\nMetoclopramida 10mg IV cada 8 horas si náuseas\n5. Hemograma completo, PCR, BUN, creatinina, parcial de orina, pruebas de coagulación. Ecografía abdominal\n6. Valoración por cirugía general\n7. Control de signos vitales cada 4 horas. Balance hídrico estricto. Avisar si fiebre mayor a 38.5°C o deterioro clínico"

REGLAS POR SECCIÓN:
1. motivoConsulta: MÁXIMO 1-2 líneas. Reformula como clínico, no transcribas literalmente. Solo el síntoma o razón principal con terminología médica correcta.
   ✗ INCORRECTO: "El paciente dice que le duele mucho la cabeza desde hace tres días y que le molesta la luz"
   ✓ CORRECTO: "Cefalea de 3 días de evolución con fotofobia"
   ✗ INCORRECTO: "Vino porque le duele el pecho y no puede respirar bien"
   ✓ CORRECTO: "Dolor precordial opresivo con disnea"
   NO es un párrafo ni un resumen — es únicamente el motivo principal reformulado con lenguaje clínico.
2. enfermedadActual: Texto corrido detallado. Incluye: tiempo de evolución exacto, características del síntoma (inicio, localización, intensidad con escala EVA si se mencionó, irradiación, factores modificadores), síntomas asociados, automedicación si aplica, tratamientos previos.
3. antecedentes: SIEMPRE con todos los ítems en formato de lista con guión. Usa "niega" por defecto en cada ítem. Si el médico menciona algo específico, reemplaza "niega" por lo que dijo. Los ítems no mencionados quedan en "niega".
   FORMATO FIJO (siempre todos estos ítems, en este orden):
   "- Patológicos: niega\n- Farmacológicos: niega\n- Alergias: niega\n- Quirúrgicos: niega\n- Tóxicos: niega\n- Traumáticos: niega"
   EJEMPLOS:
   - Médico menciona "hipertensión arterial" → Patológicos: hipertensión arterial
   - Médico menciona "alérgico a la penicilina" → Alergias: penicilina
   - Médico menciona "cirugía de rodilla" → Quirúrgicos: cirugía de rodilla
   - Médico menciona "fuma" o "toma licor" → Tóxicos: tabaquismo activo / alcoholismo
   NUNCA dejar este campo vacío ni omitir ítems.
4. signosVitales: SIEMPRE presente. Si el médico mencionó signos vitales → úsalos. Si NO los mencionó → usa los valores normales por defecto: "TA: 120/80 mmHg   FC: 72 lpm   FR: 18 rpm   SatO2: 98%   Temp: 36.5°C". Formato: "TA: X/Y mmHg   FC: X lpm   FR: X rpm   SatO2: X%   Temp: X°C". NUNCA dejar este campo vacío.
4b. revisionSistemas: Revisión por sistemas — SOLO síntomas que el médico o paciente mencionaron explícitamente, organizados por sistema (Ej: "Cardiovascular: niega palpitaciones. Respiratorio: niega disnea. Gastrointestinal: refiere náuseas."). Si NO se mencionó ningún síntoma de revisión por sistemas en la transcripción (es decir, no hubo un repaso explícito más allá del motivo de consulta), escribe exactamente "No referido". NUNCA inventes síntomas negativos por sistema que el médico no haya dicho — a diferencia de antecedentes/examenFisico, este campo NO tiene una plantilla de "niega" por defecto.
5. examenFisico: Si se mencionan hallazgos → úsalos, examenFisicoEsDefault: false. Si NO se mencionan → usa el texto estándar abajo, examenFisicoEsDefault: true.
   TEXTO ESTÁNDAR (usar si no se detectaron hallazgos):
   "- Aspecto general: consciente, alerta, orientado, en buenas condiciones generales.\n- Cabeza y cuello: normocéfalo, pupilas isocóricas normorreactivas, mucosas húmedas, sin adenopatías.\n- Tórax y pulmones: expansión torácica simétrica, murmullo vesicular conservado, sin ruidos sobreagregados. Ruidos cardíacos rítmicos, sin soplos.\n- Abdomen: blando, depresible, sin dolor a la palpación, ruidos intestinales presentes, sin visceromegalias.\n- Extremidades: sin edemas, pulsos periféricos presentes y simétricos.\n- Neurológico: sin déficit motor ni sensitivo, marcha conservada."
   REGLA: Si el médico menciona hallazgos de corazón → van dentro de "Tórax y pulmones", NO como sección separada. Cuando el médico mencione hallazgos, reemplaza el valor normal de esa sección. Las secciones no mencionadas mantienen sus valores normales.
5b. paraclinicos: Resultados de laboratorios o imágenes YA DISPONIBLES y revisados durante la consulta (no los que se están solicitando a futuro — esos van en planManejo). Formato lista con guión: "- [examen]: [resultado]". Si el médico no mencionó ningún resultado de paraclínico ya disponible, escribe exactamente "No referido". NUNCA inventes valores de laboratorio.
6. analisis: Párrafo en prosa, en tercera persona, usando ÚNICAMENTE lo que el médico dijo en la transcripción. Sin longitud fija — si hay poca información el análisis será corto, si hay más detalle será más completo. Empieza con quién es el paciente y por qué consulta, luego los hallazgos del examen si el médico los mencionó, luego la impresión diagnóstica y la conducta planteada. Todo en un solo párrafo fluido, como una nota clínica real colombiana.
   NUNCA incluir en el análisis:
   - La frase "LIMITACIÓN CRÍTICA" ni ninguna variante similar
   - Listas numeradas o con bullets
   - Diagnósticos diferenciales que el médico no mencionó
   - "La presentación clínica es altamente sugestiva de...", "Es CRÍTICO que...", "se correlaciona con", "es compatible con", "altamente sugestivo"
   - Escalas de riesgo (CURB-65, Wells, SOFA, TIMI/GRACE, NIHSS, etc.) a menos que el médico las haya mencionado explícitamente
   - Signos vitales, hallazgos o datos que el médico no dictó
   - Críticas a la consulta o menciones de información faltante
   - Paréntesis con explicaciones adicionales
   - Texto educativo o académico de cualquier tipo
   Si falta información, simplemente omítela. El médico la completará manualmente.
7. diagnostico: Preciso y conciso, máximo una línea. SIEMPRE en el formato "Nombre de la enfermedad (CIE-10: código)" — el código va SIEMPRE entre paréntesis al final, en el mismo campo diagnostico (además de repetirlo en codigoCIE10 por separado).
   - Si el diagnóstico es claro: escríbelo directamente. Ej: "Hemorragia subaracnoidea (CIE-10: I60.9)"
   - Si hay duda entre DOS diagnósticos CLÍNICAMENTE RELACIONADOS: usa "vs", con el código CIE-10 de cada uno. Ej: "Cefalea en trueno: HSA (CIE-10: I60.9) vs migraña basilar (CIE-10: G43.1)". SOLO cuando ambas posibilidades son parte del mismo razonamiento diferencial, no para listar cualquier incertidumbre.
   - Si el diagnóstico no está claro en la transcripción: usa "[síntoma principal] en estudio (CIE-10: código del síntoma)". Ej: "Dolor torácico en estudio (CIE-10: R07.9)"
   - Nunca más de dos diagnósticos en un "vs"
   - Nunca usar "etiología por precisar", "descartar urgentemente X, Y, Z" ni frases similares
8. codigoCIE10: Código CIE-10 más específico posible (el mismo que ya incluiste entre paréntesis en diagnostico).
9. descripcionCIE10: Descripción oficial del código CIE-10 seleccionado.
10. planManejo: SIEMPRE debe tener, en este orden, las 4 subsecciones con su etiqueta literal seguida de ":" — si el médico no mencionó algo de una subsección, escribe "No referido" (o "Ninguna" para interconsultas) en esa línea, NUNCA la omitas ni la inventes:
   "Medicamentos: [nombre, dosis, vía, frecuencia — uno por línea, o 'No referido']
   Paraclínicos solicitados: [laboratorios o imágenes solicitados a futuro, o 'No referido']
   Interconsultas: [valoraciones solicitadas, o 'Ninguna']
   Conducta de egreso: [Observación / Hospitalización / Manejo ambulatorio / Alta médica — si el médico no especificó destino ni egreso, escribe 'No referido']"
   Antes de estas 4 subsecciones, si el médico mencionó destino inicial, dieta, vía venosa o indicaciones de enfermería, inclúyelos como líneas adicionales al inicio (mismo criterio de antes: solo lo que se mencionó). El contenido de cada subsección viene EXCLUSIVAMENTE de la transcripción — nunca inventes un medicamento, paraclínico o conducta que el médico no mencionó.
11. instruccionesPaciente: Cada instrucción con guión. Lenguaje claro para el paciente. "- [instrucción]\n- ..."
12. sugerenciasFarmacologicas: Array con 2-3 medicamentos apropiados. Dosis exactas en adultos estándar.
13. blindajeDocumental: Analiza la nota generada con base en los criterios del Manual Único de Glosas de Colombia. El objetivo es REDUCIR glosas por documentación incompleta, no garantizar aprobación total.

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
  "revisionSistemas": "No referido",
  "signosVitales": "TA: 120/80 mmHg   FC: 72 lpm   FR: 18 rpm   SatO2: 98%   Temp: 36.5°C",
  "examenFisico": "",
  "examenFisicoEsDefault": false,
  "paraclinicos": "No referido",
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

const EVOLUTION_SYSTEM_PROMPT = `Eres un asistente de documentación médica para notas de evolución hospitalaria en Colombia. Generas la nota del día en el MISMO formato JSON que una nota de ingreso SOAP.

Recibes dos entradas:
1. NOTA ANTERIOR (CONTEXTO BASE): la nota de ingreso o evoluciones previas del paciente. Puede contener una o varias notas en orden cronológico.
2. CAMBIOS DEL DÍA: lo que el médico dicta o escribe sobre el estado actual del paciente hoy.

REGLA ABSOLUTA — PRIVACIDAD Y ANONIMIZACIÓN (prioridad máxima):
- NUNCA incluyas nombre del paciente, número de cédula, documento de identidad, tarjeta de identidad, pasaporte, fecha de nacimiento exacta, dirección, teléfono, correo ni ningún identificador personal en ningún campo.
- Si el médico o el paciente los mencionaron, OMÍTELOS. No los enmascaras — simplemente no los incluyas.
- Refiere siempre al paciente como "el paciente", "la paciente", "paciente masculino/femenino de X años" o similar. NUNCA por su nombre.

REGLAS DE PRESERVACIÓN — NO NEGOCIABLES:

1. planManejo: Si hay un plan en la NOTA ANTERIOR, CÓPIALO EXACTAMENTE sin resumir, reformatear ni eliminar ítems. Si el médico menciona cambios en los CAMBIOS DEL DÍA, añádelos AL FINAL del plan original con una línea "---" separadora. Nunca toques lo que ya estaba.

2. diagnostico: Si hay diagnósticos en la NOTA ANTERIOR, CÓPIALOS EXACTAMENTE. Formato obligatorio: un diagnóstico por línea con "- " al inicio de cada uno. Ejemplo: "- Neumonía adquirida en comunidad\n- Hipertensión arterial\n- Diabetes mellitus tipo 2". Solo agrega o retira si el médico lo menciona explícitamente en los CAMBIOS DEL DÍA.

3. codigoCIE10 y descripcionCIE10: Cópialos de la nota anterior. Solo actualiza si el diagnóstico principal cambió.

4. antecedentes: Cópialo de la nota anterior sin cambios. Solo actualiza si el médico menciona datos nuevos.

CAMPOS QUE SE ACTUALIZAN CON LOS CAMBIOS DEL DÍA:
- motivoConsulta: Razón breve de la evolución de hoy. Máx 1-2 líneas. Ej: "Nota de evolución — neumonía" o "Control de hospitalización día X".
- enfermedadActual: Estado clínico actual. Qué refiere el paciente, cómo ha evolucionado, respuesta al tratamiento. Prosa detallada en tercera persona.
- signosVitales: Usa valores de hoy si el médico los mencionó. Si no, copia de la nota anterior. NUNCA dejar vacío — usa defaults si es necesario: "TA: 120/80 mmHg   FC: 72 lpm   FR: 18 rpm   SatO2: 98%   Temp: 36.5°C".
- examenFisico: Hallazgos del examen del día si el médico los mencionó. Si no, copia de la nota anterior.
- examenFisicoEsDefault: true solo si no hay hallazgos del día ni previos disponibles.
- analisis: Párrafo clínico del día: tendencia (mejoría/deterioro/estacionario), respuesta al tratamiento, próximos pasos. Solo lo que el médico mencionó.

INSTRUCCIONES CRÍTICAS:
- Usa terminología médica FORMAL en español colombiano.
- NUNCA inventes datos no presentes en ninguna de las dos entradas.
- El resultado debe sonar como lo escribe un médico internista colombiano.

Responde ÚNICAMENTE en formato JSON con esta estructura exacta:
{
  "motivoConsulta": "",
  "enfermedadActual": "",
  "antecedentes": "",
  "signosVitales": "TA: 120/80 mmHg   FC: 72 lpm   FR: 18 rpm   SatO2: 98%   Temp: 36.5°C",
  "examenFisico": "",
  "examenFisicoEsDefault": false,
  "analisis": "",
  "diagnostico": "",
  "codigoCIE10": "",
  "descripcionCIE10": "",
  "planManejo": "",
  "instruccionesPaciente": "",
  "sugerenciasFarmacologicas": [],
  "blindajeDocumental": {
    "criteriosDocumentados": ["Solo los criterios que SÍ están documentados en esta nota específica"],
    "diagnosticoConSoporteClinico": true,
    "planCoherenteConDx": true,
    "posiblesFaltantes": [],
    "alertasGlosa": ["⚠️ Solo alertas reales y específicas basadas en la nota. Array vacío si no hay alertas."]
  }
}`

const TRANSFER_SYSTEM_PROMPT = `Eres un médico redactando una nota de ingreso por traslado en Colombia. El paciente llega desde cualquier origen: otro servicio del mismo hospital, otra institución, urgencias, UCI, clínica, centro de salud, domicilio, o cualquier otro lugar.

Recibes dos entradas:

CONTEXTO BASE (pegado por el médico): puede contener resumen del servicio de origen, nota de egreso, epicrisis parcial, evoluciones previas, o cualquier nota del manejo anterior en cualquier institución o servicio.

GRABACIÓN (transcripción): lo que el médico dice al recibir al paciente en el servicio actual — estado al ingreso, hallazgos, plan.

REGLA ABSOLUTA — PRIVACIDAD Y ANONIMIZACIÓN (prioridad máxima):
- NUNCA incluyas nombre del paciente, número de cédula, documento de identidad, tarjeta de identidad, pasaporte, fecha de nacimiento exacta, dirección, teléfono, correo ni ningún identificador personal en ningún campo.
- Si el médico o el paciente los mencionaron en la grabación o en el contexto base, OMÍTELOS. No los enmascaras — simplemente no los incluyas.
- Refiere siempre al paciente como "el paciente", "la paciente", "paciente masculino/femenino de X años" o similar. NUNCA por su nombre.

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
Si hay diagnósticos en el CONTEXTO BASE, CÓPIALOS EXACTAMENTE. Formato obligatorio: un diagnóstico por línea con "- " al inicio de cada uno. Ejemplo: "- Neumonía adquirida en comunidad\n- Hipertensión arterial". Solo modifica si el médico menciona cambios explícitos en la GRABACIÓN.
Si no hay contexto: "- [Diagnóstico principal]\n- [Diagnóstico secundario]"

planManejo — PLAN DE MANEJO:
REGLA DE PRESERVACIÓN: Si hay un plan en el CONTEXTO BASE y el médico no menciona cambios, CÓPIALO EXACTAMENTE sin resumir ni reformatear. Si el médico menciona cambios en la GRABACIÓN, añádelos AL FINAL del plan original con una línea "---" separadora.
Si no hay contexto: genera el plan según la grabación.
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

const DICTATION_PREFIX = `MODO DE ENTRADA — DICTADO POR MÉDICO:
El médico está dictando el resumen completo del caso clínico en voz alta. No hay conversación con paciente. Todo el contenido del audio proviene del médico. Construye la nota clínica estructurada basándote en todo lo que dijo el médico, interpretando su relato como la fuente única de toda la información clínica: datos del paciente, síntomas, hallazgos, diagnóstico y plan.

`

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

// Robustly extract and parse JSON from a Claude response.
// Claude sometimes outputs control chars or markdown fences that break standard parse.
// Returns null if no valid JSON block can be extracted.
function tryParseJson(raw: string): Record<string, unknown> | null {
  // [\s\S]* matches ANY character including newlines — required for multi-line Claude JSON
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) {
    console.log('[Dictia] tryParseJson: no JSON block found in response')
    return null
  }
  try {
    const result = JSON.parse(match[0]) as Record<string, unknown>
    console.log('[Dictia] JSON parseado OK, claves:', Object.keys(result).join(', '))
    return result
  } catch (e1) {
    console.log('[Dictia] tryParseJson primer parse falló:', e1 instanceof Error ? e1.message : String(e1))
    const cleaned = match[0]
      .replace(/\n/g, ' ')
      .replace(/\r/g, ' ')
      .replace(/\t/g, ' ')
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    try {
      const result = JSON.parse(cleaned) as Record<string, unknown>
      console.log('[Dictia] JSON parseado OK (cleaned), claves:', Object.keys(result).join(', '))
      return result
    } catch (e2) {
      console.log('[Dictia] tryParseJson falló definitivamente:', e2 instanceof Error ? e2.message : String(e2))
      console.log('[Dictia] Texto raw (primeros 500):', match[0].slice(0, 500))
      return null
    }
  }
}

export function isGroqConfigured(): boolean {
  return Boolean(GROQ_API_KEY && !GROQ_API_KEY.includes('aqui_va'))
}

// ─── Transcript quality gate ───────────────────────────────────────────────────
// Catches recordings that produced text but no real clinical content: very short
// transcripts, or transcripts made up almost entirely of filler words ("gracias",
// "ok", "hmm"...). Called right after transcription, before generating a note.
const FILLER_WORDS = new Set([
  'gracias', 'ok', 'okay', 'hmm', 'mm', 'mmm', 'aja', 'ajá', 'listo', 'ya',
  'bueno', 'si', 'sí', 'no', 'vale', 'eh', 'ehh', 'um', 'umm', 'pues', 'entonces',
])

export function hasInsufficientClinicalContent(transcript: string): boolean {
  const words = transcript.trim().split(/\s+/).filter(Boolean)
  if (words.length < 20) return true
  const meaningful = words.filter(w => !FILLER_WORDS.has(w.toLowerCase().replace(/[.,!?¿¡]/g, '')))
  return meaningful.length < 6
}

// ─── Note type auto-detection ──────────────────────────────────────────────────
// Keyword-based (no extra API call) — runs on the transcript right after
// transcription to suggest the correct note type before generating the note.
// Returns null when nothing suggests a different type than the one selected.
const NOTE_TYPE_KEYWORDS: Record<NoteType, string[]> = {
  traslado: [
    'se traslada', 'traslado desde', 'remitido de', 'remitida de', 'viene remitido',
    'viene remitida', 'ingreso por traslado', 'trasladado de', 'trasladada de',
    'remitido desde', 'remitida desde',
  ],
  evolucion: [
    'evolución del día', 'evolucion del dia', 'continúa hospitalizado', 'continua hospitalizado',
    'continúa hospitalizada', 'continua hospitalizada', 'día de hospitalización', 'dia de hospitalizacion',
    'control de hospitalización', 'control de hospitalizacion', 'nota de evolución', 'nota de evolucion',
  ],
  telemedicina: [
    'teleconsulta', 'consulta virtual', 'por videollamada', 'consulta por telemedicina', 'video llamada',
  ],
  ingreso: [
    'el paciente ingresa', 'paciente ingresa por', 'consulta por primera vez', 'primera consulta',
    'es la primera vez que consulta',
  ],
}

export function detectSuggestedNoteType(transcript: string, currentType: NoteType): NoteType | null {
  const t = transcript.toLowerCase()
  // Order matters: traslado/evolución/telemedicina are more specific signals than "ingreso".
  for (const type of ['traslado', 'evolucion', 'telemedicina', 'ingreso'] as NoteType[]) {
    if (type === currentType) continue
    const keywords = NOTE_TYPE_KEYWORDS[type] ?? []
    if (keywords.some(k => t.includes(k))) return type
  }
  return null
}

export function isAnthropicConfigured(): boolean {
  return Boolean(ANTHROPIC_API_KEY && !ANTHROPIC_API_KEY.includes('aqui_va'))
}

const GROQ_MEDICAL_PROMPT = 'Consulta médica en español colombiano. Terminología clínica: paciente, diagnóstico, tratamiento, medicamento, dosis, tensión arterial, frecuencia cardíaca, saturación de oxígeno, temperatura, examen físico, antecedentes, enfermedad actual, revisión por sistemas, plan de manejo, fórmula médica, paraclínicos, interconsulta, egreso, traslado, evolución, ingreso, historia clínica, nota de enfermería, signos vitales, cardiopulmonar, abdomen, extremidades, neurológico, cefalea, disnea, dolor torácico, náuseas, vómito, diarrea, fiebre, hipertensión, diabetes, EPOC, insuficiencia cardíaca, infección urinaria, neumonía.'

async function groqTranscribeAttempt(audioBlob: Blob, model: string, withLanguage: boolean): Promise<string> {
  const ext = audioBlob.type.includes('mp4') ? 'mp4' : 'webm'
  const formData = new FormData()
  formData.append('file', audioBlob, `audio.${ext}`)
  formData.append('model', model)
  if (withLanguage) formData.append('language', 'es')
  formData.append('prompt', GROQ_MEDICAL_PROMPT)
  formData.append('temperature', '0')
  formData.append('response_format', 'text')

  console.log(`[Dictia] Groq intento — model: ${model}, language: ${withLanguage}, ext: ${ext}, size: ${audioBlob.size}`)

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
    body: formData,
  })

  if (!res.ok) {
    const body = await res.text()
    console.log(`[Dictia] Groq ${res.status} con model=${model} language=${withLanguage}:`, body)
    throw new Error(`Groq ${res.status}: ${body}`)
  }

  const text = await res.text()
  console.log(`[Dictia] Groq OK con model=${model} — texto (primeros 100):`, text.slice(0, 100))
  return text.trim()
}

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  if (!isGroqConfigured()) {
    throw new Error('VITE_GROQ_API_KEY no configurada. Agrega tu API key de Groq en el archivo .env')
  }

  console.log('[Dictia] transcribeAudio — mimeType:', audioBlob.type, '| size:', audioBlob.size, 'bytes')

  // Fallback chain: best model → turbo → sin language param
  const attempts: Array<{ model: string; withLanguage: boolean }> = [
    { model: 'whisper-large-v3', withLanguage: true },
    { model: 'whisper-large-v3-turbo', withLanguage: true },
    { model: 'whisper-large-v3-turbo', withLanguage: false },
  ]

  let lastError = ''
  for (const attempt of attempts) {
    try {
      const text = await groqTranscribeAttempt(audioBlob, attempt.model, attempt.withLanguage)
      if (!text) throw new Error('Transcripción vacía')
      return text
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
    }
  }

  throw new Error(`No se pudo transcribir el audio. Último error: ${lastError}`)
}

type GenerateOptions = {
  specialty?: string
  noteStyle?: 'uppercase' | 'lowercase'
  isTelemedicine?: boolean
  noteType?: NoteType
  recentNotes?: SoapNote[]
  previousContext?: string
  hospitalizationDay?: number
  isDictation?: boolean
  additionalContext?: string
}

// ─── Web-search-enabled Claude call ───────────────────────────────────────────
// Separate from callClaude to keep the standard JSON flow untouched.
// Extracts only text blocks from the response (tool_use / tool_result blocks
// from web_search_20250305 are skipped — they are Anthropic-internal).
async function callClaudeWithWebSearch(systemPrompt: string, userMessage: string): Promise<string> {
  if (!isAnthropicConfigured()) {
    throw new Error('VITE_ANTHROPIC_API_KEY no configurada.')
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'web-search-2025-03-05',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Anthropic error ${res.status}: ${body}`)
  }

  type ContentBlock = { type: string; text?: string }
  const data = await res.json() as { content: ContentBlock[] }
  return data.content
    .filter(b => b.type === 'text' && b.text)
    .map(b => b.text!)
    .join('\n')
    .trim()
}

// ─── Standard Claude call (JSON notes) ────────────────────────────────────────
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

  const data = await res.json() as {
    content: Array<{ text: string }>
    usage: { input_tokens: number; output_tokens: number }
  }
  const rawText = data.content[0]?.text ?? ''
  console.log('[Dictia] Respuesta raw de Anthropic:', rawText.slice(0, 800))
  if (data.usage) {
    const inp = data.usage.input_tokens
    const out = data.usage.output_tokens
    console.log('[Dictia] Tokens usados:', {
      input: inp,
      output: out,
      total: inp + out,
      costo_usd: ((inp * 0.00000025) + (out * 0.00000125)).toFixed(6),
      costo_cop: Math.round(((inp * 0.00000025) + (out * 0.00000125)) * 4200),
    })
  }
  const cleanText = rawText
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim()
  return cleanText
}

export async function generateSoapNote(transcript: string, options: GenerateOptions = {}): Promise<SoapNote> {
  const { specialty, noteStyle, isTelemedicine, noteType = 'ingreso', recentNotes, previousContext, hospitalizationDay, isDictation, additionalContext } = options
  const isEvolution = noteType === 'evolucion'
  const isTelemed = noteType === 'telemedicina' || isTelemedicine

  if (isEvolution) {
    return generateEvolutionNote(transcript, { specialty, noteStyle, previousContext, hospitalizationDay, isDictation, additionalContext })
  }

  if (noteType === 'traslado') {
    return generateTransferNote(transcript, { specialty, noteStyle, previousContext, isDictation, additionalContext })
  }

  // Build system prompt: base + specialty + note style instruction
  const specialtyAddon = specialty ? (SPECIALTY_ADDONS[specialty] ?? '') : ''
  const styleInstruction = noteStyle === 'uppercase'
    ? '\n\nIMPORTANTE: Genera toda la respuesta JSON en MAYÚSCULAS. Sin excepción.'
    : noteStyle === 'lowercase'
    ? '\n\nIMPORTANTE: Genera toda la respuesta JSON en minúsculas. Sin excepción.'
    : ''
  const systemPrompt = (isDictation ? DICTATION_PREFIX : '') + SYSTEM_PROMPT + specialtyAddon + styleInstruction

  // Sanitize transcript before embedding in the prompt
  const transcripcionLimpia = transcript
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ')
    .trim()
  console.log('[Dictia] Transcripción recibida:', transcripcionLimpia.slice(0, 300))

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

  if (additionalContext && additionalContext.trim()) {
    parts.push(`\nCONTEXTO ADICIONAL DEL MÉDICO:\n${additionalContext.trim()}\n--- FIN CONTEXTO ADICIONAL ---`)
  }

  parts.push(`\nTranscripción de la consulta:\n\n${transcripcionLimpia}`)

  const userMessage = parts.join('\n')
  console.log('[Dictia] Prompt enviado a Anthropic:', userMessage.slice(0, 500))
  let raw = await callClaude(systemPrompt, userMessage, 4000)
  let parsed = tryParseJson(raw)
  if (!parsed) {
    console.log('[Dictia] Primer intento falló, reintentando con hint JSON...')
    const retryMessage = userMessage + '\n\nResponde ÚNICAMENTE con el JSON válido, sin texto adicional, sin backticks, sin markdown.'
    raw = await callClaude(systemPrompt, retryMessage, 4000)
    parsed = tryParseJson(raw)
    if (!parsed) throw new Error('No se pudo procesar la consulta. Intenta grabar de nuevo.')
  }

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
    relevant_history: (parsed.antecedentes as string) || DEFAULT_ANTECEDENTES,
    review_of_systems: (parsed.revisionSistemas as string) || 'No referido',
    vital_signs: (parsed.signosVitales as string) || DEFAULT_VITAL_SIGNS,
    physical_exam: physicalExam,
    physical_exam_is_default: isTelemed ? false : physicalExamIsDefault,
    paraclinical_results: (parsed.paraclinicos as string) || 'No referido',
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
  options: { specialty?: string; noteStyle?: string; previousContext?: string; hospitalizationDay?: number; isDictation?: boolean; additionalContext?: string }
): Promise<SoapNote> {
  const { noteStyle, previousContext, hospitalizationDay, isDictation, additionalContext } = options

  const styleInstruction = noteStyle === 'uppercase'
    ? '\n\nIMPORTANTE: Genera toda la respuesta JSON en MAYÚSCULAS. Sin excepción.'
    : noteStyle === 'lowercase'
    ? '\n\nIMPORTANTE: Genera toda la respuesta JSON en minúsculas. Sin excepción.'
    : ''

  const systemPrompt = (isDictation ? DICTATION_PREFIX : '') + EVOLUTION_SYSTEM_PROMPT + styleInstruction

  const transcripcionLimpia = transcript
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ')
    .trim()
  console.log('[Dictia] Transcripción recibida (evolución):', transcripcionLimpia.slice(0, 300))

  const parts: string[] = []

  if (hospitalizationDay) {
    parts.push(`Día de hospitalización: ${hospitalizationDay}`)
  }

  if (previousContext) {
    parts.push(`\nNOTA ANTERIOR (CONTEXTO BASE):\n${previousContext}\n--- FIN NOTA ANTERIOR ---`)
  }

  if (additionalContext && additionalContext.trim()) {
    parts.push(`\nCONTEXTO ADICIONAL DEL MÉDICO:\n${additionalContext.trim()}\n--- FIN CONTEXTO ADICIONAL ---`)
  }

  parts.push(`\nCAMBIOS DEL DÍA:\n\n${transcripcionLimpia}`)

  const userMessage = parts.join('\n')
  console.log('[Dictia] Prompt enviado a Anthropic (evolución):', userMessage.slice(0, 500))
  let raw = await callClaude(systemPrompt, userMessage, 4500)
  let parsed = tryParseJson(raw)
  if (!parsed) {
    console.log('[Dictia] Evolución: primer intento falló, reintentando con hint JSON...')
    const retryMessage = userMessage + '\n\nResponde ÚNICAMENTE con el JSON válido, sin texto adicional, sin backticks, sin markdown.'
    raw = await callClaude(systemPrompt, retryMessage, 4500)
    parsed = tryParseJson(raw)
    if (!parsed) throw new Error('No se pudo procesar la nota de evolución. Intenta de nuevo.')
  }

  const rawPharma = parsed.sugerenciasFarmacologicas as unknown[]
  const pharmaSuggestions: PharmaSuggestion[] = Array.isArray(rawPharma)
    ? rawPharma.filter(Boolean).map((s) => {
        const item = s as Record<string, unknown>
        return {
          nombre_generico: String(item.nombreGenerico ?? ''),
          nombre_comercial: String(item.nombreComercial ?? ''),
          dosis: String(item.dosis ?? ''),
          indicacion: String(item.indicacion ?? ''),
        }
      })
    : []

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

  let physicalExam = (parsed.examenFisico as string) || ''
  const physicalExamIsDefault = Boolean(parsed.examenFisicoEsDefault)

  const note: SoapNote = {
    note_type: 'evolucion',
    chief_complaint: (parsed.motivoConsulta as string) || '',
    current_illness: (parsed.enfermedadActual as string) || '',
    relevant_history: (parsed.antecedentes as string) || DEFAULT_ANTECEDENTES,
    vital_signs: (parsed.signosVitales as string) || DEFAULT_VITAL_SIGNS,
    physical_exam: physicalExam,
    physical_exam_is_default: physicalExamIsDefault,
    analysis: (parsed.analisis as string) || '',
    diagnosis: (parsed.diagnostico as string) || '',
    cie10_code: (parsed.codigoCIE10 as string) || '',
    cie10_description: (parsed.descripcionCIE10 as string) || '',
    management_plan: (parsed.planManejo as string) || '',
    patient_instructions: (parsed.instruccionesPaciente as string) || '',
    pharma_suggestions: pharmaSuggestions.length > 0 ? pharmaSuggestions : undefined,
    glosa_shield: glosaShield,
    is_telemedicine: false,
    hospitalization_day: hospitalizationDay ?? 1,
    evolution_date: new Date().toLocaleDateString('es-CO'),
  }

  return note
}

async function generateTransferNote(
  transcript: string,
  options: { specialty?: string; noteStyle?: string; previousContext?: string; isDictation?: boolean; additionalContext?: string }
): Promise<SoapNote> {
  const { noteStyle, previousContext, isDictation, additionalContext } = options

  const styleInstruction = noteStyle === 'uppercase'
    ? '\n\nIMPORTANTE: Genera toda la respuesta JSON en MAYÚSCULAS. Sin excepción.'
    : noteStyle === 'lowercase'
    ? '\n\nIMPORTANTE: Genera toda la respuesta JSON en minúsculas. Sin excepción.'
    : ''

  const systemPrompt = (isDictation ? DICTATION_PREFIX : '') + TRANSFER_SYSTEM_PROMPT + styleInstruction

  const transcripcionLimpia = transcript
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ')
    .trim()
  console.log('[Dictia] Transcripción recibida (traslado):', transcripcionLimpia.slice(0, 300))

  const parts: string[] = []

  if (previousContext) {
    parts.push(`CONTEXTO BASE (notas del servicio de origen):\n${previousContext}\n--- FIN CONTEXTO BASE ---`)
  }

  if (additionalContext && additionalContext.trim()) {
    parts.push(`\nCONTEXTO ADICIONAL DEL MÉDICO:\n${additionalContext.trim()}\n--- FIN CONTEXTO ADICIONAL ---`)
  }

  parts.push(`\nGRABACIÓN AL INGRESO (transcripción del médico al recibir al paciente):\n\n${transcripcionLimpia}`)

  const userMessage = parts.join('\n')
  console.log('[Dictia] Prompt enviado a Anthropic (traslado):', userMessage.slice(0, 500))
  let raw = await callClaude(systemPrompt, userMessage, 4500)
  let parsed = tryParseJson(raw)
  if (!parsed) {
    console.log('[Dictia] Traslado: primer intento falló, reintentando con hint JSON...')
    const retryMessage = userMessage + '\n\nResponde ÚNICAMENTE con el JSON válido, sin texto adicional, sin backticks, sin markdown.'
    raw = await callClaude(systemPrompt, retryMessage, 4500)
    parsed = tryParseJson(raw)
    if (!parsed) throw new Error('No se pudo procesar la nota de traslado. Intenta de nuevo.')
  }

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

  const evidenceMessage = `Diagnóstico: ${diagnosis}`
  let raw = await callClaude(systemPrompt, evidenceMessage, 1800)
  let parsed = tryParseJson(raw) as Partial<ClinicalAnalysis> | null
  if (!parsed) {
    raw = await callClaude(systemPrompt, evidenceMessage, 1800)
    parsed = tryParseJson(raw) as Partial<ClinicalAnalysis> | null
  }
  if (!parsed) return {
    diferenciales: ['No se pudo generar el análisis en este momento.'],
    criterios: [], paraclínicos: [], alertas: [], tratamiento: [], complicaciones: [],
  }
  return {
    diferenciales: parsed.diferenciales ?? [],
    criterios: parsed.criterios ?? [],
    paraclínicos: parsed.paraclínicos ?? [],
    alertas: parsed.alertas ?? [],
    tratamiento: parsed.tratamiento ?? [],
    complicaciones: parsed.complicaciones ?? [],
  }
}

// ─── Live guideline search via web_search_20250305 ────────────────────────────
// Called on demand by the "Buscar evidencia" button — never during automatic
// note generation so latency of the main flow is unaffected.
// Falls back to generateClinicalEvidence if web search is unavailable (beta access).
export async function searchGuidelinesWithWeb(diagnosis: string): Promise<string> {
  const year = new Date().getFullYear()
  const systemPrompt = `Eres un asistente de apoyo clínico para médicos colombianos. Se te da un diagnóstico. Usa web_search para buscar las guías de manejo actuales más relevantes.

Estrategia de búsqueda (en este orden):
1. "guías manejo ${diagnosis} Colombia ${year}"
2. "clinical guidelines ${diagnosis} treatment ${year}"
3. "${diagnosis} first line treatment dosage ${year}"

Luego presenta en español claro y conciso, sin introducción:

**Tratamiento de primera línea**
[fármaco(s) con dosis, vía y duración cuando estén disponibles]

**Cuándo hospitalizar**
[criterios específicos]

**Seguimiento**
[tiempo y criterio de alta/referencia]

**Fuentes consultadas**
[lista breve de las fuentes que encontraste con año de publicación]

Máximo 400 palabras. Sé específico y práctico. Si no encuentras guías colombianas, usa NICE, OMS, AHA o Cochrane.`

  try {
    return await callClaudeWithWebSearch(systemPrompt, `Diagnóstico: ${diagnosis}`)
  } catch (webErr) {
    console.warn('[Dictia] web_search no disponible, usando fallback generateClinicalEvidence:', webErr)
    const analysis = await generateClinicalEvidence(diagnosis)
    const sections: string[] = []
    if (analysis.tratamiento.length)   sections.push(`**Tratamiento de primera línea**\n${analysis.tratamiento.map((t, i) => `${i + 1}. ${t}`).join('\n')}`)
    if (analysis.criterios.length)     sections.push(`**Criterios diagnósticos**\n${analysis.criterios.map((c, i) => `${i + 1}. ${c}`).join('\n')}`)
    if (analysis.alertas.length)       sections.push(`**Signos de alarma / cuándo hospitalizar**\n${analysis.alertas.map((a, i) => `${i + 1}. ${a}`).join('\n')}`)
    if (analysis['paraclínicos'].length) sections.push(`**Paraclínicos recomendados**\n${analysis['paraclínicos'].map((p, i) => `${i + 1}. ${p}`).join('\n')}`)
    if (analysis.complicaciones.length) sections.push(`**Complicaciones a vigilar**\n${analysis.complicaciones.map((c, i) => `${i + 1}. ${c}`).join('\n')}`)
    return sections.join('\n\n')
  }
}

export function formatNoteForClipboard(note: SoapNote): string {
  const date = new Date().toLocaleDateString('es-CO', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })

  // Evolution note format
  if (note.note_type === 'evolucion') {
    const lines = [
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'NOTA DE EVOLUCIÓN — DICTIA AI',
      `${note.evolution_date || date}${note.hospitalization_day ? ` — Día ${note.hospitalization_day} de hospitalización` : ''}`,
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    ]

    if (note.current_illness) {
      lines.push('', note.current_illness)
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
    'REVISIÓN POR SISTEMAS',
    note.review_of_systems || 'No referido',
    '',
    'SIGNOS VITALES',
    note.vital_signs || DEFAULT_VITAL_SIGNS,
    '',
    note.is_telemedicine
      ? 'EXAMEN FÍSICO (Evaluación por telemedicina — limitada)'
      : 'EXAMEN FÍSICO',
    note.physical_exam || '(No evaluado)',
    '',
    'PARACLÍNICOS',
    note.paraclinical_results || 'No referido',
    '',
    'ANÁLISIS',
    note.analysis,
    '',
    'DIAGNÓSTICO',
    note.diagnosis,
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
