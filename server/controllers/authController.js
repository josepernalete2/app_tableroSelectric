import prisma from '../db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth.js';

/**
 * POST /api/auth/login
 * Autentica credenciales y devuelve un token JWT más los datos del usuario (sin contraseña).
 */
export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ ok: false, error: 'Usuario y contraseña son requeridos.' });
    }

    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase().trim() }
    });

    if (!user) {
      return res.status(401).json({ ok: false, error: 'Usuario o contraseña incorrectos.' });
    }

    const valido = await bcrypt.compare(password, user.password);
    if (!valido) {
      return res.status(401).json({ ok: false, error: 'Usuario o contraseña incorrectos.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, companyId: user.companyId },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const { password: _password, ...userData } = user;

    return res.status(200).json({ ok: true, token, data: userData });
  } catch (error) {
    console.error('Error en login:', error);
    next(error);
  }
};
