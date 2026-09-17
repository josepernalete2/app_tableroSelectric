/**
 * Servidor / Servicios - alarmService.js
 * Servicio para evaluación automática, deduplicación y persistencia de alarmas eléctricas.
 */

import prisma from '../config/prisma.js';
import { computeBalance } from '../utils/electricalMath.js';

/**
 * Evalúa las condiciones eléctricas de un tablero y retorna la lista de anomalías encontradas.
 * @param {Object} tablero - Objeto tablero con sus circuitos y alimentador
 * @returns {Array<Object>} Lista de alarmas detectadas
 */
export function evaluarAnomaliasTablero(tablero) {
  const anomalias = [];
  if (!tablero) return anomalias;

  const balance = computeBalance(tablero);

  // 1. Evaluación de Desbalance de Fases (> 15% WARNING, > 25% CRITICAL)
  if (balance.desbalancePorcentaje > 15) {
    const severidad = balance.desbalancePorcentaje > 25 ? 'CRITICAL' : 'WARNING';
    anomalias.push({
      tableroId: tablero.id,
      tipo: 'DESBALANCE',
      severidad,
      mensaje: `Desbalance crítico de fases del ${balance.desbalancePorcentaje}% en tablero "${tablero.nombre}". Límite normativo recomendado: 15%.`,
      detalles: {
        desbalancePorcentaje: balance.desbalancePorcentaje,
        corrientes: balance.corrientes,
        cargasKVA: balance.cargasKVA,
      }
    });
  }

  // 2. Evaluación de Sobrecarga en Interruptor Principal
  const capacidadPrincipal = parseFloat(tablero.capacidadInterruptorPrincipalAmperios || 0);
  if (capacidadPrincipal > 0) {
    const maxCorriente = Math.max(
      balance.corrientes.A || 0,
      balance.corrientes.B || 0,
      balance.corrientes.C || 0
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
          faseMayor: maxCorriente === balance.corrientes.A ? 'A' : (maxCorriente === balance.corrientes.B ? 'B' : 'C')
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
