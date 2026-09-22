import prisma from '../db.js';
import { exportarBackupStream, guardarBackupLocalEnDisco } from '../services/backup.service.js';

/**
 * Función auxiliar para generar el volcado completo y limpio de la base de datos.
 */
export const generarSnapshotCompleto = async () => {
  return await prisma.empresa.findMany({
    include: {
      proyectos: {
        include: {
          tableros: {
            include: {
              circuitos: {
                orderBy: {
                  posicionPolo: 'asc'
                }
              },
              alimentador: true
            },
            orderBy: {
              createdAt: 'asc'
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
          circuitos: {
            orderBy: {
              posicionPolo: 'asc'
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      },
      elementosUnifilares: true,
      subestaciones: true,
      puntosMedicion: true,
      ccmList: true
    },
    orderBy: {
      nombre: 'asc'
    }
  });
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
 * Genera un nuevo respaldo completo del estado actual y lo almacena en la tabla `backups`.
 */
export const crearBackupEnNube = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { nombre, descripcion } = req.body || {};
    const snapshot = await generarSnapshotCompleto();
    const jsonString = JSON.stringify(snapshot);
    const tamanoBytes = Buffer.byteLength(jsonString, 'utf8');

    const timestamp = new Date().toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' });
    const backupNombre = (nombre && nombre.trim()) || `Respaldo ${timestamp}`;
    const creadoPor = req.user?.username || 'ADMIN';

    const nuevoBackup = await prisma.backup.create({
      data: {
        nombre: backupNombre,
        descripcion: descripcion || `Respaldo generado por ${creadoPor}`,
        data: snapshot,
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

    // Guardar también una copia local en disco (backups/)
    try {
      guardarBackupLocalEnDisco(snapshot);
    } catch (fsErr) {
      console.warn('⚠️ No se pudo guardar la copia en disco local:', fsErr.message);
    }

    // Mantener un máximo de 20 respaldos en la base de datos
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

    return res.status(201).json({
      ok: true,
      success: true,
      message: 'Respaldo guardado exitosamente en la nube.',
      data: nuevoBackup
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

    await restaurarDesdeDatos(backup.data);

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
