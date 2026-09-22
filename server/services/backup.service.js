/**
 * Servidor / Servicios - backup.service.js
 * Servicio modular de exportación y gestión de copias de seguridad en entorno local y base de datos.
 * Extrae la información estructurada de la base de datos vía Prisma y la gestiona en disco (backups/) y Streams.
 */

import fs from 'fs';
import path from 'path';
import prisma from '../db.js';

const BACKUPS_DIR = path.resolve(process.cwd(), 'backups');

// Asegurar que el directorio local de respaldos exista
export function asegurarDirectorioBackups() {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
  return BACKUPS_DIR;
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
 * Guarda una copia de seguridad en formato JSON en la carpeta local backups/.
 */
export function guardarBackupLocalEnDisco(data, filenameCustom = null) {
  asegurarDirectorioBackups();
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
  const filename = filenameCustom || `backup_selectric_${timestamp}.json`;
  const filepath = path.resolve(BACKUPS_DIR, filename);

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`💾 Respaldo guardado en disco local: ${filepath}`);
  return { filename, filepath };
}

/**
 * Lee y lista todos los respaldos JSON presentes en la carpeta local backups/.
 */
export function listarBackupsLocalesEnDisco() {
  asegurarDirectorioBackups();
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
}

/**
 * Transmite la exportación de respaldo en formato JSON directamente al stream de respuesta HTTP
 * y guarda una copia local en backups/.
 * 
 * @param {import('express').Response} res Objeto de respuesta de Express
 * @param {object} usuario Objeto del usuario autenticado solicitante
 */
export async function exportarBackupStream(res, usuario = {}) {
  const backupCompleto = await recopilarDatosCompletos();

  // Agregar información de auditoría del usuario solicitante
  backupCompleto.metadata.generadoPor = {
    id: usuario.id || null,
    email: usuario.email || usuario.username || 'ADMIN',
    role: usuario.role || 'ADMIN'
  };

  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
  const filename = `backup_selectric_${timestamp}.json`;

  const jsonString = JSON.stringify(backupCompleto, null, 2);
  const jsonBuffer = Buffer.from(jsonString, 'utf-8');

  // Guardar copia local en la carpeta backups/
  try {
    guardarBackupLocalEnDisco(backupCompleto, filename);
  } catch (fsErr) {
    console.error('⚠️ No se pudo guardar la copia local en disco:', fsErr.message);
  }

  // Configuración de encabezados HTTP para forzar descarga segura
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', jsonBuffer.length);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');

  return res.status(200).send(jsonBuffer);
}

