/**
 * Utilidad de cálculo de Potencia Eléctrica Estimada (kVA y kW) para Tableros y Paneles Eléctricos.
 * Cumple con normas COVENIN / IEC / IEEE para estimación de potencia aparente (kVA) y activa (kW).
 */

export const calcularPotenciaEstimadaTablero = (tablero) => {
  if (!tablero) {
    return {
      kva: 0,
      kw: 0,
      texto: '0.0 kVA',
      metodo: 'SIN_DATOS',
      etiquetaCorta: '0 kVA'
    };
  }

  // Parsear datos técnicos si vienen como string JSON
  let dt = tablero.datosTecnicos || tablero.parametrosTecnicos || tablero.ficha || {};
  if (typeof dt === 'string') {
    try {
      dt = JSON.parse(dt);
    } catch {
      dt = {};
    }
  }

  // Si ya tiene una potencia explícita definida en kva / kw
  if (dt.kva && !isNaN(parseFloat(dt.kva))) {
    const kvaVal = parseFloat(dt.kva);
    const kwVal = parseFloat(dt.kw || (kvaVal * 0.9).toFixed(1));
    return {
      kva: kvaVal,
      kw: kwVal,
      texto: `${kvaVal.toFixed(1)} kVA (${kwVal.toFixed(1)} kW)`,
      etiquetaCorta: `${kvaVal.toFixed(1)} kVA`,
      metodo: 'NOMINAL_DIRECTO'
    };
  }

  // Obtener voltaje línea-línea (V_LL) y línea-neutro (V_LN)
  let vLL = 208;
  let vLN = 120;
  let numFases = 3;

  const voltRaw = tablero.voltaje || dt.voltaje || dt.voltajeAcometida || dt.tension || '208/120 V';
  if (typeof voltRaw === 'string') {
    const match = voltRaw.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
    if (match) {
      vLL = parseFloat(match[1]);
      vLN = parseFloat(match[2]);
    } else {
      const singleMatch = voltRaw.match(/(\d+(?:\.\d+)?)/);
      if (singleMatch) {
        const val = parseFloat(singleMatch[1]);
        if (val > 300) {
          vLL = val;
          vLN = val / Math.sqrt(3);
        } else if (val <= 150) {
          vLN = val;
          vLL = val * Math.sqrt(3);
          numFases = 1;
        } else {
          vLL = val;
          vLN = val / Math.sqrt(3);
        }
      }
    }
  } else if (typeof voltRaw === 'object' && voltRaw !== null) {
    const va = parseFloat(voltRaw.va || voltRaw.vab || 0);
    const vb = parseFloat(voltRaw.vb || voltRaw.vbc || 0);
    const vc = parseFloat(voltRaw.vc || voltRaw.vca || 0);
    if (va > 0 || vb > 0 || vc > 0) {
      const vals = [va, vb, vc].filter(v => v > 0);
      const vAvg = vals.reduce((acc, v) => acc + v, 0) / vals.length;
      if (vAvg > 150) {
        vLL = vAvg;
        vLN = vAvg / Math.sqrt(3);
      } else {
        vLN = vAvg;
        vLL = vAvg * Math.sqrt(3);
      }
    }
  }

  // 1. Método Medición Operativa: Corrientes medidas en barras principales (IA, IB, IC)
  const barras = tablero.barrasPrincipales || dt.barrasPrincipales || {};
  const ia = parseFloat(barras.ia || 0);
  const ib = parseFloat(barras.ib || 0);
  const ic = parseFloat(barras.ic || 0);

  if (ia > 0 || ib > 0 || ic > 0) {
    const currents = [ia, ib, ic].filter(i => i > 0);
    const iAvg = currents.reduce((acc, i) => acc + i, 0) / currents.length;
    // Potencia trifásica: S = √3 * V_LL * I_prom
    const kvaCalculado = (Math.sqrt(3) * vLL * iAvg) / 1000;
    const kwCalculado = kvaCalculado * 0.9;

    return {
      kva: parseFloat(kvaCalculado.toFixed(1)),
      kw: parseFloat(kwCalculado.toFixed(1)),
      texto: `${kvaCalculado.toFixed(1)} kVA (${kwCalculado.toFixed(1)} kW)`,
      etiquetaCorta: `${kvaCalculado.toFixed(1)} kVA`,
      metodo: 'MEDICION_OPERATIVA'
    };
  }

  // 2. Método Sumatoria de Cargas Conectadas (Circuitos)
  const circuits = tablero.circuits || dt.circuits || [];
  let sumaWatts = 0;
  let sumaAmpCircuitos = 0;

  if (Array.isArray(circuits) && circuits.length > 0) {
    circuits.forEach(c => {
      const w = parseFloat(c.potenciaWatts || c.ficha?.potenciaWatts || 0);
      if (w > 0) sumaWatts += w;

      const amp = parseFloat(c.breaker?.amp || c.amperaje || 0);
      if (amp > 0) {
        const polesCount = Array.isArray(c.poles) ? c.poles.length : (c.numPolos || 1);
        sumaAmpCircuitos += amp * polesCount;
      }
    });
  }

  if (sumaWatts > 0) {
    const kwCalculado = sumaWatts / 1000;
    const kvaCalculado = kwCalculado / 0.9;
    return {
      kva: parseFloat(kvaCalculado.toFixed(1)),
      kw: parseFloat(kwCalculado.toFixed(1)),
      texto: `${kvaCalculado.toFixed(1)} kVA (${kwCalculado.toFixed(1)} kW)`,
      etiquetaCorta: `${kvaCalculado.toFixed(1)} kVA`,
      metodo: 'SUMATORIA_CARGAS'
    };
  }

  // 3. Método Capacidad del Breaker Principal (Protección General)
  const bp = tablero.breakerPrincipal || dt.breakerPrincipal || {};
  const breakerAmp = parseFloat(bp.amp || bp.amperaje || dt.amperajePrincipal || 0);

  if (breakerAmp > 0) {
    // S = √3 * V_LL * I_breaker
    const kvaCapacidad = (Math.sqrt(3) * vLL * breakerAmp) / 1000;
    const kwCapacidad = kvaCapacidad * 0.9;

    return {
      kva: parseFloat(kvaCapacidad.toFixed(1)),
      kw: parseFloat(kwCapacidad.toFixed(1)),
      texto: `${kvaCapacidad.toFixed(1)} kVA (${kwCapacidad.toFixed(1)} kW)`,
      etiquetaCorta: `${kvaCapacidad.toFixed(1)} kVA`,
      metodo: 'CAPACIDAD_BREAKER'
    };
  }

  // 4. Método Estimación por suma de breakers con factor de diversidad (40%)
  if (sumaAmpCircuitos > 0) {
    const iDiversificado = (sumaAmpCircuitos / 3) * 0.40;
    const kvaDiversificado = (Math.sqrt(3) * vLL * iDiversificado) / 1000;
    const kwDiversificado = kvaDiversificado * 0.9;

    return {
      kva: parseFloat(kvaDiversificado.toFixed(1)),
      kw: parseFloat(kwDiversificado.toFixed(1)),
      texto: `${kvaDiversificado.toFixed(1)} kVA (${kwDiversificado.toFixed(1)} kW)`,
      etiquetaCorta: `${kvaDiversificado.toFixed(1)} kVA`,
      metodo: 'DIVERSIDAD_CIRCUITOS'
    };
  }

  // 5. Fallback por número de polos
  const maxPoles = parseInt(dt.maxPoles || tablero.maxPoles || 24, 10);
  const kvaEstimadoPolos = (maxPoles * 0.8).toFixed(1);
  const kwEstimadoPolos = (kvaEstimadoPolos * 0.9).toFixed(1);

  return {
    kva: parseFloat(kvaEstimadoPolos),
    kw: parseFloat(kwEstimadoPolos),
    texto: `${kvaEstimadoPolos} kVA (${kwEstimadoPolos} kW)`,
    etiquetaCorta: `${kvaEstimadoPolos} kVA`,
    metodo: 'ESTIMADO_POLOS'
  };
};

export default calcularPotenciaEstimadaTablero;
