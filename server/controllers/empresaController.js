import prisma from '../db.js';

export const obtenerEmpresas = async (req, res, next) => {
  try {
    const where = {};
    // Aislamiento Multitenant: Si es CLIENT, restringir exclusivamente a su empresa
    if (req.user.role === 'CLIENT') {
      if (!req.user.companyId) {
        return res.status(200).json({ ok: true, data: [] });
      }
      where.id = req.user.companyId;
    }

    const empresas = await prisma.empresa.findMany({
      where,
      orderBy: { nombre: 'asc' }
    });

    // Sanitizar datos sensibles para no-ADMINs
    const sanitizadas = empresas.map(empresa => {
      if (req.user.role !== 'ADMIN') {
        const {
          gerente1Nombre, gerente1Telefono, gerente1Email,
          gerente2Nombre, gerente2Telefono, gerente2Email,
          ...resto
        } = empresa;
        return resto;
      }
      return empresa;
    });

    return res.status(200).json({ ok: true, data: sanitizadas });
  } catch (error) {
    console.error('Error en obtenerEmpresas:', error);
    next(error);
  }
};

export const obtenerEmpresaPorId = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Aislamiento Multitenant: Bloquear acceso a empresas ajenas
    if (req.user.role === 'CLIENT' && req.user.companyId !== id) {
      return res.status(403).json({ 
        ok: false, 
        error: 'Acceso denegado. No tiene permisos para consultar datos de esta empresa.' 
      });
    }

    const empresa = await prisma.empresa.findUnique({
      where: { id },
      include: {
        proyectos: {
          orderBy: { createdAt: 'desc' }
        },
        elementosUnifilares: true
      }
    });

    if (!empresa) {
      return res.status(404).json({ ok: false, error: 'Empresa no encontrada.' });
    }

    if (req.user.role !== 'ADMIN') {
      const {
        gerente1Nombre, gerente1Telefono, gerente1Email,
        gerente2Nombre, gerente2Telefono, gerente2Email,
        ...resto
      } = empresa;
      return res.status(200).json({ ok: true, data: resto });
    }

    return res.status(200).json({ ok: true, data: empresa });
  } catch (error) {
    console.error('Error en obtenerEmpresaPorId:', error);
    next(error);
  }
};

export const actualizarEmpresa = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      nombre, rif, direccionFiscal, direccion,
      gerente1Nombre, gerente1Telefono, gerente1Email,
      gerente2Nombre, gerente2Telefono, gerente2Email
    } = req.body;

    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ ok: false, error: 'Acción permitida únicamente para administradores.' });
    }

    const updated = await prisma.empresa.update({
      where: { id },
      data: {
        nombre,
        rif,
        direccionFiscal,
        direccion: direccion || null,
        gerente1Nombre: gerente1Nombre || null,
        gerente1Telefono: gerente1Telefono || null,
        gerente1Email: gerente1Email || null,
        gerente2Nombre: gerente2Nombre || null,
        gerente2Telefono: gerente2Telefono || null,
        gerente2Email: gerente2Email || null
      }
    });

    return res.status(200).json({ ok: true, data: updated });
  } catch (error) {
    console.error('Error en actualizarEmpresa:', error);
    next(error);
  }
};

export const crearEmpresa = async (req, res, next) => {
  try {
    const {
      id, nombre, rif, direccionFiscal, direccion,
      gerente1Nombre, gerente1Telefono, gerente1Email,
      gerente2Nombre, gerente2Telefono, gerente2Email
    } = req.body;

    if (!nombre || !rif || !direccionFiscal) {
      return res.status(400).json({ ok: false, error: 'Los campos nombre, rif y direccionFiscal son obligatorios.' });
    }

    const nuevaEmpresa = await prisma.empresa.create({
      data: {
        id: id || undefined,
        nombre,
        rif,
        direccionFiscal,
        direccion: direccion || direccionFiscal,
        gerente1Nombre: gerente1Nombre || null,
        gerente1Telefono: gerente1Telefono || null,
        gerente1Email: gerente1Email || null,
        gerente2Nombre: gerente2Nombre || null,
        gerente2Telefono: gerente2Telefono || null,
        gerente2Email: gerente2Email || null
      }
    });

    return res.status(201).json({ ok: true, data: nuevaEmpresa });
  } catch (error) {
    console.error('Error en crearEmpresa:', error);
    next(error);
  }
};

