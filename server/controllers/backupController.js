import { google } from 'googleapis';
import { uploadBackupToGDrive } from '../services/googleDriveService.js';
import prisma from '../db.js';

/**
 * GET /api/backup/export
 * Exporta la base de datos completa (Empresas -> Tableros -> Circuitos) en formato JSON.
 */
export const exportDatabase = async (req, res, next) => {
  try {
    const data = await prisma.empresa.findMany({
      include: {
        tableros: {
          include: {
            circuitos: {
              orderBy: {
                numeroPolo: 'asc'
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      orderBy: {
        nombre: 'asc'
      }
    });

    return res.status(200).json({
      ok: true,
      data
    });
  } catch (error) {
    console.error('Error al exportar base de datos:', error);
    next(error);
  }
};

/**
 * POST /api/backup/import
 * Reemplaza la base de datos completa con los datos proporcionados en formato JSON de forma transaccional.
 */
export const importDatabase = async (req, res, next) => {
  try {
    const { data } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        ok: false,
        error: 'El formato de importación es inválido. Debe proporcionar un arreglo de Empresas.'
      });
    }

    // Ejecutar borrado completo e inserción limpia dentro de una transacción.
    // Si algún elemento falla, se revierte todo y la base de datos queda intacta.
    await prisma.$transaction(async (tx) => {
      // 1. Borrar todas las relaciones en cascada (circuito -> tablero -> empresa)
      await tx.circuito.deleteMany();
      await tx.tablero.deleteMany();
      await tx.empresa.deleteMany();

      // 2. Insertar los datos limpios de forma recursiva
      for (const comp of data) {
        await tx.empresa.create({
          data: {
            id: comp.id,
            nombre: comp.nombre,
            direccion: comp.direccion || 'Sin dirección',
            createdAt: comp.createdAt ? new Date(comp.createdAt) : undefined,
            tableros: {
              create: (comp.tableros || []).map((t) => ({
                id: t.id,
                nombre: t.nombre,
                ubicacion: t.ubicacion || 'Sin ubicación',
                alimentadoPor: t.alimentadoPor || '',
                tipo: t.tipo || 'superficial',
                foto: t.foto || null,
                ia: t.ia || null,
                ib: t.ib || null,
                ic: t.ic || null,
                va: t.va || null,
                vb: t.vb || null,
                vc: t.vc || null,
                acometida: t.acometida || null,
                neutroCalibre: t.neutroCalibre || null,
                neutroObservaciones: t.neutroObservaciones || null,
                tierraCalibre: t.tierraCalibre || null,
                tierraObservaciones: t.tierraObservaciones || null,
                observacionesGenerales: t.observacionesGenerales || null,
                createdAt: t.createdAt ? new Date(t.createdAt) : undefined,
                circuitos: {
                  create: (t.circuitos || t.circuits || []).map((c) => ({
                    id: c.id,
                    numeroPolo: parseInt(c.numeroPolo, 10),
                    equipo: c.equipo || null,
                    breakerMarca: c.breakerMarca || null,
                    breakerTipo: c.breakerTipo || null,
                    breakerAmperaje: c.breakerAmperaje ? String(c.breakerAmperaje) : null,
                    conductorCalibre: c.conductorCalibre || null,
                    createdAt: c.createdAt ? new Date(c.createdAt) : undefined,
                  }))
                }
              }))
            }
          }
        });
      }
    });

    return res.status(200).json({
      ok: true,
      message: 'Base de datos importada y restaurada con éxito.'
    });

  } catch (error) {
    console.error('Error al importar base de datos:', error);
    next(error);
  }
};

/**
 * POST /api/backup/gdrive-sync
 * Exporta el estado actual y lo sube directamente a la cuenta de Google Drive configurada.
 */
export const syncToGoogleDrive = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        ok: false,
        error: 'Debe proporcionar un correo electrónico para compartir el respaldo.'
      });
    }

    const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    // 1. Obtener los datos del volcado actual de la base de datos
    const dbData = await prisma.empresa.findMany({
      include: {
        tableros: {
          include: {
            circuitos: true
          }
        }
      }
    });

    // 2. Si no están configuradas las variables de entorno, hacer simulación exitosa
    if (!serviceEmail || !privateKey) {
      console.log(`[Simulación] Respaldo automático subido a Google Drive de administrador y compartido con: ${email}`);
      return res.status(200).json({
        ok: true,
        message: `[Simulación] Respaldo generado y compartido con ${email}. (Nota: Configure GOOGLE_SERVICE_ACCOUNT_EMAIL y GOOGLE_PRIVATE_KEY en .env para activar la subida real).`,
        data: {
          success: true,
          fileId: 'simulated-id-' + Date.now(),
          fileName: `respaldo_tableros_simulado_${Date.now()}.json`
        }
      });
    }

    // 3. Subir el respaldo a la cuenta administradora de Google Drive
    const credentials = {
      client_email: serviceEmail,
      private_key: privateKey
    };

    const gDriveResult = await uploadBackupToGDrive(dbData, folderId, credentials);

    if (!gDriveResult.success) {
      return res.status(500).json({
        ok: false,
        error: 'Error al cargar respaldo en Google Drive.',
        details: gDriveResult.error
      });
    }

    // 4. Compartir el archivo recién creado con el correo electrónico del usuario (rol editor)
    try {
      const auth = new google.auth.JWT(
        serviceEmail,
        null,
        privateKey.replace(/\\n/g, '\n'),
        ['https://www.googleapis.com/auth/drive']
      );
      const drive = google.drive({ version: 'v3', auth });

      await drive.permissions.create({
        fileId: gDriveResult.fileId,
        requestBody: {
          type: 'user',
          role: 'writer',
          emailAddress: email
        }
      });
    } catch (shareError) {
      console.error('Error al compartir permisos del archivo en Google Drive:', shareError);
      // Retornamos de todos modos éxito ya que el archivo fue subido al Drive administrador
      return res.status(200).json({
        ok: true,
        message: 'Respaldo subido a Google Drive de administrador, pero falló el compartido de permisos.',
        details: shareError.message,
        data: gDriveResult
      });
    }

    return res.status(200).json({
      ok: true,
      message: `Respaldo subido y compartido exitosamente con ${email}.`,
      data: gDriveResult
    });

  } catch (error) {
    console.error('Error en syncToGoogleDrive:', error);
    next(error);
  }
};
