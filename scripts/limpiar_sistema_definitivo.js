import prisma from '../server/db.js';

async function main() {
  console.log('===============================================================');
  console.log('⚡ SCRIPT DE LIMPIEZA TOTAL DEL SISTEMA (SOLO PRESERVA USERS)');
  console.log('===============================================================\n');

  // 1. Verificar usuarios existentes antes de la limpieza
  const usuariosAntes = await prisma.user.findMany({
    select: { id: true, username: true, role: true, companyId: true }
  });
  console.log(`👤 Usuarios registrados antes de la limpieza (${usuariosAntes.length}):`);
  usuariosAntes.forEach((u, idx) => {
    console.log(`   [${idx + 1}] ${u.username} (Rol: ${u.role}, ID: ${u.id}, CompanyId: ${u.companyId || 'null'})`);
  });

  console.log('\n⏳ Ejecutando limpieza total de tablas operativas en orden relacional...');

  await prisma.$transaction(async (tx) => {
    // 0. Desvincular companyId de todos los usuarios para liberar la FK hacia Empresa (SIN borrar ni alterar usuarios)
    const userUnlink = await tx.user.updateMany({
      where: { companyId: { not: null } },
      data: { companyId: null }
    });
    console.log(`   - Usuarios desvinculados de empresas (companyId -> null): ${userUnlink.count}`);

    // 1. Alarma
    const delAlarmas = await tx.alarma.deleteMany({});
    console.log(`   - Alarma eliminados: ${delAlarmas.count}`);

    // 2. Circuito
    const delCircuitos = await tx.circuito.deleteMany({});
    console.log(`   - Circuito eliminados: ${delCircuitos.count}`);

    // 3. Tablero
    const delTableros = await tx.tablero.deleteMany({});
    console.log(`   - Tablero eliminados: ${delTableros.count}`);

    // 4. ElementoUnifilar (desvincular autorreferencia alimentadoPorId primero)
    await tx.elementoUnifilar.updateMany({
      where: { alimentadoPorId: { not: null } },
      data: { alimentadoPorId: null }
    });
    const delElementos = await tx.elementoUnifilar.deleteMany({});
    console.log(`   - ElementoUnifilar eliminados: ${delElementos.count}`);

    // 5. Alimentador
    const delAlimentadores = await tx.alimentador.deleteMany({});
    console.log(`   - Alimentador eliminados: ${delAlimentadores.count}`);

    // 6. Subestacion
    const delSubestaciones = await tx.subestacion.deleteMany({});
    console.log(`   - Subestacion eliminados: ${delSubestaciones.count}`);

    // 7. PuntoMedicion
    const delPuntos = await tx.puntoMedicion.deleteMany({});
    console.log(`   - PuntoMedicion eliminados: ${delPuntos.count}`);

    // 8. Ccm
    const delCcm = await tx.ccm.deleteMany({});
    console.log(`   - Ccm eliminados: ${delCcm.count}`);

    // 9. InspeccionTermografica
    const delTermo = await tx.inspeccionTermografica.deleteMany({});
    console.log(`   - InspeccionTermografica eliminados: ${delTermo.count}`);

    // 10. InspeccionAterramiento
    const delAterra = await tx.inspeccionAterramiento.deleteMany({});
    console.log(`   - InspeccionAterramiento eliminados: ${delAterra.count}`);

    // 11. InspeccionTanqueCombustible
    const delTanques = await tx.inspeccionTanqueCombustible.deleteMany({});
    console.log(`   - InspeccionTanqueCombustible eliminados: ${delTanques.count}`);

    // 12. Proyecto
    const delProyectos = await tx.proyecto.deleteMany({});
    console.log(`   - Proyecto eliminados: ${delProyectos.count}`);

    // 13. Empresa
    const delEmpresas = await tx.empresa.deleteMany({});
    console.log(`   - Empresa eliminadas: ${delEmpresas.count}`);

    // 14. Backup
    const delBackups = await tx.backup.deleteMany({});
    console.log(`   - Backup eliminados: ${delBackups.count}`);
  });

  // Verificación final de conteo de registros
  const [
    countEmpresas,
    countProyectos,
    countElementos,
    countTableros,
    countCircuitos,
    countSubestaciones,
    countPuntos,
    countCcm,
    countAlimentadores,
    countTermo,
    countAterra,
    countTanques,
    countAlarmas,
    countBackups,
    usuariosFinales
  ] = await Promise.all([
    prisma.empresa.count(),
    prisma.proyecto.count(),
    prisma.elementoUnifilar.count(),
    prisma.tablero.count(),
    prisma.circuito.count(),
    prisma.subestacion.count(),
    prisma.puntoMedicion.count(),
    prisma.ccm.count(),
    prisma.alimentador.count(),
    prisma.inspeccionTermografica.count(),
    prisma.inspeccionAterramiento.count(),
    prisma.inspeccionTanqueCombustible.count(),
    prisma.alarma.count(),
    prisma.backup.count(),
    prisma.user.findMany({ select: { id: true, username: true, role: true, companyId: true } })
  ]);

  console.log('\n===============================================================');
  console.log('📊 CONTEO FINAL DE REGISTROS EN POSTGRESQL');
  console.log('===============================================================');
  console.log(`   Empresas:                       ${countEmpresas}`);
  console.log(`   Proyectos:                      ${countProyectos}`);
  console.log(`   Elementos Unifilares:           ${countElementos}`);
  console.log(`   Tableros:                       ${countTableros}`);
  console.log(`   Circuitos:                      ${countCircuitos}`);
  console.log(`   Subestaciones:                  ${countSubestaciones}`);
  console.log(`   Puntos de Medición:             ${countPuntos}`);
  console.log(`   CCM:                            ${countCcm}`);
  console.log(`   Alimentadores:                  ${countAlimentadores}`);
  console.log(`   Inspecciones Termográficas:     ${countTermo}`);
  console.log(`   Inspecciones Aterramiento:      ${countAterra}`);
  console.log(`   Inspecciones Tanque Comb.:      ${countTanques}`);
  console.log(`   Alarmas:                        ${countAlarmas}`);
  console.log(`   Backups:                        ${countBackups}`);
  console.log(`   Usuarios Activos (User):        ${usuariosFinales.length}`);
  console.log('---------------------------------------------------------------');
  usuariosFinales.forEach((u, idx) => {
    console.log(`   ✅ Usuario [${idx + 1}]: ${u.username} (Rol: ${u.role}, ID: ${u.id})`);
  });
  console.log('===============================================================\n');
}

main()
  .catch((err) => {
    console.error('❌ Error durante la limpieza:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
