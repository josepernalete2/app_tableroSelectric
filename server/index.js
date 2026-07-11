import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { crearTableroCompleto, obtenerTableros } from './controllers/tableroController.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Endpoints Principales de la Inspección Eléctrica
app.post('/api/tableros', crearTableroCompleto);
app.get('/api/tableros', obtenerTableros);

// Endpoint de Catálogos Paramétricos (Para poblar selects en el Frontend)
app.get('/api/catalogos', async (req, res) => {
  try {
    const [tiposElementos, breakers, conductores] = await Promise.all([
      prisma.tipoElemento.findMany({ orderBy: { nombre: 'asc' } }),
      prisma.catalogoBreaker.findMany({ orderBy: { amperaje: 'asc' } }),
      prisma.catalogoConductor.findMany({ orderBy: { calibre: 'asc' } }),
    ]);

    return res.json({
      ok: true,
      data: {
        tiposElementos,
        breakers,
        conductores,
      },
    });
  } catch (error) {
    console.error('Error al obtener catálogos:', error);
    return res.status(500).json({
      ok: false,
      error: 'Error al obtener los catálogos paramétricos.',
      details: error.message,
    });
  }
});

// Endpoint de Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', uptime: process.uptime(), date: new Date() });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor de Inspecciones Eléctricas corriendo en http://localhost:${PORT}`);
});
