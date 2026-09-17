/**
 * Utilidades de Cálculos Eléctricos (Capa 4 - Balance de Energía y Análisis de Potencia)
 * Diseñado conforme a normas eléctricas internacionales (NEMA MG-1, IEEE, NEC / COVENIN 200).
 */

const SQRT3 = Math.sqrt(3);

/**
 * Convierte de manera segura cualquier valor a número finito.
 */
function safeNum(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Parsea cadenas de texto con amperaje (e.g., '20A', '100 AMP', 50) a número flotante.
 */
export function parseAmpere(value) {
  if (value == null || value === '') return 0;
  const str = String(value).trim().toUpperCase();
  const cleaned = str.replace(/A$/, '').replace(/AMP/, '').trim();
  return safeNum(parseFloat(cleaned), 0);
}

/**
 * Parsea tensiones en formatos como "120/208V", "220/380V", "480/277V", "120/240V", "208V".
 */
export function parseVoltajes(tensionStr, defaultVLN = 120, defaultVLL = 208) {
  if (!tensionStr || typeof tensionStr !== 'string') {
    return { vln: defaultVLN, vll: defaultVLL };
  }
  const str = tensionStr.replace(/V/gi, '').trim();
  if (str.includes('/')) {
    const parts = str.split('/').map((s) => parseFloat(s.trim())).filter((n) => Number.isFinite(n) && n > 0);
    if (parts.length >= 2) {
      const minV = Math.min(parts[0], parts[1]);
      const maxV = Math.max(parts[0], parts[1]);
      return { vln: minV, vll: maxV };
    }
  }
  const single = parseFloat(str);
  if (Number.isFinite(single) && single > 0) {
    if (single <= 150) {
      return { vln: single, vll: Math.round(single * SQRT3) };
    } else {
      return { vln: Math.round(single / SQRT3), vll: single };
    }
  }
  return { vln: defaultVLN, vll: defaultVLL };
}

/**
 * Calcula la corriente nominal a partir de potencia aparente (VA/kVA), tensión y número de fases:
 * - 3-fases: I = S / (√3 × VLL)
 * - 1-fase / 2-fases: I = S / VLL (o V)
 */
export function corrienteNominal(config = {}) {
  const potenciaVA = safeNum(config.potenciaVA || (config.potenciaKVA ? config.potenciaKVA * 1000 : 0));
  const voltaje = safeNum(config.voltaje || config.voltajeLL || 208);
  const fases = Number(config.fases) === 1 ? 1 : Number(config.fases) === 2 ? 2 : 3;

  if (potenciaVA > 0 && voltaje > 0) {
    if (fases === 1 || config.tipoConexion === 'monofasico') {
      return Math.round((potenciaVA / voltaje) * 100) / 100;
    }
    if (fases === 2 || config.tipoConexion === 'bifasico') {
      return Math.round((potenciaVA / voltaje) * 100) / 100;
    }
    return Math.round((potenciaVA / (SQRT3 * voltaje)) * 100) / 100;
  }

  if (config.capacidadAmperios) {
    return parseAmpere(config.capacidadAmperios);
  }
  return 0;
}

/**
 * Retorna corrientes por fase A, B y C desglosadas con promedio y total.
 */
export function corrientePorFase(phases = {}) {
  const ia = parseAmpere(phases?.ia ?? phases?.a ?? phases?.currentA ?? 0);
  const ib = parseAmpere(phases?.ib ?? phases?.b ?? phases?.currentB ?? 0);
  const ic = parseAmpere(phases?.ic ?? phases?.c ?? phases?.currentC ?? 0);
  const total = ia + ib + ic;
  const promedio = total / 3;
  return {
    ia: Math.round(ia * 100) / 100,
    ib: Math.round(ib * 100) / 100,
    ic: Math.round(ic * 100) / 100,
    totalAmperaje: Math.round(total * 100) / 100,
    promedio: Math.round(promedio * 100) / 100,
    maxFase: Math.max(ia, ib, ic)
  };
}

/**
 * Calcula la carga total aparente (kVA), activa (kW) y reactiva (kVAR) global y por fase.
 * kVAR = kVA × sin(arccos(PF)) = kVA × √(1 - PF²)
 */
export function cargaTotal(phases = {}, tension = {}) {
  const ia = parseAmpere(phases?.ia ?? phases?.a ?? phases?.currentA ?? 0);
  const ib = parseAmpere(phases?.ib ?? phases?.b ?? phases?.currentB ?? 0);
  const ic = parseAmpere(phases?.ic ?? phases?.c ?? phases?.currentC ?? 0);

  let vln = safeNum(phases?.voltajeLN || tension?.vln || 0);
  let vll = safeNum(phases?.voltajeLL || phases?.voltaje || tension?.vll || 0);

  if (vln <= 0 && vll > 0) {
    vln = vll / SQRT3;
  } else if (vll <= 0 && vln > 0) {
    vll = vln * SQRT3;
  } else if (vln <= 0 && vll <= 0) {
    vln = 120;
    vll = 208;
  }

  const pfA = safeNum(phases?.a?.factorPotencia ?? phases?.factorPotencia?.a ?? phases?.factorPotencia ?? 0.90, 0.90);
  const pfB = safeNum(phases?.b?.factorPotencia ?? phases?.factorPotencia?.b ?? phases?.factorPotencia ?? 0.90, 0.90);
  const pfC = safeNum(phases?.c?.factorPotencia ?? phases?.factorPotencia?.c ?? phases?.factorPotencia ?? 0.90, 0.90);
  const pfAvg = safeNum(phases?.factorPotencia || (pfA + pfB + pfC) / 3, 0.90);
  const totalAmperaje = ia + ib + ic;

  const kvaA = (vln * ia) / 1000;
  const kvaB = (vln * ib) / 1000;
  const kvaC = (vln * ic) / 1000;
  const totalKVA = kvaA + kvaB + kvaC;

  const kwA = kvaA * pfA;
  const kwB = kvaB * pfB;
  const kwC = kvaC * pfC;
  const totalKW = kwA + kwB + kwC;

  const sinPhiA = Math.sqrt(Math.max(0, 1 - Math.pow(Math.min(1, Math.max(0, pfA)), 2)));
  const sinPhiB = Math.sqrt(Math.max(0, 1 - Math.pow(Math.min(1, Math.max(0, pfB)), 2)));
  const sinPhiC = Math.sqrt(Math.max(0, 1 - Math.pow(Math.min(1, Math.max(0, pfC)), 2)));

  const kvarA = kvaA * sinPhiA;
  const kvarB = kvaB * sinPhiB;
  const kvarC = kvaC * sinPhiC;
  const totalKVAR = kvarA + kvarB + kvarC;

  return {
    totalKW: Math.round(totalKW * 100) / 100,
    totalKVA: Math.round(totalKVA * 100) / 100,
    totalKVAR: Math.round(totalKVAR * 100) / 100,
    kvarTotal: Math.round(totalKVAR * 100) / 100,
    totalAmperaje: Math.round(totalAmperaje * 100) / 100,
    pfTotal: Math.round(pfAvg * 100) / 100,
    porFase: {
      A: { corriente: ia, kva: Math.round(kvaA * 100) / 100, kw: Math.round(kwA * 100) / 100, kvar: Math.round(kvarA * 100) / 100, pf: pfA },
      B: { corriente: ib, kva: Math.round(kvaB * 100) / 100, kw: Math.round(kwB * 100) / 100, kvar: Math.round(kvarB * 100) / 100, pf: pfB },
      C: { corriente: ic, kva: Math.round(kvaC * 100) / 100, kw: Math.round(kwC * 100) / 100, kvar: Math.round(kvarC * 100) / 100, pf: pfC }
    }
  };
}

/**
 * Calcula el porcentaje de desbalance por fase usando la norma estándar NEMA / IEEE:
 * max(|Ifase - Ipromedio| / Ipromedio) * 100
 */
export function porcentajeDesbalance(phases = {}, numFases = 3) {
  const ia = parseAmpere(phases?.ia ?? phases?.a ?? phases?.currentA ?? 0);
  const ib = parseAmpere(phases?.ib ?? phases?.b ?? phases?.currentB ?? 0);
  const ic = parseAmpere(phases?.ic ?? phases?.c ?? phases?.currentC ?? 0);

  const fasesCount = Math.max(1, numFases || 3);
  const totalAmps = ia + ib + ic;
  const promedio = totalAmps / fasesCount;

  if (promedio === 0) {
    return {
      a: 0,
      b: 0,
      c: 0,
      maxDesbalance: 0,
      promedio: 0,
      severidad: 'NORMAL',
      mensaje: 'Sin carga conectada.'
    };
  }

  const aPct = (Math.abs(ia - promedio) / promedio) * 100;
  const bPct = (Math.abs(ib - promedio) / promedio) * 100;
  const cPct = (Math.abs(ic - promedio) / promedio) * 100;
  const maxDesbalance = Math.max(aPct, bPct, cPct);

  let severidad = 'NORMAL';
  let mensaje = 'Balance de fases en rango aceptable (menor o igual a 5%).';
  if (maxDesbalance > 10) {
    severidad = 'CRÍTICO';
    mensaje = 'Desbalance severo (>10%). Riesgo de sobrecalentamiento de neutro y transformador.';
  } else if (maxDesbalance > 5) {
    severidad = 'MODERADO';
    mensaje = 'Desbalance moderado (>5%). Se recomienda redistribuir circuitos monofásicos.';
  }

  return {
    a: Math.round(aPct * 100) / 100,
    b: Math.round(bPct * 100) / 100,
    c: Math.round(cPct * 100) / 100,
    maxDesbalance: Math.round(maxDesbalance * 100) / 100,
    promedio: Math.round(promedio * 100) / 100,
    severidad,
    mensaje
  };
}

/**
 * Evalúa el factor de potencia promedio y por fase.
 */
export function factorPotencia(phases = {}) {
  const pfA = safeNum(phases?.a?.factorPotencia ?? phases?.factorPotencia?.a ?? phases?.factorPotencia ?? 0.90, 0.90);
  const pfB = safeNum(phases?.b?.factorPotencia ?? phases?.factorPotencia?.b ?? phases?.factorPotencia ?? 0.90, 0.90);
  const pfC = safeNum(phases?.c?.factorPotencia ?? phases?.factorPotencia?.c ?? phases?.factorPotencia ?? 0.90, 0.90);
  const promedio = (pfA + pfB + pfC) / 3;

  const getCalidad = (pf) => {
    if (pf >= 0.95) return 'ÓPTIMO';
    if (pf >= 0.90) return 'BUENO';
    if (pf >= 0.85) return 'ACEPTABLE';
    return 'BAJO (SUJETO A PENALIZACIÓN)';
  };

  return {
    a: Math.round(pfA * 100) / 100,
    b: Math.round(pfB * 100) / 100,
    c: Math.round(pfC * 100) / 100,
    promedio: Math.round(promedio * 100) / 100,
    pfTotal: Math.round(promedio * 100) / 100,
    calidad: getCalidad(promedio)
  };
}

/**
 * Clasifica la tipología de carga según perfil de potencia y uso.
 */
export function clasificarCarga(kw, pf = 0.9, tipoUso = '') {
  const uso = (tipoUso || '').toLowerCase();
  if (uso.includes('industrial') || uso.includes('motora') || uso.includes('ccm') || kw > 50) {
    return 'INDUSTRIAL';
  }
  if (uso.includes('comercial') || uso.includes('clima') || uso.includes('hvac') || kw > 10) {
    return 'COMERCIAL';
  }
  if (uso.includes('residencial') || (kw <= 10 && pf >= 0.85)) {
    return 'RESIDENCIAL';
  }
  return 'MIXTA';
}

/**
 * Verifica condiciones de sobrecarga frente a la capacidad nominal del alimentador o transformador.
 * Incluye alertas al 80% (carga continua NEC/Covenin) y >100% (sobrecarga crítica).
 */
export function verificarSobrecarga(carga = {}, capacidad = {}, fasesCurrents = {}, desbalance = {}) {
  const kvaCarga = safeNum(carga?.totalKVA);
  const kvaMax = safeNum(capacidad?.kva ?? capacidad?.capacidadKVA ?? capacidad?.maxKVA ?? capacidad?.transformadorKVA ?? 0);
  const ampMax = parseAmpere(capacidad?.amperaje ?? capacidad?.amperajeMax ?? capacidad?.capacidadAmperios ?? 0);
  const maxFaseAmp = Math.max(
    parseAmpere(fasesCurrents?.ia ?? 0),
    parseAmpere(fasesCurrents?.ib ?? 0),
    parseAmpere(fasesCurrents?.ic ?? 0)
  );

  const alertas = [];
  let sobrecargado = false;
  let porcentajeOcupacion = 0;
  let porcentajeOcupacionTransformador = 0;

  if (ampMax > 0) {
    porcentajeOcupacion = Math.round((maxFaseAmp / ampMax) * 10000) / 100;
    if (maxFaseAmp > ampMax) {
      sobrecargado = true;
      alertas.push({
        tipo: 'SOBRECARGA_AMP',
        mensaje: `Corriente de fase máxima (${maxFaseAmp.toFixed(1)} A) supera la capacidad nominal del alimentador (${ampMax} A).`,
        severidad: 'CRÍTICA'
      });
    } else if (maxFaseAmp > ampMax * 0.80) {
      alertas.push({
        tipo: 'ADVERTENCIA_80_PCT',
        mensaje: `Carga al ${porcentajeOcupacion}% supera el 80% de capacidad continua recomendada (NEC/COVENIN 200).`,
        severidad: 'ADVERTENCIA'
      });
    }
  }

  if (kvaMax > 0) {
    porcentajeOcupacionTransformador = Math.round((kvaCarga / kvaMax) * 10000) / 100;
    if (kvaCarga > kvaMax) {
      sobrecargado = true;
      alertas.push({
        tipo: 'SOBRECARGA_KVA',
        mensaje: `Potencia aparente total (${kvaCarga.toFixed(1)} kVA) supera la capacidad del transformador (${kvaMax.toFixed(1)} kVA).`,
        severidad: 'CRÍTICA'
      });
    } else if (kvaCarga > kvaMax * 0.80) {
      alertas.push({
        tipo: 'ADVERTENCIA_KVA_80_PCT',
        mensaje: `Potencia aparente (${kvaCarga.toFixed(1)} kVA) supera el 80% de capacidad continua del transformador (${kvaMax.toFixed(1)} kVA) [Ocupación: ${porcentajeOcupacionTransformador}%].`,
        severidad: 'ADVERTENCIA'
      });
    }
  }

  if (desbalance?.maxDesbalance > 5) {
    alertas.push({
      tipo: desbalance.maxDesbalance > 10 ? 'DESBALANCE_CRITICO' : 'DESBALANCE_ADVERTENCIA',
      mensaje: desbalance.maxDesbalance > 10
        ? `Desbalance severo (${desbalance.maxDesbalance}%). Riesgo de sobrecalentamiento de neutro y transformador.`
        : `Desbalance de carga del ${desbalance.maxDesbalance}% supera el límite recomendado del 5% (NEMA MG-1).`,
      severidad: desbalance.maxDesbalance > 10 ? 'CRÍTICA' : 'ADVERTENCIA'
    });
  }

  return {
    sobrecargado,
    porcentajeOcupacion,
    porcentajeOcupacionTransformador: kvaMax > 0 ? porcentajeOcupacionTransformador : null,
    capacidadNominalAmperios: ampMax,
    capacidadNominalKVA: kvaMax,
    alertas
  };
}

/**
 * Genera el arreglo de datos formateado para gráficas de Recharts.
 */
export function generarDatosRecharts({ fasesCurrents, carga, desbalance, pf, capacidadAmperios, tipoUso }) {
  const fases = ['A', 'B', 'C'];
  const ia = safeNum(fasesCurrents?.ia);
  const ib = safeNum(fasesCurrents?.ib);
  const ic = safeNum(fasesCurrents?.ic);
  const currents = { A: ia, B: ib, C: ic };
  const desbalances = { A: desbalance?.a ?? 0, B: desbalance?.b ?? 0, C: desbalance?.c ?? 0 };
  const pfs = { A: pf?.a ?? 0.9, B: pf?.b ?? 0.9, C: pf?.c ?? 0.9 };
  const cap = safeNum(capacidadAmperios);

  return fases.map((fase) => {
    const iVal = currents[fase] || 0;
    const faseCarga = carga?.porFase?.[fase] || {};
    const kw = faseCarga.kw || 0;
    const kva = faseCarga.kva || 0;
    const kvar = faseCarga.kvar || 0;
    const fp = pfs[fase] || 0.90;
    const ocupacion = cap > 0 ? Math.round((iVal / cap) * 10000) / 100 : null;

    return {
      name: `Fase ${fase}`,
      fase,
      corriente: Math.round(iVal * 100) / 100,
      corrienteNominal: cap > 0 ? cap : null,
      currentA: fase === 'A' ? iVal : 0,
      currentB: fase === 'B' ? iVal : 0,
      currentC: fase === 'C' ? iVal : 0,
      powerKW: Math.round(kw * 100) / 100,
      powerKVA: Math.round(kva * 100) / 100,
      powerKVAR: Math.round(kvar * 100) / 100,
      kvar: Math.round(kvar * 100) / 100,
      factorPotencia: fp,
      desbalance: desbalances[fase] || 0,
      porcentajeOcupacion: ocupacion,
      cargaTipo: clasificarCarga(kw, fp, tipoUso)
    };
  });
}

/**
 * Función principal que calcula balance completo de energía por fases.
 */
export function computeBalance(input = {}) {
  const phases = corrientePorFase(input.phases || {});
  const tension = parseVoltajes(input.tension || input.voltaje);
  const nominal = corrienteNominal({ ...input, voltaje: tension.vll });
  const carga = cargaTotal(phases, tension);
  const desbalance = porcentajeDesbalance(phases, input.fases || 3);
  const pf = factorPotencia(input.phases || { factorPotencia: input.factorPotencia });
  const capacidad = input.capacidad || {};
  const sobrecarga = verificarSobrecarga(carga, capacidad, phases, desbalance);

  const chartData = generarDatosRecharts({
    fasesCurrents: phases,
    carga,
    desbalance,
    pf,
    capacidadAmperios: capacidad.amperajeMax || capacidad.capacidadAmperios || nominal,
    tipoUso: input.tipoUso
  });

  return {
    nominalCurrent: nominal,
    tension: {
      lineaLinea: tension.vll,
      lineaNeutro: tension.vln
    },
    corrientesPorFase: {
      A: phases.ia,
      B: phases.ib,
      C: phases.ic,
      promedio: phases.promedio,
      total: phases.totalAmperaje
    },
    carga,
    kvarTotal: carga.kvarTotal,
    pfTotal: pf.pfTotal,
    desbalance,
    factorPotencia: pf,
    clasificacion: clasificarCarga(carga.totalKW, pf.promedio, input.tipoUso),
    sobrecarga,
    chartData,
    calculado: new Date().toISOString()
  };
}