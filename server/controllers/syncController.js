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
