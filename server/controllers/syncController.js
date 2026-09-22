import prisma from '../db.js';

// Lista blanca estricta de entidades permitidas para sincronización offline
const ALLOWED_SYNC_ENTITIES = new Set([
  'tablero',
  'circuito',
  'elementoUnifilar',
  'subestacion',
  'puntoMedicion',
  'ccm',
  'alimentador',
  'proyecto',
  'empresa'
]);

// Jerarquía de dependencias relacionales para garantizar orden de inserción/borrado correcto (CONC-01)
const ENTITY_PRIORITY = {
  empresa: 1,
  proyecto: 2,
  alimentador: 3,
  subestacion: 4,
  ccm: 4,
  puntoMedicion: 4,
  tablero: 4,
  elementoUnifilar: 4,
  circuito: 5
};

// Campos del sistema restringidos que nunca deben ser mutados vía sync batch (SEC-02)
const FORBIDDEN_MUTATION_FIELDS = ['role', 'password', 'deletedAt'];

export const procesarSincronizacionBatch = async (req, res, next) => {
  try {
    const { mutations } = req.body;

    if (!Array.isArray(mutations) || mutations.length === 0) {
      return res.status(400).json({ ok: false, error: 'El cuerpo de la solicitud debe contener un arreglo de mutaciones (mutations).' });
    }

    // Ordenar mutaciones según dependencias relacionales
    // CREATE/UPDATE: Padres primero -> Hijos después
    // DELETE: Hijos primero -> Padres después
    const sortedMutations = [...mutations].sort((a, b) => {
      const modelA = (a.entity || '').charAt(0).toLowerCase() + (a.entity || '').slice(1);
      const modelB = (b.entity || '').charAt(0).toLowerCase() + (b.entity || '').slice(1);
      const priorityA = ENTITY_PRIORITY[modelA] || 99;
      const priorityB = ENTITY_PRIORITY[modelB] || 99;

      if (a.operation === 'DELETE' && b.operation === 'DELETE') {
        return priorityB - priorityA; // Hijos primero
      }
      return priorityA - priorityB; // Padres primero
    });

    const applied = [];
    const conflicts = [];

    // Procesar las mutaciones de forma transaccional usando prisma.$transaction
    await prisma.$transaction(async (tx) => {
      for (const item of sortedMutations) {
        const { entity, id, operation, baseVersion, data } = item;

        if (!entity || !id || !operation) {
          conflicts.push({ id, entity, error: 'Mutación incompleta: faltan campos obligatorios' });
          continue;
        }

        const modelName = entity.charAt(0).toLowerCase() + entity.slice(1);

        // Control de Seguridad: Solo permitir entidades en lista blanca
        if (!ALLOWED_SYNC_ENTITIES.has(modelName)) {
          console.warn(`[SECURITY WARNING] Intento de mutación batch en entidad restringida o no permitida: '${entity}' por usuario '${req.user?.username}' (${req.user?.id})`);
          conflicts.push({ id, entity, error: `Entidad restringida o no permitida para sincronización: ${entity}` });
          continue;
        }

        const delegate = tx[modelName];

        if (!delegate) {
          conflicts.push({ id, entity, error: `Entidad desconocida: ${entity}` });
          continue;
        }

        try {
          // Buscar si el registro ya existe en el servidor
          const existingRecord = await delegate.findUnique({ where: { id } });

          // Multitenancy: Si el usuario es CLIENT, verificar pertenencia a su empresa
          if (req.user && req.user.role === 'CLIENT' && req.user.companyId) {
            const companyId = req.user.companyId;
            if (existingRecord) {
              const recordCompanyId = existingRecord.empresaId || (existingRecord.empresa && existingRecord.empresa.id);
              if (recordCompanyId && recordCompanyId !== companyId) {
                conflicts.push({ id, entity, error: 'Acceso denegado: este recurso pertenece a otra empresa' });
                continue;
              }
            }
          }

          if (operation === 'DELETE') {
            if (existingRecord) {
              if (existingRecord.version !== undefined && baseVersion !== undefined && existingRecord.version > baseVersion) {
                conflicts.push({ id, entity, type: 'CONFLICT', serverRecord: existingRecord, clientRecord: data });
              } else {
                if ('deletedAt' in existingRecord) {
                  const updated = await delegate.update({
                    where: { id },
                    data: {
                      deletedAt: new Date(),
                      version: (existingRecord.version || 1) + 1
                    }
                  });
                  applied.push({ id, entity, operation, version: updated.version });
                } else {
                  await delegate.delete({ where: { id } });
                  applied.push({ id, entity, operation });
                }
              }
            } else {
              applied.push({ id, entity, operation: 'ALREADY_DELETED' });
            }
            continue;
          }

          // Sanitizar payload de entrada (eliminar campos restringidos)
          const sanitizedPayload = { ...(data || {}) };
          FORBIDDEN_MUTATION_FIELDS.forEach(field => delete sanitizedPayload[field]);
          delete sanitizedPayload.id;
          delete sanitizedPayload.createdAt;

          // Operación CREATE, UPDATE o UPSERT
          if (existingRecord) {
            // Control de Concurrencia Optimista (OCC)
            const currentVersion = existingRecord.version || 1;
            const targetBaseVersion = baseVersion !== undefined ? baseVersion : currentVersion;

            if (currentVersion > targetBaseVersion) {
              // Conflicto de versión
              conflicts.push({
                id,
                entity,
                type: 'OCC_CONFLICT',
                message: `El registro en el servidor tiene la versión ${currentVersion}, mientras que el cliente intentó sincronizar sobre la versión ${targetBaseVersion}.`,
                serverRecord: existingRecord,
                clientData: sanitizedPayload
              });
              continue;
            }

            // Aplicar actualización incrementando versión
            if ('version' in existingRecord) {
              sanitizedPayload.version = currentVersion + 1;
            }

            const updatedRecord = await delegate.update({
              where: { id },
              data: sanitizedPayload
            });

            applied.push({ id, entity, operation: 'UPDATE', version: updatedRecord.version || 1, record: updatedRecord });
          } else {
            // Crear registro nuevo
            const createPayload = { ...sanitizedPayload, id };
            if (['elementoUnifilar', 'subestacion', 'tablero', 'circuito', 'puntoMedicion', 'ccm'].includes(modelName)) {
              createPayload.version = 1;
            }

            const createdRecord = await delegate.create({
              data: createPayload
            });

            applied.push({ id, entity, operation: 'CREATE', version: createdRecord.version || 1, record: createdRecord });
          }
        } catch (itemErr) {
          console.error(`❌ Error procesando mutación para ${entity} (${id}):`, itemErr);
          conflicts.push({ id, entity, error: itemErr.message });
        }
      }
    });

    return res.status(200).json({
      ok: true,
      message: `Sincronización procesada. ${applied.length} aplicados, ${conflicts.length} conflictos.`,
      appliedCount: applied.length,
      conflictCount: conflicts.length,
      applied,
      conflicts
    });
  } catch (error) {
    console.error('❌ Error crítico en procesarSincronizacionBatch:', error);
    next(error);
  }
};

