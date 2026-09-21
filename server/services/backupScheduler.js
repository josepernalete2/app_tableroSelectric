/**
 * Servidor / Servicios - backupScheduler.js
 * Programador de copias de seguridad automáticas (Nightly Backup) en la nube PostgreSQL.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../db.js';
import { generarSnapshotCompleto } from '../controllers/backupController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUPS_DIR = path.resolve(__dirname, '../../backups');

/**
 * Ejecuta un volcado completo de la base de datos y lo guarda directamente en la tabla `backups` de PostgreSQL.
 */
export async function ejecutarBackupAutomatico() {
  try {
    const data = await generarSnapshotCompleto();
    const jsonString = JSON.stringify(data);
    const tamanoBytes = Buffer.byteLength(jsonString, 'utf8');

    const timestamp = new Date().toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' });
    const isoTimestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // 1. Guardar en la tabla `backups` de PostgreSQL
    const nuevoBackup = await prisma.backup.create({
      data: {
        nombre: `Respaldo Automático ${timestamp}`,
        descripcion: 'Copia de seguridad nocturna programada automáticamente por el sistema.',
        data,
        tamanoBytes,
        creadoPor: 'AUTOMATICO'
      }
    });

    console.log(`[BackupScheduler] Respaldo automático guardado en la nube con ID: ${nuevoBackup.id}`);

    // Limpieza de backups antiguos: mantener solo los últimos 20 en la base de datos
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

    // 2. Intentar guardar respaldo en disco local si el entorno lo permite
    try {
      if (!fs.existsSync(BACKUPS_DIR)) {
        fs.mkdirSync(BACKUPS_DIR, { recursive: true });
      }
      const filename = `backup_auto_${isoTimestamp}.json`;
      const filepath = path.join(BACKUPS_DIR, filename);
      fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');

      const files = fs.readdirSync(BACKUPS_DIR)
        .filter(f => f.startsWith('backup_auto_') && f.endsWith('.json'))
        .map(f => ({ name: f, time: fs.statSync(path.join(BACKUPS_DIR, f)).mtime.getTime() }))
        .sort((a, b) => b.time - a.time);

      if (files.length > 15) {
        for (let i = 15; i < files.length; i++) {
          fs.unlinkSync(path.join(BACKUPS_DIR, files[i].name));
        }
      }
    } catch (fsErr) {
      // En entornos Serverless de solo lectura esto puede no ejecutarse, lo cual es normal
      console.log('[BackupScheduler] Nota: El almacenamiento en disco local fue omitido (entorno serverless/ROFS).');
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
export function inicializarBackupScheduler() {
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
