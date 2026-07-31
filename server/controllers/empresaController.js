import prisma from '../db.js';

export const obtenerEmpresas = async (req, res, next) => {
  try {
    const empresas = await prisma.empresa.findMany({
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
