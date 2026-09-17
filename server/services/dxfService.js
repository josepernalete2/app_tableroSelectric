/**
 * Servicio de Generación de Diagramas Unifilares en formato AutoCAD DXF (Release 12 / AC1009)
 * Genera entidades CAD vectoriales: barras principales, interruptores, circuitos por polo/fase,
 * cuadros de carga y simbología normalizada (IEEE / NEMA / IEC).
 */

/**
 * Escapa y limpia cadenas de texto para compatibilidad con el estándar DXF.
 */
function cleanText(str) {
  if (!str) return '';
  return String(str)
    .replace(/[\r\n]+/g, ' ')
    .replace(/[\\^~]/g, '')
    .trim();
}

/**
 * Genera el contenido de una línea DXF.
 */
function dxfLine(layer, x1, y1, x2, y2, color = null) {
  let res = `0\nLINE\n8\n${layer}\n`;
  if (color !== null) {
    res += `62\n${color}\n`;
  }
  res += `10\n${x1.toFixed(2)}\n20\n${y1.toFixed(2)}\n30\n0.0\n`;
  res += `11\n${x2.toFixed(2)}\n21\n${y2.toFixed(2)}\n31\n0.0\n`;
  return res;
}

/**
 * Genera el contenido de un texto DXF.
 */
function dxfText(layer, x, y, height, text, align = 0, color = null) {
  const safeStr = cleanText(text);
  if (!safeStr) return '';
  let res = `0\nTEXT\n8\n${layer}\n`;
  if (color !== null) {
    res += `62\n${color}\n`;
  }
  res += `10\n${x.toFixed(2)}\n20\n${y.toFixed(2)}\n30\n0.0\n`;
  res += `40\n${height.toFixed(2)}\n`;
  res += `1\n${safeStr}\n`;
  if (align > 0) {
    res += `72\n${align}\n11\n${x.toFixed(2)}\n21\n${y.toFixed(2)}\n31\n0.0\n`;
  }
  return res;
}

/**
 * Genera un rectángulo cerrado como 4 líneas DXF.
 */
function dxfRect(layer, x, y, width, height, color = null) {
  return (
    dxfLine(layer, x, y, x + width, y, color) +
    dxfLine(layer, x + width, y, x + width, y + height, color) +
    dxfLine(layer, x + width, y + height, x, y + height, color) +
    dxfLine(layer, x, y + height, x, y, color)
  );
}

/**
 * Genera el símbolo estándar de un interruptor termomagnético / Breaker.
 */
function dxfBreakerSymbol(layer, x, y, size = 6, state = 'ACTIVO', color = null) {
  let res = '';
  // Marco del breaker
  res += dxfRect(layer, x - size / 2, y - size / 2, size, size, color);
  // Contacto diagonal interno
  res += dxfLine(layer, x - size / 2 + 1, y - size / 2 + 1, x + size / 2 - 1, y + size / 2 - 1, color);
  if (state === 'RESERVA' || state === 'DISPONIBLE') {
    // Línea punteada transversal o cruz para reserva
    res += dxfLine(layer, x - size / 2 + 1, y + size / 2 - 1, x + size / 2 - 1, y - size / 2 + 1, 8);
  }
  return res;
}

/**
 * Genera el contenido DXF completo para un tablero eléctrico y sus circuitos.
 */