// ENDPOINT PULL: Traer datos actualizados desde el servidor
// Filtrado por lastSyncTimestamp para obtener solo cambios desde última sincronización
export const pullData = async (req, res) => {
  try {
    const user = req.user;
    const { empresaId } = user;
    const { lastSyncTimestamp } = req.query;

    const where = {};

    // Multitenancy: usuarios CLIENT solo ven su empresa
    if (user.role === 'CLIENT' && empresaId) {
      where.empresaId = empresaId;
    }

    // Filtrar por última fecha de sincronización si viene del cliente
    if (lastSyncTimestamp) {
      const ts = new Date(lastSyncTimestamp);
      where.updatedAt = { gte: ts };
    }

    // Traer empresas con todas sus relaciones anidadas
    const companies = await prisma.empresa.findMany({
      where,
      include: {
        proyectos: {
          include: {
            tableros: {
              include: {
                circuitos: true
              }
            },
            elementosUnifilares: {
              include: {
                inspeccionesSubestacion: true,
                puntosMedicion: true,
                ccmList: true
              }
            },
            inspeccionesSubestacion: true,
            puntosMedicion: true,
            ccmList: true,
            alimentadores: true
          }
        }
      }
    });

    // Formatear datos para el frontend
    const formattedCompanies = companies.map(company => ({
      ...company,
      proyectos: company.proyectos.map(proyecto => ({
        ...proyecto,
        tableros: proyecto.tableros.map(tablero => ({
          ...tablero,
          circuitos: tablero.circuitos || []
        })),
        elementosUnifilares: proyecto.elementosUnifilares.map(elem => ({
          ...elem,
          foto: elem.foto ? elem.foto.toString('base64') : null,
          fotoBlob: elem.fotoBlob
        })),
        inspeccionesSubestacion: proyecto.inspeccionesSubestacion.map(sub => ({
          ...sub,
          foto: sub.foto ? sub.foto.toString('base64') : null
        })),
        puntosMedicion: proyecto.puntosMedicion.map(pm => ({
          ...pm,
          foto: pm.foto ? pm.foto.toString('base64') : null
        })),
        ccmList: proyecto.ccmList.map(ccm => ({
          ...ccm,
          foto: ccm.foto ? ccm.foto.toString('base64') : null
        })),
        alimentadores: proyecto.alimentadores || []
      }))
    }));

    return res.status(200).json({
      ok: true,
      data: formattedCompanies,
      lastSyncTimestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error en pullData:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
};

// ENDPOINT LOCAL BACKUP: Generar y descargar backup JSON local
export const generarBackupLocal = async (req, res) => {
  try {
    const user = req.user;
    const { tipo = 'completo' } = req.body;

    // WHERE simple: solo filtrar por empresa si es CLIENT
    const where = {};
    if (user.role === 'CLIENT' && user.companyId) {
      where.rif = user.companyId; // Usar rif como identificador de empresa para CLIENT
    }

    // Simplificado: solo traer empresas con proyectos básicos (sin relaciones anidadas profundas)
    // Esto evita el ERROR FUNCTION_INVOCATION_FAILED causado por includes muy profundos
    const empresas = await prisma.empresa.findMany({
      where,
      // MÍNIMO include necesario - solo lo esencial para que funcione
      include: {
        proyectos: {
          select: {
            id: true,
            nombre: true,
            descripcion: true,
            empresaId: true
            // Sin include anidado de tableros, circuitos, etc.
          }
        }
      }
    });

    // Construir datos de backup simplificados pero estructurados
    const data = {
      exportacion: new Date().toISOString(),
      usuarioId: user.id,
      tipo: tipo,
      modo: 'essencial', // Indica que es un backup esencial (rápido y seguro)
      empresas: empresas.map(empresa => ({
        id: empresa.id,
        nombre: empresa.nombre,
        rif: empresa.rif,
        direccion: empresa.direccion,
        creadoAt: empresa.createdAt,
        proyectos: empresa.proyectos || []
      }))
    };

    // Nombre de archivo con timestamp
    const filename = `backup-${user.id}-${tipo}-${Date.now()}.json`;

    // Codificar a base64 de forma segura
    const jsonString = JSON.stringify(data, null, 2);
    const archivoBase64 = Buffer.from(jsonString).toString('base64');

    return res.status(200).json({
      ok: true,
      filename,
      archivo: archivoBase64,
      size: Buffer.byteLength(Buffer.from(jsonString)),
      recordCount: data.empresas.length,
      mensaje: `Backup esencial generado con ${data.empresas.length} empresas`
    });

  } catch (error) {
    console.error('❌ Error en generarBackupLocal (versión simplificada):', error);
    // Intentar error más específico
    return res.status(500).json({ 
      ok: false, 
      error: error.message || 'Error desconocido en backup',
      codigoError: error.code || 'PRISMA_TIMEOUT'
    });
  }
};

contarRegistros = (data) => {
  let count = 0;
  if (data.empresas) {
    data.empresas.forEach(emp => {
      count += emp.proyectos?.reduce((sum, proj) => {
        return sum + (proj.tableros?.length || 0) + 
                 (proj.elementosUnifilares?.length || 0) + 
                 (proj.puntosMedicion?.length || 0) + 
                 (proj.ccmList?.length || 0) + 
                 (proj.alimentadores?.length || 0) + 
                 (proj.ccmList?.length || 0);
      }, 0) || 0;
    });
  }
  return count;
};
