import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

let rawUrl = process.env.DATABASE_URL || 'postgresql://postgres:admin123@localhost:5432/inspecciones?schema=public';
rawUrl = rawUrl.trim();
if ((rawUrl.startsWith('"') && rawUrl.endsWith('"')) || (rawUrl.startsWith("'") && rawUrl.endsWith("'"))) {
  rawUrl = rawUrl.slice(1, -1).trim();
}

const connectionString = rawUrl;
const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

const globalForPrisma = globalThis;

if (!globalForPrisma.prismaPool) {
  globalForPrisma.prismaPool = new pg.Pool({ 
    connectionString,
    ssl: isLocalhost ? false : { rejectUnauthorized: false },
    max: 10,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000
  });

  globalForPrisma.prismaPool.on('error', (err) => {
    console.error('⚠️ Error inesperado en el pool de PostgreSQL:', err.message);
  });
}

const pool = globalForPrisma.prismaPool;
const adapter = new PrismaPg(pool);

/**
 * Lista de campos del sistema o sensibles que no deben transformarse a mayúsculas
 */
const EXCLUDED_FIELDS = new Set([
  'id', 'userId', 'empresaId', 'proyectoId', 'tableroId', 'subestacionId', 'ccmId', 'puntoMedicionId',
  'alimentadoPorId', 'origenId', 'vinculadoId', 'elementoDestinoId', 'parentId', 'circuitoId',
  'email', 'correo', 'password', 'hash', 'passwordHash', 'token', 'refreshToken', 'tokenPush',
  'foto', 'fotoUrl', 'fotoBlob', 'avatar', 'url', 'firmaSupervisor', 'firmaInspector', 'firmaAuditor',
  'firmaResponsable', 'secret', 'key'
]);

/**
 * Normaliza recursivamente valores de texto a MAYÚSCULAS estrictas
 */
export function normalizeValueToUpper(val, key = '') {
  if (typeof val === 'string') {
    if (EXCLUDED_FIELDS.has(key)) return val;
    const trimmed = val.trim();
    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('blob:') ||
      trimmed.startsWith('/uploads/') ||
      trimmed.startsWith('data:image/')
    ) {
      return trimmed;
    }
    if (trimmed.includes('@') && !trimmed.includes(' ') && trimmed.includes('.')) {
      return trimmed; // Correo electrónico
    }
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
      return trimmed; // Identificador UUID
    }
    // Si contiene formato JSON serializado
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmed);
        return JSON.stringify(normalizeObjectToUpper(parsed));
      } catch {
        // Si no es JSON válido, procesar como string estándar
      }
    }
    return trimmed.toUpperCase();
  }
  if (Array.isArray(val)) {
    return val.map((item) => normalizeValueToUpper(item, key));
  }
  if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
    return normalizeObjectToUpper(val);
  }
  return val;
}

/**
 * Recorre recursivamente un objeto sanitizando y normalizando cadenas a MAYÚSCULAS
 */
export function normalizeObjectToUpper(obj) {
  if (!obj || typeof obj !== 'object' || obj instanceof Date) return obj;
  const result = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    result[k] = normalizeValueToUpper(v, k);
  }
  return result;
}

const basePrisma = globalForPrisma.basePrisma || new PrismaClient({ adapter });
globalForPrisma.basePrisma = basePrisma;

/**
 * Extensión de Prisma que intercepta automáticamente cualquier escritura (create, update, upsert)
 * para forzar que todos los campos de texto se persistan en MAYÚSCULAS estrictas en PostgreSQL.
 */
const extendedPrisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (args) {
          if (['create', 'update', 'updateMany'].includes(operation) && args.data) {
            args.data = normalizeObjectToUpper(args.data);
          } else if (operation === 'createMany' && args.data) {
            args.data = Array.isArray(args.data)
              ? args.data.map((d) => normalizeObjectToUpper(d))
              : normalizeObjectToUpper(args.data);
          } else if (operation === 'upsert') {
            if (args.create) args.create = normalizeObjectToUpper(args.create);
            if (args.update) args.update = normalizeObjectToUpper(args.update);
          }
        }
        return query(args);
      }
    }
  }
});

export const prisma = globalForPrisma.prisma || extendedPrisma;
globalForPrisma.prisma = prisma;

export default prisma;
