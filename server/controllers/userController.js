import prisma from '../db.js';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

// La lista de usuarios se usa también para el login offline de la tableta
// (persiste los hashes bcrypt localmente y los compara en el navegador),
// por lo que se devuelve el campo password (hash). El endpoint exige autenticación.
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

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const newUser = await prisma.user.create({
      data: {
        id: id || undefined,
        username: username.trim(),
        password: passwordHash,
        role: role || 'WORKER',
        companyId: role === 'CLIENT' ? companyId : null
      }
    });

    const { password: _password, ...userData } = newUser;
    return res.status(201).json({ ok: true, data: userData });
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

    const passwordHash = password ? await bcrypt.hash(password, SALT_ROUNDS) : undefined;

    const updated = await prisma.user.update({
      where: { id },
      data: {
        username: username ? username.trim() : undefined,
        password: passwordHash,
        role: role || undefined,
        companyId: role === 'CLIENT' ? companyId : null
      }
    });

    const { password: _password, ...userData } = updated;
    return res.status(200).json({ ok: true, data: userData });
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
