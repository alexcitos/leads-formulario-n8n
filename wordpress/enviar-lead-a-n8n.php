<?php
/**
 * Fragmento del tema del portafolio (alexrope.dev): envío de cada mensaje
 * del formulario de contacto al workflow de n8n.
 *
 * Se llama justo después de que wp_mail() envió el correo normal:
 *
 *     portafolio_enviar_lead_a_n8n( $nombre, $email, $mensaje );
 *
 * Variables de entorno del contenedor de WordPress (docker-compose.yml):
 *     N8N_LEADS_URL: ${N8N_LEADS_URL}        # http://n8n:5678/webhook/leads-sitio
 *     N8N_LEADS_SECRET: ${N8N_LEADS_SECRET}  # mismo valor que la credencial Header Auth
 *
 * Tema completo: https://github.com/alexcitos/portfolio-wp-2026
 */

/**
 * Envía un lead del formulario de contacto al workflow de n8n que lo
 * clasifica con Gemini, lo registra en Google Sheets, avisa por Telegram y
 * responde con un acuse de recibo.
 *
 * Configuración por variables de entorno del contenedor (nunca en el
 * repo, que es público):
 * - N8N_LEADS_URL: URL del webhook. En producción va por la red interna
 *   de Docker (http://n8n:5678/webhook/...), sin salir a internet.
 * - N8N_LEADS_SECRET: valor de la cabecera X-Leads-Secret que el webhook
 *   exige (credencial Header Auth en n8n).
 *
 * Sin esas variables (por ejemplo en local) no hace nada. Cualquier fallo
 * se registra en el log y nunca interrumpe la respuesta al visitante: el
 * correo de wp_mail() es la vía principal y ya se envió antes de llamar
 * a esta función. El webhook responde en cuanto recibe los datos
 * (responseMode onReceived), así que el timeout corto no recorta el
 * procesamiento en n8n.
 *
 * @param string $nombre  Nombre ya sanitizado.
 * @param string $email   Email ya validado.
 * @param string $mensaje Mensaje ya sanitizado.
 */
function portafolio_enviar_lead_a_n8n( $nombre, $email, $mensaje ) {
	$url     = getenv( 'N8N_LEADS_URL' );
	$secreto = getenv( 'N8N_LEADS_SECRET' );

	if ( ! $url || ! $secreto ) {
		return;
	}

	$respuesta = wp_remote_post(
		$url,
		array(
			'timeout'     => 3,
			'redirection' => 0,
			'headers'     => array(
				'Content-Type'   => 'application/json',
				'X-Leads-Secret' => $secreto,
			),
			'body'        => wp_json_encode(
				array(
					'nombre'  => $nombre,
					'email'   => $email,
					'mensaje' => $mensaje,
					'origen'  => wp_parse_url( home_url(), PHP_URL_HOST ),
					'fecha'   => gmdate( 'c' ),
				)
			),
		)
	);

	if ( is_wp_error( $respuesta ) ) {
		error_log( 'portafolio: lead no enviado a n8n: ' . $respuesta->get_error_message() );
	} elseif ( 200 !== (int) wp_remote_retrieve_response_code( $respuesta ) ) {
		error_log( 'portafolio: n8n respondió ' . wp_remote_retrieve_response_code( $respuesta ) . ' al recibir un lead' );
	}
}
