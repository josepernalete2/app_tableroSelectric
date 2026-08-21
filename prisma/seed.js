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
  console.log('--- Iniciando Seeding de Empresas ---');

  // Empresas iniciales de prueba (para alinearse con los IDs del frontend 'c-1' y 'c-2')
  console.log('Poblando empresas iniciales...');
  await prisma.empresa.upsert({
    where: { id: 'c-1' },
    update: {
      rif: 'J-12345678-9',
      direccionFiscal: 'Av. Araure, Urb. San Román, Caracas'
    },
    create: {
      id: 'c-1',
      nombre: 'Clínica Metropolitana de Caracas',
      rif: 'J-12345678-9',
      direccionFiscal: 'Av. Araure, Urb. San Román, Caracas'
    }
  });

  await prisma.empresa.upsert({
    where: { id: 'c-2' },
    update: {
      rif: 'J-98765432-1',
      direccionFiscal: 'Carretera Nacional Turmero, Aragua'
    },
    create: {
      id: 'c-2',
      nombre: 'Alimentos Polar Planta Turmero',
      rif: 'J-98765432-1',
      direccionFiscal: 'Carretera Nacional Turmero, Aragua'
    }
  });
  console.log('Empresas c-1 y c-2 pobladas con éxito.');

  console.log('Poblando usuarios iniciales...');

  // Generamos los hashes de las contraseñas antes de guardarlas
  const hashedPassword1 = await bcrypt.hash('admin1', 10);
  const hashedPassword2 = await bcrypt.hash('admin2', 10);

  await prisma.user.upsert({
    where: { username: 'admin1' },
    update: {
      password: hashedPassword1 // Asegura que si el usuario ya existe, se actualice con la contraseña encriptada
    },
    create: {
      id: 'u-1',
      username: 'admin1',
      password: hashedPassword1, // Guarda la contraseña encriptada
      role: 'ADMIN'
    }
  });

  await prisma.user.upsert({
    where: { username: 'admin2' },
    update: {
      password: hashedPassword2 // Asegura que si el usuario ya existe, se actualice con la contraseña encriptada
    },
    create: {
      id: 'u-2',
      username: 'admin2',
      password: hashedPassword2, // Guarda la contraseña encriptada
      role: 'ADMIN'
    }
  });
  console.log('Usuarios admin1 y admin2 poblados con éxito (contraseñas encriptadas).');

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