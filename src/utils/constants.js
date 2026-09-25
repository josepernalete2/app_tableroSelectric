export const AMP_OPTIONS = ['N/A', '10', '15', '20', '30', '40', '50', '60', '70', '80', '90', '100', '125', '150', '175', '200', '225', '250', '300', '350', '400', '500'];
export const COND_OPTIONS = ['N/A', '14', '12', '10', '8', '6', '4', '2', '1/0', '2/0', '3/0', '4/0', '250', '350', '500 MCM', '2X12', '4X12', '3X8 TW', '1X500', 'SOLIDO # 4'];
export const MARCA_OPTIONS = ['GE', 'EATON', 'ABB', 'INESLA', 'MG', 'SQUARE D', 'SIEMENS', 'CUTLER-HAMMER', 'N/A'];
export const TIPO_OPTIONS = ['TQ', 'TQD', 'M35', 'A2C', 'NS', 'TED32', 'M51', 'TM250', 'QO', 'THQL', 'N/A'];

// Tensiones Normalizadas bajo Norma COVENIN 159:1997
export const TENSIONES_COVENIN_159_BT = [
  '120/240 V (1Φ - 3 hilos)',
  '120/208 V (3Φ - 4 hilos)',
  '240 V (3Φ - 3 hilos)',
  '277/480 V (3Φ - 4 hilos)',
  '480 V (3Φ - 3 hilos)'
];

export const TENSIONES_COVENIN_159_MT = [
  '4.16 kV',
  '13.8 kV',
  '24 kV',
  '34.5 kV'
];

export const TENSIONES_COVENIN_TODAS = [
  ...TENSIONES_COVENIN_159_BT,
  ...TENSIONES_COVENIN_159_MT
];

export const FRECUENCIAS_NORMALIZADAS = ['60 Hz', '50 Hz'];
export const POLOS_TRANSFERENCIA = ['2P', '3P', '4P'];

