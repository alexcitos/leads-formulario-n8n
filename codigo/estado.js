// Une los dos caminos (con y sin acuse) y deja la fila y el aviso finales.
// El aviso va a Telegram con parse_mode HTML: se escapan &, < y > para que
// ningún texto del visitante (p. ej. un "_" en el correo) rompa el formato.
const v = $('Validar IA').first().json;
const r = $input.first().json;
let acuse;
if (!v.enviar) acuse = 'no enviado: ' + v.motivo;
else if (r.error) acuse = 'falló el envío: ' + String(r.error.message || r.error).slice(0, 120);
else acuse = v.motivo_plantilla ? 'enviado (plantilla fija: ' + v.motivo_plantilla + ')' : 'enviado (redactado por Gemini)';
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const lineas = (v.aviso + '\n\n✉️ Acuse: ' + acuse).split('\n').map(esc);
lineas[0] = '<b>' + lineas[0] + '</b>';
return [{
  json: {
    cfg: v.cfg,
    fila: [...v.fila_base, acuse, v.lead.origen, v.clasif.negocio],
    aviso: lineas.join('\n'),
  },
}];
