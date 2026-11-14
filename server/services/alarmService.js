/**
 * Servidor / Servicios - alarmService.js
 * Servicio para evaluación automática, deduplicación y persistencia de alarmas eléctricas.
 */

import prisma from '../db.js';
import { computeBalance } from '../utils/electricalMath.js';

/**
 * Evalúa las condiciones eléctricas de un tablero y retorna la lista de anomalías encontradas.
 * @param {Object} tablero - Objeto tablero con sus circuitos y alimentador
 * @returns {Array<Object>} Lista de alarmas detectadas
 */
export function evaluarAnomaliasTablero(tablero) {
  const anomalias = [];
  if (!tablero) return anomalias;

  const dt = typeof tablero.datosTecnicos === 'object' && tablero.datosTecnicos !== null ? tablero.datosTecnicos : {};
  const barras = dt.barrasPrincipales || {};
  let ia = parseFloat(tablero.corrienteA ?? dt.corrienteA ?? barras.ia ?? 0) || 0;
  let ib = parseFloat(tablero.corrienteB ?? dt.corrienteB ?? barras.ib ?? 0) || 0;
  let ic = parseFloat(tablero.corrienteC ?? dt.corrienteC ?? barras.ic ?? 0) || 0;

  if (ia === 0 && ib === 0 && ic === 0 && Array.isArray(tablero.circuitos)) {
    const fasesCount = tablero.fases === 1 ? 1 : tablero.fases === 2 ? 2 : 3;
    const faseNames = fasesCount === 1 ? ['A'] : fasesCount === 2 ? ['A', 'B'] : ['A', 'B', 'C'];
    const sums = { A: 0, B: 0, C: 0 };
    for (const c of tablero.circuitos) {
      if (c.deletedAt || c.estado === 'ELIMINADO') continue;
      const np = Math.max(1, parseInt(c.numPolos, 10) || 1);
      const pp = Math.max(1, parseInt(c.posicionPolo, 10) || 1);
      const amp = parseFloat(c.amperaje || 0) || 0;
      for (let p = 0; p < np; p++) {
        const polo = pp + p * 2;
        const phaseIdx = Math.floor((polo - 1) / 2) % fasesCount;
        const f = faseNames[phaseIdx] || 'A';
        sums[f] += amp;
      }
    }
    ia = sums.A;
    ib = sums.B;
    ic = sums.C;
  }

  const capacidadPrincipal = parseFloat(
    tablero.capacidadInterruptorPrincipalAmperios ||
    tablero.alimentador?.capacidadAmperios ||
    dt.breakerPrincipal?.amp ||
    dt.amperajePrincipal ||
    0
  ) || 0;

  const balance = computeBalance({
    ...tablero,
    phases: tablero.phases || { ia, ib, ic },
    tension: tablero.tension || dt.tension || dt.voltaje || '208/120V',
    fases: tablero.fases || dt.fases || 3,
    capacidad: {
      capacidadAmperios: capacidadPrincipal,
      amperajeMax: capacidadPrincipal
    }
  });

  const desbalancePct = balance.desbalance?.maxDesbalance ?? balance.desbalancePorcentaje ?? 0;
  const corrientes = balance.corrientesPorFase || balance.corrientes || { A: ia, B: ib, C: ic };
  const cargasKVA = balance.carga || balance.cargasKVA || {};

  // 1. Evaluación de Desbalance de Fases (> 15% WARNING, > 25% CRITICAL)
  if (desbalancePct > 15) {
    const severidad = desbalancePct > 25 ? 'CRITICAL' : 'WARNING';
    anomalias.push({
      tableroId: tablero.id,
      tipo: 'DESBALANCE',
      severidad,
      mensaje: `Desbalance crítico de fases del ${desbalancePct}% en tablero "${tablero.nombre}". Límite normativo recomendado: 15%.`,
      detalles: {
        desbalancePorcentaje: desbalancePct,
        corrientes,
        cargasKVA,
      }
    });
  }

  // 2. Evaluación de Sobrecarga en Interruptor Principal
  if (capacidadPrincipal > 0) {
    const maxCorriente = Math.max(
      corrientes.A || 0,
      corrientes.B || 0,
      corrientes.C || 0
    );
    const porcentajeUso = (maxCorriente / capacidadPrincipal) * 100;

    if (porcentajeUso >= 100) {
      anomalias.push({
        tableroId: tablero.id,
        tipo: 'SOBRECARGA',
        severidad: 'CRITICAL',
        mensaje: `Sobrecarga severa (${porcentajeUso.toFixed(1)}%) en interruptor principal (${capacidadPrincipal}A) del tablero "${tablero.nombre}". Corriente máxima: ${maxCorriente.toFixed(1)}A.`,
        detalles: {
          capacidadPrincipal,
          maxCorriente,
          porcentajeUso: parseFloat(porcentajeUso.toFixed(2)),
          faseMayor: maxCorriente === corrientes.A ? 'A' : (maxCorriente === corrientes.B ? 'B' : 'C')
        }
      });
    } else if (porcentajeUso >= 80) {
      anomalias.push({
        tableroId: tablero.id,
        tipo: 'SOBRECARGA',
        severidad: 'WARNING',
        mensaje: `Carga elevada (${porcentajeUso.toFixed(1)}%) alcanzando umbral de régimen continuo (80%) en tablero "${tablero.nombre}".`,
        detalles: {
          capacidadPrincipal,
          maxCorriente,
          porcentajeUso: parseFloat(porcentajeUso.toFixed(2))
        }
      });
    }
  }

  return anomalias;
}

