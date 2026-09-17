import prisma from '../db.js';
import { computeBalance } from '../utils/electricalMath.js';

/**
 * Servicio de Auditoría y Salud de Red Eléctrica (Capa 5 - Reportes de Gestión)
 */

/**
 * 1. Detecta elementos huérfanos (sin origen de alimentación ni padre jerárquico asignado).
 * Se excluyen acometidas principales / puntos de suministro que por definición son raíz.
 */
export async function detectarHuerfanos(proyectoId) {
  const elementos = await prisma.elementoUnifilar.findMany({
    where: {
      proyectoId,
      deletedAt: null
    },
    include: {
      alimentadoPorElemento: true
    }
  });

  const huerfanos = elementos.filter((e) => {
    // Si es punto de suministro inicial o subestación raíz, no se considera huérfano
    if (e.tipoElemento === 'PUNTO_SUMINISTRO' || e.tipoElemento === 'SUBESTACION') {
      return false;
    }
    const noTieneIdPadre = !e.alimentadoPorId;
    const noTieneTextoOrigen = !e.alimentadoPor || e.alimentadoPor.trim() === '';
    return noTieneIdPadre && noTieneTextoOrigen;
  });

  return huerfanos.map((e) => ({
    id: e.id,
    nombre: e.nombre,
    tipoElemento: e.tipoElemento,
    ubicacion: e.ubicacion || 'No especificada',
    estadoVinculo: e.estadoVinculo,
    motivo: 'Elemento sin alimentador ni vínculo jerárquico asignado.'
  }));
}

/**
 * 2. Detecta elementos sin carga eléctrica declarada (amperaje = 0, kVA = 0 o sin breaker).
 */
export async function detectarSinCarga(proyectoId) {
  const elementos = await prisma.elementoUnifilar.findMany({
    where: {
      proyectoId,
      deletedAt: null
    }
  });

  const sinCarga = [];

  for (const e of elementos) {
    const dt = e.datosTecnicos || {};
    const amp = Number(e.breakerAmperaje || dt.amperaje || dt.amperajeNominal || dt.amperios || 0);
    const kva = Number(dt.kva || dt.potenciaKva || dt.potenciaEstimada || 0);
    const kw = Number(dt.kw || dt.potenciaKw || dt.potenciaWatts || 0);

    // Si es un tablero, revisar si tiene circuitos con amperaje
    if (e.tipoElemento === 'TABLERO') {
      const tablero = await prisma.tablero.findFirst({
        where: { id: e.id },
        include: { circuitos: { where: { deletedAt: null } } }
      });
      const circuitos = tablero?.circuitos || [];
      const totalAmps = circuitos.reduce((sum, c) => sum + (Number(c.amperaje) || 0), 0);
      if (circuitos.length === 0 || totalAmps === 0) {
        sinCarga.push({
          id: e.id,
          nombre: e.nombre,
          tipoElemento: e.tipoElemento,
          ubicacion: e.ubicacion,
          motivo: circuitos.length === 0 ? 'Tablero sin circuitos registrados.' : 'Tablero con 0 A de carga conectada.'
        });
      }
    } else if (amp === 0 && kva === 0 && kw === 0) {
      sinCarga.push({
        id: e.id,
        nombre: e.nombre,
        tipoElemento: e.tipoElemento,
        ubicacion: e.ubicacion,
        motivo: 'Sin capacidad nominal ni amperaje asignado.'
      });
    }
  }

  return sinCarga;
}

/**
 * 3. Detecta elementos no aprobados o provisionales (estadoVinculo === 'PENDIENTE_CREAR').
 */
export async function detectarSinAprobar(proyectoId) {
  const pendientes = await prisma.elementoUnifilar.findMany({
    where: {
      proyectoId,
      estadoVinculo: 'PENDIENTE_CREAR',
      deletedAt: null
    }
  });

  return pendientes.map((e) => ({
    id: e.id,
    nombre: e.nombre,
    tipoElemento: e.tipoElemento,
    ubicacion: e.ubicacion,
    estadoVinculo: e.estadoVinculo,
    motivo: 'Registro provisional pendiente de aprobación técnica.'
  }));
}

/**
 * 4. Calcula estadísticas de creación y distribución de estados.
 */
export async function detectarCreadosVsPendientes(proyectoId) {
  const [total, activos, pendientes, reservas] = await Promise.all([
    prisma.elementoUnifilar.count({ where: { proyectoId, deletedAt: null } }),
    prisma.elementoUnifilar.count({ where: { proyectoId, estadoVinculo: 'ACTIVO', deletedAt: null } }),
    prisma.elementoUnifilar.count({ where: { proyectoId, estadoVinculo: 'PENDIENTE_CREAR', deletedAt: null } }),
    prisma.elementoUnifilar.count({ where: { proyectoId, estadoVinculo: 'RESERVA', deletedAt: null } })
  ]);

  return {
    totalElementos: total,
    activos,
    pendientesAprobacion: pendientes,
    reservas,
    porcentajeAprobados: total > 0 ? Math.round((activos / total) * 10000) / 100 : 100
  };
}

/**
 * 5. Calcula métricas de los últimos 30 días.
 */
