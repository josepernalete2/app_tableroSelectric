import prisma from '../db.js';
import { 
  exportarBackupStream, 
  guardarBackupLocalEnDisco, 
  generarSnapshotMemoria, 
  recopilarDatosCompletos,
  obtenerResumenTodasEmpresas,
  obtenerEstadoRespaldoEmpresa,
  generarPinResguardoEmpresa,
  generarBackupEmpresaJson
} from '../services/backup.service.js';
import { subirBackupAR2 } from '../services/r2Backup.service.js';
import { enviarBackupTelegram } from '../services/telegramBackup.service.js';

/**
 * Función auxiliar para generar el volcado completo y limpio de la base de datos (compatibilidad hacia atrás).
 */
export const generarSnapshotCompleto = async () => {
  const { data } = await recopilarDatosCompletos();
  return data;
};

/**
 * Ejecuta el pipeline completo de respaldo híbrido en memoria:
 * 1. Generación de snapshot en memoria (Buffer / JSON)
 * 2. Subida paralela a Cloudflare R2 y Telegram con Promise.allSettled
 * 3. Copia local tolerante a fallos (sin bloquear en entornos Serverless)
 * 4. Registro de metadatos livianos en PostgreSQL (sin saturar la BD) y rotación (20 máx)
 */
export async function ejecutarPipelineBackup({ origen = 'MANUAL', usuario = null, nombre = null, descripcion = null } = {}) {
  const timestampVE = new Date().toLocaleString('es-VE', { 
    timeZone: 'America/Caracas',
    dateStyle: 'short', 
    timeStyle: 'short' 
  });

  // 1. Generar Snapshot 100% en memoria
  const { buffer, filename, tamanoBytes, metadata, payload } = await generarSnapshotMemoria({
    filenamePrefix: 'backup_auto',
    usuario
  });

  // 2. Ejecutar subidas externas en paralelo contra Timeouts
  const [r2Settled, telegramSettled] = await Promise.allSettled([
    subirBackupAR2(buffer, filename),
    enviarBackupTelegram(buffer, filename, metadata)
  ]);

  const r2Result = r2Settled.status === 'fulfilled' 
    ? r2Settled.value 
    : { subido: false, error: r2Settled.reason?.message || 'Error desconocido en R2' };

  const telegramResult = telegramSettled.status === 'fulfilled' 
    ? telegramSettled.value 
    : { enviado: false, error: telegramSettled.reason?.message || 'Error desconocido en Telegram' };

  // 3. Intento de respaldo local condicional (fail-safe)
  const localResult = guardarBackupLocalEnDisco(payload, filename);

  // 4. Registrar únicamente metadatos livianos en la tabla `backups` de PostgreSQL
  const creadoPor = usuario?.username || usuario?.email || origen;
  const backupNombre = (nombre && nombre.trim()) || `Respaldo ${origen} ${timestampVE}`;
  const backupDesc = descripcion || `Respaldo generado vía ${origen} (${(tamanoBytes / 1024).toFixed(1)} KB)`;

  const nuevoBackup = await prisma.backup.create({
    data: {
      nombre: backupNombre,
      descripcion: backupDesc,
      data: {
        filename,
        tamanoBytes,
        registros: metadata.counts,
        totalRecords: metadata.totalRecords,
        generadoPor: creadoPor,
        origen,
        cloudStorage: {
          r2: r2Result
        },
        notificaciones: {
          telegram: telegramResult
        },
        guardadoLocal: localResult.guardado
      },
      tamanoBytes,
      creadoPor
    },
    select: {
      id: true,
      nombre: true,
      descripcion: true,
      tamanoBytes: true,
      creadoPor: true,
      createdAt: true
    }
  });

  // Mantener un máximo de 20 registros en la base de datos
  try {
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
  } catch (rotErr) {
    console.warn('⚠️ [BackupController] Error durante la rotación de registros en BD:', rotErr.message);
  }

  return {
    ok: true,
    success: true,
    id: nuevoBackup.id,
    filename,
    tamanoBytes,
    r2: r2Result,
    telegram: telegramResult,
    guardadoLocal: localResult.guardado,
    metadata
  };
}

