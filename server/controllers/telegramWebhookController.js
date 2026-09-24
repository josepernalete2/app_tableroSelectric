/**
 * Servidor / Controladores - telegramWebhookController.js
 * Controlador de Webhook de Telegram Multi-Rol:
 * - Administrador Maestro: Backups globales bajo demanda, métricas globales del sistema.
 * - Empresas / Clientes Vinculados: Certificados ejecutivos de resguardo (/mi_estado) y vinculación segura por PIN (/vincular).
 *   (Las empresas NUNCA reciben el volcado JSON crudo, protegiendo secretos de ingeniería).
 */

import prisma from '../db.js';
import { enviarMensajeTextoTelegram, registrarWebhookTelegram } from '../services/telegramBackup.service.js';
import { ejecutarPipelineBackup } from './backupController.js';
import { recopilarDatosCompletos, obtenerEstadoRespaldoEmpresa, vincularTelegramEmpresa } from '../services/backup.service.js';

/**
 * POST /api/telegram/webhook
 * Recibe y procesa actualizaciones y comandos desde la API de Telegram.
 */
export async function procesarWebhookTelegram(req, res) {
  // 1. Responder de inmediato 200 OK a Telegram para evitar reintentos duplicados
  res.status(200).json({ ok: true });

  const update = req.body;
  if (!update) return;

  const message = update.message || update.channel_post || update.edited_message;
  if (!message || !message.text) return;

  const chatId = message.chat?.id?.toString();
  const rawText = message.text.trim();
  const tokens = rawText.split(/\s+/);
  const command = tokens[0].toLowerCase().split('@')[0].trim();
  const arg1 = tokens[1]?.trim();

  const masterAdminChatId = process.env.TELEGRAM_CHAT_ID ? process.env.TELEGRAM_CHAT_ID.toString().trim() : null;
  const esAdminMaestro = masterAdminChatId && chatId === masterAdminChatId;

  console.log(`📩 [TelegramWebhook] Mensaje recibido de ${chatId} (${esAdminMaestro ? 'ADMIN' : 'USUARIO'}): "${rawText}"`);

  try {
    // =========================================================================
    // 1. COMANDO DE VINCULACIÓN POR PIN (Disponible para cualquier chat)
    // =========================================================================
    if (command === '/vincular') {
      if (!arg1) {
        await enviarMensajeTextoTelegram(
          chatId,
          '⚠️ *Formato incorrecto.*\nDebes proporcionar el PIN de 6 dígitos generado en el panel web.\n\nEjemplo: `/vincular 492817`'
        );
        return;
      }

      const empresaVinculada = await vincularTelegramEmpresa(arg1, chatId);
      if (!empresaVinculada) {
        await enviarMensajeTextoTelegram(
          chatId,
          '❌ *PIN de vinculación inválido o expirado.*\nPor favor genera un nuevo PIN desde el módulo de Respaldos en el sistema Selectric.'
        );
        return;
      }

      const confirmacion = [
        '✅ *Empresa vinculada exitosamente!*',
        `🏢 *${empresaVinculada.nombre}*`,
        `📋 RIF: \`${empresaVinculada.rif}\``,
        '',
        '🔒 Tu canal de Telegram ha sido autorizado para recibir reportes y certificados de resguardo de tus activos eléctricos.',
        '',
        '👉 Escribe `/mi_estado` para consultar el certificado de tus tableros e instalaciones.'
      ].join('\n');

      await enviarMensajeTextoTelegram(chatId, confirmacion);
      return;
    }

    // =========================================================================
    // 2. VERIFICAR SI EL CHAT PERTENECE A UNA EMPRESA REGISTRADA
    // =========================================================================
    const empresaAsociada = await prisma.empresa.findFirst({
      where: { telegramChatId: chatId }
    });

    // =========================================================================
    // 3. FLUJO DE ADMINISTRADOR MAESTRO (Snapshot JSON y Mantenimiento Global)
    // =========================================================================
    if (esAdminMaestro) {
      if (command === '/backup' || command === '/respaldo') {
        await enviarMensajeTextoTelegram(
          chatId,
          '⏳ *Generando respaldo maestro del sistema eléctrico en memoria...*\nPor favor espera unos segundos mientras se procesa la base de datos.'
        );

        const resultado = await ejecutarPipelineBackup({ origen: 'TELEGRAM_ADMIN_ON_DEMAND' });
        if (!resultado.ok) {
          await enviarMensajeTextoTelegram(
            chatId,
            `❌ *Error al generar respaldo:* ${resultado.error || 'Fallo desconocido'}`
          );
        }
        return;
      }

      if (command === '/status' || command === '/estado') {
        const { metadata } = await recopilarDatosCompletos();
        const counts = metadata.counts || {};
        const fechaHora = new Date().toLocaleString('es-VE', { 
          timeZone: 'America/Caracas',
          dateStyle: 'medium',
          timeStyle: 'medium'
        });

        const estadoGlobal = [
          '📊 *Estado Global del Sistema - Selectric*',
          `📅 Hora del Servidor: \`${fechaHora}\``,
          `🔒 Ambiente: \`${process.env.NODE_ENV || 'production'}\``,
          '',
          `🏢 Empresas Registradas: *${counts.empresas || 0}*`,
          `📁 Proyectos Activos: *${counts.proyectos || 0}*`,
          `⚡ Tableros Eléctricos: *${counts.tableros || 0}*`,
          `🔌 Circuitos y Breakers: *${counts.circuitos || 0}*`,
          `📐 Elementos Unifilares: *${counts.elementosUnifilares || 0}*`,
          `🏭 Subestaciones: *${counts.subestaciones || 0}*`,
          `📈 Puntos de Medición: *${counts.puntosMedicion || 0}*`,
          `⚙️ Centros Control Motores: *${counts.ccm || 0}*`,
          `🔥 Inspecciones Técnicas: *${(counts.inspeccionesTermograficas || 0) + (counts.inspeccionesAterramiento || 0) + (counts.inspeccionesTanquesCombustible || 0)}*`,
          `⚠️ Alarmas Activas: *${counts.alarmas || 0}*`,
          '',
          `🔢 Total Registros en BD: *${metadata.totalRecords || 0}*`
        ].join('\n');

        await enviarMensajeTextoTelegram(chatId, estadoGlobal);
        return;
      }

      if (command === '/start' || command === '/help' || command === '/ayuda') {
        const menuAdmin = [
          '⚡ *Centro de Control de Respaldos - Selectric*',
          'Panel administrativo maestro de contingencia y resguardo.',
          '',
          '📋 *Comandos de Administrador:*',
          '🔹 `/backup` o `/respaldo` - Genera una instantánea completa en memoria y te envía el archivo `.json` maestro.',
          '🔹 `/status` o `/estado` - Muestra estadísticas en tiempo real de toda la base de datos.',
          '🔹 `/vincular <PIN>` - Vincula una empresa a un chat alternativo.',
          '🔹 `/help` - Muestra este menú.',
          '',
          '🛡️ _Canal Administrador Maestro Verificado._'
        ].join('\n');

        await enviarMensajeTextoTelegram(chatId, menuAdmin);
        return;
      }
    }

    // =========================================================================
    // 4. FLUJO DE EMPRESAS / CLIENTES VINCULADOS (Certificados de Resguardo)
    // =========================================================================
    if (empresaAsociada) {
      if (command === '/mi_estado' || command === '/resguardo' || command === '/certificado' || command === '/status' || command === '/estado') {
        const ficha = await obtenerEstadoRespaldoEmpresa(empresaAsociada.id);
        if (!ficha) {
          await enviarMensajeTextoTelegram(chatId, '⚠️ No se pudo consultar la información de la empresa.');
          return;
        }

        const fechaHora = ficha.empresa.ultimoBackupAt 
          ? new Date(ficha.empresa.ultimoBackupAt).toLocaleString('es-VE', { timeZone: 'America/Caracas', dateStyle: 'medium', timeStyle: 'short' })
          : 'En proceso';

        const certificado = [
          '🛡️ *SELECTRIC CLOUD - CERTIFICADO DE RESGUARDO*',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          `🏢 *Empresa:* ${ficha.empresa.nombre}`,
          `📋 *RIF:* \`${ficha.empresa.rif}\``,
          `📅 *Último Resguardo:* \`${fechaHora}\``,
          `🏷️ *Certificado:* \`${ficha.certificado.codigo}\``,
          '',
          '⚡ *Activos Resguardados en la Nube:*',
          `   • 📁 Proyectos Activos: *${ficha.totales.proyectos}*`,
          `   • ⚡ Tableros Eléctricos: *${ficha.totales.tableros}*`,
          `   • 🔌 Circuitos y Protecciones: *${ficha.totales.circuitos}*`,
          `   • 📐 Unifilares y Acometidas: *${ficha.totales.elementosUnifilares}*`,
          `   • ⚙️ CCMs y Subestaciones: *${ficha.totales.ccm + ficha.totales.subestaciones}*`,
          `   • 📈 Puntos de Medición: *${ficha.totales.puntosMedicion}*`,
          `   • 🔥 Inspecciones Técnicas: *${ficha.totales.inspecciones}*`,
          '',
          `🔢 *Total Activos Protegidos:* *${ficha.totales.totalActivos}*`,
          '🔒 *Integridad:* Verificada (Snapshot Seguro en Memoria)',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          '_Este reporte certifica la existencia de copias de seguridad activas en la nube de Selectric._'
        ].join('\n');

        await enviarMensajeTextoTelegram(chatId, certificado);
        return;
      }

      if (command === '/start' || command === '/help' || command === '/ayuda') {
        const menuEmpresa = [
          `⚡ *Portal de Resguardo - ${empresaAsociada.nombre}*`,
          'Servicio de monitoreo y certificación de copias de seguridad.',
          '',
          '📋 *Comandos Disponibles:*',
          '🔹 `/mi_estado` o `/resguardo` - Consulta tu certificado ejecutivo con todos los activos eléctricos protegidos.',
          '🔹 `/help` - Muestra esta ayuda.',
          '',
          '🔒 _Canal empresarial autenticado con Selectric Cloud._'
        ].join('\n');

        await enviarMensajeTextoTelegram(chatId, menuEmpresa);
        return;
      }

      // Comando no reconocido para empresa
      await enviarMensajeTextoTelegram(
        chatId,
        '❓ *Comando no reconocido.*\nEscribe `/mi_estado` para ver el certificado de resguardo de tus tableros o `/help` para ayuda.'
      );
      return;
    }

    // =========================================================================
    // 5. CHAT NO VINCULADO / ACCESO PENDIENTE
    // =========================================================================
    const mensajeBienvenida = [
      '⚡ *Bot de Resguardos Eléctricos - Selectric*',
      '',
      '🔒 *Tu cuenta de Telegram aún no está vinculada.*',
      'Para habilitar el servicio de resguardo de tu empresa:',
      '',
      '1️⃣ Ingresa al sistema web de *Selectric*.',
      '2️⃣ Dirígete a *Copias de Seguridad* > *Control por Empresas*.',
      '3️⃣ Haz clic en *Generar PIN de Enlace*.',
      '4️⃣ Escribe aquí:',
      '   `/vincular <TU_PIN>`',
      '',
      'Ejemplo: `/vincular 481920`'
    ].join('\n');

    await enviarMensajeTextoTelegram(chatId, mensajeBienvenida);
  } catch (error) {
    console.error('❌ [TelegramWebhook] Error al procesar mensaje:', error);
    await enviarMensajeTextoTelegram(
      chatId,
      `⚠️ *Ocurrió un error al procesar tu solicitud:* \`${error.message}\``
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
