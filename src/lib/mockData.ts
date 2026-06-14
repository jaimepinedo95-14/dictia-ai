import type { SoapNote, Consultation } from './supabase'

export const MOCK_SOAP_NOTE: SoapNote = {
  chief_complaint: 'Dolor de garganta y fiebre de 3 días de evolución',
  current_illness:
    'Paciente masculino de 32 años que consulta por cuadro de 3 días de evolución caracterizado por odinofagia intensa (EVA 7/10), fiebre subjetiva medida en casa de hasta 38.8°C, astenia, adinamia y disfagia a sólidos. Refiere inicio gradual el pasado lunes. Niega tos, rinorrea, disfonía, dificultad respiratoria o exantema. No ha tomado ningún medicamento. Última consulta médica hace 8 meses por cuadro gripal.',
  relevant_history:
    'Sin antecedentes patológicos de importancia. Niega alergias medicamentosas. No refiere cirugías previas. Vacunación completa para la edad. Niega tabaquismo, alcoholismo o uso de sustancias psicoactivas. Vive con su familia. Trabaja como contador.',
  physical_exam:
    'PA: 118/76 mmHg · FC: 88 lpm · FR: 18 rpm · T°: 38.4°C · SatO2: 98% aa\n\nGeneral: Paciente en regular estado general, álgico, consciente, orientado, colaborador, hidratado.\nCabeza y cuello: Adenopatías cervicales anteriores bilaterales, dolorosas a la palpación (1.5 cm aprox). No rigidez nucal.\nOrofaringe: Amígdalas palatinas hipertróficas grado III, eritematosas, con exudado blanquecino bilateral. Úvula central. Mucosa oral hidratada.\nTórax: Murmullo vesicular conservado bilateral sin agregados. Ruidos cardíacos rítmicos sin soplos.\nAbdomen: Blando, depresible, no doloroso a la palpación. Sin visceromegalias. RHA presentes.\nExtremidades: Sin edemas, pulsos periféricos simétricos.',
  physical_exam_is_default: false,
  analysis:
    'Cuadro clínico compatible con amigdalitis aguda bacteriana. La presencia de exudado amigdalino blanquecino bilateral, adenopatías cervicales dolorosas, fiebre de 38.4°C y ausencia de tos configuran un puntaje de Centor de 4/4, lo que indica alta probabilidad de etiología estreptocócica (Streptococcus pyogenes). Se descarta síndrome mononucleósico por la ausencia de esplenomegalia y la edad del paciente. No hay datos clínicos de complicación supurativa (absceso periamigdalino) ni de compromiso de la vía aérea. Se decide iniciar antibioticoterapia empírica con amoxicilina como primera línea.',
  diagnosis: 'Amigdalitis aguda bacteriana',
  cie10_code: 'J03.9',
  cie10_description: 'Amigdalitis aguda, no especificada',
  management_plan:
    '1. Amoxicilina 500 mg vía oral cada 8 horas por 10 días.\n2. Acetaminofén 1 g vía oral cada 6 horas por 5 días (condicional a fiebre o dolor).\n3. Cloruro de sodio 0.9% spray nasal cada 4-6 horas.\n4. Reposo relativo por 48-72 horas.\n5. Control médico en 48-72 horas o antes si presenta: dificultad para respirar, disfagia total, fiebre >39°C persistente, exantema, o empeoramiento del cuadro.\n6. Solicitar: Streptococcus A rápido si no hay mejoría a las 48h.',
  patient_instructions:
    '- Tome el antibiótico completo (10 días) aunque se sienta mejor, para evitar recaídas.\n- Use el acetaminofén si tiene fiebre o dolor; no exceda 4 gramos al día.\n- Tome abundantes líquidos fríos (agua, jugos sin azúcar, gelatina).\n- Descanse los primeros 2 días.\n- Evite el contacto estrecho con otras personas mientras tenga fiebre.\n- Consulte urgencias si presenta dificultad para respirar, babeo excesivo, no puede tragar ni saliva, o si la fiebre supera los 39°C.',
  pharma_suggestions: [
    { nombre_generico: 'Amoxicilina', nombre_comercial: 'Amoxil', dosis: '500 mg vía oral cada 8 horas por 10 días', indicacion: 'Antibiótico de primera línea para infección estreptocócica' },
    { nombre_generico: 'Acetaminofén', nombre_comercial: 'Tylenol', dosis: '1 g vía oral cada 6 horas (máx 4 g/día)', indicacion: 'Antipirético y analgésico' },
    { nombre_generico: 'Ibuprofeno', nombre_comercial: 'Advil', dosis: '400 mg vía oral cada 8 horas con alimentos', indicacion: 'Antiinflamatorio / analgésico alternativo' },
  ],
  is_telemedicine: false,
  glosa_shield: {
    criterios_documentados: [
      'Motivo de consulta documentado con cita textual del paciente',
      'Tiempo de evolución especificado (3 días)',
      'Intensidad del dolor con escala EVA (7/10)',
      'Examen físico con hallazgos específicos documentados',
      'Diagnóstico con soporte en escala de Centor (4/4)',
      'Plan de manejo con dosis, vía y duración específicas',
      'Criterios de alarma para consulta de urgencias definidos',
    ],
    diagnostico_con_soporte: true,
    plan_coherente: true,
    posibles_faltantes: [
      'Documentar peso y talla del paciente',
      'Registrar fecha exacta de inicio de síntomas (no solo "el lunes")',
    ],
  },
}

