export const AMP_OPTIONS = ['N/A', '10', '15', '20', '30', '40', '50', '60', '70', '80', '90', '100', '125', '150', '175', '200', '225', '250', '300', '350', '400', '500'];
export const COND_OPTIONS = ['N/A', '14', '12', '10', '8', '6', '4', '2', '1/0', '2/0', '3/0', '4/0', '250', '350', '500 MCM', '2X12', '4X12', '3X8 TW', '1X500', 'SOLIDO # 4'];
export const MARCA_OPTIONS = ['GE', 'EATON', 'ABB', 'INESLA', 'MG', 'SQUARE D', 'SIEMENS', 'CUTLER-HAMMER', 'N/A'];
export const TIPO_OPTIONS = ['THQC', 'THQL', 'TQ', 'TQD', 'M35', 'A2C', 'NS', 'TED32', 'M51', 'TM250', 'QO', 'TERMOMAGNETICO', 'CAJA_MOLDADA', 'N/A'];

/**
 * ============================================================================
 * CLASIFICACIÓN TÉCNICA NORMALIZADA DE TABLEROS ELÉCTRICOS (AUDITORÍA)
 * ============================================================================
 */

// 1. Capacidades (Número de Polos / Fases de alimentación)
export const TABLERO_CAPACIDADES_POLOS = [
  'Monopolar (1F)',
  'Bipolar (2F)',
  'Tripolar (3F)',
  'Tetrapolar (3F-N)',
  'Pentapolar (3F-N-T)'
];

// 2. Cantidad de Polos (Opciones normalizadas estrictas)
export const TABLERO_CANTIDAD_POLOS_ESTANDAR = [
  4, 6, 8, 12, 16, 18, 24, 30, 32, 36, 42, 48, 54, 72, 84
];

// 3. Uso Eléctrico (Función Principal con Siglas)
export const TABLERO_USO_ELECTRICO = [
  'TG (Tablero General)',
  'TDF (Tablero de Distribución y Fuerza)',
  'TAA (Tablero de Alumbrado y Artefactos)',
  'TCE (Tablero de Circuitos Esenciales / Emergencia)',
  'TC (Tablero de Control / Automatización)'
];

// 4. Montaje y Accesibilidad (Protección Mecánica)
export const TABLERO_MONTAJE_OPCIONES = [
  'Empotrar / Embutir',
  'Superficial',
  'Autosoportado (Gabinete de Piso / Switchgear)'
];

// 5. Nivel de Hermeticidad (Protección Ambiental NEMA / IP)
export const TABLERO_HERMETICIDAD_NEMA_IP = [
  'Uso Interior Seco (NEMA 1 / IP20)',
  'A prueba de Goteo / Lluvia Ligera (NEMA 2 / IP22)',
  'Resistente a la Intemperie (NEMA 3R / IP54 - IP55)',
  'Hermético al Agua y Polvo (NEMA 4 / 4X / IP65 - IP66)',
  'A prueba de Explosión (NEMA 7 / 9 / IP67)'
];

/**
 * ============================================================================
 * NORMATIVA TÉCNICA ELÉCTRICA VENEZOLANA - NORMA COVENIN 159:1997
 * "Tensiones normales en sistemas de distribución y utilización de energía eléctrica"
 * Comisión Venezolana de Normas Industriales (FONDONORMA / CODELECTRA)
 * ============================================================================
 * 
 * 1. BAJA TENSIÓN (Desde 120 V hasta 600 V):
 *    - Monofásico 2 hilos: 120 V
 *    - Bifásico 2 hilos: 240 V
 *    - Bifásico 3 hilos: 120/240 V y 240/480 V
 *    - Trifásico 4 hilos (Conexión Estrella): 208Y/120 V y 480Y/277 V
 *    - Trifásico 3 hilos (Conexión Delta): 240▲, 480▲ y 600▲
 * 
 * 2. MEDIA TENSIÓN (Mayor que 600 V hasta 34,5 kV):
 *    - Sistemas trifásicos de 3 hilos: 2400 V, 4800 V, 13800 V, 34500 V
 *    - Sistemas trifásicos de 4 hilos: 8320Y/4800 V, 12470Y/7200 V, 24000Y/13800 V, 24940Y/14400 V, 34500Y/19920 V
 */