/**
 * Endpoint para Vercel Cron Jobs o triggers externos protegidos:
 * GET o POST /api/cron/backup
 */
export const ejecutarCronBackup = async (req, res) => {
  try {
    const authHeader = req.headers['authorization'] || req.headers['x-cron-secret'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : authHeader.trim();
    const cronSecret = process.env.CRON_SECRET ? process.env.CRON_SECRET.trim() : '';

    // Validación estricta con CRON_SECRET
    if (cronSecret) {
      const querySecret = typeof req.query.secret === 'string' ? req.query.secret.trim() : '';
      if (token !== cronSecret && querySecret !== cronSecret) {
        console.warn('⚠️ [CronBackup] Intento de acceso no autorizado al trigger de cron de backups.');
        return res.status(401).json({
          ok: false,
          success: false,
          error: 'No autorizado: CRON_SECRET inválido o ausente'
        });
      }
    }

    console.log('⏰ [CronBackup] Iniciando ejecución programada de respaldo (Vercel Cron / Webhook)...');
    const resultado = await ejecutarPipelineBackup({ origen: 'VERCEL_CRON' });

    return res.status(200).json(resultado);
  } catch (error) {
    console.error('❌ [CronBackup] Error al ejecutar cron de backup:', error);
    return res.status(500).json({
      ok: false,
      success: false,
      error: error.message || 'Error al ejecutar respaldo cron'
    });
  }
};

/**
 * Función auxiliar para restaurar la base de datos a partir de un arreglo de Empresas.
 */
export const restaurarDesdeDatos = async (dataInput) => {
  let data = dataInput;
  if (dataInput && dataInput.data && Array.isArray(dataInput.data)) {
    data = dataInput.data;
  }
  if (!data || !Array.isArray(data)) {
    throw new Error('El formato de datos para restaurar es inválido. Debe proporcionar un arreglo de Empresas o un objeto con la clave "data".');
  }

  await prisma.$transaction(async (tx) => {
    // 1. Borrar todas las entidades en orden para evitar violaciones de clave foránea
    await tx.alarma.deleteMany();
    await tx.circuito.deleteMany();
    await tx.tablero.deleteMany();
    await tx.elementoUnifilar.deleteMany();
    await tx.subestacion.deleteMany();
    await tx.puntoMedicion.deleteMany();
    await tx.ccm.deleteMany();
    await tx.inspeccionTermografica.deleteMany();
    await tx.inspeccionAterramiento.deleteMany();
    await tx.inspeccionTanqueCombustible.deleteMany();
    await tx.alimentador.deleteMany();
    await tx.proyecto.deleteMany();
    await tx.empresa.deleteMany();

    // 2. Insertar recursivamente las empresas y sus relaciones
    for (const comp of data) {
      const createdEmpresa = await tx.empresa.create({
        data: {
          id: comp.id,
          nombre: comp.nombre || 'Empresa sin nombre',
          rif: comp.rif || `J-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          direccionFiscal: comp.direccionFiscal || comp.direccion || 'Sin dirección fiscal',
          direccion: comp.direccion || null,
          gerente1Nombre: comp.gerente1Nombre || null,
          gerente1Telefono: comp.gerente1Telefono || null,
          gerente1Email: comp.gerente1Email || null,
          gerente2Nombre: comp.gerente2Nombre || null,
          gerente2Telefono: comp.gerente2Telefono || null,
          gerente2Email: comp.gerente2Email || null,
          createdAt: comp.createdAt ? new Date(comp.createdAt) : undefined
        }
      });

      // Insertar proyectos
      for (const proy of (comp.proyectos || [])) {
        const createdProyecto = await tx.proyecto.create({
          data: {
            id: proy.id,
            nombre: proy.nombre || 'Proyecto sin nombre',
            direccion: proy.direccion || 'Sin dirección',
            descripcion: proy.descripcion || null,
            empresaId: createdEmpresa.id,
            responsableNombre: proy.responsableNombre || null,
            responsableTelefono: proy.responsableTelefono || null,
            responsableEmail: proy.responsableEmail || null,
            createdAt: proy.createdAt ? new Date(proy.createdAt) : undefined
          }
        });

        // Insertar alimentadores del proyecto si existen
        const alimentadoresMap = new Map();
        for (const alim of (proy.alimentadores || [])) {
          const createdAlim = await tx.alimentador.create({
            data: {
              id: alim.id,
              nombre: alim.nombre || 'Alimentador',
              origen: alim.origen || null,
              capacidadAmperios: alim.capacidadAmperios ? parseFloat(alim.capacidadAmperios) : null,
              capacidadKVA: alim.capacidadKVA ? parseFloat(alim.capacidadKVA) : null,
              proyectoId: createdProyecto.id,
              createdAt: alim.createdAt ? new Date(alim.createdAt) : undefined
            }
          });
          alimentadoresMap.set(createdAlim.id, createdAlim.id);
        }

        // Insertar tableros del proyecto
        for (const tab of (proy.tableros || [])) {
          await tx.tablero.create({
            data: {
              id: tab.id,
              nombre: tab.nombre || 'Tablero',
              ubicacion: tab.ubicacion || null,
              maxPolos: parseInt(tab.maxPolos || 42, 10),
              tension: tab.tension || null,
              fases: parseInt(tab.fases || 3, 10),
              alimentadorId: tab.alimentadorId && alimentadoresMap.has(tab.alimentadorId) ? tab.alimentadorId : null,
              proyectoId: createdProyecto.id,
              empresaId: createdEmpresa.id,
              createdAt: tab.createdAt ? new Date(tab.createdAt) : undefined,
              circuitos: {
                create: (tab.circuitos || tab.circuits || []).map((c) => ({
                  id: c.id,
                  posicionPolo: parseInt(c.posicionPolo ?? c.numeroPolo ?? 1, 10),
                  numPolos: parseInt(c.numPolos || 1, 10),
                  amperaje: c.amperaje ? parseFloat(c.amperaje) : null,
                  descripcion: c.descripcion || c.equipo || null,
                  estado: c.estado || 'ACTIVO',
                  elementoDestinoId: c.elementoDestinoId || null,
                  tipoElementoDestino: c.tipoElementoDestino || null,
                  createdAt: c.createdAt ? new Date(c.createdAt) : undefined
                }))
              }
            }
          });
        }

        // Insertar elementos unifilares
        for (const elem of (proy.elementosUnifilares || [])) {
          await tx.elementoUnifilar.create({
            data: {
              id: elem.id,
              nombre: elem.nombre || 'Elemento',
              tipoElemento: elem.tipoElemento || 'TABLERO',
              ubicacion: elem.ubicacion || null,
              alimentadoPor: elem.alimentadoPor || null,
              foto: elem.foto || null,
              observacionesGenerales: elem.observacionesGenerales || null,
              datosTecnicos: elem.datosTecnicos || {},
              circuitoOrigen: elem.circuitoOrigen || null,
              calibreConductor: elem.calibreConductor || null,
              breakerAmperaje: elem.breakerAmperaje ? parseFloat(elem.breakerAmperaje) : null,
              breakerMarca: elem.breakerMarca || null,
              breakerTipo: elem.breakerTipo || null,
              potenciaEstimada: elem.potenciaEstimada || null,
              estadoVinculo: elem.estadoVinculo || 'ACTIVO',
              detallesFormato: elem.detallesFormato || null,
              proyectoId: createdProyecto.id,
              empresaId: createdEmpresa.id,
              createdAt: elem.createdAt ? new Date(elem.createdAt) : undefined
            }
          });
        }

        // Insertar subestaciones
        for (const sub of (proy.subestaciones || [])) {
          await tx.subestacion.create({
            data: {
              id: sub.id,
              nombre: sub.nombre || 'Subestación',
              ubicacion: sub.ubicacion || 'Ubicación',
              fecha: sub.fecha || '',
              hora: sub.hora || '',
              inspector: sub.inspector || '',
              nivelTension: sub.nivelTension || '13.8 kV',
              estadoEntorno: sub.estadoEntorno || {},
              obrasCiviles: sub.obrasCiviles || {},
              equiposPrincipales: sub.equiposPrincipales || {},
              puestaTierra: sub.puestaTierra || {},
              edificioControl: sub.edificioControl || {},
              firmaInspector: sub.firmaInspector || null,
              firmaSupervisor: sub.firmaSupervisor || null,
              proyectoId: createdProyecto.id,
              empresaId: createdEmpresa.id,
              createdAt: sub.createdAt ? new Date(sub.createdAt) : undefined
            }
          });
        }

        // Insertar puntos de medición
        for (const pm of (proy.puntosMedicion || [])) {
          await tx.puntoMedicion.create({
            data: {
              id: pm.id,
              nombre: pm.nombre || 'Punto de Medición',
              fecha: pm.fecha || null,
              hora: pm.hora || null,
              inspector: pm.inspector || null,
              nombreUsuario: pm.nombreUsuario || null,
              numeroContrato: pm.numeroContrato || null,
              empresaDistribuidora: pm.empresaDistribuidora || null,
              nivelTensionContrato: pm.nivelTensionContrato || null,
              tensionNominal: pm.tensionNominal || null,
              potenciaContratada: pm.potenciaContratada || null,
              tarifaAplicable: pm.tarifaAplicable || null,
              codigoElementoPrincipal: pm.codigoElementoPrincipal || null,
              tipoAcometida: pm.tipoAcometida || null,
              puntoConexionPCC: pm.puntoConexionPCC || null,
              conductorAcometida: pm.conductorAcometida || null,
              longitudAcometida: pm.longitudAcometida || null,
              elementoManiobra: pm.elementoManiobra || null,
              capacidadInterrupcion: pm.capacidadInterrupcion || null,
              ubicacionTransformador: pm.ubicacionTransformador || null,
              propiedadTransformador: pm.propiedadTransformador || null,
              usoTransformador: pm.usoTransformador || null,
              ubicacionMedidor: pm.ubicacionMedidor || null,
              tipoMedicion: pm.tipoMedicion || null,
              marcaModeloMedidor: pm.marcaModeloMedidor || null,
              numeroSerieAno: pm.numeroSerieAno || null,
              observaciones: pm.observaciones || null,
              firmaInspector: pm.firmaInspector || null,
              firmaSupervisor: pm.firmaSupervisor || null,
              proyectoId: createdProyecto.id,
              empresaId: createdEmpresa.id,
              createdAt: pm.createdAt ? new Date(pm.createdAt) : undefined
            }
          });
        }

        // Insertar CCM
        for (const ccm of (proy.ccmList || [])) {
          await tx.ccm.create({
            data: {
              id: ccm.id,
              nombre: ccm.nombre || 'CCM',
              plantaInstalacion: ccm.plantaInstalacion || null,
              areaProceso: ccm.areaProceso || null,
              fabricanteMarca: ccm.fabricanteMarca || null,
              modeloSerie: ccm.modeloSerie || null,
              gradoNemaIp: ccm.gradoNemaIp || null,
              fecha: ccm.fecha || null,
              inspector: ccm.inspector || null,
              supervisor: ccm.supervisor || null,
              anoFabricacionInstalacion: ccm.anoFabricacionInstalacion || null,
              parametrosElectricos: ccm.parametrosElectricos || {},
              gavetasBucketLog: ccm.gavetasBucketLog || {},
              inspeccionFisica: ccm.inspeccionFisica || {},
              seguridadTermografia: ccm.seguridadTermografia || {},
              hallazgosCriticos: ccm.hallazgosCriticos || {},
              firmaInspector: ccm.firmaInspector || null,
              firmaSupervisor: ccm.firmaSupervisor || null,
              proyectoId: createdProyecto.id,
              empresaId: createdEmpresa.id,
              createdAt: ccm.createdAt ? new Date(ccm.createdAt) : undefined
            }
          });
        }

        // Insertar Inspecciones Termográficas
        for (const it of (proy.inspeccionesTermograficas || [])) {
          await tx.inspeccionTermografica.create({
            data: {
              id: it.id,
              nombre: it.nombre || 'Inspección Termográfica',
              ubicacion: it.ubicacion || null,
              fecha: it.fecha || null,
              hora: it.hora || null,
              inspector: it.inspector || null,
              supervisor: it.supervisor || null,
              tempAmbiente: it.tempAmbiente ? parseFloat(it.tempAmbiente) : null,
              tempPuntoCaliente: it.tempPuntoCaliente ? parseFloat(it.tempPuntoCaliente) : null,
              tempReferencia: it.tempReferencia ? parseFloat(it.tempReferencia) : null,
              cameraModel: it.cameraModel || null,
              proyectoId: createdProyecto.id,
              empresaId: createdEmpresa.id,
              createdAt: it.createdAt ? new Date(it.createdAt) : undefined
            }
          });
        }

        // Insertar Inspecciones de Aterramiento
        for (const ia of (proy.inspeccionesAterramiento || [])) {
          await tx.inspeccionAterramiento.create({
            data: {
              id: ia.id,
              nombre: ia.nombre || 'Inspección Aterramiento',
              ubicacion: ia.ubicacion || null,
              fecha: ia.fecha || null,
              hora: ia.hora || null,
              inspector: ia.inspector || null,
              supervisor: ia.supervisor || null,
              resistenciaOhmios: ia.resistenciaOhmios ? parseFloat(ia.resistenciaOhmios) : null,
              metodoMedicion: ia.metodoMedicion || null,
              tipoSistemaPat: ia.tipoSistemaPat || null,
              tipoUnion: ia.tipoUnion || null,
              proyectoId: createdProyecto.id,
              empresaId: createdEmpresa.id,
              createdAt: ia.createdAt ? new Date(ia.createdAt) : undefined
            }
          });
        }

        // Insertar Inspecciones de Tanques de Combustible
        for (const itc of (proy.inspeccionesTanquesCombustible || [])) {
          await tx.inspeccionTanqueCombustible.create({
            data: {
              id: itc.id,
              nombre: itc.nombre || 'Inspección Tanque',
              ubicacion: itc.ubicacion || null,
              fecha: itc.fecha || null,
              hora: itc.hora || null,
              inspector: itc.inspector || null,
              supervisor: itc.supervisor || null,
              tipoCombustible: itc.tipoCombustible || null,
              capacidadTotalLitros: itc.capacidadTotalLitros ? parseFloat(itc.capacidadTotalLitros) : null,
              nivelActualPorcentaje: itc.nivelActualPorcentaje ? parseFloat(itc.nivelActualPorcentaje) : null,
              consumoGeneradorLh: itc.consumoGeneradorLh ? parseFloat(itc.consumoGeneradorLh) : null,
              diqueContencion110: itc.diqueContencion110 || null,
              proyectoId: createdProyecto.id,
              empresaId: createdEmpresa.id,
              createdAt: itc.createdAt ? new Date(itc.createdAt) : undefined
            }
          });
        }

        // Insertar Alarmas
        for (const al of (proy.alarmas || [])) {
          await tx.alarma.create({
            data: {
              id: al.id,
              tipo: al.tipo || 'INFO',
              severidad: al.severidad || 'INFO',
              mensaje: al.mensaje || 'Alarma',
              detalles: al.detalles || {},
              estado: al.estado || 'ACTIVA',
              leidaAt: al.leidaAt ? new Date(al.leidaAt) : null,
              tableroId: al.tableroId || null,
              proyectoId: createdProyecto.id,
              createdAt: al.createdAt ? new Date(al.createdAt) : undefined
            }
          });
        }
      }
    }
  });
};

/**
 * GET /api/backup/export o GET /api/backups/export
 * Obtiene la data completa de la base de datos usando Prisma, la convierte a JSON en memoria
 * y la envía directamente con headers de descarga HTTP mediante Streams sin tocar el sistema de archivos (fs).
 */
export const exportDatabase = async (req, res) => {
  try {
    await exportarBackupStream(res, req.user);
  } catch (error) {
    console.error('[BackupController] Error al exportar base de datos:', error);
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(500).json({
        ok: false,
        success: false,
        error: error.message || 'Error al exportar la base de datos'
      });
    }
    return res.end();
  }
};

/**
 * POST /api/backup/import
 * Reemplaza la base de datos completa con los datos proporcionados en formato JSON.
 */
export const importDatabase = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { data } = req.body || {};
    await restaurarDesdeDatos(data);

    return res.status(200).json({
      ok: true,
      success: true,
      message: 'Base de datos importada y restaurada con éxito.'
    });
  } catch (error) {
    console.error('Error al importar base de datos:', error);
    return res.status(500).json({
      ok: false,
      success: false,
      error: error.message || 'Error al importar la base de datos'
    });
  }
};

/**
 * GET /api/backup/cloud
 * Obtiene la lista de todos los respaldos guardados en la tabla `backups` de la base de datos.
 */
export const listarBackupsEnNube = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const backups = await prisma.backup.findMany({
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        tamanoBytes: true,
        creadoPor: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.status(200).json({
      ok: true,
      success: true,
      data: backups
    });
  } catch (error) {
    console.error('Error al listar respaldos en la nube:', error);
    return res.status(500).json({
      ok: false,
      success: false,
      error: error.message || 'Error al listar los respaldos en la nube'
    });
  }
};

/**
 * POST /api/backup/cloud
 * Genera un nuevo respaldo completo usando el pipeline híbrido (R2, Telegram, BD y Local).
 */
export const crearBackupEnNube = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { nombre, descripcion } = req.body || {};
    const resultado = await ejecutarPipelineBackup({
      origen: 'MANUAL',
      usuario: req.user,
      nombre,
      descripcion
    });

    return res.status(201).json({
      ok: true,
      success: true,
      message: 'Respaldo generado y distribuido exitosamente.',
      data: resultado
    });
  } catch (error) {
    console.error('Error al crear respaldo en la nube:', error);
    return res.status(500).json({
      ok: false,
      success: false,
      error: error.message || 'Error al guardar el respaldo en la nube'
    });
  }
};

/**
 * GET /api/backup/cloud/:id/download
 * Descarga el contenido JSON de un respaldo específico almacenado en la nube.
 */
export const descargarBackupEnNube = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { id } = req.params;
    const backup = await prisma.backup.findUnique({
      where: { id }
    });

    if (!backup) {
      return res.status(404).json({
        ok: false,
        success: false,
        error: 'Respaldo no encontrado en la nube.'
      });
    }

    return res.status(200).json({
      ok: true,
      success: true,
      nombre: backup.nombre,
      createdAt: backup.createdAt,
      data: backup.data
    });
  } catch (error) {
    console.error('Error al descargar respaldo de la nube:', error);
    return res.status(500).json({
      ok: false,
      success: false,
      error: error.message || 'Error al descargar el respaldo'
    });
  }
};

/**
 * POST /api/backup/cloud/:id/restore
 * Restaura la base de datos completa utilizando el snapshot guardado en un respaldo de la nube.
 */
export const restaurarBackupEnNube = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { id } = req.params;
    const backup = await prisma.backup.findUnique({
      where: { id }
    });

    if (!backup || !backup.data) {
      return res.status(404).json({
        ok: false,
        success: false,
        error: 'Respaldo no encontrado o sin datos válidos.'
      });
    }

    // Si data contiene snapshot completo o data estructurada
    const payloadRestaurar = backup.data.data ? backup.data.data : backup.data;
    await restaurarDesdeDatos(payloadRestaurar);

    return res.status(200).json({
      ok: true,
      success: true,
      message: `Base de datos restaurada con éxito desde el respaldo "${backup.nombre}".`,
      data: backup.data
    });
  } catch (error) {
    console.error('Error al restaurar respaldo desde la nube:', error);
    return res.status(500).json({
      ok: false,
      success: false,
      error: error.message || 'Error al restaurar la base de datos'
    });
  }
};

/**
 * DELETE /api/backup/cloud/:id
 * Elimina un registro de respaldo almacenado en la nube.
 */
export const eliminarBackupEnNube = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { id } = req.params;
    await prisma.backup.delete({
      where: { id }
    });

    return res.status(200).json({
      ok: true,
      success: true,
      message: 'Respaldo eliminado con éxito.'
    });
  } catch (error) {
    console.error('Error al eliminar respaldo:', error);
    return res.status(500).json({
      ok: false,
      success: false,
      error: error.message || 'Error al eliminar el respaldo de la nube'
    });
  }
};

/**
 * GET /api/backup/resumen-empresas
 * Devuelve un resumen de resguardo para todas las empresas del sistema.
 */
export const obtenerResumenEmpresasController = async (req, res) => {
  try {
    const empresas = await obtenerResumenTodasEmpresas();
    return res.status(200).json({
      ok: true,
      success: true,
      data: empresas
    });
  } catch (error) {
    console.error('❌ [BackupController] Error al obtener resumen de empresas:', error);
    return res.status(500).json({
      ok: false,
      error: error.message || 'Error al consultar resumen de empresas'
    });
  }
};

/**
 * GET /api/backup/empresa/:empresaId/estado
 * Devuelve la ficha técnica y certificado de resguardo de una empresa.
 */
export const obtenerEstadoEmpresaController = async (req, res) => {
  try {
    const { empresaId } = req.params;
    const estado = await obtenerEstadoRespaldoEmpresa(empresaId);
    if (!estado) {
      return res.status(404).json({ ok: false, error: 'Empresa no encontrada' });
    }
    return res.status(200).json({
      ok: true,
      success: true,
      data: estado
    });
  } catch (error) {
    console.error('❌ [BackupController] Error al obtener estado de empresa:', error);
    return res.status(500).json({
      ok: false,
      error: error.message || 'Error al consultar estado de la empresa'
    });
  }
};

/**
 * POST /api/backup/generar-pin/:empresaId
 * Genera o renueva el PIN de 6 dígitos para vincular la empresa por Telegram.
 */
export const generarPinEmpresaController = async (req, res) => {
  try {
    const { empresaId } = req.params;
    const resultado = await generarPinResguardoEmpresa(empresaId);
    return res.status(200).json({
      ok: true,
      success: true,
      data: resultado
    });
  } catch (error) {
    console.error('❌ [BackupController] Error al generar PIN de empresa:', error);
    return res.status(500).json({
      ok: false,
      error: error.message || 'Error al generar PIN de resguardo'
    });
  }
};

/**
 * POST /api/backup/empresa/:empresaId
 * Ejecuta el respaldo individual en memoria de una empresa.
 */
export const ejecutarBackupEmpresaController = async (req, res) => {
  try {
    const { empresaId } = req.params;
    const resultado = await generarBackupEmpresaJson(empresaId);
    return res.status(200).json({
      ok: true,
      success: true,
      data: {
        filename: resultado.filename,
        tamanoBytes: resultado.tamanoBytes,
        metadata: resultado.payload.metadata
      }
    });
  } catch (error) {
    console.error('❌ [BackupController] Error al ejecutar respaldo de empresa:', error);
    return res.status(500).json({
      ok: false,
      error: error.message || 'Error al respaldar la empresa'
    });
  }
};

/**
 * GET /api/backup/empresa/:empresaId/export
 * Descarga directamente el archivo JSON del snapshot aislado de la empresa.
 */
export const descargarBackupEmpresaController = async (req, res) => {
  try {
    const { empresaId } = req.params;
    const { buffer, filename } = await generarBackupEmpresaJson(empresaId);

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');

    return res.status(200).send(buffer);
  } catch (error) {
    console.error('❌ [BackupController] Error al descargar respaldo de empresa:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        ok: false,
        error: error.message || 'Error al exportar respaldo de empresa'
      });
    }
    return res.end();
  }
};