export const MOCK_CONSULTATIONS: Consultation[] = [
  {
    id: '1',
    user_id: 'mock-user-id',
    recording_duration: 480,
    note_type: 'ingreso',
    status: 'approved',
    specialty: 'Medicina General',
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    approved_at: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    user_id: 'mock-user-id',
    recording_duration: 720,
    note_type: 'ingreso',
    status: 'approved',
    specialty: 'Ginecología',
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    approved_at: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    user_id: 'mock-user-id',
    recording_duration: 360,
    note_type: 'evolucion',
    status: 'approved',
    specialty: 'Medicina General',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    approved_at: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    user_id: 'mock-user-id',
    recording_duration: 600,
    note_type: 'ingreso',
    status: 'approved',
    specialty: 'Medicina Interna',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    approved_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
  },
  {
    id: '5',
    user_id: 'mock-user-id',
    recording_duration: 540,
    note_type: 'telemedicina',
    status: 'approved',
    specialty: 'Urgencias',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    approved_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
  },
]

export const COUNTRIES = [
  'Argentina', 'Bolivia', 'Chile', 'Colombia', 'Costa Rica', 'Cuba',
  'Ecuador', 'El Salvador', 'Guatemala', 'Honduras', 'México', 'Nicaragua',
  'Panamá', 'Paraguay', 'Perú', 'República Dominicana', 'Uruguay', 'Venezuela',
]

export const SPECIALTIES = [
  'Medicina General', 'Medicina Familiar', 'Medicina Interna', 'Urgencias y Emergencias',
  'Pediatría', 'Ginecología y Obstetricia', 'Cirugía General', 'Cardiología',
  'Dermatología', 'Endocrinología', 'Gastroenterología', 'Geriatría',
  'Infectología', 'Neumología', 'Neurología', 'Oftalmología',
  'Ortopedia y Traumatología', 'Otorrinolaringología', 'Psiquiatría',
  'Reumatología', 'Urología', 'Otra especialidad',
]

export const PLANS = [
  {
    id: 'free_trial',
    name: 'Gratis',
    price: 0,
    currency: 'COP',
    consultations: 10,
    period: 'notas de prueba',
    features: ['10 historias clínicas incluidas', 'Todas las funciones disponibles', 'Requiere tarjeta de crédito', 'Sin cobro hasta agotar las 10 notas'],
    cta: 'Empezar gratis',
    highlight: false,
  },
  {
    id: 'basic',
    name: 'Básico',
    price: 39900,
    currency: 'COP',
    consultations: 130,
    period: 'mes',
    features: ['Historia clínica SOAP completa', 'Nota de evolución hospitalaria', 'CIE-10 automático', 'Anti-glosas colombianas'],
    cta: 'Empezar gratis',
    highlight: false,
  },
  {
    id: 'standard',
    name: 'Estándar',
    price: 54900,
    currency: 'COP',
    consultations: 250,
    period: 'mes',
    features: ['Todo el plan Básico', 'Nota de ingreso por traslado', 'Nota de devolución de turno', 'AI Assistant dentro de la nota'],
    cta: 'Empezar gratis',
    highlight: true,
    badge: 'Más popular',
  },
  {
    id: 'advanced',
    name: 'Avanzado',
    price: 69900,
    currency: 'COP',
    consultations: 440,
    period: 'mes',
    features: ['Todo el plan Estándar', 'Evidencia clínica integrada', 'Sugerencias farmacológicas', 'Soporte prioritario'],
    cta: 'Empezar gratis',
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99900,
    currency: 'COP',
    consultations: 900,
    period: 'mes',
    features: ['Todo el plan Avanzado', 'Aprendizaje de estilo del médico', 'Acceso anticipado a nuevas funciones', 'Soporte directo por WhatsApp'],
    cta: 'Empezar gratis',
    highlight: false,
    badge: 'Para alto volumen',
  },
]
