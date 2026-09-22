/**
 * Servidor / Servicios - backup.service.js
 * Servicio modular de exportación de copias de seguridad para entornos Serverless y Contenedores (Railway).
 * Extrae la información estructurada de la base de datos vía Prisma y la transmite vía Stream en memoria.
 */

import { Readable } from 'stream';
import prisma from '../db.js';

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
      environment: process.env.NODE_ENV || 'production',
      counts,
      totalRecords
    },
    data: empresas
  };
}

/**
 * Transmite la exportación de respaldo en formato JSON directamente al stream de respuesta HTTP.
 * Utiliza un stream en memoria para optimizar el consumo de RAM y evitar escrituras en disco.
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

  // Configuración de encabezados HTTP para forzar descarga segura y sin caché
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', jsonBuffer.length);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');

  // Enviar el buffer en memoria directamente para máxima compatibilidad con funciones Serverless (Vercel)
  return res.status(200).send(jsonBuffer);
}
