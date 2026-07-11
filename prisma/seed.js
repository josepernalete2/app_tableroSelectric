import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- Iniciando Seeding de Catálogos Paramétricos ---');

  // 1. Tipos de Elementos
  const tiposElementos = [
    { nombre: 'Luminaria', descripcion: 'Luminarias de techo, pared o de emergencia' },
    { nombre: 'Tomacorriente', descripcion: 'Tomacorrientes de uso general o especial (GFCI)' },
    { nombre: 'Motor', descripcion: 'Motores eléctricos trifásicos o monofásicos' },
    { nombre: 'Aire Acondicionado', descripcion: 'Equipos de climatización/AC' },
    { nombre: 'Calentador de Agua', descripcion: 'Calentador de agua eléctrico' },
    { nombre: 'Otros', descripcion: 'Otros equipos no clasificados' }
  ];

  for (const item of tiposElementos) {
    await prisma.tipoElemento.upsert({
      where: { nombre: item.nombre },
      update: {},
      create: item,
    });
  }
  console.log('Catálogo de Tipos de Elementos poblado.');

  // 2. Catalogo de Breakers (Si está vacío)
  const countBreakers = await prisma.catalogoBreaker.count();
  if (countBreakers === 0) {
    const breakers = [
      { modelo: 'QO115', amperaje: 15, polos: 1, marca: 'Schneider Electric' },
      { modelo: 'QO120', amperaje: 20, polos: 1, marca: 'Schneider Electric' },
      { modelo: 'QO230', amperaje: 30, polos: 2, marca: 'Schneider Electric' },
      { modelo: 'QO250', amperaje: 50, polos: 2, marca: 'Schneider Electric' },
      { modelo: 'QO3100', amperaje: 100, polos: 3, marca: 'Schneider Electric' }
    ];

    for (const item of breakers) {
      await prisma.catalogoBreaker.create({ data: item });
    }
    console.log('Catálogo de Breakers poblado.');
  } else {
    console.log('Catálogo de Breakers ya contiene datos, omitiendo.');
  }

  // 3. Catalogo de Conductores (Si está vacío)
  const countConductores = await prisma.catalogoConductor.count();
  if (countConductores === 0) {
    const conductores = [
      { calibre: '#14 AWG', tipoAislamiento: 'THHN', material: 'Cobre', capacidadAmp: 15 },
      { calibre: '#12 AWG', tipoAislamiento: 'THHN', material: 'Cobre', capacidadAmp: 20 },
      { calibre: '#10 AWG', tipoAislamiento: 'THHN', material: 'Cobre', capacidadAmp: 30 },
      { calibre: '#8 AWG', tipoAislamiento: 'THHN', material: 'Cobre', capacidadAmp: 55 },
      { calibre: '2/0 AWG', tipoAislamiento: 'THHN', material: 'Cobre', capacidadAmp: 195 }
    ];

    for (const item of conductores) {
      await prisma.catalogoConductor.create({ data: item });
    }
    console.log('Catálogo de Conductores poblado.');
  } else {
    console.log('Catálogo de Conductores ya contiene datos, omitiendo.');
  }

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
