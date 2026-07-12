import prisma from './db.js';

try {
  console.log("Testing query...");
  const empresas = await prisma.empresa.findMany();
  console.log("✅ Query succeeded! Found", empresas.length, "companies.");
  process.exit(0);
} catch (e) {
  console.error("❌ Database query failed:", e);
  process.exit(1);
}
