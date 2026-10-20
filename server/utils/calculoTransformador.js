/**
 * ============================================================================
 * BACKEND: MÓDULO DE CÁLCULO ELÉCTRICO Y ESQUEMAS DE TRANSFORMADORES
 * Normas de Referencia: IEEE C57.12.00, CEN 200 (NEC), COVENIN 159:1997 / 536
 * ============================================================================
 */

export const TIPOS_CONEXION_TRAFO = [
  {
    id: 'TRIFASICO_ESTRELLA',
    label: 'Trifásico Estrella (3F - 4H, ej. 208Y/120V, 480Y/277V)',
    shortLabel: '3F - 4H Estrella (Y)',
    fases: 3,
    hilos: 4,
    esTrifasico: true,
    tensionSecundariaSugerida: '208Y/120 V',
    tensionPrimariaSugerida: '13.8 kV',
    descripcion: 'Configuración trifásica estándar con neutro aterrizado en estrella secundaria.'
  },
  {
    id: 'TRIFASICO_DELTA',
    label: 'Trifásico Delta (3F - 3H / 4H, ej. 240V / 480V)',
    shortLabel: '3F - 3H/4H Delta (Δ)',
    fases: 3,
    hilos: 3,
    esTrifasico: true,
    tensionSecundariaSugerida: '240▲',
    tensionPrimariaSugerida: '13.8 kV',
    descripcion: 'Configuración trifásica en delta cerrada para cargas de fuerza o industriales.'
  },
  {
    id: 'TRIFASICO_DELTA_ABIERTO',
    label: 'Trifásico Delta Abierto (Banco de 2 transformadores en V-V)',
    shortLabel: '3F - Banco Delta Abierto (V-V)',
    fases: 3,
    hilos: 3,
    esTrifasico: true,
    tensionSecundariaSugerida: '240▲',
    tensionPrimariaSugerida: '13.8 kV',
    descripcion: 'Banco de 2 transformadores monofásicos operando en V-V (capacidad efectiva 57.7% del banco de 3).'
  },
  {
    id: 'MONOFASICO',
    label: 'Monofásico (1F - 2H / 3H, ej. 120/240V)',
    shortLabel: '1F - 2H/3H Monofásico',
    fases: 1,
    hilos: 2,
    esTrifasico: false,
    tensionSecundariaSugerida: '120/240 V',
    tensionPrimariaSugerida: '13.8 kV',
    descripcion: 'Transformador monofásico con secundario de 2 o 3 hilos (toma central 120/240V).'
  },
  {
    id: 'BIFASICO',
    label: 'Bifásico (2F - 3H)',
    shortLabel: '2F - 3H Bifásico',
    fases: 2,
    hilos: 3,
    esTrifasico: false,
    tensionSecundariaSugerida: '120/240 V',
    tensionPrimariaSugerida: '13.8 kV',
    descripcion: 'Alimentación a dos fases y neutro para distribución bifásica.'
  }
];

const SQRT3 = Math.sqrt(3);

/**
 * Parsea y normaliza la potencia en kVA.
 */
export function parsePotenciaKva(potenciaVal, unidad = 'kVA') {
  if (potenciaVal == null || potenciaVal === '') return null;
  const str = String(potenciaVal).replace(/,/g, '.').trim();
  const isMva = /mva/i.test(str) || String(unidad).toUpperCase() === 'MVA';
  const cleanNum = parseFloat(str.replace(/[^0-9.]/g, ''));
  if (isNaN(cleanNum) || cleanNum <= 0) return null;

  if (isMva) {
    return cleanNum * 1000;
  }
  return cleanNum;
}

/**
 * Parsea y normaliza la tensión primaria a Voltios (V).
 */
export function parseVoltajePrimario(tensionVal, unidad = 'kV') {
  if (tensionVal == null || tensionVal === '') return null;
  const str = String(tensionVal).replace(/,/g, '.').trim();

  const kvMatch = str.match(/([0-9]+(?:\.[0-9]+)?)\s*k[vV]/i);
  if (kvMatch) {
    const val = parseFloat(kvMatch[1]);
    return val > 0 ? val * 1000 : null;
  }

  const vMatch = str.match(/([0-9]+(?:\.[0-9]+)?)\s*V(?![a-zA-Z])/i);
  if (vMatch) {
    const vVal = parseFloat(vMatch[1]);
    if (vVal < 100 && String(unidad).toUpperCase() === 'KV') {
      return vVal * 1000;
    }
    return vVal > 0 ? vVal : null;
  }

  const cleanNum = parseFloat(str.replace(/[^0-9.]/g, ''));
  if (isNaN(cleanNum) || cleanNum <= 0) return null;

  if (cleanNum >= 1000) {
    return cleanNum;
  }

  if (String(unidad).toUpperCase() === 'KV' || cleanNum <= 100) {
    return cleanNum * 1000;
  }

  return cleanNum;
}

/**
 * Parsea y normaliza la tensión secundaria a Voltios (V).
 */
