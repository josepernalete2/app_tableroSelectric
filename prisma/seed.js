import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs'; // Encriptar contraseñas con bcryptjs

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:admin123@localhost:5432/inspecciones?schema=public';
const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

const pool = new pg.Pool({ 
  connectionString,
  ssl: isLocalhost ? false : { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- Iniciando Seeding de Usuarios Base ---');
  console.log('Verificando usuarios iniciales (sin crear empresas de prueba)...');

  // Generamos los hashes de las contraseñas antes de crearlas (solo si no existen)
  const hashedPassword1 = await bcrypt.hash('tobby 1', 10);
  const hashedPassword2 = await bcrypt.hash('admin2', 10);

  await prisma.user.upsert({
    where: { username: 'admin1' },
    update: {},
    create: {
      id: 'u-1',
      username: 'admin1',
      password: hashedPassword1,
      role: 'ADMIN'
    }
  });

  await prisma.user.upsert({
    where: { username: 'admin2' },
    update: {},
    create: {
      id: 'u-2',
      username: 'admin2',
      password: hashedPassword2,
      role: 'ADMIN'
    }
  });
  console.log('Usuarios base verificados con éxito (sin modificar usuarios existentes).');

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