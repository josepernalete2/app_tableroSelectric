import prisma from './server/db.js';

async function main() {
  console.log("Checking database...");
  try {
    const projects = await prisma.proyecto.findMany({
      include: {
        alimentadores: true
      }
    });
    console.log("Projects and their feeders count:");
    for (const p of projects) {
      console.log(`- Project "${p.nombre}" (ID: ${p.id}): ${p.alimentadores.length} feeders.`);
      if (p.alimentadores.length > 0) {
        console.log("Feeders list:", p.alimentadores);
      }
    }
  } catch (err) {
    console.error("Error reading database:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
