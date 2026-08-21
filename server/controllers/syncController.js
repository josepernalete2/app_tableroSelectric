import prisma from '../db.js';

export const procesarSincronizacionBatch = async (req, res, next) => {
  try {
    const { mutations } = req.body;

    if (!Array.isArray(mutations) || mutations.length === 0) {
      return res.status(400).json({ ok: false, error: 'El cuerpo de la solicitud debe contener un arreglo de mutaciones (mutations).' });
    }

    const applied = [];
    const conflicts = [];

    // Procesar las mutaciones de forma transaccional usando prisma.$transaction
    await prisma.$transaction(async (tx) => {
      for (const item of mutations) {
        const { entity, id, operation, baseVersion, data } = item;

        if (!entity || !id || !operation) {
          conflicts.push({ id, entity, error: 'Mutación incompleta' });
          continue;
        }

        const modelName = entity.charAt(0).toLowerCase() + entity.slice(1);
        const delegate = tx[modelName];

        if (!delegate) {
          conflicts.push({ id, entity, error: `Entidad desconocida: ${entity}` });
          continue;
        }

        try {
          // Buscar si el registro ya existe en el servidor
          const existingRecord = await delegate.findUnique({ where: { id } });

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
                clientData: data
              });
              continue;
            }

            // Aplicar actualización incrementando versión
            const updatePayload = { ...data };
            delete updatePayload.id;
            delete updatePayload.createdAt;

            if ('version' in existingRecord) {
              updatePayload.version = currentVersion + 1;
            }

            const updatedRecord = await delegate.update({
              where: { id },
              data: updatePayload
            });

            applied.push({ id, entity, operation: 'UPDATE', version: updatedRecord.version || 1, record: updatedRecord });
          } else {
            // Crear registro nuevo
            const createPayload = { ...data, id };
            if ('version' in delegate) {
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