// 1. BAJA TENSIÓN (Desde 120 V hasta 600 V) - COVENIN 159:1997 (Formato Estándar Descriptivo)
export const TENSIONES_COVENIN_159_BT = [
  '120 V (1Φ - 2 hilos)',
  '240 V (2Φ - 2 hilos)',
  '120/240 V (2Φ - 3 hilos)',
  '240/480 V (2Φ - 3 hilos)',
  '208Y/120 V (3Φ - 4 hilos Estrella)',
  '480Y/277 V (3Φ - 4 hilos Estrella)',
  '240▲ (3Φ - 3 hilos Delta)',
  '480▲ (3Φ - 3 hilos Delta)',
  '600▲ (3Φ - 3 hilos Delta)'
];

// Valores directos / compactos de Baja Tensión (COVENIN 159:1997)
export const TENSIONES_COVENIN_159_BT_VALORES = [
  '120 V',
  '240 V',
  '120/240 V',
  '240/480 V',
  '208Y/120 V',
  '480Y/277 V',
  '240▲',
  '480▲',
  '600▲'
];

// 2. MEDIA TENSIÓN (Mayor que 600 V hasta 34,5 kV) - COVENIN 159:1997 (Formato Estándar Descriptivo)
export const TENSIONES_COVENIN_159_MT = [
  '2400 V (3Φ - 3 hilos)',
  '4800 V (3Φ - 3 hilos)',
  '13800 V (13.8 kV - 3Φ 3 hilos)',
  '34500 V (34.5 kV - 3Φ 3 hilos)',
  '8320Y/4800 V (3Φ - 4 hilos Estrella)',
  '12470Y/7200 V (3Φ - 4 hilos Estrella)',
  '24000Y/13800 V (24 kV - 3Φ 4 hilos Estrella)',
  '24940Y/14400 V (3Φ - 4 hilos Estrella)',
  '34500Y/19920 V (34.5 kV - 3Φ 4 hilos Estrella)'
];

// Valores directos / compactos de Media Tensión (COVENIN 159:1997)
export const TENSIONES_COVENIN_159_MT_VALORES = [
  '2400 V',
  '4800 V',
  '13800 V',
  '34500 V',
  '8320Y/4800 V',
  '12470Y/7200 V',
  '24000Y/13800 V',
  '24940Y/14400 V',
  '34500Y/19920 V'
];

// Catálogo Consolidado de Todas las Tensiones Normalizadas
export const TENSIONES_COVENIN_TODAS = [
  ...TENSIONES_COVENIN_159_BT,
  ...TENSIONES_COVENIN_159_MT
];

export const TENSIONES_COVENIN_TODAS_VALORES = [
  ...TENSIONES_COVENIN_159_BT_VALORES,
  ...TENSIONES_COVENIN_159_MT_VALORES
];

/**
 * Catálogo Maestro Estructurado bajo Norma COVENIN 159:1997
 * Con metadatos completos para categorización, validación y búsqueda tolerante.
 */
