import XLSX from 'xlsx-js-style';

// Estilo de borde por defecto para toda la grilla
const defaultBorder = {
  top: { style: 'thin', color: { rgb: '94A3B8' } }, // Slate 400
  bottom: { style: 'thin', color: { rgb: '94A3B8' } },
  left: { style: 'thin', color: { rgb: '94A3B8' } },
  right: { style: 'thin', color: { rgb: '94A3B8' } }
};

// Generador de estilos para las celdas
const cellStyle = (options = {}) => {
  return {
    font: {
      name: 'Arial',
      sz: options.sz || 9,
      bold: !!options.bold,
      italic: !!options.italic,
      color: { rgb: options.textColor || '000000' }
    },
    fill: options.fill ? { fgColor: { rgb: options.fill } } : undefined,
    alignment: {
      horizontal: options.align || 'center',
      vertical: 'center',
      wrapText: true
    },
    border: options.noBorder ? undefined : defaultBorder
  };
};

// Helper para crear filas de metadatos con celdas combinadas para evitar cortes de borde
const crearFilaMetadata = (key1, val1, key2, val2) => {
  const row = [];
  
  // Clave 1 (Col A)
  row.push({ v: key1, s: cellStyle({ fill: 'E2E8F0', bold: true, align: 'left' }) });
  
  // Valor 1 (Col B-F)
  const valStyle1 = cellStyle({ align: 'left' });
  for (let i = 0; i < 5; i++) {
    row.push({ v: val1, s: valStyle1 });
  }

  // Clave 2 (Col G)
  row.push({ v: key2, s: cellStyle({ fill: 'E2E8F0', bold: true, align: 'left' }) });

  // Valor 2 (Col H-L)
  const valStyle2 = cellStyle({ align: 'left' });
  for (let i = 0; i < 5; i++) {
    row.push({ v: val2, s: valStyle2 });
  }

  return row;
};

