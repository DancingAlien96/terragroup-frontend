export default function PrivacidadContent() {
  return (
    <>
      <p>
        Esta Política de Privacidad describe cómo <strong>TerraGroup</strong> (en adelante,
        “nosotros”, “nuestro” o “TerraGroup”) recopila, utiliza, almacena y protege la
        información personal de los usuarios (en adelante, “Usted” o “Usuario”) que acceden
        o utilizan la plataforma disponible en{' '}
        <a href="https://terragroup.urbandata.app">terragroup.urbandata.app</a> (en adelante,
        la “Plataforma”).
      </p>

      <p>
        Al utilizar la Plataforma, Usted acepta el tratamiento de sus datos personales conforme
        a esta Política. Si no está de acuerdo, le rogamos no utilizar nuestros servicios.
      </p>

      <h2>1. Responsable del tratamiento</h2>
      <p>
        El responsable del tratamiento de los datos personales es <strong>TerraGroup</strong>,
        con domicilio en la República de Guatemala. Para cualquier consulta puede contactarnos en{' '}
        <a href="mailto:terragroup692@gmail.com">terragroup692@gmail.com</a>.
      </p>

      <h2>2. Datos que recopilamos</h2>
      <p>Recopilamos los siguientes datos cuando Usted utiliza la Plataforma:</p>
      <ul>
        <li>
          <strong>Datos de registro</strong>: nombre completo, nombre de la empresa, correo
          electrónico, nombre de usuario, número de teléfono y NIT (cuando aplique).
        </li>
        <li>
          <strong>Datos de autenticación</strong>: contraseña cifrada (almacenada mediante
          algoritmo bcrypt) y sesiones JWT.
        </li>
        <li>
          <strong>Datos operativos cargados por las empresas clientes</strong>: información de
          propietarios, lotes, ventas, pagos, comprobantes y expedientes. Esta información es
          ingresada por la empresa contratante; TerraGroup actúa como procesador, no como
          responsable de esta información (ver sección 6).
        </li>
        <li>
          <strong>Datos técnicos</strong>: dirección IP, agente de usuario del navegador, fechas
          de acceso y eventos de auditoría dentro de la Plataforma.
        </li>
        <li>
          <strong>Datos de pago</strong>: no almacenamos información de tarjetas ni datos
          financieros. Los pagos se procesan a través de <strong>Recurrente</strong>, pasarela
          autorizada cuya política de privacidad se aplica al momento del pago.
        </li>
      </ul>

      <h2>3. Fines del tratamiento</h2>
      <p>Utilizamos sus datos para:</p>
      <ul>
        <li>Crear, gestionar y mantener su cuenta y la de su empresa.</li>
        <li>Operar la Plataforma (cobranza, gestión de cartera, reportes).</li>
        <li>
          Enviar notificaciones operativas estrictamente necesarias (confirmaciones de pago,
          recordatorios de cuotas, alertas de actividad). No enviamos publicidad sin
          consentimiento previo.
        </li>
        <li>
          Enviar mensajes vía WhatsApp Business (Meta Cloud API) cuando la empresa cliente lo
          haya activado, exclusivamente para fines operativos relacionados con sus propios
          clientes.
        </li>
        <li>Cumplir con obligaciones legales aplicables.</li>
        <li>Mantener bitácoras de auditoría para fines de seguridad.</li>
      </ul>

      <h2>4. Base legal del tratamiento</h2>
      <p>
        El tratamiento de sus datos se realiza con base en (i) la ejecución del contrato
        celebrado entre Usted y TerraGroup al adquirir el servicio, (ii) su consentimiento
        otorgado al aceptar esta Política, y (iii) el interés legítimo de operar la Plataforma
        de manera segura y eficiente.
      </p>

      <h2>5. Compartición con terceros</h2>
      <p>
        No vendemos, alquilamos ni comercializamos sus datos personales. Compartimos información
        únicamente con los siguientes proveedores, en la medida estrictamente necesaria para
        operar el servicio:
      </p>
      <ul>
        <li>
          <strong>Recurrente</strong> (Guatemala) — procesamiento de pagos de la suscripción.
        </li>
        <li>
          <strong>Meta Platforms Ireland Ltd.</strong> — entrega de mensajes a través de
          WhatsApp Business Cloud API, cuando esta función esté activa.
        </li>
        <li>
          <strong>Proveedor de infraestructura</strong> — servidor privado virtual (VPS) donde se
          aloja la Plataforma.
        </li>
        <li>
          <strong>Autoridades competentes</strong>, únicamente cuando exista una orden judicial o
          requerimiento legal vinculante.
        </li>
      </ul>

      <h2>6. Datos de los clientes finales de las empresas (propietarios)</h2>
      <p>
        Las empresas que contratan TerraGroup cargan en la Plataforma información personal de
        sus propios clientes (propietarios, compradores, fiadores). Respecto de esa información:
      </p>
      <ul>
        <li>
          La empresa contratante es el <strong>responsable del tratamiento</strong> de esos datos
          ante sus titulares y ante las autoridades.
        </li>
        <li>
          TerraGroup actúa como <strong>encargado del tratamiento</strong>, procesando esos datos
          únicamente por instrucción de la empresa contratante.
        </li>
        <li>
          Cada empresa es responsable de obtener los consentimientos y de cumplir las leyes que
          le sean aplicables respecto de sus propios clientes.
        </li>
      </ul>

      <h2>7. Conservación de los datos</h2>
      <p>
        Conservamos los datos mientras la cuenta de su empresa permanezca activa. Tras la
        cancelación, conservaremos los datos por un período máximo de <strong>30 días</strong>{' '}
        para fines de respaldo, transcurridos los cuales serán eliminados de forma permanente,
        salvo obligación legal que requiera un plazo mayor (por ejemplo, retención contable).
      </p>

      <h2>8. Sus derechos</h2>
      <p>
        Usted tiene derecho a (i) acceder a sus datos personales, (ii) rectificar la
        información inexacta, (iii) solicitar su eliminación, (iv) oponerse al tratamiento en
        determinados supuestos, y (v) retirar el consentimiento otorgado. Para ejercer estos
        derechos, escríbanos a{' '}
        <a href="mailto:terragroup692@gmail.com">terragroup692@gmail.com</a>. Atenderemos su
        solicitud en un plazo máximo de 15 días hábiles.
      </p>

      <h2>9. Seguridad</h2>
      <p>Implementamos medidas técnicas y organizativas razonables, incluyendo:</p>
      <ul>
        <li>Cifrado en tránsito mediante TLS/HTTPS.</li>
        <li>Cifrado de contraseñas con bcrypt.</li>
        <li>Tokens de sesión firmados con JWT y rotación periódica del secreto.</li>
        <li>Headers de seguridad (X-Content-Type-Options, Content-Security-Policy).</li>
        <li>Bitácoras de auditoría de acciones críticas.</li>
        <li>Aislamiento de datos entre empresas (multi-tenant).</li>
      </ul>
      <p>
        Ninguna medida es infalible. En caso de detectar un incidente que comprometa
        razonablemente sus datos, le notificaremos sin demora indebida.
      </p>

      <h2>10. Cookies y tecnologías similares</h2>
      <p>
        La Plataforma utiliza <strong>almacenamiento local del navegador (localStorage)</strong>{' '}
        para conservar la sesión iniciada y <strong>una cookie HTTP</strong> con el token de
        autenticación durante 7 días. No utilizamos cookies de terceros, ni rastreadores
        publicitarios, ni herramientas de analítica de terceros.
      </p>

      <h2>11. Datos de menores</h2>
      <p>
        La Plataforma está dirigida a empresas y profesionales mayores de edad. No recopilamos
        intencionalmente datos de menores de edad. Si detectamos que un menor ha proporcionado
        datos, los eliminaremos.
      </p>

      <h2>12. Transferencias internacionales</h2>
      <p>
        Algunos de nuestros proveedores (por ejemplo, Meta Ireland Ltd.) pueden alojar
        infraestructura fuera de Guatemala. Al utilizar la Plataforma, Usted reconoce y consiente
        dichas transferencias internacionales, las cuales se realizan bajo estándares razonables
        de protección.
      </p>

      <h2>13. Cambios a esta Política</h2>
      <p>
        Podemos actualizar esta Política. La versión vigente siempre estará publicada en esta
        URL con la fecha de “última actualización”. Cambios sustanciales serán notificados por
        correo electrónico con al menos 15 días de antelación.
      </p>

      <h2>14. Legislación aplicable</h2>
      <p>
        Esta Política se rige por las leyes de la República de Guatemala. Cualquier controversia
        se someterá a la jurisdicción de los tribunales competentes de la ciudad de Guatemala,
        salvo que la ley disponga otra cosa.
      </p>

      <h2>15. Contacto</h2>
      <p>
        Para cualquier consulta, queja o ejercicio de derechos, escríbanos a{' '}
        <a href="mailto:terragroup692@gmail.com">terragroup692@gmail.com</a>.
      </p>
    </>
  );
}
