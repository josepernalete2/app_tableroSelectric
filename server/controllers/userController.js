import prisma from '../db.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secretKeyTableroSelectric';

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

    if (!user || user.password !== password) {
      return res.status(401).json({ ok: false, error: 'Usuario o contraseña incorrectos.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, companyId: user.companyId },
      JWT_SECRET,
      { expiresIn: '24h' }
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

    const existing = await prisma.user.findUnique({
      where: { username: username.toLowerCase().trim() }
    });
    if (existing) {
      return res.status(400).json({ ok: false, error: 'Ya existe un usuario con este nombre de usuario.' });
    }

    const newUser = await prisma.user.create({
      data: {
        id: id || undefined,
        username: username.trim(),
        password,
        role: role || 'WORKER',
        companyId: role === 'CLIENT' ? companyId : null
      }
    });

    return res.status(201).json({ ok: true, data: newUser });
  } catch (error) {
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
          username: username.toLowerCase().trim(),
          id: { not: id }
        }
      });
      if (existing) {
        return res.status(400).json({ ok: false, error: 'Ya existe otro usuario con este nombre de usuario.' });
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        username: username ? username.trim() : undefined,
        password: password || undefined,
        role: role || undefined,
        companyId: role === 'CLIENT' ? companyId : null
      }
    });

    return res.status(200).json({ ok: true, data: updated });
  } catch (error) {
    console.error('Error en actualizarUsuario:', error);
    next(error);
  }
};

export const eliminarUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id } });
    return res.status(200).json({ ok: true, message: 'Usuario eliminado con éxito.' });
  } catch (error) {
    console.error('Error en eliminarUsuario:', error);
    next(error);
  }
};