export async function calcularMetricas30Dias(proyectoId) {
  const hace30Dias = new Date();
  hace30Dias.setDate(hace30Dias.getDate() - 30);

  const [creadosRecientes, actualizadosRecientes, tablerosTotal, subestacionesTotal] = await Promise.all([
    prisma.elementoUnifilar.count({
      where: {
        proyectoId,
        createdAt: { gte: hace30Dias },
        deletedAt: null
      }
    }),
    prisma.elementoUnifilar.count({
      where: {
        proyectoId,
        updatedAt: { gte: hace30Dias },
        deletedAt: null
      }
    }),
    prisma.tablero.count({ where: { proyectoId, deletedAt: null } }),
    prisma.subestacion.count({ where: { proyectoId, deletedAt: null } })
  ]);

  return {
    periodo: '30 días',
    creadosUltimos30Dias: creadosRecientes,
    actualizadosUltimos30Dias: actualizadosRecientes,
    tablerosRegistrados: tablerosTotal,
    subestacionesRegistradas: subestacionesTotal
  };
}

/**
 * 6. Calcula el índice de salud integral de la red eléctrica (0 a 100 pts).
 */
export async function calcularSaludRed(proyectoId) {
  const [huerfanos, sinCarga, sinAprobar, tableros] = await Promise.all([
    detectarHuerfanos(proyectoId),
    detectarSinCarga(proyectoId),
    detectarSinAprobar(proyectoId),
    prisma.tablero.findMany({
      where: { proyectoId, deletedAt: null },
      include: {
        circuitos: { where: { deletedAt: null } },
        alimentador: true
      }
    })
  ]);

  let penalizaciones = 0;
  const hallazgos = [];

  // Penalización por huérfanos (-10 pts c/u)
  if (huerfanos.length > 0) {
    penalizaciones += huerfanos.length * 10;
    hallazgos.push({
      severidad: 'ALTA',
      mensaje: `${huerfanos.length} elemento(s) huérfano(s) sin conexión eléctrica trazable.`
    });
  }

  // Penalización por elementos sin carga (-5 pts c/u)
  if (sinCarga.length > 0) {
    penalizaciones += sinCarga.length * 5;
    hallazgos.push({
      severidad: 'MEDIA',
      mensaje: `${sinCarga.length} elemento(s) con parámetros de carga en cero o incompletos.`
    });
  }

  // Penalización por elementos pendientes (-5 pts c/u)
  if (sinAprobar.length > 0) {
    penalizaciones += sinAprobar.length * 5;
    hallazgos.push({
      severidad: 'BAJA',
      mensaje: `${sinAprobar.length} elemento(s) provisional(es) sin consolidar.`
    });
  }

  // Análisis de desbalance y sobrecargas en tableros
  let tablerosDesbalanceados = 0;
  let tablerosSobrecargados = 0;

  for (const t of tableros) {
    const faseAmps = { A: 0, B: 0, C: 0 };
    for (const c of t.circuitos) {
      const amp = Number(c.amperaje) || 0;
      const polo = c.posicionPolo || 1;
      const faseIdx = Math.floor((polo - 1) / 2) % 3;
      const fase = ['A', 'B', 'C'][faseIdx];
      faseAmps[fase] += amp;
    }

    const capAmp = Number(t.alimentador?.capacidadAmperios) || 0;
    const balance = computeBalance({
      phases: { ia: faseAmps.A, ib: faseAmps.B, ic: faseAmps.C },
      tension: t.tension,
      capacidad: { amperajeMax: capAmp }
    });

    if (balance.desbalance.maxDesbalance > 10) {
      tablerosDesbalanceados++;
      penalizaciones += 15;
    } else if (balance.desbalance.maxDesbalance > 5) {
      tablerosDesbalanceados++;
      penalizaciones += 5;
    }

    if (balance.sobrecarga.sobrecargado) {
      tablerosSobrecargados++;
      penalizaciones += 20;
    }
  }

  if (tablerosDesbalanceados > 0) {
    hallazgos.push({
      severidad: 'ALTA',
      mensaje: `${tablerosDesbalanceados} tablero(s) presentan desbalance de fases superior al 5%.`
    });
  }

  if (tablerosSobrecargados > 0) {
    hallazgos.push({
      severidad: 'CRÍTICA',
      mensaje: `${tablerosSobrecargados} tablero(s) exceden la capacidad nominal de su alimentador.`
    });
  }

  const saludScore = Math.max(0, 100 - penalizaciones);
  let calificacion = 'EXCELENTE';
  if (saludScore < 50) calificacion = 'CRÍTICA';
  else if (saludScore < 70) calificacion = 'DEFICIENTE';
  else if (saludScore < 85) calificacion = 'ACEPTABLE';

  return {
    score: saludScore,
    calificacion,
    totalHallazgos: hallazgos.length,
    hallazgos,
    tablerosEvaluados: tableros.length,
    tablerosDesbalanceados,
    tablerosSobrecargados
  };
}

/**
 * 7. Ejecuta reporte de auditoría consolidado completo.
 */
export async function ejecutarAuditoriaCompleta(proyectoId) {
  const [huerfanos, sinCarga, sinAprobar, estadisticas, metricas30Dias, salud] = await Promise.all([
    detectarHuerfanos(proyectoId),
    detectarSinCarga(proyectoId),
    detectarSinAprobar(proyectoId),
    detectarCreadosVsPendientes(proyectoId),
    calcularMetricas30Dias(proyectoId),
    calcularSaludRed(proyectoId)
  ]);

  return {
    proyectoId,
    fechaAuditoria: new Date().toISOString(),
    salud,
    estadisticas,
    metricas30Dias,
    huerfanos: {
      total: huerfanos.length,
      items: huerfanos
    },
    sinCarga: {
      total: sinCarga.length,
      items: sinCarga
    },
    sinAprobar: {
      total: sinAprobar.length,
      items: sinAprobar
    }
  };
}
