import prisma from '../db.js';

export const obtenerMensajesUsuario = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ ok: false, error: 'El ID de usuario es requerido.' });
    }

    // Control de Acceso (BOLA / IDOR): Solo el propio usuario o un ADMIN pueden consultar los mensajes
    if (req.user.role !== 'ADMIN' && req.user.id !== userId) {
      return res.status(403).json({ 
        ok: false, 
        error: 'Acceso denegado. No tiene autorización para consultar los mensajes de este usuario.' 
      });
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
      },
      orderBy: { createdAt: 'asc' }
    });

    return res.status(200).json({ ok: true, data: messages });
  } catch (error) {
    console.error('Error en obtenerMensajesUsuario:', error);
    next(error);
  }
};

export const guardarMensaje = async (req, res, next) => {
  try {
    const { receiverId, text } = req.body;

    if (!receiverId || !text || !text.trim()) {
      return res.status(400).json({ ok: false, error: 'Campos receiverId y text son obligatorios.' });
    }

    // Identidad asegurada directamente desde el token JWT verificado (inmune a spoofing)
    const senderId = req.user.id;
    const senderUsername = req.user.username || 'Usuario';

    const newMessage = await prisma.message.create({
      data: {
        senderId,
        senderUsername,
        receiverId,
        text: text.trim(),
        read: false
      }
    });

    const io = req.app.get('io');
    const connectedUsers = req.app.get('connectedUsers');

    if (io && connectedUsers) {
      const receiverSocketId = connectedUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('receive_message', newMessage);
        console.log(`✉️ Mensaje relayeado por socket en tiempo real a ${receiverId} (${receiverSocketId})`);
      }
    }

    return res.status(201).json({ ok: true, data: newMessage });
  } catch (error) {
    console.error('Error en guardarMensaje:', error);
    next(error);
  }
};

export const marcarMensajesComoLeidos = async (req, res, next) => {
  try {
    const { senderId, receiverId } = req.body;

    if (!senderId || !receiverId) {
      return res.status(400).json({ ok: false, error: 'Campos senderId y receiverId requeridos.' });
    }

    // Control de Acceso: Solo el receptor legítimo o un ADMIN pueden marcar como leído
    if (req.user.role !== 'ADMIN' && req.user.id !== receiverId) {
      return res.status(403).json({
        ok: false,
        error: 'Acceso denegado. Solo el destinatario puede marcar sus mensajes como leídos.'
      });
    }

    await prisma.message.updateMany({
      where: {
        senderId: senderId,
        receiverId: receiverId,
        read: false
      },
      data: {
        read: true
      }
    });

    const io = req.app.get('io');
    const connectedUsers = req.app.get('connectedUsers');
    if (io && connectedUsers) {
      const senderSocketId = connectedUsers.get(senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit('messages_read', { senderId, receiverId });
      }
    }

    return res.status(200).json({ ok: true, message: 'Mensajes marcados como leídos.' });
  } catch (error) {
    console.error('Error en marcarMensajesComoLeidos:', error);
    next(error);
  }
};
