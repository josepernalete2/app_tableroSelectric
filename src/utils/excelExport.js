import XLSX from 'xlsx-js-style';

// Estilo de borde por defecto
const defaultBorder = {
  top: { style: 'thin', color: { rgb: '94A3B8' } },
  bottom: { style: 'thin', color: { rgb: '94A3B8' } },
  left: { style: 'thin', color: { rgb: '94A3B8' } },
  right: { style: 'thin', color: { rgb: '94A3B8' } }
};

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

// ============================================================================
// EXPORTAR UN SOLO ELEMENTO (PANEL ELÉCTRICO, TRANSFERENCIA, GENERADOR) A EXCEL
// ============================================================================
export const exportElementoToExcel = (element, companyName = '') => {
  if (!element) return;

  const wb = XLSX.utils.book_new();
  const wsData = [];
  const merges = [];

  const tipo = element.tipoElemento || 'TABLERO';
  const nombreElem = element.nombre || 'Elemento';

  // --- TITULO PRINCIPAL (Fila 0) ---
  const titleStyle = cellStyle({ sz: 14, bold: true, textColor: 'FFFFFF', fill: '0F172A' });
  const tituloSec = tipo === 'GENERADOR' 
    ? 'INSPECCIÓN TÉCNICA - GENERADOR DE EMERGENCIA' 
    : tipo === 'TRANSFER' 
    ? 'INSPECCIÓN TÉCNICA - TRANSFERENCIA AUTOMÁTICA (ATS/MTS)' 
    : 'INSPECCIÓN TÉCNICA - PANEL ELÉCTRICO DE DISTRIBUCIÓN';

  wsData.push(Array(8).fill({ v: tituloSec, s: titleStyle }));
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } });

  // --- SUBTITULO (Fila 1) ---
  const subStyle = cellStyle({ sz: 10, bold: true, textColor: 'FFFFFF', fill: '1E293B' });
  wsData.push(Array(8).fill({ 
    v: `Empresa: ${companyName || 'General'}  |  Equipo: ${nombreElem}  |  Ubicación: ${element.ubicacion || 'N/A'}`, 
    s: subStyle 
  }));
  merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 7 } });

  // Fila vacía (Fila 2)
  wsData.push(Array(8).fill({ v: '', s: cellStyle({ noBorder: true }) }));

  const dt = element.datosTecnicos || {};

  if (tipo === 'GENERADOR') {
    // --- PLANTILLA GENERADOR ---
    const hStyle = cellStyle({ sz: 11, bold: true, textColor: 'FFFFFF', fill: 'F59E0B' });
    wsData.push(Array(8).fill({ v: 'DATOS DE PLACA DEL GENERADOR', s: hStyle }));
    merges.push({ s: { r: 3, c: 0 }, e: { r: 3, c: 7 } });

    const keyStyle = cellStyle({ fill: 'F1F5F9', bold: true, align: 'left' });
    const valStyle = cellStyle({ align: 'left' });

    const params = [
      ['MARCA', dt.marca || 'DOMOSA', 'UNIDAD', 'PLACA'],
      ['FASES', dt.fases || '3', 'UNIDAD', 'FASE'],
      ['POTENCIA', dt.kva || dt.potenciaKva || '580', 'UNIDAD', 'KVA'],
      ['VOLTAJE', dt.voltajeGeneracion || dt.voltaje || '208', 'UNIDAD', 'VOL'],
      ['AMPERAJE', dt.amperaje || '800', 'UNIDAD', 'AMP'],
      ['FACTOR DE POTENCIA (FP)', dt.fp || '-', 'UNIDAD', '%'],
      ['COMBUSTIBLE', dt.combustible || 'DIÉSEL / GASOIL', 'UNIDAD', 'GALONES']
    ];

    params.forEach(([param, val, unitLabel, unitVal]) => {
      wsData.push([
        { v: param, s: keyStyle },
        { v: val, s: valStyle },
        { v: '', s: valStyle },
        { v: '', s: valStyle },
        { v: unitLabel, s: keyStyle },
        { v: unitVal, s: valStyle },
        { v: '', s: valStyle },
        { v: '', s: valStyle }
      ]);
      const r = wsData.length - 1;
      merges.push({ s: { r, c: 1 }, e: { r, c: 3 } });
      merges.push({ s: { r, c: 5 }, e: { r, c: 7 } });
    });

    // Sub-sección Interruptor
    wsData.push(Array(8).fill({ v: '', s: cellStyle({ noBorder: true }) }));
    const rInt = wsData.length;
    wsData.push(Array(8).fill({ v: 'INTERRUPTOR DEL GENERADOR', s: hStyle }));
    merges.push({ s: { r: rInt, c: 0 }, e: { r: rInt, c: 7 } });

    const intHeaders = ['INTERRUPTOR', 'MARCA', 'TIPO', 'AMP', 'COND. FASE', 'COND. NEUTRO', '', ''];
    wsData.push(intHeaders.map(h => ({ v: h, s: cellStyle({ fill: 'CBD5E1', bold: true }) })));

    const intData = [
      'GENERADOR',
      dt.interruptor?.marca || dt.interruptorMarca || 'CHINT',
      dt.interruptor?.tipo || dt.interruptorTipo || '-',
      dt.interruptor?.amp || dt.interruptorAmp || '1600',
      dt.interruptor?.condFase || dt.condFase || '2(3X500)',
      dt.interruptor?.condNeutro || dt.condNeutro || '500',
      '', ''
    ];
    wsData.push(intData.map(d => ({ v: d, s: valStyle })));

  } else if (tipo === 'TRANSFER') {
    // --- PLANTILLA TRANSFERENCIA ---
    const hStyle = cellStyle({ sz: 11, bold: true, textColor: 'FFFFFF', fill: '10B981' });
    wsData.push(Array(8).fill({ v: 'ESPECIFICACIONES DE TRANSFERENCIA (ATS/MTS)', s: hStyle }));
    merges.push({ s: { r: 3, c: 0 }, e: { r: 3, c: 7 } });

    const keyStyle = cellStyle({ fill: 'F1F5F9', bold: true, align: 'left' });
    const valStyle = cellStyle({ align: 'left' });

    const rowsT = [
      ['MODELO', dt.modelo || 'DOMOSA', 'TIPO TRANSFERENCIA', dt.tipoTransferencia || 'YUYE-YES1 3200/4P'],
      ['CAPACIDAD (AMP)', dt.amperaje || dt.capacidadAmperios || '3200', 'MEDICIÓN VOLTAJE', `VAB: ${dt.voltaje?.vab || '211'}V | VAC: ${dt.voltaje?.vac || '208'}V | VBC: ${dt.voltaje?.vbc || '209'}V`],
      ['ALIMENTACIÓN GEN 1 / CORPOELEC', dt.alimentacionGenerador1 || dt.alimentacionCorpoelec || '2(3X500)', 'ALIMENTACIÓN GEN 2 / DOMOSA', dt.alimentacionGenerador2 || dt.alimentacionTransfDomosa || '2(3X500)'],
      ['CARGA', dt.carga || '2(3X500)', 'NEUTRO', dt.neutro || '500'],
      ['TIERRA', dt.tierra || 'NO', 'OBSERVACIÓN', dt.observacionTransferencia || 'TRANSFERENCIA ALIMENTADA POR LOS DOS GENERADORES']
    ];

    rowsT.forEach(([k1, v1, k2, v2]) => {
      wsData.push([
        { v: k1, s: keyStyle },
        { v: v1, s: valStyle },
        { v: '', s: valStyle },
        { v: '', s: valStyle },
        { v: k2, s: keyStyle },
        { v: v2, s: valStyle },
        { v: '', s: valStyle },
        { v: '', s: valStyle }
      ]);
      const r = wsData.length - 1;
      merges.push({ s: { r, c: 1 }, e: { r, c: 3 } });
      merges.push({ s: { r, c: 5 }, e: { r, c: 7 } });
    });

  } else {
    // --- PLANTILLA PANEL ELÉCTRICO / TABLERO ---
    return exportTableroToExcel(element);
  }

  // Observaciones generales al final
  const rLast = wsData.length;
  wsData.push(Array(8).fill({ v: '', s: cellStyle({ noBorder: true }) }));
  wsData.push(Array(8).fill({ v: 'OBSERVACIONES GENERALES E INFORME TÉCNICO', s: cellStyle({ fill: '334155', textColor: 'FFFFFF', bold: true, align: 'left' }) }));
  merges.push({ s: { r: rLast + 1, c: 0 }, e: { r: rLast + 1, c: 7 } });

  wsData.push(Array(8).fill({ v: element.observacionesGenerales || 'Sin observaciones.', s: cellStyle({ align: 'left' }) }));
  merges.push({ s: { r: rLast + 2, c: 0 }, e: { r: rLast + 2, c: 7 } });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!merges'] = merges;
  ws['!cols'] = Array(8).fill({ wch: 22 });

  XLSX.utils.book_append_sheet(wb, ws, tipo);

  const safeName = nombreElem.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  XLSX.writeFile(wb, `Ficha_Tecnica_${tipo}_${safeName}.xlsx`);
};

