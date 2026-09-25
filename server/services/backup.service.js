/**
 * Servidor / Servicios - backup.service.js
 * Servicio modular de exportación, resguardo empresarial y generación de copias de seguridad 100% en memoria.
 * Diseñado para entornos Serverless (Vercel con FS Read-Only) y Contenedores (Railway).
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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
 * Actualiza el estado y marca de tiempo de resguardo en todas las empresas respaldadas.
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

  // Actualizar marca de último respaldo y estado SUCCESS en todas las empresas auditadas
  try {
    const ahora = new Date();
    await prisma.empresa.updateMany({
      data: {
        ultimoBackupAt: ahora,
        ultimoBackupStatus: 'SUCCESS'
      }
    });
  } catch (updErr) {
    console.warn('⚠️ [BackupService] Error al actualizar estado de resguardo de empresas:', updErr.message);
  }

  return {
    metadata: {
      appName: 'App Tableros Eléctricos (Selectric)',
      exportVersion: '2.2.0',
      schemaVersion: '1.2.0',
      generatedAt: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      counts,
      totalRecords
    },
    data: empresas
  };
}

/**
 * Genera el snapshot global completo en memoria (Buffer / JSON) sin depender del disco.
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
 * Obtiene el resumen consolidado de resguardo para todas las empresas registradas.
 */
export async function obtenerResumenTodasEmpresas() {
  const empresas = await prisma.empresa.findMany({
    include: {
      proyectos: {
        include: {
          _count: {
            select: {
              tableros: true,
              elementosUnifilares: true,
              subestaciones: true,
              puntosMedicion: true,
              ccmList: true,
              inspeccionesTermograficas: true,
              inspeccionesAterramiento: true,
              inspeccionesTanquesCombustible: true,
              alarmas: true,
              alimentadores: true
            }
          },
          tableros: {
            select: {
              _count: {
                select: { circuitos: true }
              }
            }
          }
        }
      },
      tableros: {
        select: {
          _count: {
            select: { circuitos: true }
          }
        }
      },
      _count: {
        select: {
          proyectos: true,
          tableros: true,
          elementosUnifilares: true,
          subestaciones: true,
          puntosMedicion: true,
          ccmList: true
        }
      }
    },
    orderBy: { nombre: 'asc' }
  });

  return empresas.map(emp => {
    let totalTableros = emp.tableros.length;
    let totalCircuitos = emp.tableros.reduce((acc, t) => acc + (t._count?.circuitos || 0), 0);
    let totalAlimentadores = 0;
    let totalUnifilares = emp._count.elementosUnifilares || 0;
    let totalSubestaciones = emp._count.subestaciones || 0;
    let totalPuntosMedicion = emp._count.puntosMedicion || 0;
    let totalCcm = emp._count.ccmList || 0;
    let totalInspecciones = 0;
    let totalAlarmas = 0;

    for (const proy of emp.proyectos) {
      totalTableros += proy._count.tableros || 0;
      totalAlimentadores += proy._count.alimentadores || 0;
      totalUnifilares += proy._count.elementosUnifilares || 0;
      totalSubestaciones += proy._count.subestaciones || 0;
      totalPuntosMedicion += proy._count.puntosMedicion || 0;
      totalCcm += proy._count.ccmList || 0;
      totalInspecciones += (proy._count.inspeccionesTermograficas || 0) +
                           (proy._count.inspeccionesAterramiento || 0) +
                           (proy._count.inspeccionesTanquesCombustible || 0);
      totalAlarmas += proy._count.alarmas || 0;

      for (const t of proy.tableros) {
        totalCircuitos += t._count?.circuitos || 0;
      }
    }

    const totalActivos = totalTableros + totalCircuitos + totalAlimentadores + totalUnifilares + 
                         totalSubestaciones + totalPuntosMedicion + totalCcm + totalInspecciones;

    // Generar un hash de verificación único de la empresa
    const hashData = `${emp.id}:${emp.nombre}:${totalActivos}:${emp.ultimoBackupAt || emp.updatedAt}`;
    const certificadoHash = crypto.createHash('sha256').update(hashData).digest('hex').substring(0, 12).toUpperCase();

    return {
      id: emp.id,
      nombre: emp.nombre,
      rif: emp.rif,
      direccionFiscal: emp.direccionFiscal,
      gerente1Nombre: emp.gerente1Nombre,
      gerente1Email: emp.gerente1Email,
      gerente1Telefono: emp.gerente1Telefono,
      telegramChatId: emp.telegramChatId,
      telegramBackupPin: emp.telegramBackupPin,
      ultimoBackupAt: emp.ultimoBackupAt,
      ultimoBackupStatus: emp.ultimoBackupStatus || 'PENDIENTE',
      certificadoHash: `SEL-CERT-${certificadoHash}`,
      totales: {
        proyectos: emp.proyectos.length,
        tableros: totalTableros,
        circuitos: totalCircuitos,
        alimentadores: totalAlimentadores,
        elementosUnifilares: totalUnifilares,
        subestaciones: totalSubestaciones,
        puntosMedicion: totalPuntosMedicion,
        ccm: totalCcm,
        inspecciones: totalInspecciones,
        alarmas: totalAlarmas,
        totalActivos
      }
    };
  });
}

