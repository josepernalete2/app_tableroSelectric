/**
 * Servidor / Servicios - backupScheduler.js
 * Programador de copias de seguridad automáticas (Nightly Backup).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUPS_DIR = path.resolve(__dirname, '../../backups');

/**
 * Ejecuta un volcado completo de la base de datos a un archivo JSON con timestamp.
 */
export async function ejecutarBackupAutomatico() {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }

    const data = await prisma.empresa.findMany({
      include: {
        proyectos: {
          include: {
            tableros: {
              include: {
                circuitos: true,
                alimentador: true
              }
            },
            elementosUnifilares: true,
            subestaciones: true,
            puntosMedicion: true,
            ccmList: true,
            inspeccionesTermograficas: true,
            inspeccionesAterramiento: true,
            inspeccionesTanquesCombustible: true,
            alarmas: true
          }
        }
      }
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_auto_${timestamp}.json`;
    const filepath = path.join(BACKUPS_DIR, filename);

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`[BackupScheduler] Respaldo automático completado con éxito: ${filename}`);

    // Limpieza de backups antiguos: mantener solo los últimos 15 archivos
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.startsWith('backup_auto_') && f.endsWith('.json'))
      .map(f => ({ name: f, time: fs.statSync(path.join(BACKUPS_DIR, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time);

    if (files.length > 15) {
      for (let i = 15; i < files.length; i++) {
        fs.unlinkSync(path.join(BACKUPS_DIR, files[i].name));
      }
    }

    return { ok: true, filename, count: data.length };
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
