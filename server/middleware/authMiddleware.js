import jwt from 'jsonwebtoken';

const MIN_JWT_SECRET_LENGTH = 32;

if (!process.env.JWT_SECRET) {
  console.warn('⚠️ WARNING: JWT_SECRET no está definido en process.env. Usando clave de desarrollo por defecto (32+ caracteres).');
}

const JWT_SECRET = process.env.JWT_SECRET || 'secretKeyTableroSelectric_2026_SecureKey_MustBeLongEnough';

if (JWT_SECRET.length < MIN_JWT_SECRET_LENGTH) {
  throw new Error(`❌ ERROR CRÍTICO DE SEGURIDAD: JWT_SECRET debe tener al menos ${MIN_JWT_SECRET_LENGTH} caracteres. Longitud actual: ${JWT_SECRET.length}`);
}

export { JWT_SECRET };

export const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader) {
    return res.status(401).json({ ok: false, error: 'Acceso denegado. No se proporcionó token de autenticación.' });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
  if (!token) {
    return res.status(401).json({ ok: false, error: 'Acceso denegado. Formato de token inválido.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, username, role, companyId }
    next();
  } catch (error) {
    console.error('❌ Error al verificar JWT:', error.message);
    return res.status(403).json({ ok: false, error: 'Token inválido o expirado.' });
  }
};

export const requireRoles = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'No autenticado.' });
    }

    if (!rolesPermitidos.includes(req.user.role)) {
      return res.status(403).json({
        ok: false,
        error: `Acceso denegado. Se requiere uno de los siguientes roles: ${rolesPermitidos.join(', ')}.`
      });
    }

    next();
  };
};

export const enforceTenantIsolation = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ ok: false, error: 'No autenticado.' });
  }

  // Si el usuario es CLIENT, solo puede acceder a datos de su propia empresa
  if (req.user.role === 'CLIENT') {
    const requestedCompanyId = req.params.empresaId || req.params.companyId || req.body.empresaId || req.body.companyId || req.query.empresaId || req.query.companyId;

    if (requestedCompanyId && requestedCompanyId !== req.user.companyId) {
      return res.status(403).json({
        ok: false,
        error: 'Acceso denegado. No tiene permisos para acceder a los recursos de esta empresa.'
      });
    }
  }

  next();
};

export default verificarToken;
