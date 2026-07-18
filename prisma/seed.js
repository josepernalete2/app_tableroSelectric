import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:admin123@localhost:5432/inspecciones?schema=public';
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- Iniciando Seeding de Empresas ---');

  // Empresas iniciales de prueba (para alinearse con los IDs del frontend 'c-1' y 'c-2')
  console.log('Poblando empresas iniciales...');
  await prisma.empresa.upsert({
    where: { id: 'c-1' },
    update: {},
    create: {
      id: 'c-1',
      nombre: 'Clínica Metropolitana de Caracas',
      direccion: 'Av. Araure, Urb. San Román, Caracas'
    }
  });

  await prisma.empresa.upsert({
    where: { id: 'c-2' },
    update: {},
    create: {
      id: 'c-2',
      nombre: 'Alimentos Polar Planta Turmero',
      direccion: 'Carretera Nacional Turmero, Aragua'
    }
  });
  console.log('Empresas c-1 y c-2 pobladas con éxito.');

  console.log('--- Seeding completado con éxito ---');
}

main()
  .catch((e) => {
    console.error('Error durante el seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
