/**
 * Servidor / Controladores - telegramWebhookController.js
 * Controlador de Webhook de Telegram para responder a comandos en tiempo real (/backup, /start, /status).
 */

import { enviarMensajeTextoTelegram, registrarWebhookTelegram } from '../services/telegramBackup.service.js';
import { ejecutarPipelineBackup } from './backupController.js';
import { recopilarDatosCompletos } from '../services/backup.service.js';

/**
 * POST /api/telegram/webhook
 * Recibe y procesa actualizaciones y comandos desde la API de Telegram.
 */
export async function procesarWebhookTelegram(req, res) {
  // 1. Responder de inmediato 200 OK a Telegram para evitar timeouts y reintentos duplicados
  res.status(200).json({ ok: true });

  const update = req.body;
  if (!update) return;

  const message = update.message || update.channel_post || update.edited_message;
  if (!message || !message.text) return;

  const chatId = message.chat?.id?.toString();
  const rawText = message.text.trim();
  const cleanCommand = rawText.toLowerCase().split('@')[0].trim(); // Remover @NombreDelBot si existe

  const authorizedChatId = process.env.TELEGRAM_CHAT_ID ? process.env.TELEGRAM_CHAT_ID.toString().trim() : null;

  // 2. Validación de Seguridad Estricta del Chat ID
  if (!authorizedChatId || chatId !== authorizedChatId) {
    console.warn(`⚠️ [TelegramWebhook] Mensaje rechazado de chat no autorizado (${chatId}). Usuario: ${message.from?.username || message.from?.id}`);
    if (chatId) {
      await enviarMensajeTextoTelegram(
        chatId,
        '⛔ *Acceso Denegado*\nEste bot está reservado exclusivamente para la administración del sistema eléctrico *Selectric*.'
      );
    }
    return;
  }

  console.log(`📩 [TelegramWebhook] Comando recibido de ${chatId}: "${rawText}"`);

  // 3. Procesamiento de Comandos
  try {
    if (cleanCommand === '/backup' || cleanCommand === '/respaldo') {
      // Notificación previa inmediata
      await enviarMensajeTextoTelegram(
        chatId,
        '⏳ *Generando respaldo del sistema eléctrico en memoria...*\nPor favor espera unos segundos mientras se procesa la base de datos.'
      );

      // Ejecutar pipeline completo en memoria
      const resultado = await ejecutarPipelineBackup({ origen: 'TELEGRAM_ON_DEMAND' });

      if (!resultado.ok) {
        await enviarMensajeTextoTelegram(
          chatId,
          `❌ *Error al generar respaldo:* ${resultado.error || 'Fallo desconocido'}`
        );
      }
      // Nota: Si fue exitoso, ejecutarPipelineBackup ya despacha el archivo adjunto JSON con enviarBackupTelegram.
      return;
    }

    if (cleanCommand === '/start' || cleanCommand === '/help' || cleanCommand === '/ayuda') {
      const menu = [
        '⚡ *Bot de Respaldos - Selectric*',
        'Sistema de inspección y gestión de tableros eléctricos.',
        '',
        '📋 *Comandos Disponibles:*',
        '🔹 `/backup` o `/respaldo` - Genera una instantánea completa en memoria y te envía el archivo `.json` adjunto.',
        '🔹 `/status` o `/estado` - Muestra estadísticas en tiempo real de la base de datos.',
        '🔹 `/help` - Muestra este menú de ayuda.',
        '',
        '🔒 _Acceso autorizado para este chat._'
      ].join('\n');

      await enviarMensajeTextoTelegram(chatId, menu);
      return;
    }

    if (cleanCommand === '/status' || cleanCommand === '/estado') {
      const { metadata } = await recopilarDatosCompletos();
      const counts = metadata.counts || {};
      const fechaHora = new Date().toLocaleString('es-VE', { 
        timeZone: 'America/Caracas',
        dateStyle: 'medium',
        timeStyle: 'medium'
      });

      const estado = [
        '📊 *Estado del Sistema Eléctrico - Selectric*',
        `📅 Hora del Servidor: \`${fechaHora}\``,
        `🔒 Ambiente: \`${process.env.NODE_ENV || 'production'}\``,
        '',
        `🏢 Empresas: *${counts.empresas || 0}*`,
        `📁 Proyectos: *${counts.proyectos || 0}*`,
        `⚡ Tableros: *${counts.tableros || 0}*`,
        `🔌 Circuitos: *${counts.circuitos || 0}*`,
        `📐 Elementos Unifilares: *${counts.elementosUnifilares || 0}*`,
        `🏭 Subestaciones: *${counts.subestaciones || 0}*`,
        `📈 Puntos de Medición: *${counts.puntosMedicion || 0}*`,
        `⚙️ CCM: *${counts.ccm || 0}*`,
        `🔥 Termografías: *${counts.inspeccionesTermograficas || 0}*`,
        `⚠️ Alarmas: *${counts.alarmas || 0}*`,
        '',
        `🔢 Total Registros en BD: *${metadata.totalRecords || 0}*`
      ].join('\n');

      await enviarMensajeTextoTelegram(chatId, estado);
      return;
    }

    // Respuesta a comandos no reconocidos
    await enviarMensajeTextoTelegram(
      chatId,
      '❓ *Comando no reconocido.*\nUsa `/backup` para generar un respaldo o `/help` para ver los comandos disponibles.'
    );
  } catch (error) {
    console.error('❌ [TelegramWebhook] Error al procesar comando:', error);
    await enviarMensajeTextoTelegram(
      chatId,
      `⚠️ *Ocurrió un error inesperado al procesar el comando:* \`${error.message}\``
    );
  }
}

/**
 * GET /api/telegram/setup-webhook?url=https://tu-dominio.railway.app
 * Endpoint auxiliar administrativo para registrar el webhook fácilmente.
 */
export async function configurarWebhookEndpoint(req, res) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : authHeader.trim();

    if (cronSecret && token !== cronSecret && req.query.secret !== cronSecret) {
      return res.status(401).json({ ok: false, error: 'No autorizado: CRON_SECRET requerido' });
    }

    const host = req.query.url || `${req.protocol}://${req.get('host')}`;
    const webhookUrl = `${host.replace(/\/+$/, '')}/api/telegram/webhook`;

    const resultado = await registrarWebhookTelegram(webhookUrl);
    console.log(`🔗 [TelegramWebhook] Registro de Webhook solicitado hacia: ${webhookUrl}`, resultado);

    return res.status(200).json({
      ok: resultado.ok,
      webhookUrl,
      telegramResponse: resultado
    });
  } catch (error) {
    console.error('❌ [TelegramWebhook] Error al configurar webhook:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}
