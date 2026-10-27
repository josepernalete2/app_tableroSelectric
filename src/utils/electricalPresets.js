/**
 * Catálogo de Presets y Opciones Predefinidas Estándar en Instalaciones Eléctricas
 * Cumple con normas COVENIN 159:1997, COVENIN 200 (Código Eléctrico Nacional) y NFPA 70 / NEC.
 * Permite autocompletado rápido sin restringir el ingreso de valores personalizados.
 */

export const PRESET_MARCAS = [
  'SCHNEIDER ELECTRIC',
  'SQUARE D',
  'SIEMENS',
  'ABB',
  'EATON / CUTLER-HAMMER',
  'GENERAL ELECTRIC (GE)',
  'LEGRAND',
  'MITSUBISHI ELECTRIC',
  'CHINT ELECTRIC',
  'WEG',
  'RITTAL',
  'CUMMINS',
  'CATERPILLAR (CAT)',
  'KOHLER',
  'GENERAC',
  'SDMO',
  'YUYE / YES1',
  'SOCOMEC',
  'ASCO',
  'BTICINO'
];

export const PRESET_VOLTAJES = [
  '208Y/120 V (3Φ - 4 hilos Estrella)',
  '480Y/277 V (3Φ - 4 hilos Estrella)',
  '240/120 V (Delta Abierta con neutro central)',
  '240 V Delta (3Φ - 3 hilos)',
  '120/240 V (1Φ - 3 hilos)',
  '380Y/220 V (3Φ - 4 hilos 50/60 Hz)',
  '440 V (3Φ - 3 hilos Industrial)',
  '4.16 kV (Media Tensión)',
  '13.8 kV (Media Tensión Distribución)',
  '24 kV (Media Tensión)',
  '34.5 kV (Subtransmisión)'
];

export const PRESET_KVA = [
  '15 kVA',
  '25 kVA',
  '30 kVA',
  '37.5 kVA',
  '45 kVA',
  '50 kVA',
  '75 kVA',
  '100 kVA',
  '112.5 kVA',
  '150 kVA',
  '200 kVA',
  '225 kVA',
  '250 kVA',
  '300 kVA',
  '500 kVA',
  '630 kVA',
  '750 kVA',
  '1000 kVA',
  '1250 kVA',
  '1500 kVA',
  '2000 kVA',
  '2500 kVA'
];

export const PRESET_KW = [
  '10 kW',
  '15 kW',
  '20 kW',
  '30 kW',
  '40 kW',
  '50 kW',
  '60 kW',
  '80 kW',
  '100 kW',
  '120 kW',
  '150 kW',
  '200 kW',
  '250 kW',
  '300 kW',
  '400 kW',
  '500 kW',
  '600 kW',
  '800 kW',
  '1000 kW'
];

export const PRESET_AMPERAJES = [
  '15 A',
  '20 A',
  '30 A',
  '40 A',
  '50 A',
  '60 A',
  '70 A',
  '80 A',
  '100 A',
  '125 A',
  '150 A',
  '175 A',
  '200 A',
  '225 A',
  '250 A',
  '300 A',
  '400 A',
  '500 A',
  '600 A',
  '800 A',
  '1000 A',
  '1200 A',
  '1600 A',
  '2000 A',
  '2500 A',
  '3200 A',
  '4000 A'
];

export const PRESET_CONDUCTORES = [
  '14 AWG (Cu)',
  '12 AWG (Cu)',
  '10 AWG (Cu)',
  '8 AWG (Cu)',
  '6 AWG (Cu)',
  '4 AWG (Cu)',
  '2 AWG (Cu)',
  '1/0 AWG (Cu)',
  '2/0 AWG (Cu)',
  '3/0 AWG (Cu)',
  '4/0 AWG (Cu)',
  '250 MCM (Cu)',
  '300 MCM (Cu)',
  '350 MCM (Cu)',
  '400 MCM (Cu)',
  '500 MCM (Cu)',
  '3x 1/0 AWG + 1x #2 AWG (N) + 1x #6 AWG (Tierra)',
  '3x 3/0 AWG + 1x 1/0 AWG (N) + 1x #4 AWG (Tierra)',
  '3x 250 MCM + 1x 2/0 AWG (N) + 1x #2 AWG (Tierra)',
  '3x 350 MCM + 1x 4/0 AWG (N) + 1x 1/0 AWG (Tierra)',
  '3x 500 MCM + 1x 250 MCM (N) + 1x 2/0 AWG (Tierra)',
  '2x (3x 500 MCM) + 2x (1x 250 MCM N) + 1x 4/0 AWG (Tierra)'
];

export const PRESET_BREAKER_TIPOS = [
  'TERMOMAGNÉTICO (MCB - CAJA MOLDEADA)',
  'ELECTRÓNICO CON MICROLÓGICA (MCCB)',
  'POTENCIA EN AIRE (ACB - BASTIDOR ABIERTO)',
  'DIFERENCIAL (ID / RCCB / GFCI)',
  'SECCIONADOR BAJO CARGA',
  'GUARDAMOTOR MAGNÉTICO/TÉRMICO'
];

export const PRESET_UBICACIONES = [
  'SÓTANO - SALA TÉCNICA PRINCIPAL',
  'SALA ELÉCTRICA N° 1',
  'SALA ELÉCTRICA N° 2',
  'PLANTA BAJA (PB)',
  'MEZZANINA',
  'PISO 1',
  'PISO 2',
  'PISO 3',
  'AZOTEA / SALA DE MÁQUINAS',
  'PATIO DE TRANSFORMADORES',
  'CASETA DE GENERACIÓN',
  'SALA DE BOMBAS / HIDRONEUMÁTICO',
  'ÁREA EXTERIOR'
];

export const PRESET_CONEXIONES_TRAFO = [
  'DYn11 (DELTA - ESTRELLA CON NEUTRO)',
  'YNyn0 (ESTRELLA - ESTRELLA CON NEUTRO)',
  'DD0 (DELTA - DELTA)',
  'YNd11 (ESTRELLA CON NEUTRO - DELTA)',
  'DELTA ABIERTA'
];

export const PRESET_TIPOS_ELEMENTO = [
  { value: 'TABLERO', label: '⚡ Tablero Eléctrico / Panel de Distribución' },
  { value: 'TRANSFORMADOR', label: '🔄 Transformador de Potencia / Distribución' },
  { value: 'GENERADOR', label: '🔋 Generador / Grupo Electrógeno' },
  { value: 'TRANSFER', label: '🔀 Transferencia Automática / Manual (ATS/MTS)' },
  { value: 'CCM', label: '🎛️ Centro de Control de Motores (CCM)' },
  { value: 'PUNTO_SUMINISTRO', label: '🌐 Punto de Suministro / Acometida Eléctrica' },
  { value: 'PUNTO_MEDICION', label: '📊 Punto de Medición / Medidor de Frontera' },
  { value: 'BANCO_CONDENSADOR', label: '⚡ Banco de Condensadores' },
  { value: 'PUESTA_TIERRA', label: '🛡️ Sistema de Puesta a Tierra (SPAT)' }
];
