import { Link } from 'react-router-dom'
import Logo from '../components/Logo'

const LAST_UPDATED = '17 de junio de 2026'
const CONTACT_EMAIL = 'privacidad@dictia.health'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100 py-4 px-6 flex items-center justify-between sticky top-0 bg-white z-10">
        <Link to="/"><Logo size="md" /></Link>
        <Link to="/" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">← Volver al inicio</Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 text-slate-700">
        <p className="text-xs font-semibold text-primary-600 uppercase tracking-wider mb-2">Dictia AI</p>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Política de Privacidad y Protección de Datos</h1>
        <p className="text-sm text-slate-400 mb-10">Última actualización: {LAST_UPDATED} · Versión v1.0-2025</p>

        <Section title="1. Identificación del responsable del tratamiento">
          <p>
            <strong>Dictia AI</strong> (en adelante "Dictia", "nosotros" o "la plataforma"), operada bajo el dominio <strong>dictia.health</strong>, actúa como <strong>encargado del tratamiento</strong> de los datos de pacientes que el médico usuario procesa a través de la plataforma, y como <strong>responsable del tratamiento</strong> únicamente de los datos propios del médico usuario (datos de cuenta, uso de la plataforma y facturación).
          </p>
          <p className="mt-3">
            El <strong>médico usuario</strong> es el responsable del tratamiento frente a sus pacientes, en los términos de la legislación aplicable en su país de ejercicio profesional. Dictia actúa como su encargado de procesamiento para las operaciones de transcripción y generación de notas.
          </p>
          <p className="mt-3">
            Para ejercer sus derechos o contactar al responsable del tratamiento de sus datos de cuenta, escriba a: <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary-600 underline">{CONTACT_EMAIL}</a>
          </p>
        </Section>

        <Section title="2. Marco legal aplicable">
          <p>Dictia cumple con la normativa de protección de datos personales vigente en los países donde opera:</p>
          <ul className="mt-3 space-y-2 list-none">
            {[
              ['🇨🇴 Colombia', 'Ley 1581 de 2012 (protección de datos), Decreto 1377 de 2013, Resolución 1995 de 1999 (manejo de historia clínica — aplicable al médico usuario como custodio; Dictia no es sistema HCE), Ley 23 de 1981 (ética médica, confidencialidad de HC), Resolución 1888 de 2025 (datos de salud)'],
              ['🇲🇽 México', 'Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y su Reglamento 2025'],
              ['🇦🇷 Argentina', 'Ley 25.326 de Protección de Datos Personales'],
              ['🇨🇱 Chile', 'Ley 19.628 sobre Protección de la Vida Privada'],
              ['🇧🇷 Brasil', 'Lei Geral de Proteção de Dados (LGPD) – Lei 13.709/2018'],
              ['🇵🇪 Perú', 'Ley 29.733 de Protección de Datos Personales y su Reglamento'],
            ].map(([country, law]) => (
              <li key={country} className="flex items-start gap-2 text-sm">
                <span className="flex-shrink-0">{country}</span>
                <span className="text-slate-600">{law}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="3. Datos que Dictia recopila del médico usuario">
          <p>Dictia recopila y trata únicamente los siguientes datos del médico que crea una cuenta:</p>
          <Table rows={[
            ['Nombre completo', 'Identificación de la cuenta', 'Vigencia de la cuenta + 1 año'],
            ['Correo electrónico', 'Autenticación y comunicaciones', 'Vigencia de la cuenta + 1 año'],
            ['País y especialidad', 'Personalización de la plataforma', 'Vigencia de la cuenta + 1 año'],
            ['Plan activo y uso', 'Facturación y límites de uso', 'Vigencia de la cuenta + 1 año'],
            ['Fecha de aceptación de términos', 'Evidencia de consentimiento expreso', 'Permanente (obligación legal)'],
            ['Datos de pago (token)', 'Procesamiento de cobros vía Wompi', 'Según política de Wompi'],
            ['IP de acceso', 'Seguridad y control institucional', '90 días en logs de sesión'],
            ['Metadatos de consultas', 'Estadísticas de uso (duración, tipo, especialidad)', 'Vigencia de la cuenta + 1 año'],
          ]} headers={['Dato', 'Finalidad', 'Tiempo de retención']} />
          <p className="mt-4 text-sm text-slate-500 bg-slate-50 rounded-xl p-3">
            <strong>Nota:</strong> Los metadatos de consultas NO incluyen diagnósticos, nombres de pacientes, transcripciones ni contenido clínico de ningún tipo.
          </p>
        </Section>

        <Section title="4. Datos que Dictia NO recopila ni retiene">
          <p>Por diseño de privacidad (<em>privacy by design</em>), Dictia <strong>no almacena en ningún servidor propio ni de terceros</strong> los siguientes datos:</p>
          <ul className="mt-3 space-y-2 text-sm">
            {[
              'Audio de las consultas médicas (se elimina inmediatamente al completar la transcripción)',
              'Transcripciones de consultas (se eliminan al completar la generación de la nota)',
              'Notas clínicas generadas (se muestran al médico en pantalla pero nunca se guardan)',
              'Nombres, cédulas, fechas de nacimiento o cualquier dato identificable de pacientes',
              'Diagnósticos asociados a pacientes identificables',
              'Imágenes, documentos o archivos clínicos de pacientes',
            ].map(item => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold flex-shrink-0">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="5. Flujo de procesamiento de datos de pacientes">
          <p>El ciclo completo de una consulta transcurre de la siguiente forma:</p>
          <ol className="mt-3 space-y-2 text-sm list-decimal list-inside text-slate-600">
            <li>El médico graba la consulta desde su navegador (el audio queda en memoria del dispositivo).</li>
            <li>El audio se envía cifrado a <strong>Groq</strong> para transcripción en tiempo real.</li>
            <li>Al completar la transcripción, el audio se descarta automáticamente.</li>
            <li>La transcripción se envía a <strong>Anthropic</strong> para generar la nota médica estructurada.</li>
            <li>Al completar la nota, la transcripción se descarta automáticamente.</li>
            <li>La nota se muestra al médico para su revisión y aprobación.</li>
            <li>Al aprobar, Dictia registra únicamente metadatos no identificables (tipo de nota, duración, especialidad).</li>
            <li>La nota aprobada queda bajo la responsabilidad y custodia del médico.</li>
          </ol>
          <p className="mt-4 text-sm bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800">
            <strong>Importante:</strong> Dictia no tiene acceso al contenido clínico de las notas generadas. El médico es el único responsable de la custodia, almacenamiento y compartición de las notas con sus pacientes o con otros sistemas.
          </p>
        </Section>

        <Section title="6. Sub-encargados del tratamiento">
          <p>Dictia utiliza los siguientes proveedores de infraestructura que actúan como sub-encargados del tratamiento:</p>
          <Table rows={[
            ['Supabase', 'Base de datos (solo datos del médico)', 'EE.UU. (AWS us-east-1)', 'supabase.com/privacy'],
            ['Groq Inc.', 'Transcripción de audio (procesa y descarta)', 'EE.UU.', 'groq.com/privacy'],
            ['Anthropic PBC', 'Generación de notas (procesa y descarta)', 'EE.UU.', 'anthropic.com/privacy'],
            ['Wompi / Bancolombia', 'Procesamiento de pagos', 'Colombia / EE.UU.', 'wompi.co/politica-privacidad'],
            ['Vercel Inc.', 'Hosting y CDN de la aplicación', 'EE.UU. / Global', 'vercel.com/legal/privacy-policy'],
          ]} headers={['Proveedor', 'Función', 'Ubicación', 'Política']} />
          <p className="mt-3 text-sm text-slate-500">
            Todos los sub-encargados procesan los datos bajo contratos de procesamiento de datos (DPA) que garantizan niveles de protección equivalentes a los exigidos por la normativa LATAM aplicable.
          </p>
        </Section>

        <Section title="7. Derechos del médico usuario">
          <p>Como titular de los datos de su cuenta, usted tiene los siguientes derechos:</p>
          <ul className="mt-3 space-y-2 text-sm">
            {[
              ['Acceso', 'Solicitar un reporte de todos los datos que Dictia tiene sobre su cuenta.'],
              ['Rectificación', 'Corregir datos incorrectos directamente desde Configuración o por correo.'],
              ['Supresión', 'Solicitar la eliminación completa de su cuenta y datos asociados.'],
              ['Portabilidad', 'Recibir sus datos de cuenta en formato legible por máquina (CSV/JSON).'],
              ['Revocación del consentimiento', 'Cancelar su cuenta en cualquier momento sin penalidad.'],
              ['Oposición', 'Oponerse al tratamiento de sus datos para fines distintos a los estrictamente necesarios.'],
            ].map(([right, desc]) => (
              <li key={right} className="flex items-start gap-2">
                <span className="font-semibold text-slate-900 flex-shrink-0 w-44">{right}</span>
                <span className="text-slate-600">{desc}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm">
            Para ejercer cualquiera de estos derechos, envíe un correo a <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary-600 underline">{CONTACT_EMAIL}</a> con el asunto "Ejercicio de derechos ARCO". Respondemos en máximo <strong>15 días hábiles</strong>.
          </p>
        </Section>

        <Section title="8. Seguridad de los datos">
          <ul className="space-y-2 text-sm">
            {[
              'Cifrado en tránsito: TLS 1.3 en todas las comunicaciones entre el navegador, Dictia y los sub-encargados.',
              'Cifrado en reposo: Los datos del médico en Supabase están cifrados con AES-256 en reposo.',
              'Autenticación: Autenticación segura mediante Supabase Auth con tokens JWT de corta duración.',
              'Row Level Security (RLS): Cada médico accede únicamente a sus propios datos en la base de datos.',
              'Sin almacenamiento de audio: El audio nunca toca los servidores de Dictia ni Supabase.',
              'Control de acceso institucional: Las clínicas pueden restringir el acceso por IP de red.',
            ].map(item => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-primary-500 flex-shrink-0 mt-0.5">🔒</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="9. Cookies y almacenamiento local">
          <p>
            Dictia utiliza <strong>cookies esenciales</strong> para el funcionamiento de la sesión de usuario (autenticación). No utilizamos cookies de rastreo publicitario ni compartimos datos de navegación con terceros para fines de marketing.
          </p>
          <p className="mt-3 text-sm text-slate-600">
            También usamos <code className="bg-slate-100 px-1 rounded">localStorage</code> del navegador para almacenar preferencias locales de la interfaz (modo de pantalla, configuración de notas). Estos datos nunca se envían a nuestros servidores.
          </p>
        </Section>

        <Section title="10. Transferencias internacionales de datos">
          <p>
            Los datos del médico usuario pueden ser procesados en los Estados Unidos de América, donde operan nuestros principales sub-encargados (Supabase, Groq, Anthropic, Vercel). Estas transferencias se realizan bajo garantías contractuales adecuadas (Cláusulas Contractuales Estándar o instrumentos equivalentes) conforme a la normativa aplicable en cada país LATAM.
          </p>
        </Section>

        <Section title="11. Cambios a esta política">
          <p>
            Dictia puede actualizar esta política de privacidad. En caso de cambios materiales, notificaremos al médico usuario por correo electrónico con al menos <strong>30 días de anticipación</strong>. El uso continuado de la plataforma después de la fecha de vigencia de los cambios constituye aceptación de la política actualizada.
          </p>
        </Section>

        <Section title="12. Contacto">
          <p>Para cualquier consulta relacionada con privacidad y protección de datos:</p>
          <div className="mt-3 bg-slate-50 rounded-xl p-4 text-sm space-y-1">
            <p><strong>Correo:</strong> <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary-600 underline">{CONTACT_EMAIL}</a></p>
            <p><strong>Asunto sugerido:</strong> "Consulta de privacidad – [su nombre]"</p>
            <p><strong>Tiempo de respuesta:</strong> Máximo 15 días hábiles</p>
          </div>
        </Section>

        <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <p className="text-xs text-slate-400">© 2025 Dictia AI · {LAST_UPDATED}</p>
          <div className="flex gap-4 text-xs">
            <Link to="/terminos" className="text-primary-600 hover:underline">Términos de uso</Link>
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

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto mt-3">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-slate-50">
            {headers.map(h => (
              <th key={h} className="text-left px-3 py-2 font-semibold text-slate-600 border border-slate-200">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="even:bg-slate-50">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 border border-slate-200 text-slate-700">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