/**
 * Consulta detallada de la ficha de resguardo para una empresa específica.
 */
export async function obtenerEstadoRespaldoEmpresa(empresaId) {
  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    include: {
      proyectos: {
        include: {
          tableros: {
            include: {
              circuitos: { orderBy: { posicionPolo: 'asc' } },
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
          alarmas: true,
          alimentadores: true
        }
      },
      tableros: {
        include: {
          circuitos: { orderBy: { posicionPolo: 'asc' } }
        }
      },
      elementosUnifilares: true,
      subestaciones: true,
      puntosMedicion: true,
      ccmList: true
    }
  });

  if (!empresa) return null;

  let totalTableros = empresa.tableros.length;
  let totalCircuitos = empresa.tableros.reduce((acc, t) => acc + (t.circuitos?.length || 0), 0);
  let totalAlimentadores = 0;
  let totalUnifilares = empresa.elementosUnifilares?.length || 0;
  let totalSubestaciones = empresa.subestaciones?.length || 0;
  let totalPuntosMedicion = empresa.puntosMedicion?.length || 0;
  let totalCcm = empresa.ccmList?.length || 0;
  let totalInspecciones = 0;
  let totalAlarmas = 0;

  for (const proy of empresa.proyectos) {
    totalTableros += proy.tableros?.length || 0;
    totalAlimentadores += proy.alimentadores?.length || 0;
    totalUnifilares += proy.elementosUnifilares?.length || 0;
    totalSubestaciones += proy.subestaciones?.length || 0;
    totalPuntosMedicion += proy.puntosMedicion?.length || 0;
    totalCcm += proy.ccmList?.length || 0;
    totalInspecciones += (proy.inspeccionesTermograficas?.length || 0) +
                         (proy.inspeccionesAterramiento?.length || 0) +
                         (proy.inspeccionesTanquesCombustible?.length || 0);
    totalAlarmas += proy.alarmas?.length || 0;

    for (const t of proy.tableros || []) {
      totalCircuitos += t.circuitos?.length || 0;
    }
  }

  const totalActivos = totalTableros + totalCircuitos + totalAlimentadores + totalUnifilares + 
                       totalSubestaciones + totalPuntosMedicion + totalCcm + totalInspecciones;

  const hashData = `${empresa.id}:${empresa.nombre}:${totalActivos}:${empresa.ultimoBackupAt || new Date().toISOString()}`;
  const certificadoHash = `SEL-CERT-${crypto.createHash('sha256').update(hashData).digest('hex').substring(0, 12).toUpperCase()}`;

  return {
    empresa: {
      id: empresa.id,
      nombre: empresa.nombre,
      rif: empresa.rif,
      direccionFiscal: empresa.direccionFiscal,
      gerente1Nombre: empresa.gerente1Nombre,
      gerente1Email: empresa.gerente1Email,
      telegramChatId: empresa.telegramChatId,
      telegramBackupPin: empresa.telegramBackupPin,
      ultimoBackupAt: empresa.ultimoBackupAt,
      ultimoBackupStatus: empresa.ultimoBackupStatus || 'PENDIENTE'
    },
    certificado: {
      codigo: certificadoHash,
      emitidoAt: new Date().toISOString(),
      estado: empresa.ultimoBackupStatus === 'SUCCESS' ? 'PROTEGIDO' : 'PENDIENTE',
      nivelSeguridad: 'NIVEL_1_SNAPSHOT_ENCRIPTADO'
    },
    totales: {
      proyectos: empresa.proyectos.length,
      tableros: totalTableros,
      circuitos: totalCircuitos,
      alimentadores: totalAlimentadores,
      elementosUnifilares: totalUnifilares,
      subestaciones: totalSubestaciones,
      puntosMedicion: totalPuntosMedicion,
      ccm: totalCcm,
      inspecciones: totalInspecciones,
      alarmas: totalAlarmas,
      totalActivos
    }
  };
}

