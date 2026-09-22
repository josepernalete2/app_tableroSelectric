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

if (process.env.VERCEL && (!process.env.DATABASE_URL || isLocalhost)) {
  console.error('❌ ERROR CRÍTICO EN VERCEL: DATABASE_URL no está definida o apunta a localhost en Vercel.');
}

const globalForPrisma = globalThis;

if (!globalForPrisma.prismaPool) {
  globalForPrisma.prismaPool = new pg.Pool({ 
    connectionString,
    ssl: isLocalhost ? false : { rejectUnauthorized: false },
    max: process.env.VERCEL ? 3 : 10,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000
  });

  globalForPrisma.prismaPool.on('error', (err) => {
    console.error('⚠️ Error inesperado en el pool de PostgreSQL:', err.message);
  });
}

const pool = globalForPrisma.prismaPool;
const adapter = new PrismaPg(pool);

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

globalForPrisma.prisma = prisma;

export default prisma;