export function generateTableroDXF(tablero = {}) {
  const nombreTablero = tablero.nombre || 'TABLERO_PRINCIPAL';
  const ubicacion = tablero.ubicacion || 'SALA_ELECTRICA';
  const tension = tablero.tension || '120/208V';
  const fases = tablero.fases || 3;
  const maxPolos = tablero.maxPolos || 42;
  const alimentador = tablero.alimentador?.nombre || tablero.alimentador?.origen || 'ACOMETIDA_PRINCIPAL';
  const capacidadAlimentador = tablero.alimentador?.capacidadAmperios ? `${tablero.alimentador.capacidadAmperios} A` : 'N/A';
  const circuitos = Array.isArray(tablero.circuitos) ? tablero.circuitos : [];

  const rows = Math.ceil(maxPolos / 2);
  const rowSpacing = 16;
  const columnWidth = 140;
  const busStartX = 200;
  const busStartY = 300;
  const busEndY = busStartY - (rows * rowSpacing) - 30;

  // 1. SECCIÓN HEADER
  let dxf = '0\nSECTION\n2\nHEADER\n';
  dxf += '9\n$ACADVER\n1\nAC1009\n';
  dxf += '9\n$INSUNITS\n70\n4\n'; // Milímetros
  dxf += '9\n$EXTMIN\n10\n0.0\n20\n0.0\n30\n0.0\n';
  dxf += `9\n$EXTMAX\n10\n${(busStartX * 2 + columnWidth * 2).toFixed(2)}\n20\n${(busStartY + 150).toFixed(2)}\n30\n0.0\n`;
  dxf += '0\nENDSEC\n';

  // 2. SECCIÓN TABLES (Capas con colores normalizados)
  dxf += '0\nSECTION\n2\nTABLES\n';
  dxf += '0\nTABLE\n2\nLAYER\n70\n8\n';

  const layers = [
    { name: '0', color: 7 },
    { name: 'FASE_A', color: 1 },        // Rojo (Fase A)
    { name: 'FASE_B', color: 2 },        // Amarillo (Fase B)
    { name: 'FASE_C', color: 5 },        // Azul (Fase C)
    { name: 'NEUTRO', color: 7 },        // Blanco/Gris
    { name: 'TIERRA', color: 3 },        // Verde
    { name: 'BARRAS_PRINCIPALES', color: 4 }, // Cian
    { name: 'INTERRUPTORES', color: 30 }, // Naranja
    { name: 'TEXTO_TITULO', color: 7 },
    { name: 'TEXTO_CIRCUITOS', color: 7 },
    { name: 'MARCO_ROTULO', color: 7 }
  ];

  for (const lay of layers) {
    dxf += `0\nLAYER\n2\n${lay.name}\n70\n0\n62\n${lay.color}\n6\nCONTINUOUS\n`;
  }

  dxf += '0\nENDTAB\n';
  dxf += '0\nENDSEC\n';

  // 3. SECCIÓN ENTITIES
  dxf += '0\nSECTION\n2\nENTITIES\n';

  // --- CUADRO DE RÓTULO / MEMBRETE SUPERIOR ---
  const boxX = 30;
  const boxY = busStartY + 80;
  const boxW = 400;
  const boxH = 55;

  dxf += dxfRect('MARCO_ROTULO', boxX, boxY, boxW, boxH, 7);
  dxf += dxfLine('MARCO_ROTULO', boxX, boxY + 35, boxX + boxW, boxY + 35, 7);
  dxf += dxfText('TEXTO_TITULO', boxX + 15, boxY + 40, 6, `DIAGRAMA UNIFILAR - TABLERO: ${nombreTablero}`, 0, 4);
  dxf += dxfText('TEXTO_CIRCUITOS', boxX + 15, boxY + 22, 3.5, `UBICACIÓN: ${ubicacion}   |   TENSIÓN: ${tension}   |   FASES: ${fases}F + N + T`, 0, 7);
  dxf += dxfText('TEXTO_CIRCUITOS', boxX + 15, boxY + 8, 3.5, `ALIMENTADOR: ${alimentador} (${capacidadAlimentador})   |   CAPACIDAD: ${maxPolos} POLOS`, 0, 7);

  // --- ACOMETIDA Y BARRAS PRINCIPALES ---
  const busSpacing = 6;
  const numBuses = fases === 1 ? 1 : fases === 2 ? 2 : 3;
  const busColors = [1, 2, 5]; // Rojo, Amarillo, Azul
  const busNames = ['A', 'B', 'C'];

  // Acometida superior hacia las barras
  dxf += dxfLine('BARRAS_PRINCIPALES', busStartX, busStartY + 70, busStartX, busStartY + 20, 4);
  dxf += dxfText('TEXTO_CIRCUITOS', busStartX + 5, busStartY + 50, 3.5, `LLEGADA: ${alimentador} (${capacidadAlimentador})`, 0, 4);
  dxf += dxfBreakerSymbol('INTERRUPTORES', busStartX, busStartY + 35, 8, 'ACTIVO', 4);

  // Dibujar barras verticales A, B, C
  for (let b = 0; b < numBuses; b++) {
    const bx = busStartX - ((numBuses - 1) * busSpacing / 2) + (b * busSpacing);
    dxf += dxfLine(`FASE_${busNames[b]}`, bx, busStartY + 10, bx, busEndY, busColors[b]);
    dxf += dxfText(`FASE_${busNames[b]}`, bx - 2, busStartY + 14, 3, `F${busNames[b]}`, 0, busColors[b]);
  }

  // Barra de Neutro y Tierra a los costados
  const neutroX = busStartX - 25;
  const tierraX = busStartX + 25;
  dxf += dxfLine('NEUTRO', neutroX, busStartY + 10, neutroX, busEndY, 7);
  dxf += dxfText('NEUTRO', neutroX - 4, busStartY + 14, 2.8, 'N', 0, 7);
  dxf += dxfLine('TIERRA', tierraX, busStartY + 10, tierraX, busEndY, 3);
  dxf += dxfText('TIERRA', tierraX - 4, busStartY + 14, 2.8, 'T', 0, 3);

  // --- MAPA DE CIRCUITOS POR POLO ---
  const circuitsByPole = new Map();
  for (const c of circuitos) {
    if (c.deletedAt) continue;
    const p = c.posicionPolo || 1;
    circuitsByPole.set(p, c);
  }

  for (let pole = 1; pole <= maxPolos; pole++) {
    const isOdd = pole % 2 === 1;
    const rowIndex = Math.floor((pole - 1) / 2);
    const yPos = busStartY - (rowIndex * rowSpacing);

    const circ = circuitsByPole.get(pole);
    const numPolos = circ?.numPolos || 1;
    const amperaje = circ?.amperaje ? `${circ.amperaje}A` : (circ?.breaker?.amp ? `${circ.breaker.amp}A` : '20A');
    const descripcion = circ?.descripcion || circ?.equipo || (circ ? `Circuito Polo ${pole}` : 'RESERVA');
    const estado = circ?.estado || (circ ? 'ACTIVO' : 'RESERVA');

    // Determinar fase
    const phaseIdx = Math.floor((pole - 1) / 2) % numBuses;
    const phaseName = busNames[phaseIdx] || 'A';
    const phaseColor = busColors[phaseIdx] || 7;
    const layerName = `FASE_${phaseName}`;

    if (isOdd) {
      // Columna Izquierda (Polos impares: 1, 3, 5, 7...)
      const connBusX = busStartX - ((numBuses - 1) * busSpacing / 2) + (phaseIdx * busSpacing);
      const startBranchX = busStartX - 15;
      const breakerX = startBranchX - 25;
      const endBranchX = breakerX - 25;
      const textX = endBranchX - 85;

      // Conexión desde barra hacia breaker
      dxf += dxfLine(layerName, connBusX, yPos, startBranchX, yPos, phaseColor);
      dxf += dxfLine(layerName, startBranchX, yPos, breakerX + 3, yPos, phaseColor);
      dxf += dxfBreakerSymbol('INTERRUPTORES', breakerX, yPos, 5, estado, phaseColor);
      dxf += dxfLine(layerName, breakerX - 3, yPos, endBranchX, yPos, phaseColor);

      // Círculo terminal / flecha de salida
      dxf += dxfLine(layerName, endBranchX, yPos - 1.5, endBranchX, yPos + 1.5, phaseColor);
      dxf += dxfLine(layerName, endBranchX, yPos + 1.5, endBranchX - 3, yPos, phaseColor);
      dxf += dxfLine(layerName, endBranchX, yPos - 1.5, endBranchX - 3, yPos, phaseColor);

      // Etiquetas descriptivas
      dxf += dxfText('TEXTO_CIRCUITOS', breakerX - 4, yPos + 4, 2.6, `${pole}`, 0, 7);
      dxf += dxfText('TEXTO_CIRCUITOS', breakerX - 8, yPos - 5.5, 2.4, `${numPolos}x${amperaje}`, 0, 4);
      dxf += dxfText('TEXTO_CIRCUITOS', textX, yPos + 1, 2.5, descripcion.slice(0, 26), 0, 7);
      dxf += dxfText('TEXTO_CIRCUITOS', textX, yPos - 4, 2.0, `[${phaseName}] ${estado}`, 0, phaseColor);

    } else {
      // Columna Derecha (Polos pares: 2, 4, 6, 8...)
      const connBusX = busStartX - ((numBuses - 1) * busSpacing / 2) + (phaseIdx * busSpacing);
      const startBranchX = busStartX + 15;
      const breakerX = startBranchX + 25;
      const endBranchX = breakerX + 25;
      const textX = endBranchX + 8;

      // Conexión desde barra hacia breaker
      dxf += dxfLine(layerName, connBusX, yPos, startBranchX, yPos, phaseColor);
      dxf += dxfLine(layerName, startBranchX, yPos, breakerX - 3, yPos, phaseColor);
      dxf += dxfBreakerSymbol('INTERRUPTORES', breakerX, yPos, 5, estado, phaseColor);
      dxf += dxfLine(layerName, breakerX + 3, yPos, endBranchX, yPos, phaseColor);

      // Círculo terminal / flecha de salida
      dxf += dxfLine(layerName, endBranchX, yPos - 1.5, endBranchX, yPos + 1.5, phaseColor);
      dxf += dxfLine(layerName, endBranchX, yPos + 1.5, endBranchX + 3, yPos, phaseColor);
      dxf += dxfLine(layerName, endBranchX, yPos - 1.5, endBranchX + 3, yPos, phaseColor);

      // Etiquetas descriptivas
      dxf += dxfText('TEXTO_CIRCUITOS', breakerX + 2, yPos + 4, 2.6, `${pole}`, 0, 7);
      dxf += dxfText('TEXTO_CIRCUITOS', breakerX - 4, yPos - 5.5, 2.4, `${numPolos}x${amperaje}`, 0, 4);
      dxf += dxfText('TEXTO_CIRCUITOS', textX, yPos + 1, 2.5, descripcion.slice(0, 26), 0, 7);
      dxf += dxfText('TEXTO_CIRCUITOS', textX, yPos - 4, 2.0, `[${phaseName}] ${estado}`, 0, phaseColor);
    }
  }

  // Fin de entidades
  dxf += '0\nENDSEC\n';
  dxf += '0\nEOF\n';

  return dxf;
}