/**
 * Analiza todos los tableros de un proyecto, persiste nuevas alarmas y deduplica activas.
 * @param {string} proyectoId
 * @returns {Promise<Array>} Alarmas activas consolidadas
 */
export async function sincronizarAlarmasProyecto(proyectoId) {
  const tableros = await prisma.tablero.findMany({
    where: { proyectoId, deletedAt: null },
    include: {
      circuitos: { where: { deletedAt: null } },
      alimentador: true
    }
  });

  const alarmasDetectadas = [];
  for (const tab of tableros) {
    const anoms = evaluarAnomaliasTablero(tab);
    for (const anom of anoms) {
      alarmasDetectadas.push({
        ...anom,
        proyectoId
      });
    }
  }

  // Obtener alarmas existentes no resueltas
  const alarmasExistentes = await prisma.alarma.findMany({
    where: {
      proyectoId,
      estado: { in: ['ACTIVA', 'RECONOCIDA'] }
    }
  });

  // Guardar solo si no existe ya una alarma del mismo tipo para ese tablero
  for (const anom of alarmasDetectadas) {
    const existe = alarmasExistentes.find(
      a => a.tableroId === anom.tableroId && a.tipo === anom.tipo
    );

    if (!existe) {
      await prisma.alarma.create({
        data: {
          proyectoId: anom.proyectoId,
          tableroId: anom.tableroId,
          tipo: anom.tipo,
          severidad: anom.severidad,
          mensaje: anom.mensaje,
          detalles: anom.detalles,
          estado: 'ACTIVA'
        }
      });
    } else {
      // Actualizar mensaje/severidad/detalles si cambió
      await prisma.alarma.update({
        where: { id: existe.id },
        data: {
          severidad: anom.severidad,
          mensaje: anom.mensaje,
          detalles: anom.detalles
        }
      });
    }
  }

  return prisma.alarma.findMany({
    where: { proyectoId },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Obtiene las alarmas de un proyecto (activas o todas).
 */
export async function listarAlarmasProyecto(proyectoId, soloActivas = false) {
  const where = { proyectoId };
  if (soloActivas) {
    where.estado = { in: ['ACTIVA', 'RECONOCIDA'] };
  }
  return prisma.alarma.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Cambia el estado de una alarma (RECONOCIDA, RESUELTA).
 */
export async function actualizarEstadoAlarma(alarmaId, nuevoEstado) {
  return prisma.alarma.update({
    where: { id: alarmaId },
    data: {
      estado: nuevoEstado,
      leidaAt: nuevoEstado !== 'ACTIVA' ? new Date() : null
    }
  });
}
