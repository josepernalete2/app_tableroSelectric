/**
 * Servidor / Servicios - backupScheduler.js
 * Programador de copias de seguridad automáticas para entornos con contenedores activos (Railway / Local).
 * Utiliza el pipeline unificado en memoria con distribución a Cloudflare R2, Telegram y PostgreSQL.
 */

import { ejecutarPipelineBackup } from '../controllers/backupController.js';

/**
 * Ejecuta el respaldo automático nocturno usando el pipeline híbrido en memoria.
 */
export async function ejecutarBackupAutomatico() {
  try {
    console.log('⏰ [BackupScheduler] Iniciando respaldo automático programado...');
    const resultado = await ejecutarPipelineBackup({
      origen: 'RAILWAY_CRON',
      nombre: `Respaldo Automático ${new Date().toLocaleString('es-VE', { timeZone: 'America/Caracas', dateStyle: 'short', timeStyle: 'short' })}`,
      descripcion: 'Copia de seguridad nocturna programada automáticamente por el sistema.'
    });

    console.log(`✅ [BackupScheduler] Respaldo automático completado con éxito: ${resultado.filename}`);
    return resultado;
  } catch (error) {
    console.error('❌ [BackupScheduler] Error durante el respaldo automático:', error.message);
    return { ok: false, error: error.message };
  }
}

/**
 * Inicializa el temporizador para ejecutar el respaldo a las 02:00 AM todos los días (hora local del servidor).
 */
export function iniciarSchedulerBackups() {
  const calcularMilisegundosHastaLasDosAM = () => {
    const ahora = new Date();
    const proximaEjecucion = new Date();
    proximaEjecucion.setHours(2, 0, 0, 0);

    if (ahora >= proximaEjecucion) {
      proximaEjecucion.setDate(proximaEjecucion.getDate() + 1);
    }
    return proximaEjecucion.getTime() - ahora.getTime();
  };

  const programarSiguiente = () => {
    const msHastaLasDos = calcularMilisegundosHastaLasDosAM();
    const horas = (msHastaLasDos / (1000 * 60 * 60)).toFixed(2);
    console.log(`[BackupScheduler] Siguiente respaldo programado en ${horas} horas (02:00 AM)`);

    setTimeout(async () => {
      await ejecutarBackupAutomatico();
      programarSiguiente(); // Reprogramar para la siguiente noche
    }, msHastaLasDos);
  };

  programarSiguiente();
}

// Alias para compatibilidad
export const inicializarBackupScheduler = iniciarSchedulerBackups;
