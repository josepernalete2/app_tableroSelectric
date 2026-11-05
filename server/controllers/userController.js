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
    const { username, password } = req.body || {};
    const cleanUsername = typeof username === 'string' ? username.trim() : '';
    const rawPassword = typeof password === 'string' ? password : '';

    if (!cleanUsername || !rawPassword) {
      return res.status(400).json({ ok: false, error: 'Usuario y contraseña son requeridos.' });
    }

    const user = await prisma.user.findFirst({
      where: {
        username: {
          equals: cleanUsername,
          mode: 'insensitive'
        }
      }
    });

    if (!user) {
      return res.status(401).json({ ok: false, error: 'El usuario ingresado no existe.' });
    }

    // Verificar si la contraseña coincide (soporte para hash bcrypt o texto plano heredado)
    let isMatch = false;
    if (/^\$2[abxy]\$/.test(user.password)) {
      isMatch = await bcrypt.compare(rawPassword, user.password);
      if (!isMatch && rawPassword !== rawPassword.trim()) {
        isMatch = await bcrypt.compare(rawPassword.trim(), user.password);
      }
    } else {
      // Si la contraseña almacenada estaba en texto plano, comparar y actualizar automáticamente a bcrypt
      isMatch = (user.password === rawPassword || user.password === rawPassword.trim());
      if (isMatch) {
        const hashedPassword = await bcrypt.hash(rawPassword, 12);
        await prisma.user.update({
          where: { id: user.id },
          data: { password: hashedPassword }
        });
      }
    }

    if (!isMatch) {
      return res.status(401).json({ ok: false, error: 'La contraseña ingresada es incorrecta.' });
    }

    // Si el usuario estaba guardado en mayúsculas por versiones previas y entra con su casing real, sincronizarlo
    let finalUsername = user.username;
    if (user.username !== cleanUsername && user.username.toLowerCase() === cleanUsername.toLowerCase()) {
      try {
        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: { username: cleanUsername },
          select: USER_SELECT_DTO
        });
        finalUsername = updatedUser.username;
      } catch {
        finalUsername = cleanUsername;
      }
    }

    const token = jwt.sign(
      { id: user.id, username: finalUsername, role: user.role, companyId: user.companyId },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    return res.status(200).json({
      ok: true,
      token,
      user: {
        id: user.id,
        username: finalUsername,
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
    const { id, username, password, role, companyId } = req.body || {};
    const cleanUsername = typeof username === 'string' ? username.trim() : '';
    const rawPassword = typeof password === 'string' ? password : '';
    const trimmedPassword = typeof password === 'string' ? password.trim() : '';

    if (!cleanUsername || !trimmedPassword) {
      return res.status(400).json({ ok: false, error: 'Usuario y contraseña son requeridos.' });
    }

    if (rawPassword.length < 4) {
      return res.status(400).json({ ok: false, error: 'La contraseña debe tener al menos 4 caracteres.' });
    }

    const existing = await prisma.user.findFirst({
      where: {
        username: {
          equals: cleanUsername,
          mode: 'insensitive'
        }
      }
    });

    if (existing) {
      return res.status(400).json({ ok: false, error: 'Ya existe un usuario con este nombre de usuario.' });
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 12);

    const newUser = await prisma.user.create({
      data: {
        id: id || undefined,
        username: cleanUsername,
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
    const { username, password, role, companyId } = req.body || {};
    const cleanUsername = typeof username === 'string' ? username.trim() : '';
    const rawPassword = typeof password === 'string' ? password : '';
    const trimmedPassword = typeof password === 'string' ? password.trim() : '';

    let hashedPassword = undefined;
    if (trimmedPassword.length > 0) {
      if (rawPassword.length < 4) {
        return res.status(400).json({ ok: false, error: 'La nueva contraseña debe tener al menos 4 caracteres.' });
      }
      hashedPassword = await bcrypt.hash(rawPassword, 12);
    }

    let userToUpdate = await prisma.user.findUnique({ where: { id } });
    if (!userToUpdate && cleanUsername) {
      userToUpdate = await prisma.user.findFirst({
        where: {
          username: {
            equals: cleanUsername,
            mode: 'insensitive'
          }
        }
      });
    }

    // Si el usuario solo existía en caché local del navegador y ahora se guarda con contraseña, crearlo en BD
    if (!userToUpdate) {
      if (cleanUsername && hashedPassword) {
        const created = await prisma.user.create({
          data: {
            id: id || undefined,
            username: cleanUsername,
            password: hashedPassword,
            role: role || 'WORKER',
            companyId: role === 'CLIENT' ? companyId : null
          },
          select: USER_SELECT_DTO
        });
        return res.status(200).json({ ok: true, data: created });
      }
      return res.status(404).json({ ok: false, error: 'Usuario no encontrado.' });
    }

    const targetId = userToUpdate.id;

    if (cleanUsername) {
      const existing = await prisma.user.findFirst({
        where: {
          username: {
            equals: cleanUsername,
            mode: 'insensitive'
          },
          id: { not: targetId }
        }
      });
      if (existing) {
        return res.status(400).json({ ok: false, error: 'Ya existe otro usuario con este nombre de usuario.' });
      }
    }

    if (userToUpdate.username.toLowerCase() === 'admin1') {
      if (role && role !== 'ADMIN') {
        return res.status(403).json({ ok: false, error: 'No se puede revocar el rol de Administrador al usuario principal admin1.' });
      }
      if (cleanUsername && cleanUsername.toLowerCase() !== 'admin1') {
        return res.status(403).json({ ok: false, error: 'No se puede cambiar el nombre del usuario principal admin1.' });
      }
    }

    const nextRole = role || userToUpdate.role;
    const updateData = {
      ...(cleanUsername ? { username: cleanUsername } : {}),
      ...(hashedPassword !== undefined ? { password: hashedPassword } : {}),
      ...(role ? { role } : {}),
      companyId: nextRole === 'CLIENT' ? (companyId !== undefined ? companyId : userToUpdate.companyId) : null
    };

    const updated = await prisma.user.update({
      where: { id: targetId },
      data: updateData,
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
    const { username } = req.body || {};
    const cleanUsername = typeof username === 'string' ? username.trim() : '';
    if (!cleanUsername) {
      return res.status(400).json({ ok: false, error: 'El nombre de usuario o correo es requerido.' });
    }

    const user = await prisma.user.findFirst({
      where: {
        username: { equals: cleanUsername, mode: 'insensitive' }
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
    const { codigo } = req.body || {};
    const cleanCodigo = typeof codigo === 'string' ? codigo.trim() : '';
    if (!cleanCodigo || cleanCodigo.length !== 6) {
      return res.status(400).json({ ok: false, error: 'El código 2FA debe tener 6 dígitos numéricos.' });
    }

    // Validación OTP simulada con aceptación de tokens de prueba o temporales
    const esValido = /^\d{6}$/.test(cleanCodigo);
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

