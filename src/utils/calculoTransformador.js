/**
 * ============================================================================
 * MÓDULO DE CÁLCULO ELÉCTRICO Y ESQUEMAS DE TRANSFORMADORES
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
 * Admite entradas como "500", "500 kVA", "0.5 MVA", etc.
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
 * Maneja valores como "13.8", "13.8 kV", "13800 V", "34.5", "4.16 kV", etc.
 */
export function parseVoltajePrimario(tensionVal, unidad = 'kV') {
  if (tensionVal == null || tensionVal === '') return null;
  const str = String(tensionVal).replace(/,/g, '.').trim();

  // Si contiene explícitamente "kV"
  const kvMatch = str.match(/([0-9]+(?:\.[0-9]+)?)\s*k[vV]/i);
  if (kvMatch) {
    const val = parseFloat(kvMatch[1]);
    return val > 0 ? val * 1000 : null;
  }

  // Si contiene explícitamente "V" (sin ser kV)
  const vMatch = str.match(/([0-9]+(?:\.[0-9]+)?)\s*V(?![a-zA-Z])/i);
  if (vMatch) {
    const vVal = parseFloat(vMatch[1]);
    if (vVal < 100 && String(unidad).toUpperCase() === 'KV') {
      return vVal * 1000;
    }
    return vVal > 0 ? vVal : null;
  }

  // Limpieza numérica general
  const cleanNum = parseFloat(str.replace(/[^0-9.]/g, ''));
  if (isNaN(cleanNum) || cleanNum <= 0) return null;

  // Si el valor numérico ingresado es >= 1000 (ej. 13800 o 4160), ya viene en Voltios
  if (cleanNum >= 1000) {
    return cleanNum;
  }

  // Si el valor numérico es menor a 1000 y la unidad es kV o por defecto MT (< 100)
  if (String(unidad).toUpperCase() === 'KV' || cleanNum <= 100) {
    return cleanNum * 1000;
  }

  return cleanNum;
}

/**
 * Parsea y normaliza la tensión secundaria a Voltios (V).
 * En sistemas trifásicos o monofásicos con derivación central, toma la tensión de línea nominal
 * (por ejemplo "208Y/120 V" -> 208 V, "480Y/277 V" -> 480 V, "120/240 V" -> 240 V).
 */
export function parseVoltajeSecundario(tensionVal) {
  if (tensionVal == null || tensionVal === '') return null;
  const str = String(tensionVal).replace(/,/g, '.').trim();

  // Caso: formato con barra ej. "208/120", "208Y/120", "120/240", "480Y/277"
  const slashMatch = str.match(/([0-9]+(?:\.[0-9]+)?)[^\d/]*\/[^\d/]*([0-9]+(?:\.[0-9]+)?)/);
  if (slashMatch) {
    const vA = parseFloat(slashMatch[1]);
    const vB = parseFloat(slashMatch[2]);
    if (!isNaN(vA) && !isNaN(vB)) {
      return Math.max(vA, vB);
    }
  }

  // Extracción del primer número significativo (ej. "240▲", "480 V", "240")
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

  // Deducción basada en texto libre legado de conexion
  const legacy = String(conexionLegacy || '').toUpperCase().trim();
  if (legacy.includes('ABIERTO') || legacy.includes('V-V')) return 'TRIFASICO_DELTA_ABIERTO';
  if (legacy.includes('DELTA') && !legacy.includes('ESTRELLA')) return 'TRIFASICO_DELTA';
  if (legacy.includes('ESTRELLA') || legacy.includes('DYN') || legacy.includes('YN')) return 'TRIFASICO_ESTRELLA';
  if (legacy.includes('MONOF') || Number(fasesLegacy) === 1) return 'MONOFASICO';
  if (legacy.includes('BIF') || Number(fasesLegacy) === 2) return 'BIFASICO';

  // Por defecto estándar trifásico estrella
  return 'TRIFASICO_ESTRELLA';
}

/**
 * Realiza el cálculo eléctrico completo de corrientes nominales primaria (I₁) y secundaria (I₂).
 * 
 * Fórmulas:
 * - Monofásico / Bifásico:
 *     I = (kVA × 1000) / V
 * - Trifásico (Estrella, Delta, Delta Abierto):
 *     I = (kVA × 1000) / (√3 × V)
 * 
 * @param {Object} params
 * @param {number|string} params.potencia Potencia nominal (kVA o MVA)
 * @param {string} [params.unidadPotencia='kVA'] 'kVA' o 'MVA'
 * @param {number|string} params.tensionPrimaria Tensión primaria nominal (ej. 13.8 o 13800 V)
 * @param {string} [params.unidadTensionPrimaria='kV'] 'kV' o 'V'
 * @param {number|string} params.tensionSecundaria Tensión secundaria nominal (ej. 208/120 o 240)
 * @param {string} [params.tipoConexion='TRIFASICO_ESTRELLA'] Uno de los 5 tipos canónicos
 * @param {number|string} [params.fases=3] Número de fases (fallback)
 * 
 * @returns {Object} Resultado con corrientes numéricas, formateadas y metadatos
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
        // I₁ = (kVA × 1000) / (√3 × V₁)
        i1 = Math.round((sVa / (SQRT3 * v1)) * 100) / 100;
      } else {
        // I₁ = (kVA × 1000) / V₁
        i1 = Math.round((sVa / v1) * 100) / 100;
      }
    }

    // Corriente Secundaria I₂
    if (v2 != null && v2 > 0) {
      if (esTrifasico) {
        // I₂ = (kVA × 1000) / (√3 × V₂)
        i2 = Math.round((sVa / (SQRT3 * v2)) * 100) / 100;
      } else {
        // I₂ = (kVA × 1000) / V₂
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