// ============================================================================
// EXPORTAR TABLERO INDIVIDUAL A EXCEL
// ============================================================================
export const exportTableroToExcel = (tablero) => {
  if (!tablero) return;

  const wsData = [];
  const merges = [];

  const titleStyle = cellStyle({ sz: 14, bold: true, textColor: 'FFFFFF', fill: '0F172A' });
  wsData.push(Array(12).fill({ v: 'INFORMACIÓN GENERAL DE TABLERO / PANEL ELÉCTRICO', s: titleStyle }));
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 11 } });

  const subStyle = cellStyle({ sz: 10, bold: true, textColor: 'FFFFFF', fill: '1E293B' });
  wsData.push(Array(12).fill({ 
    v: `Empresa: ${tablero.nombreEmpresa || 'General'}  |  Tablero: ${tablero.nombre}  |  Ubicación: ${tablero.ubicacion || 'N/A'}`, 
    s: subStyle 
  }));
  merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 11 } });

  wsData.push(Array(12).fill({ v: '', s: cellStyle({ noBorder: true }) }));

  // Metadatos Tablero
  const keyStyle = cellStyle({ fill: 'E2E8F0', bold: true, align: 'left' });
  const valStyle = cellStyle({ align: 'left' });

  const addMetaRow = (k1, v1, k2, v2) => {
    const row = [{ v: k1, s: keyStyle }];
    for (let i = 0; i < 5; i++) row.push({ v: v1, s: valStyle });
    row.push({ v: k2, s: keyStyle });
    for (let i = 0; i < 5; i++) row.push({ v: v2, s: valStyle });
    wsData.push(row);

    const r = wsData.length - 1;
    merges.push({ s: { r, c: 1 }, e: { r, c: 5 } });
    merges.push({ s: { r, c: 7 }, e: { r, c: 11 } });
  };

  addMetaRow('Tablero Alimentado Por:', tablero.alimentadoPor || 'ATS SÓTANO 580', 'Tipo de Tablero:', tablero.tipo || 'SUPERFICIAL');
  addMetaRow('Breaker Principal:', `Marca: ${tablero.breakerPrincipal?.marca || 'SIN BREAKER'} | Amp: ${tablero.breakerPrincipal?.amp || '-'}`, 'Voltaje Medido:', `Ia: ${tablero.barrasPrincipales?.ia || '211,5'}V | Ib: ${tablero.barrasPrincipales?.ib || '207,4'}V | Ic: ${tablero.barrasPrincipales?.ic || '208,6'}V`);
  addMetaRow('Acometida Entrada:', tablero.acometida || '3X500 MCM', 'Neutro de Llegada:', `Calibre: ${tablero.neutroLlegada?.calibre || '1X500'} | Obs: ${tablero.neutroLlegada?.observaciones || 'CABLE ROJO'}`);
  addMetaRow('Puesta a Tierra:', `Calibre: ${tablero.puestaTierra?.calibre || 'SOLIDO #4'} | Obs: ${tablero.puestaTierra?.observaciones || 'MALLA A TIERRA'}`, 'Polos Máximos:', `${tablero.maxPoles || 30} Polos`);

  wsData.push(Array(12).fill({ v: '', s: cellStyle({ noBorder: true }) }));

  // Sección Circuitos
  const circColStyle = cellStyle({ sz: 9, bold: true, textColor: '000000', fill: 'F59E0B' });
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

  const maxPoles = tablero.maxPoles || 30;
  const stylePolo = cellStyle({ bold: true, fill: 'CBD5E1' });
  const styleNormal = cellStyle({ align: 'center' });
  const styleEquipos = cellStyle({ align: 'left' });
  const styleReserva = cellStyle({ align: 'left', italic: true, textColor: '64748B' });

  for (let pole = 1; pole <= maxPoles; pole += 2) {
    const oddPole = pole;
    const evenPole = pole + 1;
    const currentRow = [];

    const cLeft = tablero.circuits?.find((c) => c.poles.includes(oddPole));
    if (cLeft) {
      const textVal = cLeft.equipo || 'RESERVA';
      currentRow.push(
        { v: textVal, s: textVal === 'RESERVA' ? styleReserva : styleEquipos },
        { v: cLeft.breaker?.marca || '', s: styleNormal },
        { v: cLeft.breaker?.tipo || '', s: styleNormal },
        { v: cLeft.breaker?.amp || '', s: styleNormal },
        { v: cLeft.conductor || '', s: styleNormal },
        { v: cLeft.poles.join(', '), s: stylePolo }
      );
    } else {
      currentRow.push(
        { v: 'RESERVA', s: styleReserva },
        { v: '', s: styleNormal }, { v: '', s: styleNormal }, { v: '', s: styleNormal }, { v: '', s: styleNormal },
        { v: oddPole, s: stylePolo }
      );
    }

    const cRight = tablero.circuits?.find((c) => c.poles.includes(evenPole));
    if (cRight) {
      const textVal = cRight.equipo || 'RESERVA';
      currentRow.push(
        { v: cRight.poles.join(', '), s: stylePolo },
        { v: cRight.conductor || '', s: styleNormal },
        { v: cRight.breaker?.amp || '', s: styleNormal },
        { v: cRight.breaker?.tipo || '', s: styleNormal },
        { v: cRight.breaker?.marca || '', s: styleNormal },
        { v: textVal, s: textVal === 'RESERVA' ? styleReserva : styleEquipos }
      );
    } else {
      currentRow.push(
        { v: evenPole, s: stylePolo },
        { v: '', s: styleNormal }, { v: '', s: styleNormal }, { v: '', s: styleNormal }, { v: '', s: styleNormal },
        { v: 'RESERVA', s: styleReserva }
      );
    }

    wsData.push(currentRow);
  }

  // Observaciones generales al final
  const lastRowIdx = wsData.length;
  wsData.push(Array(12).fill({ v: '', s: cellStyle({ noBorder: true }) }));
  wsData.push(Array(12).fill({ v: 'OBSERVACIÓN GENERAL:', s: cellStyle({ fill: 'FEF08A', textColor: '000000', bold: true, align: 'left' }) }));
  merges.push({ s: { r: lastRowIdx + 1, c: 0 }, e: { r: lastRowIdx + 1, c: 11 } });

  wsData.push(Array(12).fill({ v: tablero.observacionesGenerales || 'Sin observaciones.', s: cellStyle({ align: 'left' }) }));
  merges.push({ s: { r: lastRowIdx + 2, c: 0 }, e: { r: lastRowIdx + 2, c: 11 } });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ws['!merges'] = merges;
  ws['!cols'] = [
    { wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 8 },
    { wch: 8 },  { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 30 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Panel Eléctrico');

  const safeName = (tablero.nombre || 'tablero').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  XLSX.writeFile(wb, `Panel_Electrico_${safeName}.xlsx`);
};

// ============================================================================
// EXPORTAR INFORME COMPLETO DE LA EMPRESA A EXCEL (MULTISHEET WORKBOOK)
// ============================================================================
export const exportCompanyToExcel = (company) => {
  if (!company) return;

  const wb = XLSX.utils.book_new();

  // Hoja 1: Resumen General de la Empresa
  const summaryData = [
    Array(4).fill({ v: `INFORME TÉCNICO COMPLETO - ${company.nombre.toUpperCase()}`, s: cellStyle({ sz: 14, bold: true, textColor: 'FFFFFF', fill: '0F172A' }) }),
    Array(4).fill({ v: `Total Proyectos: ${company.proyectos?.length || 0}  |  Fecha de Generación: ${new Date().toLocaleDateString('es-ES')}`, s: cellStyle({ sz: 10, bold: true, textColor: 'FFFFFF', fill: '1E293B' }) }),
    Array(4).fill({ v: '', s: cellStyle({ noBorder: true }) }),
    [
      { v: 'PROYECTO', s: cellStyle({ fill: 'F59E0B', bold: true }) },
      { v: 'EQUIPO / PLANTILLA', s: cellStyle({ fill: 'F59E0B', bold: true }) },
      { v: 'TIPO', s: cellStyle({ fill: 'F59E0B', bold: true }) },
      { v: 'UBICACIÓN', s: cellStyle({ fill: 'F59E0B', bold: true }) }
    ]
  ];

  const merges = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }
  ];

  company.proyectos?.forEach((p) => {
    const elList = p.elementosUnifilares || p.tableros || [];
    elList.forEach((el) => {
      summaryData.push([
        { v: p.nombre, s: cellStyle({ align: 'left' }) },
        { v: el.nombre, s: cellStyle({ align: 'left', bold: true }) },
        { v: el.tipoElemento, s: cellStyle({ align: 'center' }) },
        { v: el.ubicacion || 'N/A', s: cellStyle({ align: 'left' }) }
      ]);
    });
  });

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!merges'] = merges;
  wsSummary['!cols'] = [{ wch: 35 }, { wch: 35 }, { wch: 20 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen Empresa');

  // Agregar cada equipo como hoja individual en el libro Excel
  company.proyectos?.forEach((p) => {
    const elList = p.elementosUnifilares || p.tableros || [];
    elList.forEach((el, index) => {
      const sheetName = `${el.tipoElemento}_${index + 1}`.slice(0, 31);
      const wsData = [];
      const sheetMerges = [];

      wsData.push(Array(6).fill({ v: `PROYECTO: ${p.nombre.toUpperCase()} - ${el.nombre.toUpperCase()}`, s: cellStyle({ sz: 12, bold: true, textColor: 'FFFFFF', fill: '0F172A' }) }));
      sheetMerges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } });

      wsData.push([
        { v: 'PARÁMETRO', s: cellStyle({ fill: 'E2E8F0', bold: true }) },
        { v: 'VALOR', s: cellStyle({ fill: 'E2E8F0', bold: true }) },
        { v: '', s: cellStyle({ fill: 'E2E8F0' }) },
        { v: '', s: cellStyle({ fill: 'E2E8F0' }) },
        { v: '', s: cellStyle({ fill: 'E2E8F0' }) },
        { v: '', s: cellStyle({ fill: 'E2E8F0' }) }
      ]);
      sheetMerges.push({ s: { r: 1, c: 1 }, e: { r: 1, c: 5 } });

      wsData.push([{ v: 'Nombre del Equipo:', s: cellStyle({ align: 'left', bold: true }) }, { v: el.nombre, s: cellStyle({ align: 'left' }) }, { v: '', s: cellStyle() }, { v: '', s: cellStyle() }, { v: '', s: cellStyle() }, { v: '', s: cellStyle() }]);
      sheetMerges.push({ s: { r: 2, c: 1 }, e: { r: 2, c: 5 } });

      wsData.push([{ v: 'Ubicación Física:', s: cellStyle({ align: 'left', bold: true }) }, { v: el.ubicacion || 'N/A', s: cellStyle({ align: 'left' }) }, { v: '', s: cellStyle() }, { v: '', s: cellStyle() }, { v: '', s: cellStyle() }, { v: '', s: cellStyle() }]);
      sheetMerges.push({ s: { r: 3, c: 1 }, e: { r: 3, c: 5 } });

      wsData.push([{ v: 'Alimentado Por:', s: cellStyle({ align: 'left', bold: true }) }, { v: el.alimentadoPor || 'N/A', s: cellStyle({ align: 'left' }) }, { v: '', s: cellStyle() }, { v: '', s: cellStyle() }, { v: '', s: cellStyle() }, { v: '', s: cellStyle() }]);
      sheetMerges.push({ s: { r: 4, c: 1 }, e: { r: 4, c: 5 } });

      wsData.push([{ v: 'Observaciones:', s: cellStyle({ align: 'left', bold: true }) }, { v: el.observacionesGenerales || 'Sin observaciones.', s: cellStyle({ align: 'left' }) }, { v: '', s: cellStyle() }, { v: '', s: cellStyle() }, { v: '', s: cellStyle() }, { v: '', s: cellStyle() }]);
      sheetMerges.push({ s: { r: 5, c: 1 }, e: { r: 5, c: 5 } });

      const wsEl = XLSX.utils.aoa_to_sheet(wsData);
      wsEl['!merges'] = sheetMerges;
      wsEl['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsEl, sheetName);
    });
  });

  const safeCompany = company.nombre.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  XLSX.writeFile(wb, `Informe_Completo_Empresa_${safeCompany}.xlsx`);
};

export default exportElementoToExcel;
