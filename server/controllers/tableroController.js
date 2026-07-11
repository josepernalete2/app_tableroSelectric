import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Helper recursivo para construir la estructura de creación anidada para Prisma.
 * Esto permite crear tableros, sub-tableros y sus respectivos circuitos de forma recursiva.
 */
function construirDatosCreacionTablero(data) {
  const datos = {
    nombre: data.nombre,
    codigo: data.codigo,
    placaMarca: data.placaMarca || null,
    placaModelo: data.placaModelo || null,
    tensionNominal: parseFloat(data.tensionNominal),
    corrienteNominal: parseFloat(data.corrienteNominal),
    fases: parseInt(data.fases, 10),
    hilos: parseInt(data.hilos, 10),
  };

  if (data.circuitos && Array.isArray(data.circuitos)) {
    datos.circuitos = {
      create: data.circuitos.map((circuito) => {
        const circuitoData = {
          numeroPolo: parseInt(circuito.numeroPolo, 10),
          descripcion: circuito.descripcion || null,
          tipoDestino: circuito.tipoDestino,
        };

        if (circuito.tipoDestino === 'ARTEFACTO' && circuito.artefacto) {
          circuitoData.artefacto = {
            create: {
              nombre: circuito.artefacto.nombre,
              descripcion: circuito.artefacto.descripcion || null,
              potenciaWatts: circuito.artefacto.potenciaWatts ? parseFloat(circuito.artefacto.potenciaWatts) : null,
              tipoElemento: { connect: { id: circuito.artefacto.tipoElementoId } },
              breaker: { connect: { id: circuito.artefacto.breakerId } },
              conductor: { connect: { id: circuito.artefacto.conductorId } },
            },
          };
        } else if (circuito.tipoDestino === 'SUB_TABLERO' && circuito.subTablero) {
          // Llamada recursiva para soportar sub-tableros anidados con sus propios circuitos
          circuitoData.subTablero = {
            create: construirDatosCreacionTablero(circuito.subTablero),
          };
        }

        return circuitoData;
      }),
    };
  }

  return datos;
}

/**
 * POST /api/tableros
 * Crea un tablero principal con todos sus circuitos, artefactos y sub-tableros de forma transaccional.
 */
export const crearTableroCompleto = async (req, res) => {
  try {
    const { body } = req;

    // Validaciones de campos requeridos de nivel superior
    if (!body.nombre || !body.codigo || body.tensionNominal === undefined || body.corrienteNominal === undefined) {
      return res.status(400).json({
        ok: false,
        error: 'Los campos nombre, codigo, tensionNominal y corrienteNominal son obligatorios a nivel de Tablero.',
      });
    }

    const datosCreacion = construirDatosCreacionTablero(body);

    // Prisma ejecuta la creación anidada dentro de una transacción implícita de base de datos
    const nuevoTablero = await prisma.tablero.create({
      data: datosCreacion,
      include: {
        circuitos: {
          include: {
            artefacto: {
              include: {
                tipoElemento: true,
                breaker: true,
                conductor: true,
              },
            },
            subTablero: {
              include: {
                circuitos: true
              }
            }
          },
        },
      },
    });

    return res.status(201).json({
      ok: true,
      message: 'Tablero y todos sus componentes creados con éxito de forma transaccional.',
      data: nuevoTablero,
    });
  } catch (error) {
    console.error('Error en crearTableroCompleto:', error);
    return res.status(500).json({
      ok: false,
      error: 'Error interno al procesar la creación del tablero.',
      details: error.message,
    });
  }
};

/**
 * GET /api/tableros
 * Obtiene todos los tableros con sus circuitos y relaciones.
 */
export const obtenerTableros = async (req, res) => {
  try {
    const tableros = await prisma.tablero.findMany({
      include: {
        circuitos: {
          include: {
            artefacto: {
              include: {
                tipoElemento: true,
                breaker: true,
                conductor: true,
              },
            },
            subTablero: true,
          },
        },
      },
    });

    return res.json({
      ok: true,
      data: tableros,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: 'Error al obtener los tableros.',
      details: error.message,
    });
  }
};
