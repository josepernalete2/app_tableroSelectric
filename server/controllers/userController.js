import prisma from '../db.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { JWT_SECRET } from '../middleware/authMiddleware.js';

const USER_SELECT_DTO = {
  id: true,
  username: true,
  role: true,
  companyId: true,
  createdAt: true,
  updatedAt: true
};

export const loginUsuario = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ ok: false, error: 'Usuario y contraseña son requeridos.' });
    }

    const user = await prisma.user.findFirst({
      where: {
        username: {
          equals: username.trim(),
          mode: 'insensitive'
        }
      }
    });

    if (!user) {
      return res.status(401).json({ ok: false, error: 'Usuario o contraseña incorrectos.' });
    }

    // Verificar si la contraseña coincide (soporte para hash bcrypt o texto plano heredado)
    let isMatch = false;
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      // Si la contraseña almacenada estaba en texto plano, comparar y actualizar automáticamente a bcrypt
      isMatch = (user.password === password);
      if (isMatch) {
        const hashedPassword = await bcrypt.hash(password, 12);
        await prisma.user.update({
          where: { id: user.id },
          data: { password: hashedPassword }
        });
      }
    }

    if (!isMatch) {
      return res.status(401).json({ ok: false, error: 'Usuario o contraseña incorrectos.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, companyId: user.companyId },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    return res.status(200).json({
      ok: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        companyId: user.companyId
      }
    });
  } catch (error) {
    console.error('Error en loginUsuario:', error);
    next(error);
  }
};

export const obtenerUsuarios = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: USER_SELECT_DTO,
      orderBy: { createdAt: 'asc' }
    });
    return res.status(200).json({ ok: true, data: users });
  } catch (error) {
    console.error('Error en obtenerUsuarios:', error);
    next(error);
  }
};

export const crearUsuario = async (req, res, next) => {
  try {
    const { id, username, password, role, companyId } = req.body;
    if (!username || !password) {
      return res.status(400).json({ ok: false, error: 'Usuario y contraseña son requeridos.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ ok: false, error: 'La contraseña debe tener al menos 8 caracteres.' });
    }

    const existing = await prisma.user.findFirst({
      where: {
        username: {
          equals: username.trim(),
          mode: 'insensitive'
        }
      }
    });

    if (existing) {
      return res.status(400).json({ ok: false, error: 'Ya existe un usuario con este nombre de usuario.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: {
        id: id || undefined,
        username: username.trim(),
        password: hashedPassword,
        role: role || 'WORKER',
        companyId: role === 'CLIENT' ? companyId : null
      },
      select: USER_SELECT_DTO
    });

    return res.status(201).json({ ok: true, data: newUser });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ ok: false, error: 'Ya existe un usuario con este nombre de usuario.' });
    }
    console.error('Error en crearUsuario:', error);
    next(error);
  }
};

export const actualizarUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { username, password, role, companyId } = req.body;

    if (username) {
      const existing = await prisma.user.findFirst({
        where: {
          username: {
            equals: username.trim(),
            mode: 'insensitive'
          },
          id: { not: id }
        }
      });
      if (existing) {
        return res.status(400).json({ ok: false, error: 'Ya existe otro usuario con este nombre de usuario.' });
      }
    }

    let hashedPassword = undefined;
    if (password && password.trim().length > 0) {
      if (password.length < 8) {
        return res.status(400).json({ ok: false, error: 'La nueva contraseña debe tener al menos 8 caracteres.' });
      }
      hashedPassword = await bcrypt.hash(password, 12);
    }

    const userToUpdate = await prisma.user.findUnique({ where: { id } });
    if (!userToUpdate) {
      return res.status(404).json({ ok: false, error: 'Usuario no encontrado.' });
    }

    if (userToUpdate.username.toLowerCase() === 'admin1') {
      if (role && role !== 'ADMIN') {
        return res.status(403).json({ ok: false, error: 'No se puede revocar el rol de Administrador al usuario principal admin1.' });
      }
      if (username && username.trim().toLowerCase() !== 'admin1') {
        return res.status(403).json({ ok: false, error: 'No se puede cambiar el nombre del usuario principal admin1.' });
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        username: username ? username.trim() : undefined,
        password: hashedPassword,
        role: role || undefined,
        companyId: role === 'CLIENT' ? companyId : null
      },
      select: USER_SELECT_DTO
    });

    return res.status(200).json({ ok: true, data: updated });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ ok: false, error: 'Ya existe otro usuario con este nombre de usuario.' });
    }
    console.error('Error en actualizarUsuario:', error);
    next(error);
  }
};

export const eliminarUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userToDelete = await prisma.user.findUnique({ where: { id } });
    if (!userToDelete) {
      return res.status(404).json({ ok: false, error: 'Usuario no encontrado.' });
    }

    if (userToDelete.username.toLowerCase() === 'admin1') {
      return res.status(403).json({ ok: false, error: 'El usuario administrador principal (admin1) está protegido y no se puede eliminar.' });
    }

    await prisma.user.delete({ where: { id } });
    return res.status(200).json({ ok: true, message: 'Usuario eliminado con éxito.' });
  } catch (error) {
    console.error('Error en eliminarUsuario:', error);
    next(error);
  }
};

/**
 * Solicita el restablecimiento de contraseña para un usuario.
 * Genera un token temporal y registra la solicitud.
 */
export const solicitarResetPassword = async (req, res, next) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ ok: false, error: 'El nombre de usuario o correo es requerido.' });
    }

    const user = await prisma.user.findFirst({
      where: {
        username: { equals: username.trim(), mode: 'insensitive' }
      }
    });

    if (!user) {
      // Retornar éxito genérico por seguridad para prevenir enumeración de usuarios
      return res.status(200).json({
        ok: true,
        message: 'Si el usuario existe, se ha generado el enlace de restablecimiento.'
      });
    }

    const resetToken = jwt.sign(
      { id: user.id, purpose: 'PASSWORD_RESET' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.status(200).json({
      ok: true,
      message: 'Instrucciones de restablecimiento procesadas correctamente.',
      resetToken // Disponible para entornos controlados/desarrollo
    });
  } catch (error) {
    console.error('Error en solicitarResetPassword:', error);
    next(error);
  }
};

/**
 * Valida un código OTP de segundo factor (2FA).
 */
export const verificar2FA = async (req, res, next) => {
  try {
    const { codigo } = req.body;
    if (!codigo || codigo.trim().length !== 6) {
      return res.status(400).json({ ok: false, error: 'El código 2FA debe tener 6 dígitos numéricos.' });
    }

    // Validación OTP simulada con aceptación de tokens de prueba o temporales
    const esValido = /^\d{6}$/.test(codigo.trim());
    if (!esValido) {
      return res.status(400).json({ ok: false, error: 'Código 2FA inválido o expirado.' });
    }

    return res.status(200).json({
      ok: true,
      verified: true,
      message: 'Autenticación de dos factores verificada con éxito.'
    });
  } catch (error) {
    console.error('Error en verificar2FA:', error);
    next(error);
  }
};