export function parseVoltajeSecundario(tensionVal) {
  if (tensionVal == null || tensionVal === '') return null;
  const str = String(tensionVal).replace(/,/g, '.').trim();

  const slashMatch = str.match(/([0-9]+(?:\.[0-9]+)?)[^\d/]*\/[^\d/]*([0-9]+(?:\.[0-9]+)?)/);
  if (slashMatch) {
    const vA = parseFloat(slashMatch[1]);
    const vB = parseFloat(slashMatch[2]);
    if (!isNaN(vA) && !isNaN(vB)) {
      return Math.max(vA, vB);
    }
  }

  const numMatch = str.match(/([0-9]+(?:\.[0-9]+)?)/);
  if (numMatch) {
    const val = parseFloat(numMatch[1]);
    return val > 0 ? val : null;
  }

  return null;
}

/**
 * Normaliza cualquier esquema de conexión recibido a uno de los 5 tipos canónicos.
 */
export function normalizarTipoConexion(tipoConexion, conexionLegacy = '', fasesLegacy = 3) {
  if (tipoConexion) {
    const upper = String(tipoConexion).toUpperCase().trim();
    if (upper.includes('DELTA_ABIERTO') || upper.includes('ABIERTO') || upper.includes('V-V')) {
      return 'TRIFASICO_DELTA_ABIERTO';
    }
    if (upper.includes('ESTRELLA') || upper.includes('WYE') || upper.includes('Y') || upper === '3F_4H') {
      return 'TRIFASICO_ESTRELLA';
    }
    if (upper.includes('DELTA') || upper.includes('TRIANGULO')) {
      return 'TRIFASICO_DELTA';
    }
    if (upper.includes('MONOFASICO') || upper === '1F' || upper === '1F-2H' || upper === '1F_2H') {
      return 'MONOFASICO';
    }
    if (upper.includes('BIFASICO') || upper === '2F' || upper === '2F-3H' || upper === '2F_3H') {
      return 'BIFASICO';
    }
    if (TIPOS_CONEXION_TRAFO.some(t => t.id === upper)) {
      return upper;
    }
  }

  const legacy = String(conexionLegacy || '').toUpperCase().trim();
  if (legacy.includes('ABIERTO') || legacy.includes('V-V')) return 'TRIFASICO_DELTA_ABIERTO';
  if (legacy.includes('DELTA') && !legacy.includes('ESTRELLA')) return 'TRIFASICO_DELTA';
  if (legacy.includes('ESTRELLA') || legacy.includes('DYN') || legacy.includes('YN')) return 'TRIFASICO_ESTRELLA';
  if (legacy.includes('MONOF') || Number(fasesLegacy) === 1) return 'MONOFASICO';
  if (legacy.includes('BIF') || Number(fasesLegacy) === 2) return 'BIFASICO';

  return 'TRIFASICO_ESTRELLA';
}

/**
 * Realiza el cálculo eléctrico completo de corrientes nominales primaria (I₁) y secundaria (I₂).
 */
export function calcularCorrientesTrafo({
  potencia,
  unidadPotencia = 'kVA',
  tensionPrimaria,
  unidadTensionPrimaria = 'kV',
  tensionSecundaria,
  tipoConexion = 'TRIFASICO_ESTRELLA',
  fases = 3
} = {}) {
  const kva = parsePotenciaKva(potencia, unidadPotencia);
  const v1 = parseVoltajePrimario(tensionPrimaria, unidadTensionPrimaria);
  const v2 = parseVoltajeSecundario(tensionSecundaria);

  const canonTipoConexion = normalizarTipoConexion(tipoConexion, '', fases);
  const connMeta = TIPOS_CONEXION_TRAFO.find(t => t.id === canonTipoConexion) || TIPOS_CONEXION_TRAFO[0];
  const esTrifasico = connMeta.esTrifasico;

  let i1 = null;
  let i2 = null;

  if (kva != null && kva > 0) {
    const sVa = kva * 1000;

    // Corriente Primaria I₁
    if (v1 != null && v1 > 0) {
      if (esTrifasico) {
        i1 = Math.round((sVa / (SQRT3 * v1)) * 100) / 100;
      } else {
        i1 = Math.round((sVa / v1) * 100) / 100;
      }
    }

    // Corriente Secundaria I₂
    if (v2 != null && v2 > 0) {
      if (esTrifasico) {
        i2 = Math.round((sVa / (SQRT3 * v2)) * 100) / 100;
      } else {
        i2 = Math.round((sVa / v2) * 100) / 100;
      }
    }
  }

  return {
    kva,
    v1Volts: v1,
    v2Volts: v2,
    esTrifasico,
    tipoConexion: canonTipoConexion,
    metaConexion: connMeta,
    fases: connMeta.fases,
    i1,
    i2,
    i1Formateada: i1 != null ? `${i1.toFixed(2)} A` : '—',
    i2Formateada: i2 != null ? `${i2.toFixed(2)} A` : '—',
    formulaI1: esTrifasico ? 'I₁ = S / (√3 · V₁)' : 'I₁ = S / V₁',
    formulaI2: esTrifasico ? 'I₂ = S / (√3 · V₂)' : 'I₂ = S / V₂'
  };
}
