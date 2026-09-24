/**
 * Servidor / Servicios - backup.service.js
 * Servicio modular de exportación y generación de copias de seguridad 100% en memoria.
 * Diseñado para entornos Serverless (Vercel con FS Read-Only) y Contenedores (Railway).
 */

import fs from 'fs';
import path from 'path';
import prisma from '../db.js';

const BACKUPS_DIR = path.resolve(process.cwd(), 'backups');

/**
 * Intenta asegurar la existencia del directorio local backups/ de forma tolerante a fallos.
 * En entornos Read-Only (Vercel) no lanzará excepción.
 */
export function asegurarDirectorioBackups() {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }
    return BACKUPS_DIR;
  } catch (err) {
    console.warn('⚠️ [BackupService] Sistema de archivos de solo lectura detectado (EROFS), no se puede crear directorio local:', err.message);
    return null;
  }
}

/**
 * Consulta de forma estructurada y segura todas las entidades principales del sistema.
 */
export async function recopilarDatosCompletos() {
  const [
    empresas,
    totalProyectos,
    totalTableros,
    totalCircuitos,
    totalElementosUnifilares,
    totalSubestaciones,
    totalPuntosMedicion,
    totalCcm,
    totalTermograficas,
    totalAterramientos,
    totalTanques,
    totalAlarmas,
    totalAlimentadores
  ] = await Promise.all([
    prisma.empresa.findMany({
      include: {
        proyectos: {
          include: {
            tableros: {
              include: {
                circuitos: {
                  orderBy: { posicionPolo: 'asc' }
                },
                alimentador: true
              },
              orderBy: { createdAt: 'asc' }
            },
            elementosUnifilares: true,
            subestaciones: true,
            puntosMedicion: true,
            ccmList: true,
            inspeccionesTermograficas: true,
            inspeccionesAterramiento: true,
            inspeccionesTanquesCombustible: true,
            alarmas: true,
            alimentadores: true
          },
          orderBy: { createdAt: 'asc' }
        },
        tableros: {
          include: {
            circuitos: {
              orderBy: { posicionPolo: 'asc' }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        elementosUnifilares: true,
        subestaciones: true,
        puntosMedicion: true,
        ccmList: true
      },
      orderBy: { nombre: 'asc' }
    }),
    prisma.proyecto.count(),
    prisma.tablero.count(),
    prisma.circuito.count(),
    prisma.elementoUnifilar.count(),
    prisma.subestacion.count(),
    prisma.puntoMedicion.count(),
    prisma.ccm.count(),
    prisma.inspeccionTermografica.count(),
    prisma.inspeccionAterramiento.count(),
    prisma.inspeccionTanqueCombustible.count(),
    prisma.alarma.count(),
    prisma.alimentador.count()
  ]);

  const counts = {
    empresas: empresas.length,
    proyectos: totalProyectos,
    tableros: totalTableros,
    circuitos: totalCircuitos,
    elementosUnifilares: totalElementosUnifilares,
    subestaciones: totalSubestaciones,
    puntosMedicion: totalPuntosMedicion,
    ccm: totalCcm,
    inspeccionesTermograficas: totalTermograficas,
    inspeccionesAterramiento: totalAterramientos,
    inspeccionesTanquesCombustible: totalTanques,
    alarmas: totalAlarmas,
    alimentadores: totalAlimentadores
  };

  const totalRecords = Object.values(counts).reduce((acc, curr) => acc + curr, 0);

  return {
    metadata: {
      appName: 'App Tableros Eléctricos (Selectric)',
      exportVersion: '2.1.0',
      schemaVersion: '1.0.0',
      generatedAt: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      counts,
      totalRecords
    },
    data: empresas
  };
}

/**
 * Genera el snapshot completo en memoria (Buffer / JSON) sin depender del disco.
 * 
 * @param {object} opciones Opciones adicionales (filenamePrefix, usuario, etc.)
 * @returns {Promise<{ payload: object, jsonString: string, buffer: Buffer, filename: string, tamanoBytes: number, metadata: object }>}
 */
export async function generarSnapshotMemoria(opciones = {}) {
  const { filenamePrefix = 'backup_auto', usuario = null } = opciones;
  const snapshot = await recopilarDatosCompletos();

  if (usuario) {
    snapshot.metadata.generadoPor = {
      id: usuario.id || null,
      username: usuario.username || usuario.email || 'ADMIN',
      role: usuario.role || 'ADMIN'
    };
  }

  const isoTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${filenamePrefix}_${isoTimestamp}.json`;
  const jsonString = JSON.stringify(snapshot, null, 2);
  const buffer = Buffer.from(jsonString, 'utf-8');
  const tamanoBytes = buffer.length;

  return {
    payload: snapshot,
    jsonString,
    buffer,
    filename,
    tamanoBytes,
    metadata: snapshot.metadata
  };
}

/**
 * Intenta guardar una copia en disco local de manera tolerante a fallos (solo en entornos con FS escribible).
 * Nunca lanza excepciones si el sistema de archivos es Read-Only (Vercel).
 */
export function guardarBackupLocalEnDisco(data, filenameCustom = null) {
  try {
    const dir = asegurarDirectorioBackups();
    if (!dir) return { guardado: false, error: 'Directorio no disponible (Read-Only)' };

    const isoTimestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const filename = filenameCustom || `backup_selectric_${isoTimestamp}.json`;
    const filepath = path.resolve(BACKUPS_DIR, filename);

    fs.writeFileSync(filepath, typeof data === 'string' ? data : JSON.stringify(data, null, 2), 'utf-8');
    console.log(`💾 Respaldo guardado en disco local: ${filepath}`);
    return { guardado: true, filename, filepath };
  } catch (fsErr) {
    console.warn(`⚠️ [BackupService] No se pudo guardar en disco local (${fsErr.code || fsErr.message}). Omitiendo escritura local de forma segura.`);
    return { guardado: false, error: fsErr.message };
  }
}

/**
 * Lee y lista los respaldos JSON presentes en la carpeta local backups/ si está disponible.
 */
export function listarBackupsLocalesEnDisco() {
  try {
    asegurarDirectorioBackups();
    if (!fs.existsSync(BACKUPS_DIR)) return [];

    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(filename => {
        const filepath = path.resolve(BACKUPS_DIR, filename);
        const stats = fs.statSync(filepath);
        return {
          filename,
          filepath,
          sizeBytes: stats.size,
          createdAt: stats.birthtime || stats.mtime,
          mtime: stats.mtime
        };
      })
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    return files;
  } catch (err) {
    console.warn('⚠️ [BackupService] No se pudieron listar respaldos locales:', err.message);
    return [];
  }
}

/**
 * Transmite la exportación de respaldo en formato JSON directamente al stream HTTP en memoria.
 */
export async function exportarBackupStream(res, usuario = {}) {
  const { buffer, filename, payload } = await generarSnapshotMemoria({
    filenamePrefix: 'backup_selectric',
    usuario
  });

  // Intento de guardado local silencioso (no bloqueante)
  guardarBackupLocalEnDisco(payload, filename);

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', buffer.length);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');

  return res.status(200).send(buffer);
}
