import prisma from '../server/db.js';

// Lista de nombres / variantes de empresas a PRESERVAR
const PRESERVED_NAMES_NORMALIZED = [
  'pernaletes house',
  'residencia pernalete gimenez',
  'recidencia pernalete gimenez',
  'residencia pernalete giménez',
  'recidencia pernalete giménez',
  'residencia montilla',
  'recidencia montilla'
];

const PRESERVED_IDS = [
  'company-1790782611183',
  'company-1790550500930',
  'company-1790621378492'
];

const PRESERVED_RIFS = [
  'V11274002-0',
  '30797057',
  'V5765466'
];

const normalize = (str) => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

const isPreservedCompany = (company) => {
  if (PRESERVED_IDS.includes(company.id)) return true;
  if (PRESERVED_RIFS.includes(company.rif)) return true;
  const normName = normalize(company.nombre);
  return PRESERVED_NAMES_NORMALIZED.some(pName => normalize(pName) === normName);
};

async function main() {
  console.log('===========================================================');
  console.log('🧹 SELECTRIC - SCRIPT DE LIMPIEZA DEFINITIVA DEL SISTEMA');
  console.log('===========================================================\n');

  // 1. Obtener todas las empresas registradas
  const allCompanies = await prisma.empresa.findMany({
    include: {
      proyectos: {
        select: { id: true, nombre: true }
      }
    }
  });

  const preservedCompanies = [];
  const companiesToDelete = [];

  for (const comp of allCompanies) {
    if (isPreservedCompany(comp)) {
      preservedCompanies.push(comp);
    } else {
      companiesToDelete.push(comp);
    }
  }

  console.log(`📋 Total empresas encontradas en BD: ${allCompanies.length}`);
  console.log(`🔒 Empresas protegidas para PRESERVAR (${preservedCompanies.length}):`);
  preservedCompanies.forEach((c, idx) => {
    console.log(`   ${idx + 1}. [${c.id}] "${c.nombre}" (RIF: ${c.rif}) - Proyectos: ${c.proyectos.length}`);
  });

  console.log(`\n🗑️ Empresas de prueba A ELIMINAR (${companiesToDelete.length}):`);
  companiesToDelete.forEach((c, idx) => {
    console.log(`   ${idx + 1}. [${c.id}] "${c.nombre}" (RIF: ${c.rif})`);
  });

  if (companiesToDelete.length === 0) {
    console.log('\n✨ No hay empresas sobrantes para eliminar. La base de datos ya está limpia.');
    process.exit(0);
  }

  const deleteIds = companiesToDelete.map(c => c.id);
  const preservedIds = preservedCompanies.map(c => c.id);

  console.log('\n🚀 Iniciando transacción atómica de eliminación en cascada...');

  await prisma.$transaction(async (tx) => {
    // A. Identificar proyectos que se eliminarán
    const proyectosAEliminar = await tx.proyecto.findMany({
      where: {
        OR: [
          { empresaId: { in: deleteIds } },
          { empresaId: { notIn: preservedIds } }
        ]
      },
      select: { id: true }
    });
    const deleteProjIds = proyectosAEliminar.map(p => p.id);

    // B. Identificar tableros que se eliminarán
    const tablerosAEliminar = await tx.tablero.findMany({
      where: {
        OR: [
          { empresaId: { in: deleteIds } },
          { proyectoId: { in: deleteProjIds } },
          { empresaId: { notIn: preservedIds } }
        ]
      },
      select: { id: true }
    });
    const deleteTableroIds = tablerosAEliminar.map(t => t.id);

    // 1. Eliminar circuitos de los tableros afectados
    if (deleteTableroIds.length > 0) {
      const deletedCirc = await tx.circuito.deleteMany({
        where: { tableroId: { in: deleteTableroIds } }
      });
      console.log(`   - Circuitos eliminados: ${deletedCirc.count}`);
    }

    // 2. Eliminar alarmas
    const deletedAlarmas = await tx.alarma.deleteMany({
      where: {
        OR: [
          { proyectoId: { in: deleteProjIds } },
          { tableroId: { in: deleteTableroIds } }
        ]
      }
    });
    console.log(`   - Alarmas eliminadas: ${deletedAlarmas.count}`);

    // 3. Eliminar tableros
    if (deleteTableroIds.length > 0) {
      const deletedTabs = await tx.tablero.deleteMany({
        where: { id: { in: deleteTableroIds } }
      });
      console.log(`   - Tableros eliminados: ${deletedTabs.count}`);
    }

    // 4. Eliminar alimentadores
    if (deleteProjIds.length > 0) {
      const deletedAlims = await tx.alimentador.deleteMany({
        where: { proyectoId: { in: deleteProjIds } }
      });
      console.log(`   - Alimentadores eliminados: ${deletedAlims.count}`);
    }

    // 5. Eliminar elementos unifilares
    const deletedElem = await tx.elementoUnifilar.deleteMany({
      where: {
        OR: [
          { empresaId: { in: deleteIds } },
          { proyectoId: { in: deleteProjIds } },
          { empresaId: { notIn: preservedIds } }
        ]
      }
    });
    console.log(`   - Elementos unifilares eliminados: ${deletedElem.count}`);

    // 6. Eliminar inspecciones
    const deletedSub = await tx.subestacion.deleteMany({
      where: {
        OR: [
          { empresaId: { in: deleteIds } },
          { proyectoId: { in: deleteProjIds } },
          { empresaId: { notIn: preservedIds } }
        ]
      }
    });
    console.log(`   - Subestaciones eliminadas: ${deletedSub.count}`);

    const deletedPto = await tx.puntoMedicion.deleteMany({
      where: {
        OR: [
          { empresaId: { in: deleteIds } },
          { proyectoId: { in: deleteProjIds } },
          { empresaId: { notIn: preservedIds } }
        ]
      }
    });
    console.log(`   - Puntos de medición eliminados: ${deletedPto.count}`);

    const deletedCcm = await tx.ccm.deleteMany({
      where: {
        OR: [
          { empresaId: { in: deleteIds } },
          { proyectoId: { in: deleteProjIds } },
          { empresaId: { notIn: preservedIds } }
        ]
      }
    });
    console.log(`   - CCM eliminados: ${deletedCcm.count}`);

    const deletedTermo = await tx.inspeccionTermografica.deleteMany({
      where: {
        OR: [
          { empresaId: { in: deleteIds } },
          { proyectoId: { in: deleteProjIds } },
          { empresaId: { notIn: preservedIds } }
        ]
      }
    });
    console.log(`   - Inspecciones termográficas eliminadas: ${deletedTermo.count}`);

    const deletedPat = await tx.inspeccionAterramiento.deleteMany({
      where: {
        OR: [
          { empresaId: { in: deleteIds } },
          { proyectoId: { in: deleteProjIds } },
          { empresaId: { notIn: preservedIds } }
        ]
      }
    });
    console.log(`   - Inspecciones de aterramiento eliminadas: ${deletedPat.count}`);

    const deletedTanques = await tx.inspeccionTanqueCombustible.deleteMany({
      where: {
        OR: [
          { empresaId: { in: deleteIds } },
          { proyectoId: { in: deleteProjIds } },
          { empresaId: { notIn: preservedIds } }
        ]
      }
    });
    console.log(`   - Inspecciones de tanques eliminadas: ${deletedTanques.count}`);

    // 7. Eliminar proyectos
    if (deleteProjIds.length > 0) {
      const deletedProjs = await tx.proyecto.deleteMany({
        where: { id: { in: deleteProjIds } }
      });
      console.log(`   - Proyectos eliminados: ${deletedProjs.count}`);
    }

    // 8. Desvincular usuarios asociados a empresas eliminadas
    const updatedUsers = await tx.user.updateMany({
      where: { companyId: { in: deleteIds } },
      data: { companyId: null }
    });
    if (updatedUsers.count > 0) {
      console.log(`   - Usuarios desvinculados de empresas eliminadas: ${updatedUsers.count}`);
    }

    // 9. Eliminar empresas
    const deletedCompanies = await tx.empresa.deleteMany({
      where: { id: { in: deleteIds } }
    });
    console.log(`   - Empresas eliminadas: ${deletedCompanies.count}`);
  });

  // 4. Verificación final de la base de datos
  const finalEmpresas = await prisma.empresa.findMany({
    select: {
      id: true,
      nombre: true,
      rif: true,
      _count: {
        select: {
          proyectos: true,
          elementosUnifilares: true,
          tableros: true,
          subestaciones: true
        }
      }
    }
  });

  console.log('\n===========================================================');
  console.log(`✅ LIMPIEZA FINALIZADA EXITOSAMENTE. EMPRESAS ACTIVAS (${finalEmpresas.length}):`);
  console.log('===========================================================');
  finalEmpresas.forEach((c, idx) => {
    console.log(`${idx + 1}. "${c.nombre}" | RIF: ${c.rif} | Proyectos: ${c._count.proyectos} | Tableros: ${c._count.tableros} | Elementos: ${c._count.elementosUnifilares}`);
  });

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error fatal durante la limpieza:', err);
  process.exit(1);
});
