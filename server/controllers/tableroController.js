import prisma from '../db.js';

/**
 * POST /api/empresas/:empresaId/tableros
 * Crea un tablero técnico asociado a una empresa junto con todos sus circuitos de forma anidada transaccional.
 */
export const crearTableroCompleto = async (req, res) => {
  try {
    const { empresaId } = req.params;
    const {
      id,
      nombre,
      ubicacion,
      alimentadoPor,
      tipo,
      ia,
      ib,
      ic,
      va,
      vb,
      vc,
      acometida,
      neutroCalibre,
      neutroObservaciones,
      tierraCalibre,
      tierraObservaciones,
      observacionesGenerales,
      foto,
      circuitos = []
    } = req.body;

    // Validación de campos requeridos
    if (!nombre) {
      return res.status(400).json({
        ok: false,
        error: 'El nombre o código del tablero es obligatorio.'
      });
    }

    if (!ubicacion || !alimentadoPor || !tipo) {
      return res.status(400).json({
        ok: false,
        error: 'Los campos ubicación, alimentadoPor y tipo son requeridos para la creación.'
      });
    }

    // Inserción anidada (Nested Write) en Prisma: Todo ocurre dentro de una transacción.
    const nuevoTablero = await prisma.tablero.create({
      data: {
        id: id || undefined,
        nombre,
        ubicacion,
        alimentadoPor,
        tipo,
        foto,
        ia,
        ib,
        ic,
        va,
        vb,
        vc,
        acometida,
        neutroCalibre,
        neutroObservaciones,
        tierraCalibre,
        tierraObservaciones,
        observacionesGenerales,
        empresa: {
          connect: { id: empresaId }
        },
        circuitos: {
          create: circuitos.map((circ) => ({
            numeroPolo: parseInt(circ.numeroPolo, 10),
            equipo: circ.equipo || null,
            breakerMarca: circ.breakerMarca || null,
            breakerTipo: circ.breakerTipo || null,
            breakerAmperaje: circ.breakerAmperaje ? String(circ.breakerAmperaje) : null,
            conductorCalibre: circ.conductorCalibre || null
          }))
        }
      },
      include: {
        circuitos: true
      }
    });

    return res.status(201).json({
      ok: true,
      message: 'Tablero y todos sus circuitos registrados con éxito.',
      data: nuevoTablero
    });

  } catch (error) {
    console.error('Error en crearTableroCompleto:', error);

    // Capturar violación de restricción única en Prisma (P2002)
    // Específicamente cuando se intenta duplicar [empresaId, nombre]
    if (error.code === 'P2002') {
      const targetFields = error.meta?.target || [];
      if (targetFields.includes('empresaId') && targetFields.includes('nombre')) {
        return res.status(400).json({
          ok: false,
          error: 'El nombre/código del tablero ya está registrado para esta empresa. Elija un nombre diferente.'
        });
      }
      return res.status(400).json({
        ok: false,
        error: 'Error de restricción única: Uno de los campos ingresados ya existe en la base de datos.'
      });
    }

    return res.status(500).json({
      ok: false,
      error: 'Error interno del servidor al registrar el tablero.',
      details: error.message
    });
  }
};

/**
 * GET /api/empresas/:empresaId/tableros
 * Lista todos los tableros que pertenecen a una empresa específica con sus circuitos correspondientes.
 */
export const obtenerTablerosPorEmpresa = async (req, res) => {
  try {
    const { empresaId } = req.params;

    // Verificar si la empresa existe
    const empresaExiste = await prisma.empresa.findUnique({
      where: { id: empresaId }
    });

    if (!empresaExiste) {
      return res.status(404).json({
        ok: false,
        error: 'La empresa especificada no existe.'
      });
    }

    // Obtener tableros
    const tableros = await prisma.tablero.findMany({
      where: {
        empresaId
      },
      include: {
        circuitos: {
          orderBy: {
            numeroPolo: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.status(200).json({
      ok: true,
      data: tableros
    });

  } catch (error) {
    console.error('Error en obtenerTablerosPorEmpresa:', error);
    return res.status(500).json({
      ok: false,
      error: 'Error al obtener la lista de tableros de la empresa.',
      details: error.message
    });
  }
};