export const CATALOGO_COVENIN_159 = [
  // --- BAJA TENSIÓN (Desde 120 V hasta 600 V) ---
  {
    id: 'bt-120-1f-2h',
    valor: '120 V',
    label: '120 V (1Φ - 2 hilos)',
    rango: 'BT',
    rangoTexto: 'Baja Tensión',
    subgrupo: 'Monofásico 2 hilos',
    sistema: 'Monofásico 2 hilos',
    fases: '1Φ',
    hilos: 2,
    conexion: 'L-N',
    norma: 'COVENIN 159:1997',
    alias: ['120V', '120', '1F-2H', 'Monofásico 120']
  },
  {
    id: 'bt-240-2f-2h',
    valor: '240 V',
    label: '240 V (2Φ - 2 hilos)',
    rango: 'BT',
    rangoTexto: 'Baja Tensión',
    subgrupo: 'Bifásico 2 hilos',
    sistema: 'Bifásico 2 hilos',
    fases: '2Φ',
    hilos: 2,
    conexion: 'L-L',
    norma: 'COVENIN 159:1997',
    alias: ['240V', '240', '2F-2H', 'Bifásico 240']
  },
  {
    id: 'bt-120-240-2f-3h',
    valor: '120/240 V',
    label: '120/240 V (2Φ - 3 hilos)',
    rango: 'BT',
    rangoTexto: 'Baja Tensión',
    subgrupo: 'Bifásico 3 hilos',
    sistema: 'Bifásico 3 hilos',
    fases: '2Φ',
    hilos: 3,
    conexion: 'L-L-N',
    norma: 'COVENIN 159:1997',
    alias: ['120/240', '240/120 V', '120/240V', 'Bifásico 120/240']
  },
  {
    id: 'bt-240-480-2f-3h',
    valor: '240/480 V',
    label: '240/480 V (2Φ - 3 hilos)',
    rango: 'BT',
    rangoTexto: 'Baja Tensión',
    subgrupo: 'Bifásico 3 hilos',
    sistema: 'Bifásico 3 hilos',
    fases: '2Φ',
    hilos: 3,
    conexion: 'L-L-N',
    norma: 'COVENIN 159:1997',
    alias: ['240/480', '480/240 V', '240/480V', 'Bifásico 240/480']
  },
  {
    id: 'bt-208y-120-3f-4h',
    valor: '208Y/120 V',
    label: '208Y/120 V (3Φ - 4 hilos Estrella)',
    rango: 'BT',
    rangoTexto: 'Baja Tensión',
    subgrupo: 'Trifásico 4 hilos (Conexión Estrella)',
    sistema: 'Trifásico 4 hilos (Conexión Estrella)',
    fases: '3Φ',
    hilos: 4,
    conexion: 'Estrella',
    norma: 'COVENIN 159:1997',
    alias: ['120/208 V', '208/120 V', '120/208', '208Y', '208V', 'Estrella', 'Y', 'Wye']
  },
  {
    id: 'bt-480y-277-3f-4h',
    valor: '480Y/277 V',
    label: '480Y/277 V (3Φ - 4 hilos Estrella)',
    rango: 'BT',
    rangoTexto: 'Baja Tensión',
    subgrupo: 'Trifásico 4 hilos (Conexión Estrella)',
    sistema: 'Trifásico 4 hilos (Conexión Estrella)',
    fases: '3Φ',
    hilos: 4,
    conexion: 'Estrella',
    norma: 'COVENIN 159:1997',
    alias: ['277/480 V', '480/277 V', '277/480', '480Y', '480V', 'Estrella', 'Y', 'Wye']
  },
  {
    id: 'bt-240-delta-3f-3h',
    valor: '240▲',
    label: '240▲ (3Φ - 3 hilos Delta)',
    rango: 'BT',
    rangoTexto: 'Baja Tensión',
    subgrupo: 'Trifásico 3 hilos (Conexión Delta)',
    sistema: 'Trifásico 3 hilos (Conexión Delta)',
    fases: '3Φ',
    hilos: 3,
    conexion: 'Delta',
    norma: 'COVENIN 159:1997',
    alias: ['240▲', '240 Delta', '240V Delta', '240 V Delta', 'Delta 240', 'Triángulo']
  },
  {
    id: 'bt-480-delta-3f-3h',
    valor: '480▲',
    label: '480▲ (3Φ - 3 hilos Delta)',
    rango: 'BT',
    rangoTexto: 'Baja Tensión',
    subgrupo: 'Trifásico 3 hilos (Conexión Delta)',
    sistema: 'Trifásico 3 hilos (Conexión Delta)',
    fases: '3Φ',
    hilos: 3,
    conexion: 'Delta',
    norma: 'COVENIN 159:1997',
    alias: ['480▲', '480 Delta', '480V Delta', '480 V Delta', 'Delta 480', 'Triángulo']
  },
  {
    id: 'bt-600-delta-3f-3h',
    valor: '600▲',
    label: '600▲ (3Φ - 3 hilos Delta)',
    rango: 'BT',
    rangoTexto: 'Baja Tensión',
    subgrupo: 'Trifásico 3 hilos (Conexión Delta)',
    sistema: 'Trifásico 3 hilos (Conexión Delta)',
    fases: '3Φ',
    hilos: 3,
    conexion: 'Delta',
    norma: 'COVENIN 159:1997',
    alias: ['600▲', '600 Delta', '600V Delta', '600 V Delta', 'Delta 600', 'Triángulo']
  },

  // --- MEDIA TENSIÓN (Mayor que 600 V hasta 34,5 kV) ---
  // Sistemas trifásicos de 3 hilos
  {
    id: 'mt-2400-3f-3h',
    valor: '2400 V',
    label: '2400 V (3Φ - 3 hilos)',
    rango: 'MT',
    rangoTexto: 'Media Tensión',
    subgrupo: 'Trifásico 3 hilos',
    sistema: 'Sistemas trifásicos de 3 hilos',
    fases: '3Φ',
    hilos: 3,
    conexion: 'Trifásico 3 hilos',
    norma: 'COVENIN 159:1997',
    alias: ['2.4 kV', '2400V', '2,4 kV', '2.4kV', '2400']
  },
  {
    id: 'mt-4800-3f-3h',
    valor: '4800 V',
    label: '4800 V (3Φ - 3 hilos)',
    rango: 'MT',
    rangoTexto: 'Media Tensión',
    subgrupo: 'Trifásico 3 hilos',
    sistema: 'Sistemas trifásicos de 3 hilos',
    fases: '3Φ',
    hilos: 3,
    conexion: 'Trifásico 3 hilos',
    norma: 'COVENIN 159:1997',
    alias: ['4.8 kV', '4800V', '4,8 kV', '4.8kV', '4800', '4.16 kV']
  },
  {
    id: 'mt-13800-3f-3h',
    valor: '13800 V',
    label: '13800 V (13.8 kV - 3Φ 3 hilos)',
    rango: 'MT',
    rangoTexto: 'Media Tensión',
    subgrupo: 'Trifásico 3 hilos',
    sistema: 'Sistemas trifásicos de 3 hilos',
    fases: '3Φ',
    hilos: 3,
    conexion: 'Trifásico 3 hilos',
    norma: 'COVENIN 159:1997',
    alias: ['13.8 kV', '13800V', '13,8 kV', '13.8kV', '13800', '13.8']
  },
  {
    id: 'mt-34500-3f-3h',
    valor: '34500 V',
    label: '34500 V (34.5 kV - 3Φ 3 hilos)',
    rango: 'MT',
    rangoTexto: 'Media Tensión',
    subgrupo: 'Trifásico 3 hilos',
    sistema: 'Sistemas trifásicos de 3 hilos',
    fases: '3Φ',
    hilos: 3,
    conexion: 'Trifásico 3 hilos',
    norma: 'COVENIN 159:1997',
    alias: ['34.5 kV', '34500V', '34,5 kV', '34.5kV', '34500', '34.5']
  },

  // Sistemas trifásicos de 4 hilos (Conexión Estrella con neutro multiterrizado)
  {
    id: 'mt-8320y-4800-3f-4h',
    valor: '8320Y/4800 V',
    label: '8320Y/4800 V (3Φ - 4 hilos Estrella)',
    rango: 'MT',
    rangoTexto: 'Media Tensión',
    subgrupo: 'Trifásico 4 hilos (Conexión Estrella)',
    sistema: 'Sistemas trifásicos de 4 hilos',
    fases: '3Φ',
    hilos: 4,
    conexion: 'Estrella',
    norma: 'COVENIN 159:1997',
    alias: ['8.32 kV', '8.32Y/4.8 kV', '8320/4800 V', '8320Y', '8.32']
  },
  {
    id: 'mt-12470y-7200-3f-4h',
    valor: '12470Y/7200 V',
    label: '12470Y/7200 V (3Φ - 4 hilos Estrella)',
    rango: 'MT',
    rangoTexto: 'Media Tensión',
    subgrupo: 'Trifásico 4 hilos (Conexión Estrella)',
    sistema: 'Sistemas trifásicos de 4 hilos',
    fases: '3Φ',
    hilos: 4,
    conexion: 'Estrella',
    norma: 'COVENIN 159:1997',
    alias: ['12.47 kV', '12.47Y/7.2 kV', '12470/7200 V', '12470Y', '12.47']
  },
  {
    id: 'mt-24000y-13800-3f-4h',
    valor: '24000Y/13800 V',
    label: '24000Y/13800 V (24 kV - 3Φ 4 hilos Estrella)',
    rango: 'MT',
    rangoTexto: 'Media Tensión',
    subgrupo: 'Trifásico 4 hilos (Conexión Estrella)',
    sistema: 'Sistemas trifásicos de 4 hilos',
    fases: '3Φ',
    hilos: 4,
    conexion: 'Estrella',
    norma: 'COVENIN 159:1997',
    alias: ['24 kV', '24Y/13.8 kV', '24000/13800 V', '24000Y', '24']
  },
  {
    id: 'mt-24940y-14400-3f-4h',
    valor: '24940Y/14400 V',
    label: '24940Y/14400 V (3Φ - 4 hilos Estrella)',
    rango: 'MT',
    rangoTexto: 'Media Tensión',
    subgrupo: 'Trifásico 4 hilos (Conexión Estrella)',
    sistema: 'Sistemas trifásicos de 4 hilos',
    fases: '3Φ',
    hilos: 4,
    conexion: 'Estrella',
    norma: 'COVENIN 159:1997',
    alias: ['24.94 kV', '24.94Y/14.4 kV', '24940/14400 V', '24940Y', '24.94']
  },
  {
    id: 'mt-34500y-19920-3f-4h',
    valor: '34500Y/19920 V',
    label: '34500Y/19920 V (34.5 kV - 3Φ 4 hilos Estrella)',
    rango: 'MT',
    rangoTexto: 'Media Tensión',
    subgrupo: 'Trifásico 4 hilos (Conexión Estrella)',
    sistema: 'Sistemas trifásicos de 4 hilos',
    fases: '3Φ',
    hilos: 4,
    conexion: 'Estrella',
    norma: 'COVENIN 159:1997',
    alias: ['34.5 kV', '34.5Y/19.92 kV', '34500/19920 V', '34500Y', '34.5']
  }
];

