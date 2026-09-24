/**
 * Servidor / Servicios - telegramBackup.service.js
 * Servicio de envío de respaldos, mensajes y gestión de Webhook con Telegram Bot API.
 * 100% nativo de Node.js 18+ usando fetch, FormData y Blob sin dependencias externas.
 */

/**
 * Envía un mensaje de texto simple o formateado con Markdown a un chat de Telegram.
 * 
 * @param {string|number} chatId ID del chat destinatario
 * @param {string} texto Mensaje de texto a enviar
 * @param {object} opciones Opciones adicionales (parse_mode, etc.)
 * @returns {Promise<{ ok: boolean, messageId?: number, error?: string }>}
 */
export async function enviarMensajeTextoTelegram(chatId, texto, opciones = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) {
    return { ok: false, error: 'TELEGRAM_BOT_TOKEN o chatId no configurados' };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: texto,
        parse_mode: opciones.parse_mode || 'Markdown',
        ...opciones
      })
    });

    const result = await response.json();
    if (!response.ok || !result.ok) {
      console.error('❌ [Telegram] Error al enviar mensaje de texto:', result.description);
      return { ok: false, error: result.description };
    }

    return { ok: true, messageId: result.result?.message_id };
  } catch (err) {
    console.error('❌ [Telegram] Excepción al enviar mensaje de texto:', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Envía un archivo de respaldo JSON como documento adjunto a un chat o canal de Telegram.
 * 
 * @param {Buffer} buffer Contenido en memoria del archivo JSON
 * @param {string} filename Nombre del archivo para el adjunto
 * @param {object} metadata Metadatos del respaldo (conteos de entidades, fecha, etc.)
 * @returns {Promise<{ enviado: boolean, motivo?: string, messageId?: number, error?: string }>}
 */
export async function enviarBackupTelegram(buffer, filename, metadata = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.info('ℹ️ [Telegram] Respaldo en Telegram omitido: TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID no configurados.');
    return {
      enviado: false,
      motivo: 'NO_CONFIGURADO',
      mensaje: 'Variables de Telegram no configuradas en el entorno'
    };
  }

  try {
    const counts = metadata.counts || {};
    const totalRecords = metadata.totalRecords || 0;
    const tamanoKb = (buffer.length / 1024).toFixed(1);
    const fechaHora = new Date().toLocaleString('es-VE', { 
      timeZone: 'America/Caracas',
      dateStyle: 'medium',
      timeStyle: 'medium'
    });

    const caption = [
      '⚡ *Copia de Seguridad - Selectric*',
      `📅 Fecha: \`${fechaHora}\``,
      `📦 Archivo: \`${filename}\` (${tamanoKb} KB)`,
      '',
      '📊 *Resumen de Entidades:*',
      `🏢 Empresas: *${counts.empresas || 0}*`,
      `📁 Proyectos: *${counts.proyectos || 0}*`,
      `⚡ Tableros: *${counts.tableros || 0}*`,
      `🔌 Circuitos: *${counts.circuitos || 0}*`,
      `📐 Unifilares: *${counts.elementosUnifilares || 0}*`,
      `🏭 Subestaciones: *${counts.subestaciones || 0}*`,
      `📈 Ptos. Medición: *${counts.puntosMedicion || 0}*`,
      `⚙️ CCM: *${counts.ccm || 0}*`,
      `🔥 Termografías: *${counts.inspeccionesTermograficas || 0}*`,
      `⚠️ Alarmas: *${counts.alarmas || 0}*`,
      `🔢 Total Registros: *${totalRecords}*`,
      '',
      `🔒 *Ambiente:* \`${process.env.NODE_ENV || 'production'}\``
    ].join('\n');

    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('caption', caption);
    formData.append('parse_mode', 'Markdown');

    // Usar Blob nativo para evitar errores de tipo en FormData
    const blob = new Blob([buffer], { type: 'application/json' });
    formData.append('document', blob, filename);

    const response = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      const errorMsg = result.description || `HTTP ${response.status}: ${response.statusText}`;
      console.error('❌ [Telegram] Error al enviar documento por Telegram:', errorMsg);
      return {
        enviado: false,
        error: errorMsg
      };
    }

    console.log(`📱 [Telegram] Respaldo enviado exitosamente al chat ${chatId} (Msg ID: ${result.result?.message_id})`);
    return {
      enviado: true,
      messageId: result.result?.message_id
    };
  } catch (error) {
    console.error('❌ [Telegram] Excepción al enviar respaldo por Telegram:', error.message);
    return {
      enviado: false,
      error: error.message
    };
  }
}

/**
 * Registra o actualiza la URL del webhook en Telegram Bot API.
 * 
 * @param {string} urlWebhook URL pública HTTPS donde Telegram enviará las actualizaciones
 * @returns {Promise<{ ok: boolean, description?: string }>}
 */
export async function registrarWebhookTelegram(urlWebhook) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN no configurado en variables de entorno');
  }

  const endpoint = `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(urlWebhook)}`;
  const response = await fetch(endpoint);
  const result = await response.json();
  return result;
}
