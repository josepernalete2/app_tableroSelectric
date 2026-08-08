import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// Configura la conexión usando el URL del entorno
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:admin123@localhost:5432/inspecciones?schema=public';

// Determina si requiere SSL (si no es localhost o 127.0.0.1)
const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

const pool = new pg.Pool({ 
  connectionString,
  ssl: isLocalhost ? false : { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

export default prisma;
