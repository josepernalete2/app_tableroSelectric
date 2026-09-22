/**
 * Servidor / Servicios - backupScheduler.js
 * Programador de copias de seguridad automáticas (Nightly Backup) en entorno local y base de datos.
 */

import fs from 'fs';
import path from 'path';
import prisma from '../db.js';
import { generarSnapshotCompleto } from '../controllers/backupController.js';

const BACKUPS_DIR = path.resolve(process.cwd(), 'backups');

/**
 * Asegura la existencia del directorio local backups/
 */
function asegurarDirectorio() {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
  return BACKUPS_DIR;
}

/**
 * Ejecuta un volcado completo de la base de datos y lo guarda directamente en la tabla `backups` y en disco local en `backups/`.
 */
export async function ejecutarBackupAutomatico() {
  try {
    const data = await generarSnapshotCompleto();
    const jsonString = JSON.stringify(data, null, 2);
    const tamanoBytes = Buffer.byteLength(jsonString, 'utf8');

    const timestamp = new Date().toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' });
    const isoTimestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // 1. Guardar en la tabla `backups` de la base de datos
    const nuevoBackup = await prisma.backup.create({
      data: {
        nombre: `Respaldo Automático ${timestamp}`,
        descripcion: 'Copia de seguridad nocturna programada automáticamente por el sistema.',
        data,
        tamanoBytes,
        creadoPor: 'AUTOMATICO'
      }
    });

    console.log(`[BackupScheduler] Respaldo automático registrado en BD con ID: ${nuevoBackup.id}`);

    // Limpieza en BD: mantener los últimos 20
    const totalBackups = await prisma.backup.findMany({
      select: { id: true },
      orderBy: { createdAt: 'desc' }
    });

    if (totalBackups.length > 20) {
      const aEliminar = totalBackups.slice(20).map((b) => b.id);
      await prisma.backup.deleteMany({
        where: { id: { in: aEliminar } }
      });
    }

    // 2. Guardar respaldo directamente en la carpeta local backups/
    try {
      asegurarDirectorio();
      const filename = `backup_auto_${isoTimestamp}.json`;
      const filepath = path.resolve(BACKUPS_DIR, filename);
      fs.writeFileSync(filepath, jsonString, 'utf-8');
      console.log(`[BackupScheduler] Respaldo guardado exitosamente en archivo local: ${filepath}`);

      // Rotación local: conservar los últimos 15 archivos
      const files = fs.readdirSync(BACKUPS_DIR)
        .filter(f => f.startsWith('backup_auto_') && f.endsWith('.json'))
        .map(f => ({ name: f, time: fs.statSync(path.resolve(BACKUPS_DIR, f)).mtime.getTime() }))
        .sort((a, b) => b.time - a.time);

      if (files.length > 15) {
        for (let i = 15; i < files.length; i++) {
          fs.unlinkSync(path.resolve(BACKUPS_DIR, files[i].name));
        }
      }
    } catch (fsErr) {
      console.error('[BackupScheduler] Error al escribir respaldo en disco local:', fsErr.message);
    }

    return { ok: true, id: nuevoBackup.id, count: data.length };
  } catch (error) {
    console.error('[BackupScheduler] Error durante el respaldo automático:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Inicializa el temporizador para ejecutar el respaldo a las 02:00 AM todos los días.
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
    console.log(`[BackupScheduler] Siguiente respaldo programado en ${(msHastaLasDos / (1000 * 60 * 60)).toFixed(2)} horas`);

    setTimeout(async () => {
      await ejecutarBackupAutomatico();
      programarSiguiente(); // Reprogramar para la siguiente noche
    }, msHastaLasDos);
  };

  programarSiguiente();
}

// Alias para compatibilidad
export const inicializarBackupScheduler = iniciarSchedulerBackups;

