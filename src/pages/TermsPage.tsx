import { Link } from 'react-router-dom'
import Logo from '../components/Logo'

const LAST_UPDATED = '13 de junio de 2025'
const CONTACT_EMAIL = 'legal@dictia.health'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100 py-4 px-6 flex items-center justify-between sticky top-0 bg-white z-10">
        <Link to="/"><Logo size="md" /></Link>
        <Link to="/" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">← Volver al inicio</Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 text-slate-700">
        <p className="text-xs font-semibold text-primary-600 uppercase tracking-wider mb-2">Dictia AI</p>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Términos de Uso</h1>
        <p className="text-sm text-slate-400 mb-10">Última actualización: {LAST_UPDATED} · Versión v1.0-2025</p>

        <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4 mb-10 text-sm text-primary-800 leading-relaxed">
          <strong>Antes de usar Dictia, lea estos términos.</strong> Al crear una cuenta y usar la plataforma, usted acepta quedar vinculado por estos Términos de Uso. Si no está de acuerdo, no utilice la plataforma.
        </div>

        <Section title="1. Descripción del servicio">
          <p>
            Dictia AI es una plataforma de documentación médica asistida por inteligencia artificial que permite a médicos transcribir consultas y generar historias clínicas estructuradas en formato SOAP con codificación CIE-10. El servicio está disponible en <strong>dictia.health</strong>.
          </p>
          <p className="mt-3">
            Dictia es una herramienta de asistencia a la documentación. <strong>No es un dispositivo médico, no emite diagnósticos clínicos, y no reemplaza el juicio clínico del médico.</strong> El médico es el único responsable de revisar, aprobar y utilizar el contenido generado.
          </p>
        </Section>

        <Section title="2. Elegibilidad y registro">
          <ul className="space-y-2 text-sm">
            <li>• El uso de Dictia está reservado exclusivamente a <strong>profesionales de la salud habilitados</strong> (médicos, especialistas, residentes bajo supervisión) en sus países de ejercicio.</li>
            <li>• Al registrarse, usted declara ser un profesional de la salud con licencia vigente y que usará la plataforma únicamente en el ejercicio de su actividad profesional.</li>
            <li>• Usted es responsable de mantener la confidencialidad de sus credenciales de acceso y de todas las actividades que ocurran bajo su cuenta.</li>
            <li>• Una cuenta corresponde a un único profesional. No está permitido compartir credenciales entre múltiples usuarios.</li>
          </ul>
        </Section>

        <Section title="3. Responsabilidades del médico usuario">
          <p>Al usar Dictia, usted acepta y reconoce que:</p>
          <ul className="mt-3 space-y-2.5 text-sm">
            {[
              'Es el único responsable del tratamiento de datos de salud de sus pacientes, conforme a la legislación aplicable en su país.',
              'Debe contar con el consentimiento informado de sus pacientes para el uso de herramientas de documentación asistida por IA en la consulta.',
              'Debe revisar y aprobar toda nota generada por Dictia antes de incorporarla a la historia clínica oficial del paciente.',
              'Es responsable de la custodia, almacenamiento y compartición de las notas aprobadas, dado que Dictia no las almacena.',
              'No debe introducir voluntariamente en la consulta datos de pacientes que no sean estrictamente necesarios para la documentación médica.',
              'Debe usar Dictia de conformidad con la ética médica y las normas de su colegio o asociación profesional.',
              'Es responsable del cumplimiento normativo frente a sus pacientes y autoridades sanitarias en lo que respecta al uso de IA en la consulta médica.',
            ].map(item => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-primary-500 flex-shrink-0 mt-0.5 font-bold">→</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="4. Naturaleza del servicio de IA y limitaciones">
          <p>Usted comprende y acepta que:</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>• Las notas generadas por Dictia son el resultado de modelos de inteligencia artificial y pueden contener errores, omisiones o imprecisiones.</li>
            <li>• Dictia <strong>no garantiza</strong> la exactitud, completitud o adecuación clínica de las notas generadas.</li>
            <li>• El análisis de blindaje documental (anti-glosas) es orientativo y no garantiza la aprobación de cuentas médicas por aseguradoras o EPS.</li>
            <li>• La transcripción de audio puede no ser perfecta, especialmente con terminología altamente especializada, acentos regionales o ruido ambiental.</li>
            <li>• Dictia no puede verificar la veracidad de la información suministrada en la consulta.</li>
          </ul>
        </Section>

        <Section title="5. Planes, precios y facturación">
          <ul className="space-y-2 text-sm">
            <li>• Dictia ofrece un período de prueba gratuita de <strong>3 días</strong> que comienza al crear la cuenta.</li>
            <li>• Al finalizar el período de prueba, se activará automáticamente el cobro del plan seleccionado, salvo que cancele antes.</li>
            <li>• Los precios están expresados en Pesos Colombianos (COP) e incluyen IVA cuando corresponde.</li>
            <li>• Dictia puede modificar los precios notificando al usuario con al menos <strong>30 días de anticipación</strong>.</li>
            <li>• No se realizan reembolsos por períodos parciales de uso, salvo que la ley aplicable lo exija.</li>
            <li>• El procesamiento de pagos está a cargo de <strong>Wompi (Bancolombia)</strong>. Dictia no almacena datos de tarjetas de crédito.</li>
          </ul>
        </Section>

        <Section title="6. Propiedad intelectual">
          <p>
            El software, diseño, marca, algoritmos y contenidos de Dictia son propiedad exclusiva de Dictia AI y están protegidos por las leyes de propiedad intelectual aplicables.
          </p>
          <p className="mt-3">
            Las notas médicas generadas a partir de las consultas del médico son propiedad del médico usuario. Dictia no reclama derechos sobre el contenido clínico generado.
          </p>
          <p className="mt-3">
            Usted otorga a Dictia una licencia limitada, no exclusiva y revocable para procesar sus datos de uso con el fin de mejorar el servicio, en forma agregada y anonimizada, nunca a nivel individual.
          </p>
        </Section>

        <Section title="7. Uso prohibido">
          <p>Está estrictamente prohibido:</p>
          <ul className="mt-3 space-y-2 text-sm">
            {[
              'Usar Dictia para fines distintos a la documentación médica profesional.',
              'Intentar acceder a datos de otros usuarios o vulnerar la seguridad del sistema.',
              'Usar la plataforma para generar contenido médico fraudulento o engañoso.',
              'Revender, sublicenciar o transferir el acceso a la plataforma a terceros.',
              'Realizar ingeniería inversa del software o intentar extraer los modelos de IA subyacentes.',
              'Usar scripts automáticos o bots para consumir el servicio de manera masiva sin autorización.',
            ].map(item => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-red-500 flex-shrink-0 mt-0.5 font-bold">✕</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="8. Suspensión y terminación">
          <p>
            Dictia se reserva el derecho de suspender o terminar el acceso de un usuario que incumpla estos términos, sin previo aviso y sin derecho a reembolso.
          </p>
          <p className="mt-3">
            El médico usuario puede cancelar su cuenta en cualquier momento desde la sección de facturación o enviando un correo a <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary-600 underline">{CONTACT_EMAIL}</a>. La cancelación tendrá efecto al final del período de facturación en curso.
          </p>
        </Section>

        <Section title="9. Limitación de responsabilidad">
          <p>
            En la máxima medida permitida por la ley aplicable, Dictia no será responsable por:
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>• Daños derivados de errores en las notas generadas por IA que no fueron revisados por el médico.</li>
            <li>• Pérdida de notas no guardadas por el médico (Dictia no almacena el contenido clínico).</li>
            <li>• Interrupciones del servicio por causas fuera del control de Dictia (fallos de terceros, fuerza mayor).</li>
            <li>• Decisiones clínicas tomadas basándose exclusivamente en el contenido generado por la IA sin revisión médica.</li>
          </ul>
          <p className="mt-3">
            La responsabilidad máxima de Dictia frente al usuario, en cualquier caso, no excederá el valor pagado por el usuario en los últimos 3 meses de servicio.
          </p>
        </Section>

        <Section title="10. Modificaciones a los términos">
          <p>
            Dictia puede actualizar estos Términos de Uso. Los cambios materiales serán notificados por correo electrónico con al menos <strong>30 días de anticipación</strong>. El uso continuado del servicio después de la fecha de vigencia implica aceptación de los nuevos términos.
          </p>
        </Section>

        <Section title="11. Ley aplicable y resolución de disputas">
          <p>
            Estos términos se rigen por las leyes de la República de Colombia. Las disputas que no puedan resolverse amigablemente serán sometidas a la jurisdicción de los tribunales competentes de Bogotá D.C., Colombia, sin perjuicio de los derechos del consumidor que la legislación local del usuario pudiera reconocerle.
          </p>
        </Section>

        <Section title="12. Contacto">
          <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1">
            <p><strong>Consultas legales:</strong> <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary-600 underline">{CONTACT_EMAIL}</a></p>
            <p><strong>Soporte general:</strong> <a href="mailto:hola@dictia.health" className="text-primary-600 underline">hola@dictia.health</a></p>
            <p><strong>Privacidad y datos:</strong> <a href="mailto:privacidad@dictia.health" className="text-primary-600 underline">privacidad@dictia.health</a></p>
          </div>
        </Section>

        <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <p className="text-xs text-slate-400">© 2025 Dictia AI · {LAST_UPDATED}</p>
          <div className="flex gap-4 text-xs">
            <Link to="/privacidad" className="text-primary-600 hover:underline">Política de privacidad</Link>
            <Link to="/" className="text-slate-500 hover:underline">Volver al inicio</Link>
          </div>
        </div>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold text-slate-900 mb-3 pb-2 border-b border-slate-100">{title}</h2>
      <div className="text-sm text-slate-700 leading-relaxed space-y-2">{children}</div>
    </section>
  )
}
