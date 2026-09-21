import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:admin123@localhost:5432/inspecciones?schema=public';
const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

const globalForPrisma = globalThis;

if (!globalForPrisma.prismaPool) {
  globalForPrisma.prismaPool = new pg.Pool({ 
    connectionString,
    ssl: isLocalhost ? false : { rejectUnauthorized: false },
    max: 10
  });
}

const pool = globalForPrisma.prismaPool;
const adapter = new PrismaPg(pool);

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