export const FRECUENCIAS_NORMALIZADAS = ['60 Hz', '50 Hz'];
export const POLOS_TRANSFERENCIA = ['2P', '3P', '4P'];

export const VALID_TIPOS_ELEMENTO = [
  'TABLERO', 'PUNTO_SUMINISTRO', 'SUBESTACION', 'TRANSFORMADOR',
  'GENERADOR', 'PUESTA_TIERRA', 'TRANSFER', 'PUNTO_MEDICION',
  'CCM', 'BANCO_CONDENSADOR', 'AMBIENTAL_FISICA', 'TERMOGRAFICA',
  'SISTEMA_ATERRAMIENTO', 'TANQUE_COMBUSTIBLE', 'OTRO'
];

export const BARRAS_AMP_OPTIONS = ['100A', '125A', '150A', '200A', '225A', '250A', '300A', '400A', '500A', '600A', '800A', '1000A', '1200A', '1600A', '2000A', '2500A'];
export const VOLTAJE_FN_OPTIONS = ['120 V', '127 V', '220 V', '277 V', '110 V', '115 V'];
export const VOLTAJE_LL_OPTIONS = ['208 V', '220 V', '240 V', '380 V', '440 V', '460 V', '480 V'];
export const ACOMETIDA_OPTIONS = ['3X #2 + 1X #4', '3X 1/0 + 1X #2', '3X 2/0 + 1X 1/0', '3X 3/0 + 1X 2/0', '3X 4/0 + 1X 3/0', '3X 250 MCM + 1X 1/0', '3X 350 MCM + 1X 2/0', '3X 500 MCM + 1X 4/0', '2X (3X 500 MCM)'];

export function cleanTipoElemento(tipo) {
  if (!tipo || typeof tipo !== 'string') return 'TABLERO';
  const clean = tipo.trim().toUpperCase();
  return VALID_TIPOS_ELEMENTO.includes(clean) ? clean : 'TABLERO';
}

