/**
 * Servidor / Controladores - alarmController.js
 * Endpoints REST para gestión de alarmas eléctricas.
 */

import prisma from '../db.js';
import {
  sincronizarAlarmasProyecto,
  listarAlarmasProyecto,
  actualizarEstadoAlarma
} from '../services/alarmService.js';

export async function getAlarmasProyecto(req, res) {
  const { proyectoId } = req.params;
  const { soloActivas } = req.query;

  try {
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId }
    });

    if (!proyecto) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    if (req.user?.role === 'CLIENT' && req.user.companyId !== proyecto.empresaId) {
      return res.status(403).json({ error: 'Acceso no autorizado al proyecto solicitado' });
    }

    // Evalúa y actualiza las alarmas en base al estado actual de tableros
    await sincronizarAlarmasProyecto(proyectoId);

    const alarmas = await listarAlarmasProyecto(proyectoId, soloActivas === 'true');
    res.json(alarmas);
  } catch (error) {
    console.error('Error al obtener alarmas del proyecto:', error);
    res.status(500).json({ error: 'Error interno al consultar alarmas eléctricas' });
  }
}

export async function cambiarEstadoAlarma(req, res) {
  const { id } = req.params;
  const { estado } = req.body;

  if (!['ACTIVA', 'RECONOCIDA', 'RESUELTA'].includes(estado)) {
    return res.status(400).json({ error: 'Estado de alarma no válido' });
  }

  try {
    const alarma = await prisma.alarma.findUnique({
      where: { id },
      include: { proyecto: true }
    });

    if (!alarma) {
      return res.status(404).json({ error: 'Alarma no encontrada' });
    }

    if (req.user?.role === 'CLIENT' && req.user.companyId !== alarma.proyecto.empresaId) {
      return res.status(403).json({ error: 'Acceso no autorizado' });
    }

    const actualizada = await actualizarEstadoAlarma(id, estado);
    res.json(actualizada);
  } catch (error) {
    console.error('Error al actualizar estado de alarma:', error);
    res.status(500).json({ error: 'Error interno al actualizar alarma' });
  }
}
