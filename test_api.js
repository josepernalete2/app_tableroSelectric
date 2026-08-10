import prisma from './server/db.js';
import fetch from 'node-fetch'; // wait, node-fetch is not in package.json, but we can use global fetch in Node.js 18+

async function main() {
  console.log("Checking users...");
  try {
    const users = await prisma.user.findMany();
    console.log("Users in DB:", users.map(u => ({ id: u.id, username: u.username, role: u.role, password: u.password })));

    if (users.length === 0) {
      console.log("No users found to authenticate with.");
      return;
    }

    const testUser = users[0];
    console.log(`Attempting login for user: ${testUser.username}`);

    const loginRes = await fetch("http://localhost:3001/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: testUser.username, password: testUser.password })
    });

    const loginData = await loginRes.json();
    console.log("Login result:", loginData);

    if (!loginData.ok) {
      console.error("Login failed!");
      return;
    }

    const token = loginData.token;

    // Try adding a test alimentador
    console.log("Attempting to add a feeder...");
    const proj = await prisma.proyecto.findFirst();
    if (!proj) {
      console.log("No project found to associate feeder with.");
      return;
    }

    const feederPayload = {
      id: "test-feeder-uuid-1",
      nombre: "Alimentador Prueba 1",
      origen: "Subestacion A",
      capacidadAmperios: 200,
      proyectoId: proj.id
    };

    console.log("Feeder payload:", feederPayload);

    const postRes = await fetch("http://localhost:3001/api/alimentadores", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(feederPayload)
    });

    console.log("POST status:", postRes.status);
    const postData = await postRes.json();
    console.log("POST result:", postData);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
