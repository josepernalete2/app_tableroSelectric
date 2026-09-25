import prisma from '../server/db.js';

async function main() {
  console.log('🧹 Iniciando limpieza de empresas y datos asociados...');

  // 1. Conteo previo
  const empresasCount = await prisma.empresa.count();
  const proyectosCount = await prisma.proyecto.count();
  const tablerosCount = await prisma.tablero.count();
  const circuitosCount = await prisma.circuito.count();
  const elementosCount = await prisma.elementoUnifilar.count();
  const subestacionesCount = await prisma.subestacion.count();
  const puntosMedicionCount = await prisma.puntoMedicion.count();
  const ccmCount = await prisma.ccm.count();
  const patCount = await prisma.inspeccionAterramiento.count();
  const termoCount = await prisma.inspeccionTermografica.count();
  const tanquesCount = await prisma.inspeccionTanqueCombustible.count();
  const alarmasCount = await prisma.alarma.count();

  console.log(`📊 Estado actual:
  - Empresas: ${empresasCount}
  - Proyectos: ${proyectosCount}
  - Tableros: ${tablerosCount}
  - Circuitos: ${circuitosCount}
  - Elementos Unifilares: ${elementosCount}
  - Subestaciones: ${subestacionesCount}
  - Puntos de Medición: ${puntosMedicionCount}
  - CCM: ${ccmCount}
  - Inspecciones PAT: ${patCount}
  - Inspecciones Termográficas: ${termoCount}
  - Inspecciones Tanques: ${tanquesCount}
  - Alarmas: ${alarmasCount}`);

  // 2. Eliminar todas las empresas (Prisma / Postgres Cascade eliminará en cascada)
  const deleteResult = await prisma.empresa.deleteMany({});
  console.log(`🗑️ Eliminadas ${deleteResult.count} empresas.`);

  // 3. Limpiar cualquier registro huérfano si existiera
  await prisma.circuito.deleteMany({});
  await prisma.tablero.deleteMany({});
  await prisma.alimentador.deleteMany({});
  await prisma.elementoUnifilar.deleteMany({});
  await prisma.subestacion.deleteMany({});
  await prisma.puntoMedicion.deleteMany({});
  await prisma.ccm.deleteMany({});
  await prisma.inspeccionAterramiento.deleteMany({});
  await prisma.inspeccionTermografica.deleteMany({});
  await prisma.inspeccionTanqueCombustible.deleteMany({});
  await prisma.alarma.deleteMany({});
  await prisma.proyecto.deleteMany({});

  // 4. Actualizar companyId en usuarios a null
  await prisma.user.updateMany({
    where: { companyId: { not: null } },
    data: { companyId: null }
  });

  // 5. Conteo posterior
  const finalEmpresas = await prisma.empresa.count();
  const finalProyectos = await prisma.proyecto.count();
  const finalTableros = await prisma.tablero.count();
  const finalUsers = await prisma.user.count();

  console.log(`\n✅ Limpieza completada con éxito:
  - Empresas restantes: ${finalEmpresas}
  - Proyectos restantes: ${finalProyectos}
  - Tableros restantes: ${finalTableros}
  - Usuarios del sistema preservados: ${finalUsers}`);

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error durante la limpieza:', err);
  process.exit(1);
});