export const eliminarEmpresa = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ ok: false, error: 'Acción permitida únicamente para administradores.' });
    }

    const empresa = await prisma.empresa.findUnique({
      where: { id }
    });

    if (!empresa) {
      return res.status(404).json({ ok: false, error: 'Empresa no encontrada.' });
    }

    // Transacción de eliminación en cascada segura de todas las dependencias
    await prisma.$transaction(async (tx) => {
      // 1. Obtener los IDs de proyectos pertenecientes a la empresa
      const proyectos = await tx.proyecto.findMany({
        where: { empresaId: id },
        select: { id: true }
      });
      const proyectoIds = proyectos.map(p => p.id);

      // 2. Tableros pertenecientes a la empresa o sus proyectos
      const tableros = await tx.tablero.findMany({
        where: {
          OR: [
            { empresaId: id },
            { proyectoId: { in: proyectoIds } }
          ]
        },
        select: { id: true }
      });
      const tableroIds = tableros.map(t => t.id);

      // 3. Eliminar circuitos de los tableros
      if (tableroIds.length > 0) {
        await tx.circuito.deleteMany({
          where: { tableroId: { in: tableroIds } }
        });
      }

      // 4. Eliminar alarmas asociadas
      await tx.alarma.deleteMany({
        where: {
          OR: [
            { proyectoId: { in: proyectoIds } },
            { tableroId: { in: tableroIds } }
          ]
        }
      });

      // 5. Eliminar tableros
      if (tableroIds.length > 0) {
        await tx.tablero.deleteMany({
          where: { id: { in: tableroIds } }
        });
      }

      // 6. Eliminar alimentadores
      if (proyectoIds.length > 0) {
        await tx.alimentador.deleteMany({
          where: { proyectoId: { in: proyectoIds } }
        });
      }

      // 7. Eliminar elementos unifilares
      await tx.elementoUnifilar.deleteMany({
        where: {
          OR: [
            { empresaId: id },
            { proyectoId: { in: proyectoIds } }
          ]
        }
      });

      // 8. Eliminar inspecciones
      await tx.subestacion.deleteMany({
        where: {
          OR: [
            { empresaId: id },
            { proyectoId: { in: proyectoIds } }
          ]
        }
      });

      await tx.puntoMedicion.deleteMany({
        where: {
          OR: [
            { empresaId: id },
            { proyectoId: { in: proyectoIds } }
          ]
        }
      });

      await tx.ccm.deleteMany({
        where: {
          OR: [
            { empresaId: id },
            { proyectoId: { in: proyectoIds } }
          ]
        }
      });

      await tx.inspeccionTermografica.deleteMany({
        where: {
          OR: [
            { empresaId: id },
            { proyectoId: { in: proyectoIds } }
          ]
        }
      });

      await tx.inspeccionAterramiento.deleteMany({
        where: {
          OR: [
            { empresaId: id },
            { proyectoId: { in: proyectoIds } }
          ]
        }
      });

      await tx.inspeccionTanqueCombustible.deleteMany({
        where: {
          OR: [
            { empresaId: id },
            { proyectoId: { in: proyectoIds } }
          ]
        }
      });

      // 9. Eliminar proyectos
      if (proyectoIds.length > 0) {
        await tx.proyecto.deleteMany({
          where: { id: { in: proyectoIds } }
        });
      }

      // 10. Desvincular usuarios asociados a esta empresa
      await tx.user.updateMany({
        where: { companyId: id },
        data: { companyId: null }
      });

      // 11. Eliminar la empresa
      await tx.empresa.delete({
        where: { id }
      });
    });

    return res.status(200).json({ 
      ok: true, 
      message: 'Empresa y todos sus datos dependientes eliminados correctamente en cascada.' 
    });
  } catch (error) {
    console.error('Error en eliminarEmpresa:', error);
    next(error);
  }
};

