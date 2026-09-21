import { google } from 'googleapis';
import { uploadBackupToGDrive } from '../services/googleDriveService.js';
import prisma from '../db.js';

/**
 * GET /api/backup/export
 * Exporta la base de datos completa en formato JSON estructurado.
 */
export const exportDatabase = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const data = await prisma.empresa.findMany({
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

    return res.status(200).json({
      ok: true,
      success: true,
      data
    });
  } catch (error) {
    console.error('Error al exportar base de datos:', error);
    return res.status(500).json({
      ok: false,
      success: false,
      error: error.message || 'Error al exportar la base de datos'
    });
  }
};

/**
 * POST /api/backup/import
 * Reemplaza la base de datos completa con los datos proporcionados en formato JSON de forma transaccional.
 */
export const importDatabase = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { data } = req.body || {};

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        ok: false,
        success: false,
        error: 'El formato de importación es inválido. Debe proporcionar un arreglo de Empresas.'
      });
    }

    // Ejecutar borrado completo e inserción limpia dentro de una transacción.
    // Si algún elemento falla, se revierte todo y la base de datos queda intacta.
    await prisma.$transaction(async (tx) => {
      // 1. Borrar todas las entidades secundarias en cascada
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

      // 2. Insertar los datos limpios de forma recursiva
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

          // Insertar tableros del proyecto
          const tablerosList = proy.tableros || [];
          for (const tab of tablerosList) {
            await tx.tablero.create({
              data: {
                id: tab.id,
                nombre: tab.nombre || 'Tablero',
                ubicacion: tab.ubicacion || null,
                maxPolos: parseInt(tab.maxPolos || 42, 10),
                tension: tab.tension || null,
                fases: parseInt(tab.fases || 3, 10),
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

          // Insertar elementos unifilares del proyecto
          const elementosList = proy.elementosUnifilares || [];
          for (const elem of elementosList) {
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
                proyectoId: createdProyecto.id,
                empresaId: createdEmpresa.id,
                createdAt: elem.createdAt ? new Date(elem.createdAt) : undefined
              }
            });
          }
        }
      }
    });

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
 * POST /api/backup/gdrive-sync
 * Exporta el estado actual y lo sube directamente a la cuenta de Google Drive configurada.
 */
export const syncToGoogleDrive = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { email } = req.body || {};

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        ok: false,
        success: false,
        error: 'Debe proporcionar un correo electrónico válido para compartir el respaldo.'
      });
    }

    // Verificar si las variables de entorno existen
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      return res.status(400).json({
        ok: false,
        success: false,
        error: 'Las credenciales de Google Drive no están configuradas en el servidor.'
      });
    }

    const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL.trim();
    const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || null;

    // 1. Obtener los datos del volcado actual de la base de datos
    const dbData = await prisma.empresa.findMany({
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
          }
        }
      },
      orderBy: {
        nombre: 'asc'
      }
    });

    // 2. Subir el respaldo a la cuenta administradora de Google Drive
    const credentials = {
      client_email: serviceEmail,
      private_key: privateKey
    };

    const gDriveResult = await uploadBackupToGDrive(dbData, folderId, credentials);

    if (!gDriveResult || !gDriveResult.success) {
      return res.status(500).json({
        ok: false,
        success: false,
        error: gDriveResult?.error || 'Error al cargar respaldo en Google Drive.'
      });
    }

    // 3. Compartir el archivo recién creado con el correo electrónico del usuario (rol editor)
    try {
      const auth = new google.auth.JWT(
        serviceEmail,
        null,
        privateKey,
        ['https://www.googleapis.com/auth/drive']
      );
      const drive = google.drive({ version: 'v3', auth });

      await drive.permissions.create({
        fileId: gDriveResult.fileId,
        requestBody: {
          type: 'user',
          role: 'writer',
          emailAddress: email.trim()
        }
      });
    } catch (shareError) {
      console.error('Error al compartir permisos del archivo en Google Drive:', shareError);
      return res.status(200).json({
        ok: true,
        success: true,
        message: 'Respaldo subido a Google Drive de administrador, pero no se pudo compartir automáticamente los permisos por correo.',
        details: shareError.message,
        data: gDriveResult
      });
    }

    return res.status(200).json({
      ok: true,
      success: true,
      message: `Respaldo subido y compartido exitosamente con ${email.trim()}.`,
      data: gDriveResult
    });

  } catch (error) {
    console.error('Error en syncToGoogleDrive:', error);
    return res.status(500).json({
      ok: false,
      success: false,
      error: error.message || 'Error interno al sincronizar con Google Drive'
    });
  }
};
