import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secretKeyTableroSelectric';

export const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ ok: false, error: 'Acceso denegado. No se proporcionó token.' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ ok: false, error: 'Acceso denegado. Formato de token inválido.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, username, role, companyId }
    next();
  } catch (error) {
    console.error('Error al verificar JWT:', error.message);
    return res.status(403).json({ ok: false, error: 'Token inválido o expirado.' });
  }
};

export default verificarToken;