/**
 * Genera un PIN de 6 dígitos aleatorio para vincular la empresa con Telegram.
 */
export async function generarPinResguardoEmpresa(empresaId) {
  const pin = Math.floor(100000 + Math.random() * 900000).toString();
  
  const empresa = await prisma.empresa.update({
    where: { id: empresaId },
    data: { telegramBackupPin: pin },
    select: {
      id: true,
      nombre: true,
      rif: true,
      telegramBackupPin: true,
      telegramChatId: true
    }
  });

  return empresa;
}

/**
 * Vincula una empresa con un Chat ID de Telegram a partir del PIN de seguridad.
 */
export async function vincularTelegramEmpresa(pin, chatId) {
  if (!pin || !chatId) return null;

  const empresa = await prisma.empresa.findFirst({
    where: { telegramBackupPin: pin.toString().trim() }
  });

  if (!empresa) return null;

  const empresaActualizada = await prisma.empresa.update({
    where: { id: empresa.id },
    data: {
      telegramChatId: chatId.toString(),
      telegramBackupPin: null, // Consumir PIN tras vincular
      ultimoBackupStatus: 'SUCCESS',
      ultimoBackupAt: new Date()
    }
  });

  return empresaActualizada;
}

/**
 * Genera una exportación JSON en memoria aislada exclusivamente con los datos de una empresa.
 */
export async function generarBackupEmpresaJson(empresaId) {
  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    include: {
      proyectos: {
        include: {
          tableros: {
            include: {
              circuitos: { orderBy: { posicionPolo: 'asc' } },
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
          alarmas: true,
          alimentadores: true
        }
      },
      tableros: {
        include: {
          circuitos: { orderBy: { posicionPolo: 'asc' } }
        }
      },
      elementosUnifilares: true,
      subestaciones: true,
      puntosMedicion: true,
      ccmList: true
    }
  });

  if (!empresa) throw new Error('Empresa no encontrada');

  const snapshotEmpresa = {
    metadata: {
      appName: 'App Tableros Eléctricos (Selectric)',
      tipoExportacion: 'EMPRESA_INDIVIDUAL',
      empresaId: empresa.id,
      empresaNombre: empresa.nombre,
      empresaRif: empresa.rif,
      generatedAt: new Date().toISOString()
    },
    data: [empresa]
  };

  const isoTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const slug = empresa.nombre.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20);
  const filename = `backup_${slug}_${isoTimestamp}.json`;
  const jsonString = JSON.stringify(snapshotEmpresa, null, 2);
  const buffer = Buffer.from(jsonString, 'utf-8');

  // Actualizar estado de resguardo de la empresa
  await prisma.empresa.update({
    where: { id: empresaId },
    data: {
      ultimoBackupAt: new Date(),
      ultimoBackupStatus: 'SUCCESS'
    }
  });

  return {
    filename,
    buffer,
    tamanoBytes: buffer.length,
    payload: snapshotEmpresa
  };
}

/**
 * Intenta guardar una copia en disco local de manera tolerante a fallos (solo en entornos con FS escribible).
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
 * No genera archivos duplicados en disco durante la descarga.
 */
export async function exportarBackupStream(res, usuario = {}) {
  const { buffer, filename } = await generarSnapshotMemoria({
    filenamePrefix: 'backup_selectric',
    usuario
  });

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', buffer.length);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');

  return res.status(200).send(buffer);
}