export const exportTableroToExcel = (tablero) => {
  if (!tablero) return;

  const wsData = [];
  const merges = [];

  // --- TITULO PRINCIPAL (Fila 0) ---
  const titleStyle = cellStyle({ sz: 14, bold: true, textColor: 'FFFFFF', fill: '0F172A' });
  wsData.push(Array(12).fill({ v: 'INSPECCIÓN TÉCNICA DE TABLEROS ELÉCTRICOS', s: titleStyle }));
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 11 } });

  // --- SUBTITULO (Fila 1) ---
  const subStyle = cellStyle({ sz: 10, bold: true, textColor: 'FFFFFF', fill: '1E293B' });
  wsData.push(Array(12).fill({ 
    v: `Cliente: ${tablero.nombreEmpresa || 'General'}  |  Tablero: ${tablero.nombre}  |  Código/ID: ${tablero.id}`, 
    s: subStyle 
  }));
  merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 11 } });

  // Fila vacía (Fila 2)
  wsData.push(Array(12).fill({ v: '', s: cellStyle({ noBorder: true }) }));

  // --- CABECERAS SECCIÓN METADATOS (Fila 3) ---
  const metaHeaderLStyle = cellStyle({ sz: 10, bold: true, textColor: 'FFFFFF', fill: '475569', align: 'left' });
  const metaHeaderRStyle = cellStyle({ sz: 10, bold: true, textColor: 'FFFFFF', fill: '475569', align: 'left' });
  
  const metaHeaderRow = [];
  for (let i = 0; i < 6; i++) metaHeaderRow.push({ v: 'ESPECIFICACIONES DEL TABLERO', s: metaHeaderLStyle });
  for (let i = 0; i < 6; i++) metaHeaderRow.push({ v: 'VALORES MEDIDOS Y CONEXIONES', s: metaHeaderRStyle });
  wsData.push(metaHeaderRow);
  
  merges.push({ s: { r: 3, c: 0 }, e: { r: 3, c: 5 } });
  merges.push({ s: { r: 3, c: 6 }, e: { r: 3, c: 11 } });

  // --- METADATOS (Filas 4 a 8) ---
  const r4 = crearFilaMetadata('ID / Código:', tablero.id, 'Tensión A-B-C (V):', `Va: ${tablero.voltaje?.va || 0}V | Vb: ${tablero.voltaje?.vb || 0}V | Vc: ${tablero.voltaje?.vc || 0}V`);
  const r5 = crearFilaMetadata('Ubicación:', tablero.ubicacion, 'Corriente A-B-C (A):', `Ia: ${tablero.barrasPrincipales?.ia || 0}A | Ib: ${tablero.barrasPrincipales?.ib || 0}A | Ic: ${tablero.barrasPrincipales?.ic || 0}A`);
  const r6 = crearFilaMetadata('Alimentado por:', tablero.alimentadoPor, 'Breaker Principal:', `Marca: ${tablero.breakerPrincipal?.marca || 'N/A'} | Tipo: ${tablero.breakerPrincipal?.tipo || 'N/A'} | Amp: ${tablero.breakerPrincipal?.amp || 'N/A'}`);
  const r7 = crearFilaMetadata('Tipo de Tablero:', tablero.tipo, 'Neutro de Llegada:', `Calibre: ${tablero.neutroLlegada?.calibre || 'N/A'} | Obs: ${tablero.neutroLlegada?.observaciones || 'N/A'}`);
  const r8 = crearFilaMetadata('Acometida:', tablero.acometida, 'Puesta a Tierra:', `Calibre: ${tablero.puestaTierra?.calibre || 'N/A'} | Obs: ${tablero.puestaTierra?.observaciones || 'N/A'}`);
  
  wsData.push(r4, r5, r6, r7, r8);
  
  // Agregar fusiones de metadatos
  for (let r = 4; r <= 8; r++) {
    merges.push({ s: { r, c: 1 }, e: { r, c: 5 } });
    merges.push({ s: { r, c: 7 }, e: { r, c: 11 } });
  }

  // Fila vacía (Fila 9)
  wsData.push(Array(12).fill({ v: '', s: cellStyle({ noBorder: true }) }));

  // --- ENCABEZADO SECCIÓN CIRCUITOS (Fila 10) ---
  const circHeaderTitleStyle = cellStyle({ sz: 11, bold: true, textColor: 'FFFFFF', fill: '334155' });
  wsData.push(Array(12).fill({ v: 'DISTRIBUCIÓN Y DETALLES DE CIRCUITOS', s: circHeaderTitleStyle }));
  merges.push({ s: { r: 10, c: 0 }, e: { r: 10, c: 11 } });

  // --- CABECERAS DE COLUMNAS DE CIRCUITOS (Fila 11) ---
  const circColStyle = cellStyle({ sz: 9, bold: true, textColor: '000000', fill: 'F59E0B' }); // Fondo Ámbar
  wsData.push([
    { v: 'EQUIPO QUE ALIMENTA (IZQ)', s: circColStyle },
    { v: 'BREAKER MARCA', s: circColStyle },
    { v: 'BREAKER TIPO', s: circColStyle },
    { v: 'BREAKER AMP', s: circColStyle },
    { v: 'CONDUCTOR', s: circColStyle },
    { v: 'POLO', s: circColStyle },
    { v: 'POLO', s: circColStyle },
    { v: 'CONDUCTOR', s: circColStyle },
    { v: 'BREAKER AMP', s: circColStyle },
    { v: 'BREAKER TIPO', s: circColStyle },
    { v: 'BREAKER MARCA', s: circColStyle },
    { v: 'EQUIPO QUE ALIMENTA (DER)', s: circColStyle }
  ]);

  // --- CUERPO DE CIRCUITOS ---
  const maxPoles = tablero.maxPoles || 24;
  const processedCircuitIds = new Set();
  const startRow = 12;

  const stylePolo = cellStyle({ bold: true, fill: 'CBD5E1' }); // Gris para los polos del centro
  const styleNormal = cellStyle({ align: 'center' });
  const styleEquipos = cellStyle({ align: 'left' });
  const styleReserva = cellStyle({ align: 'left', italic: true, textColor: '64748B' });

  for (let pole = 1; pole <= maxPoles; pole += 2) {
    const oddPole = pole;
    const evenPole = pole + 1;
    const currentRow = [];

    // --- LADO IZQUIERDO (IMPAR) ---
    const cLeft = tablero.circuits?.find((c) => c.poles.includes(oddPole));
    if (cLeft) {
      const isFirst = oddPole === Math.min(...cLeft.poles);
      if (isFirst) {
        processedCircuitIds.add(cLeft.id);
        const textVal = cLeft.tipoDestino === 'SUB_TABLERO_PENDIENTE' 
          ? 'RESERVA (Pendiente por Crear)' 
          : (cLeft.equipo || 'RESERVA');
        
        currentRow.push(
          { v: textVal, s: textVal.startsWith('RESERVA') ? styleReserva : styleEquipos },
          { v: cLeft.breaker?.marca || '', s: styleNormal },
          { v: cLeft.breaker?.tipo || '', s: styleNormal },
          { v: cLeft.breaker?.amp || '', s: styleNormal },
          { v: cLeft.conductor || '', s: styleNormal },
          { v: cLeft.poles.join(', '), s: stylePolo }
        );
      } else {
        // Celda que continúa del polo anterior
        currentRow.push(
          { v: `(Continúa Polo ${Math.min(...cLeft.poles)})`, s: styleReserva },
          { v: '', s: styleNormal },
          { v: '', s: styleNormal },
          { v: '', s: styleNormal },
          { v: '', s: styleNormal },
          { v: oddPole, s: stylePolo }
        );
      }
    } else {
      // Reserva vacío
      currentRow.push(
        { v: 'RESERVA', s: styleReserva },
        { v: '', s: styleNormal },
        { v: '', s: styleNormal },
        { v: '', s: styleNormal },
        { v: '', s: styleNormal },
        { v: oddPole, s: stylePolo }
      );
    }

    // --- LADO DERECHO (PAR) ---
    const cRight = tablero.circuits?.find((c) => c.poles.includes(evenPole));
    if (cRight) {
      const isFirst = evenPole === Math.min(...cRight.poles);
      if (isFirst) {
        processedCircuitIds.add(cRight.id);
        const textVal = cRight.tipoDestino === 'SUB_TABLERO_PENDIENTE' 
          ? 'RESERVA (Pendiente por Crear)' 
          : (cRight.equipo || 'RESERVA');

        currentRow.push(
          { v: cRight.poles.join(', '), s: stylePolo },
          { v: cRight.conductor || '', s: styleNormal },
          { v: cRight.breaker?.amp || '', s: styleNormal },
          { v: cRight.breaker?.tipo || '', s: styleNormal },
          { v: cRight.breaker?.marca || '', s: styleNormal },
          { v: textVal, s: textVal.startsWith('RESERVA') ? styleReserva : styleEquipos }
        );
      } else {
        // Celda que continúa
        currentRow.push(
          { v: evenPole, s: stylePolo },
          { v: '', s: styleNormal },
          { v: '', s: styleNormal },
          { v: '', s: styleNormal },
          { v: '', s: styleNormal },
          { v: `(Continúa Polo ${Math.min(...cRight.poles)})`, s: styleReserva }
        );
      }
    } else {
      // Reserva vacío
      currentRow.push(
        { v: evenPole, s: stylePolo },
        { v: '', s: styleNormal },
        { v: '', s: styleNormal },
        { v: '', s: styleNormal },
        { v: '', s: styleNormal },
        { v: 'RESERVA', s: styleReserva }
      );
    }

    wsData.push(currentRow);
  }

  // --- OBSERVACIONES GENERALES (Final de la hoja) ---
  const lastRowIdx = wsData.length;
  wsData.push(Array(12).fill({ v: '', s: cellStyle({ noBorder: true }) })); // Fila vacía

  const obsHeaderStyle = cellStyle({ sz: 10, bold: true, textColor: 'FFFFFF', fill: '475569', align: 'left' });
  wsData.push(Array(12).fill({ v: 'OBSERVACIONES GENERALES Y RECOMENDACIONES', s: obsHeaderStyle }));
  merges.push({ s: { r: lastRowIdx + 1, c: 0 }, e: { r: lastRowIdx + 1, c: 11 } });

  const obsValStyle = cellStyle({ align: 'left' });
  wsData.push(Array(12).fill({ v: tablero.observacionesGenerales || 'Sin observaciones.', s: obsValStyle }));
  merges.push({ s: { r: lastRowIdx + 2, c: 0 }, e: { r: lastRowIdx + 2, c: 11 } });

  // Crear libro y añadir hoja
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Inyectar fusiones y anchos de columna
  ws['!merges'] = merges;
  ws['!cols'] = [
    { wch: 32 }, // Equipo Impar
    { wch: 16 }, // Breaker Marca
    { wch: 12 }, // Breaker Tipo
    { wch: 12 }, // Breaker Amp
    { wch: 12 }, // Conductor
    { wch: 8 },  // Polo Izq
    { wch: 8 },  // Polo Der
    { wch: 12 }, // Conductor
    { wch: 12 }, // Breaker Amp
    { wch: 12 }, // Breaker Tipo
    { wch: 16 }, // Breaker Marca
    { wch: 32 }  // Equipo Par
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Inspección');

  // Descargar archivo Excel
  const safeName = tablero.nombre.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  XLSX.writeFile(wb, `Reporte_Inspeccion_Tablero_${safeName}.xlsx`);
};
export default exportTableroToExcel;
