/**
 * Utilidades para cálculo de ocupación y detección de colisiones de polos
 * en cuadros de cargas de tableros eléctricos.
 * 
 * Regla de disposición:
 * - Columna Izquierda: Polos impares [1, 3, 5, 7, ...]
 * - Columna Derecha: Polos pares [2, 4, 6, 8, ...]
 * - Disyuntor Multipolo (1P, 2P, 3P): Ocupa polos sucesivos en su respectiva columna (salto de +2).
 */

/**
 * Retorna el arreglo de polos físicos ocupados dado el polo inicial y la cantidad de polos.
 * @param {number|string} startPole - Polo inicial (ej. 1, 2, 3...)
 * @param {number|string} numPoles - Cantidad de polos (1, 2, 3)
 * @returns {number[]} Arreglo de números de polos (ej. [1, 3] para 2P en polo 1)
 */
export const getRequiredPoles = (startPole, numPoles = 1) => {
  const start = parseInt(startPole, 10);
  const n = parseInt(numPoles, 10);
  if (isNaN(start) || start < 1) return [];
  const count = isNaN(n) || n < 1 ? 1 : Math.min(n, 3);

  const poles = [];
  for (let i = 0; i < count; i++) {
    poles.push(start + i * 2);
  }
  return poles;
};

/**
 * Construye un mapa de ocupación de polos a partir de la lista de circuitos de un tablero.
 * @param {Array} circuits - Arreglo de circuitos del tablero
 * @param {string|number|null} excludeCircuitId - ID del circuito a excluir (en caso de edición)
 * @returns {Object} Mapa { [polo]: { circuitId, descripcion, numPolos, posicionPolo, amperaje, estado, tipoDestino } }
 */
export const buildPolesOccupancyMap = (circuits = [], excludeCircuitId = null) => {
  const map = {};

  if (!Array.isArray(circuits)) return map;

  circuits.forEach((circ) => {
    // Ignorar el circuito que se está editando
    if (excludeCircuitId && (circ.id === excludeCircuitId || circ.id === `auto_${excludeCircuitId}`)) {
      return;
    }

    // Ignorar circuitos automáticos sin personalizar o vacíos si no tienen carga o configuración
    const isAutoEmpty = circ.id?.startsWith?.('auto_') && (!circ.breaker?.amp && !circ.equipo && circ.equipo !== 'RESERVA_MANUAL');
    if (isAutoEmpty) {
      return;
    }

    // Determinar los polos ocupados por este circuito
    let occupiedPoles = [];
    if (Array.isArray(circ.poles) && circ.poles.length > 0) {
      occupiedPoles = circ.poles.map((p) => parseInt(p, 10)).filter((p) => !isNaN(p));
    } else if (circ.posicionPolo !== undefined) {
      occupiedPoles = getRequiredPoles(circ.posicionPolo, circ.numPolos || 1);
    }

    const estadoNorm = (circ.estado === 'RESERVA' || circ.tipoDestino === 'RESERVA' || circ.equipo === 'RESERVA')
      ? 'RESERVA'
      : 'ACTIVO';

    const descripcion = circ.descripcion || circ.equipo || circ.nombre || `Circuito Polo ${occupiedPoles[0] || 'N/A'}`;
    const amperaje = circ.amperaje || circ.breaker?.amp || null;

    occupiedPoles.forEach((pole) => {
      map[pole] = {
        circuitId: circ.id,
        descripcion,
        posicionPolo: circ.posicionPolo || occupiedPoles[0],
        numPolos: circ.numPolos || occupiedPoles.length,
        amperaje,
        estado: estadoNorm,
        tipoDestino: circ.tipoDestino || 'ARTEFACTO',
        breaker: circ.breaker || null
      };
    });
  });

  return map;
};

/**
 * Valida si una asignación de polos colisiona con circuitos existentes o excede la capacidad máxima.
 * @param {Object} params
 * @param {number|string} params.posicionPolo - Polo inicial
 * @param {number|string} params.numPolos - Cantidad de polos (1, 2, 3)
 * @param {number} [params.maxPolos=42] - Capacidad máxima de polos del tablero
 * @param {Array} [params.circuits=[]] - Circuitos existentes en el tablero
 * @param {string|number|null} [params.excludeCircuitId=null] - ID del circuito en edición
 * @returns {Object} { isValid, requiredPoles, exceedsMax, maxPole, conflicts, conflictMessages, occupancyMap }
 */
export const validatePoleOccupancy = ({
  posicionPolo,
  numPolos = 1,
  maxPolos = 42,
  circuits = [],
  excludeCircuitId = null
}) => {
  const start = parseInt(posicionPolo, 10);
  const count = parseInt(numPolos, 10) || 1;
  const max = parseInt(maxPolos, 10) || 42;

  if (isNaN(start) || start < 1) {
    return {
      isValid: false,
      requiredPoles: [],
      exceedsMax: false,
      maxPole: null,
      conflicts: [],
      conflictMessages: ['Debe indicar un polo inicial válido mayor o igual a 1.'],
      occupancyMap: {}
    };
  }

  if (count < 1 || count > 3) {
    return {
      isValid: false,
      requiredPoles: [],
      exceedsMax: false,
      maxPole: null,
      conflicts: [],
      conflictMessages: ['El número de polos debe ser 1 (Monofásico), 2 (Bifásico) o 3 (Trifásico).'],
      occupancyMap: {}
    };
  }

  const requiredPoles = getRequiredPoles(start, count);
  const highestPole = Math.max(...requiredPoles);
  const exceedsMax = highestPole > max;

  const occupancyMap = buildPolesOccupancyMap(circuits, excludeCircuitId);
  const conflicts = [];
  const conflictMessages = [];

  if (exceedsMax) {
    conflictMessages.push(
      `Los polos requeridos [${requiredPoles.join(', ')}] superan la capacidad máxima del tablero (${max} polos). El polo ${highestPole} está fuera de rango.`
    );
  }

  requiredPoles.forEach((pole) => {
    if (occupancyMap[pole]) {
      const occ = occupancyMap[pole];
      conflicts.push({
        pole,
        occupiedBy: occ
      });
      conflictMessages.push(
        `El polo ${pole} ya está ocupado por "${occ.descripcion}" (Estado: ${occ.estado}${occ.amperaje ? `, ${occ.amperaje}A` : ''}).`
      );
    }
  });

  const isValid = !exceedsMax && conflicts.length === 0;

  return {
    isValid,
    requiredPoles,
    exceedsMax,
    maxPole: highestPole,
    conflicts,
    conflictMessages,
    occupancyMap
  };
};
