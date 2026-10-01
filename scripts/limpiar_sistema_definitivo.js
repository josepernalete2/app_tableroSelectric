import prisma from '../server/db.js';

// Lista estricta de nombres de empresas/residencias permitidas a conservar
const EMPRESAS_PERMITIDAS = [
  'Pernaletes house',
  'Residencia Pernalete Giménez',
  'Residencia montilla'
];

/**
 * Normaliza una cadena para comparación insensible a tildes, mayúsculas y espacios
 */
function normalizar(str) {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

async function main() {
  console.log('===============================================================');
  console.log('⚡ SCRIPT DE LIMPIEZA DEFINITIVA DEL SISTEMA ELECTRICO');
  console.log('===============================================================\n');

  // 1. Diagnóstico de empresas existentes
  const todasLasEmpresas = await prisma.empresa.findMany({
    include: {
      proyectos: {
        include: {
          tableros: true,
          elementosUnifilares: true
        }
      }
    }
  });

  console.log(`📋 Total de empresas encontradas en el sistema: ${todasLasEmpresas.length}`);
  todasLasEmpresas.forEach((e, idx) => {
    console.log(`   [${idx + 1}] "${e.nombre}" (ID: ${e.id}, RIF: ${e.rif}, Proyectos: ${e.proyectos.length})`);
  });

  // Normalización de la lista de permitidas
  const permitidasNorm = EMPRESAS_PERMITIDAS.map(normalizar);

  const empresasAConservar = [];
  const empresasAEliminar = [];

  for (const emp of todasLasEmpresas) {
    const empNorm = normalizar(emp.nombre);
    const esPermitida = permitidasNorm.some(perm => empNorm === perm || empNorm.includes(perm) || perm.includes(empNorm));
    
    if (esPermitida) {
      empresasAConservar.push(emp);
    } else {
      empresasAEliminar.push(emp);
    }
  }

  console.log('\n---------------------------------------------------------------');
  console.log(`🔒 EMPRESAS A PRESERVAR (${empresasAConservar.length}):`);
  empresasAConservar.forEach(e => console.log(`   ✅ "${e.nombre}" [ID: ${e.id}]`));

  console.log(`\n🗑️ EMPRESAS A ELIMINAR (${empresasAEliminar.length}):`);
  empresasAEliminar.forEach(e => console.log(`   ❌ "${e.nombre}" [ID: ${e.id}]`));
  console.log('---------------------------------------------------------------\n');

  if (empresasAEliminar.length === 0) {
    console.log('✨ No hay empresas para eliminar. El sistema ya se encuentra limpio.');
    process.exit(0);
  }

  const idsEmpresasAEliminar = empresasAEliminar.map(e => e.id);

  console.log('⏳ Ejecutando transacción de borrado seguro en cascada...');

  await prisma.$transaction(async (tx) => {
    // 1. Obtener IDs de proyectos asociados a las empresas a eliminar
    const proyectos = await tx.proyecto.findMany({
      where: { empresaId: { in: idsEmpresasAEliminar } },
      select: { id: true }
    });
    const proyectoIds = proyectos.map(p => p.id);

    // 2. Obtener IDs de tableros asociados a las empresas o sus proyectos
    const tableros = await tx.tablero.findMany({
      where: {
        OR: [
          { empresaId: { in: idsEmpresasAEliminar } },
          { proyectoId: { in: proyectoIds } }
        ]
      },
      select: { id: true }
    });
    const tableroIds = tableros.map(t => t.id);

    // 3. Eliminar circuitos de los tableros
    if (tableroIds.length > 0) {
      const cRes = await tx.circuito.deleteMany({
        where: { tableroId: { in: tableroIds } }
      });
      console.log(`   - Circuitos eliminados: ${cRes.count}`);
    }

    // 4. Eliminar alarmas
    const alRes = await tx.alarma.deleteMany({
      where: {
        OR: [
          { proyectoId: { in: proyectoIds } },
          { tableroId: { in: tableroIds } }
        ]
      }
    });
    console.log(`   - Alarmas eliminadas: ${alRes.count}`);

    // 5. Eliminar tableros
    if (tableroIds.length > 0) {
      const tabRes = await tx.tablero.deleteMany({
        where: { id: { in: tableroIds } }
      });
      console.log(`   - Tableros eliminados: ${tabRes.count}`);
    }

    // 6. Eliminar alimentadores
    if (proyectoIds.length > 0) {
      const alimRes = await tx.alimentador.deleteMany({
        where: { proyectoId: { in: proyectoIds } }
      });
      console.log(`   - Alimentadores eliminados: ${alimRes.count}`);
    }

    // 7. Desvincular jerarquías unifilares autorreferenciales
    await tx.elementoUnifilar.updateMany({
      where: {
        OR: [
          { empresaId: { in: idsEmpresasAEliminar } },
          { proyectoId: { in: proyectoIds } }
        ],
        alimentadoPorId: { not: null }
      },
      data: { alimentadoPorId: null }
    });

    // 8. Eliminar elementos unifilares
    const elemRes = await tx.elementoUnifilar.deleteMany({
      where: {
        OR: [
          { empresaId: { in: idsEmpresasAEliminar } },
          { proyectoId: { in: proyectoIds } }
        ]
      }
    });
    console.log(`   - Elementos unifilares eliminados: ${elemRes.count}`);

    // 9. Eliminar inspecciones técnicas
    const subRes = await tx.subestacion.deleteMany({
      where: {
        OR: [
          { empresaId: { in: idsEmpresasAEliminar } },
          { proyectoId: { in: proyectoIds } }
        ]
      }
    });
    console.log(`   - Subestaciones eliminadas: ${subRes.count}`);

    const pmRes = await tx.puntoMedicion.deleteMany({
      where: {
        OR: [
          { empresaId: { in: idsEmpresasAEliminar } },
          { proyectoId: { in: proyectoIds } }
        ]
      }
    });
    console.log(`   - Puntos de medición eliminados: ${pmRes.count}`);

    const ccmRes = await tx.ccm.deleteMany({
      where: {
        OR: [
          { empresaId: { in: idsEmpresasAEliminar } },
          { proyectoId: { in: proyectoIds } }
        ]
      }
    });
    console.log(`   - CCM eliminados: ${ccmRes.count}`);

    const patRes = await tx.inspeccionAterramiento.deleteMany({
      where: {
        OR: [
          { empresaId: { in: idsEmpresasAEliminar } },
          { proyectoId: { in: proyectoIds } }
        ]
      }
    });
    console.log(`   - Inspecciones PAT eliminadas: ${patRes.count}`);

    const termoRes = await tx.inspeccionTermografica.deleteMany({
      where: {
        OR: [
          { empresaId: { in: idsEmpresasAEliminar } },
          { proyectoId: { in: proyectoIds } }
        ]
      }
    });
    console.log(`   - Inspecciones Termográficas eliminadas: ${termoRes.count}`);

    const tanqRes = await tx.inspeccionTanqueCombustible.deleteMany({
      where: {
        OR: [
          { empresaId: { in: idsEmpresasAEliminar } },
          { proyectoId: { in: proyectoIds } }
        ]
      }
    });
    console.log(`   - Inspecciones Tanques eliminadas: ${tanqRes.count}`);

    // 10. Eliminar proyectos
    if (proyectoIds.length > 0) {
      const pRes = await tx.proyecto.deleteMany({
        where: { id: { in: proyectoIds } }
      });
      console.log(`   - Proyectos eliminados: ${pRes.count}`);
    }

    // 11. Desvincular usuarios asociados a las empresas eliminadas
    const uRes = await tx.user.updateMany({
      where: { companyId: { in: idsEmpresasAEliminar } },
      data: { companyId: null }
    });
    console.log(`   - Usuarios desvinculados de empresas eliminadas: ${uRes.count}`);

    // 12. Eliminar empresas
    const empRes = await tx.empresa.deleteMany({
      where: { id: { in: idsEmpresasAEliminar } }
    });
    console.log(`   - Empresas eliminadas: ${empRes.count}`);
  });

  console.log('\n===============================================================');
  console.log('🔍 VERIFICACIÓN FINAL DEL ESTADO DE LA BASE DE DATOS');
  console.log('===============================================================');

  const empresasFinales = await prisma.empresa.findMany({
    include: {
      proyectos: {
        include: {
          tableros: {
            include: {
              circuitos: true
            }
          },
          elementosUnifilares: true,
          subestaciones: true,
          puntosMedicion: true,
          ccmList: true
        }
      }
    }
  });

  console.log(`\n🏢 Empresas activas en PostgreSQL (${empresasFinales.length}):`);
  empresasFinales.forEach((emp, i) => {
    console.log(`\n[${i + 1}] Empresa: "${emp.nombre}" (ID: ${emp.id}, RIF: ${emp.rif})`);
    if (emp.proyectos.length === 0) {
      console.log('    - Sin proyectos');
    } else {
      emp.proyectos.forEach(p => {
        console.log(`    📁 Proyecto: "${p.nombre}" (ID: ${p.id})`);
        console.log(`       - Tableros: ${p.tableros.length}`);
        p.tableros.forEach(t => {
          console.log(`         ⚡ Tablero: "${t.nombre}" (${t.circuitos.length} circuitos)`);
        });
        console.log(`       - Elementos Unifilares: ${p.elementosUnifilares.length}`);
        console.log(`       - Subestaciones: ${p.subestaciones.length}`);
        console.log(`       - Puntos Medición: ${p.puntosMedicion.length}`);
        console.log(`       - CCM: ${p.ccmList.length}`);
      });
    }
  });

  console.log('\n✅ Limpieza completada con éxito y sin errores.');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error fatal durante la ejecución:', err);
  process.exit(1);
});
