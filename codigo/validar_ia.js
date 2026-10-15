// Valida y sanea lo que devolvió Gemini. Gemini nunca decide a quién se
// escribe ni qué enlaces van: el destinatario es el email del formulario
// y la firma es fija. Si algo no cuadra, se usa la plantilla fija.
const p = $('Preparar').first().json;
const r = $input.first().json;
const { cfg, lead } = p;

let ia = null;
try {
  const texto = r.candidates[0].content.parts.map((x) => x.text || '').join('');
  ia = JSON.parse(texto);
} catch (e) { ia = null; }

const TIPOS = ['empleo', 'proyecto', 'consulta', 'spam'];
const clasif = {
  tipo: ia && TIPOS.includes(ia.tipo) ? ia.tipo : 'sin_clasificar',
  prioridad: ia && ['alta', 'media', 'baja'].includes(ia.prioridad) ? ia.prioridad : 'media',
  idioma: ia && typeof ia.idioma === 'string' ? ia.idioma.slice(0, 5).toLowerCase() : 'es',
  servicio: ia && typeof ia.servicio === 'string' ? ia.servicio.slice(0, 30) : 'Otro',
  negocio: ia && typeof ia.negocio === 'string' && ia.negocio.trim() ? ia.negocio.replace(/\s+/g, ' ').trim().slice(0, 40) : 'no indica',
  resumen: ia && typeof ia.resumen === 'string' ? ia.resumen.replace(/\s+/g, ' ').trim().slice(0, 220) : '(sin resumen: Gemini no respondió)',
};
const ingles = clasif.idioma === 'en';

// --- Saneado de la respuesta redactada por Gemini ---------------------
let cuerpo = ia && typeof ia.respuesta === 'string' ? ia.respuesta.trim() : '';
const PELIGROS = [
  /https?:\/\//i, /\bwww\./i, /\b[a-z0-9-]+\.(com|net|org|io|dev|co|me|ly|app|xyz|info|biz|ru|cn)\b/i, // enlaces y dominios
  /[^\s@]+@[^\s@]+/,                       // correos
  /\+?\d[\d\s().-]{7,}\d/,                 // teléfonos o cifras largas
  /<[^>]+>|\[[^\]]*\]\([^)]*\)/,           // HTML o enlaces Markdown
  /[$€£]\s?\d|\d+\s?(usd|cop|eur|dólares|pesos)\b/i, // precios
  /contraseñ|password|transferenc|bitcoin|cripto|tarjeta|cuenta bancaria|wire|gift card/i,
];
let motivo_plantilla = '';
if (!cuerpo) motivo_plantilla = 'Gemini no redactó respuesta';
else if (cuerpo.length < 80 || cuerpo.length > 1200) motivo_plantilla = 'longitud fuera de rango';
else if (PELIGROS.some((re) => re.test(cuerpo))) motivo_plantilla = 'contenido no permitido';

const nombreCorto = lead.nombre.split(/\s+/)[0].slice(0, 40);
if (motivo_plantilla) {
  cuerpo = ingles
    ? `Hi ${nombreCorto},\n\nThank you for reaching out through my website. I have received your message and I will reply personally within one or two business days.`
    : `Hola, ${nombreCorto}:\n\nGracias por escribirme a través de mi sitio web. Recibí tu mensaje y te responderé personalmente en uno o dos días hábiles.`;
}
const firma = ingles
  ? '\n\n—\nAlex Rodríguez P.\nWordPress development · Cloud infrastructure · Automation\nhttps://alexrope.dev\n\nThis is an automatic acknowledgment. I will reply to you personally.'
  : '\n\n—\nAlex Rodríguez P.\nDesarrollo WordPress · Infraestructura en la nube · Automatización\nhttps://alexrope.dev\n\nEste es un acuse de recibo automático. Te responderé personalmente.';

// --- ¿Se envía el acuse? ----------------------------------------------
let motivo = '';
if (clasif.tipo === 'spam') motivo = 'clasificado como spam';
else if (p.limite) motivo = p.limite;
const enviar = !motivo;

if (enviar) {
  const sd = $getWorkflowStaticData('global');
  sd.por_email = sd.por_email || {};
  sd.por_email[lead.email] = Date.now();
  sd.acuses.total = (sd.acuses.total || 0) + 1;
}

const ICONO = { empleo: '💼', proyecto: '🚀', consulta: '💬', spam: '🚫', sin_clasificar: '❓' };
const aviso = [
  `${ICONO[clasif.tipo]} Lead nuevo en ${lead.origen || 'el sitio'}: ${clasif.tipo.toUpperCase()} · prioridad ${clasif.prioridad}`,
  `👤 ${lead.nombre} <${lead.email}>`,
  `🏢 Negocio: ${clasif.negocio}`,
  `🧩 ${clasif.servicio} · idioma ${clasif.idioma}`,
  `📝 ${clasif.resumen}`,
  '',
  `Mensaje: ${lead.mensaje.slice(0, 600)}${lead.mensaje.length > 600 ? '…' : ''}`,
].join('\n');

const fecha = new Date(Date.now() - 5 * 3600000).toISOString().replace('T', ' ').slice(0, 16);
return [{
  json: {
    cfg, lead, clasif, enviar, motivo, motivo_plantilla, aviso,
    correo: {
      asunto: ingles ? 'I received your message · Alex Rodríguez P.' : 'Recibí tu mensaje · Alex Rodríguez P.',
      texto: cuerpo + firma,
    },
    fila_base: [fecha, lead.nombre, lead.email, clasif.tipo, clasif.prioridad, clasif.servicio, clasif.idioma, clasif.resumen, lead.mensaje],
  },
}];
