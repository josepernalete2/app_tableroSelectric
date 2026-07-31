import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-cambiar-en-produccion';

export const autenticar = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ ok: false, error: 'No autenticado. Token requerido.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ ok: false, error: 'Token inválido o expirado.' });
  }
};

export const requerirAdmin = (req, res, next) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({
      ok: false,
      error: 'Acción permitida únicamente para administradores.'
    });
  }
  return next();
};
