import crypto from 'crypto';
import prisma from '../db.js';
import { calcularCorrientesTrafo, normalizarTipoConexion } from '../utils/calculoTransformador.js';
import { subirImagenAR2, obtenerImagenDeR2, diagnosticarR2, eliminarImagenDeR2, extraerR2KeyDeUrl } from '../services/r2Backup.service.js';

/**
 * Validador y sanitizador de fotos en el servidor para evitar que Prisma falle
 * ante cadenas Base64 incompletas, truncadas (ej. 'base64,/') o sobredimensionadas.
 */
export function sanitizeFotoServer(foto) {
  if (!foto || typeof foto !== 'string') return null;
  const trimmed = foto.trim();
  if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') return null;

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/api/sync/image?key=') ||
    trimmed.startsWith('/api/sync/image/') ||
    trimmed.startsWith('/uploads/') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  if (trimmed.startsWith('data:image/')) {
    const commaIndex = trimmed.indexOf(',');
    if (commaIndex === -1) {
      console.warn('[SERVER SYNC] ⚠️ DataURL sin separador coma. Descartando.');
      return null;
    }
    const base64Data = trimmed.substring(commaIndex + 1).trim();
    if (base64Data.length < 50 || base64Data === '/' || base64Data.endsWith(',/') || (base64Data.startsWith('/') && base64Data.length < 100)) {
      console.warn('[SERVER SYNC] ⚠️ Foto base64 incompleta o truncada recibida. Omitiendo foto para evitar error de Prisma.');
      return null;
    }
    if (base64Data.length > 14 * 1024 * 1024) {
      console.warn('[SERVER SYNC] ⚠️ Foto base64 excede límite permitido (14MB). Descartando.');
      return null;
    }
    return trimmed;
  }

  return null;
}

// Lista exhaustiva y normalizada de tipos de elementos unifilares válidos en Prisma
export const VALID_TIPOS_ELEMENTO = [
  'TABLERO', 'PUNTO_SUMINISTRO', 'SUBESTACION', 'TRANSFORMADOR',
  'GENERADOR', 'PUESTA_TIERRA', 'TRANSFER', 'PUNTO_MEDICION',
  'CCM', 'BANCO_CONDENSADOR', 'AMBIENTAL_FISICA', 'TERMOGRAFICA',
  'SISTEMA_ATERRAMIENTO', 'TANQUE_COMBUSTIBLE', 'OTRO'
];

/**
 * Limpia y normaliza el tipo de elemento según el enum TipoElemento de Prisma.
 * Previene ReferenceErrors fatales en el backend y la syncQueue de la PWA.
 */
export function cleanTipoElemento(tipo) {
  if (!tipo || typeof tipo !== 'string') return 'TABLERO';
  const clean = tipo.trim().toUpperCase();
  return VALID_TIPOS_ELEMENTO.includes(clean) ? clean : 'TABLERO';
}

// Lista blanca estricta de entidades permitidas para sincronización offline
const ALLOWED_SYNC_ENTITIES = new Set([
  'tablero',
  'circuito',
  'elementoUnifilar',
  'subestacion',
  'puntoMedicion',
  'ccm',
  'alimentador',
  'proyecto',
  'empresa',
  'inspeccionTermografica',
  'inspeccionAterramiento',
  'inspeccionTanqueCombustible'
]);

// Jerarquía de dependencias relacionales para garantizar orden de inserción/borrado correcto (CONC-01)
const ENTITY_PRIORITY = {
  empresa: 1,
  proyecto: 2,
  alimentador: 3,
  subestacion: 4,
  ccm: 4,
  puntoMedicion: 4,
  tablero: 4,
  elementoUnifilar: 4,
  inspeccionTermografica: 4,
  inspeccionAterramiento: 4,
  inspeccionTanqueCombustible: 4,
  circuito: 5
};

// Mapeo exhaustivo y seguro de nombres de entidades del frontend a delegates de Prisma
export const mapEntityToPrismaModel = (entity) => {
  if (!entity) return '';
  const clean = String(entity).trim();
  const mapping = {
    'empresa': 'empresa',
    'Empresa': 'empresa',
    'EMPRESA': 'empresa',
    'proyecto': 'proyecto',
    'Proyecto': 'proyecto',
    'PROYECTO': 'proyecto',
    'alimentador': 'alimentador',
    'Alimentador': 'alimentador',
    'ALIMENTADOR': 'alimentador',
    'tablero': 'tablero',
    'Tablero': 'tablero',
    'TABLERO': 'tablero',
    'circuito': 'circuito',
    'Circuito': 'circuito',
    'CIRCUITO': 'circuito',
    'elemento': 'elementoUnifilar',
    'Elemento': 'elementoUnifilar',
    'ELEMENTO': 'elementoUnifilar',
    'elementoUnifilar': 'elementoUnifilar',
    'ElementoUnifilar': 'elementoUnifilar',
    'ELEMENTO_UNIFILAR': 'elementoUnifilar',
    'subestacion': 'subestacion',
    'Subestacion': 'subestacion',
    'SUBESTACION': 'subestacion',
    'INSPECCION_SUBESTACION': 'subestacion',
    'puntoMedicion': 'puntoMedicion',
    'PuntoMedicion': 'puntoMedicion',
    'PUNTO_MEDICION': 'puntoMedicion',
    'ccm': 'ccm',
    'Ccm': 'ccm',
    'CCM': 'ccm',
    'inspeccionTermografica': 'inspeccionTermografica',
    'InspeccionTermografica': 'inspeccionTermografica',
    'INSPECCION_TERMOGRAFICA': 'inspeccionTermografica',
    'inspeccionAterramiento': 'inspeccionAterramiento',
    'InspeccionAterramiento': 'inspeccionAterramiento',
    'INSPECCION_ATERRAMIENTO': 'inspeccionAterramiento',
    'inspeccionTanqueCombustible': 'inspeccionTanqueCombustible',
    'InspeccionTanqueCombustible': 'inspeccionTanqueCombustible',
    'INSPECCION_TANQUE_COMBUSTIBLE': 'inspeccionTanqueCombustible'
  };

  if (mapping[clean]) return mapping[clean];
  return clean.charAt(0).toLowerCase() + clean.slice(1);
};

// Campos del sistema restringidos que nunca deben ser mutados vía sync batch (SEC-02)
const FORBIDDEN_MUTATION_FIELDS = ['role', 'password', 'deletedAt'];

// Lista blanca estricta de campos permitidos por modelo según schema.prisma (evita PrismaClientValidationError)
const MODEL_ALLOWED_FIELDS = {
  empresa: new Set([
    'id', 'nombre', 'rif', 'direccionFiscal', 'direccion', 'gerente1Nombre',
    'gerente1Telefono', 'gerente1Email', 'gerente2Nombre', 'gerente2Telefono',
    'gerente2Email', 'telegramBackupPin', 'telegramChatId'
  ]),
  proyecto: new Set([
    'id', 'nombre', 'direccion', 'descripcion', 'empresaId', 'responsableNombre',
    'responsableTelefono', 'responsableEmail'
  ]),
  alimentador: new Set([
    'id', 'nombre', 'origen', 'capacidadAmperios', 'capacidadKVA', 'proyectoId'
  ]),
  tablero: new Set([
    'id', 'nombre', 'ubicacion', 'maxPolos', 'tension', 'fases', 'alimentadorId',
    'proyectoId', 'empresaId', 'version', 'deletedAt'
  ]),
  circuito: new Set([
    'id', 'tableroId', 'posicionPolo', 'numPolos', 'amperaje', 'descripcion',
    'estado', 'elementoDestinoId', 'tipoElementoDestino', 'version', 'deletedAt'
  ]),
  elementoUnifilar: new Set([
    'id', 'nombre', 'tipoElemento', 'ubicacion', 'alimentadoPor', 'foto',
    'observacionesGenerales', 'datosTecnicos', 'alimentadoPorId', 'circuitoOrigen',
    'calibreConductor', 'breakerAmperaje', 'breakerMarca', 'breakerTipo',
    'potenciaEstimada', 'estadoVinculo', 'detallesFormato', 'version',
    'deletedAt', 'proyectoId', 'empresaId'
  ]),
  subestacion: new Set([
    'id', 'nombre', 'ubicacion', 'fecha', 'hora', 'inspector', 'nivelTension',
    'estadoEntorno', 'obrasCiviles', 'equiposPrincipales', 'puestaTierra',
    'edificioControl', 'firmaInspector', 'firmaSupervisor', 'version',
    'deletedAt', 'proyectoId', 'empresaId'
  ]),
  puntoMedicion: new Set([
    'id', 'nombre', 'fecha', 'hora', 'inspector', 'nombreUsuario', 'numeroContrato',
    'empresaDistribuidora', 'nivelTensionContrato', 'tensionNominal', 'potenciaContratada',
    'tarifaAplicable', 'codigoElementoPrincipal', 'tipoAcometida', 'puntoConexionPCC',
    'conductorAcometida', 'longitudAcometida', 'elementoManiobra', 'capacidadInterrupcion',
    'ubicacionTransformador', 'propiedadTransformador', 'usoTransformador', 'ubicacionMedidor',
    'tipoMedicion', 'marcaModeloMedidor', 'numeroSerieAno', 'observaciones', 'firmaInspector',
    'firmaSupervisor', 'version', 'deletedAt', 'proyectoId', 'empresaId'
  ]),
  ccm: new Set([
    'id', 'nombre', 'plantaInstalacion', 'areaProceso', 'fabricanteMarca', 'modeloSerie',
    'gradoNemaIp', 'fecha', 'inspector', 'supervisor', 'anoFabricacionInstalacion',
    'parametrosElectricos', 'gavetasBucketLog', 'inspeccionFisica', 'seguridadTermografia',
    'hallazgosCriticos', 'firmaInspector', 'firmaSupervisor', 'version', 'deletedAt',
    'proyectoId', 'empresaId'
  ]),
  inspeccionTermografica: new Set([
    'id', 'nombre', 'ubicacion', 'fecha', 'hora', 'inspector', 'supervisor',
    'tempAmbiente', 'tempPuntoCaliente', 'tempReferencia', 'cameraModel',
    'version', 'deletedAt', 'proyectoId', 'empresaId'
  ]),
  inspeccionAterramiento: new Set([
    'id', 'nombre', 'ubicacion', 'fecha', 'hora', 'inspector', 'supervisor',
    'resistenciaOhmios', 'metodoMedicion', 'tipoSistemaPat', 'tipoUnion',
    'version', 'deletedAt', 'proyectoId', 'empresaId'
  ]),
  inspeccionTanqueCombustible: new Set([
    'id', 'nombre', 'ubicacion', 'fecha', 'hora', 'inspector', 'supervisor',
    'tipoCombustible', 'capacidadTotalLitros', 'nivelActualPorcentaje',
    'consumoGeneradorLh', 'diqueContencion110',
    'version', 'deletedAt', 'proyectoId', 'empresaId'
  ])
};

export const procesarSincronizacionBatch = async (req, res, next) => {
  try {
    const { mutations } = req.body;

    if (!Array.isArray(mutations) || mutations.length === 0) {
      console.warn('[SYNC SERVER] ⚠️ Solicitud batch recibida sin arreglo de mutaciones válido.');
      return res.status(400).json({ ok: false, error: 'El cuerpo de la solicitud debe contener un arreglo de mutaciones (mutations).' });
    }

    console.log(`[SYNC SERVER] 🚀 Procesando lote de ${mutations.length} mutaciones para usuario '${req.user?.username || 'Anónimo'}' (${req.user?.id || 'N/A'})`);

    // Ordenar mutaciones según dependencias relacionales
    // CREATE/UPDATE: Padres primero -> Hijos después
    // DELETE: Hijos primero -> Padres después
    const sortedMutations = [...mutations].sort((a, b) => {
      const modelA = mapEntityToPrismaModel(a.entity);
      const modelB = mapEntityToPrismaModel(b.entity);
      const priorityA = ENTITY_PRIORITY[modelA] || 99;
      const priorityB = ENTITY_PRIORITY[modelB] || 99;

      if (a.operation === 'DELETE' && b.operation === 'DELETE') {
        return priorityB - priorityA; // Hijos primero
      }
      return priorityA - priorityB; // Padres primero
    });

    const applied = [];
    const conflicts = [];
    const pendingHierarchyLinks = [];

    // Procesar cada mutación asegurando que los fallos individuales no aborten el lote completo
    for (const item of sortedMutations) {
      const { entity, id, operation, baseVersion, data } = item;

      if (!entity || !id || !operation) {
        console.warn(`[SYNC SERVER] ⚠️ Mutación descartada por datos incompletos:`, item);
        conflicts.push({ id, entity, error: 'Mutación incompleta: faltan campos obligatorios' });
        continue;
      }

      const modelName = mapEntityToPrismaModel(entity);

      if (!ALLOWED_SYNC_ENTITIES.has(modelName)) {
        console.warn(`[SYNC SECURITY] Intento de mutación en entidad no permitida: '${entity}' (${id})`);
        conflicts.push({ id, entity, error: `Entidad restringida o no permitida: ${entity}` });
        continue;
      }

      const delegate = prisma[modelName];
      if (!delegate) {
        console.warn(`[SYNC SERVER] Delegado de Prisma no encontrado para: ${modelName}`);
        conflicts.push({ id, entity, error: `Entidad desconocida en base de datos: ${entity}` });
        continue;
      }

      try {
        const existingRecord = await delegate.findUnique({ where: { id } });

        // Multitenancy: verificación para usuarios CLIENT
        if (req.user && req.user.role === 'CLIENT' && req.user.companyId) {
          const companyId = req.user.companyId;
          if (existingRecord) {
            const recordCompanyId = existingRecord.empresaId || (existingRecord.empresa && existingRecord.empresa.id);
            if (recordCompanyId && recordCompanyId !== companyId) {
              conflicts.push({ id, entity, error: 'Acceso denegado: este recurso pertenece a otra empresa' });
              continue;
            }
          }
        }

        if (operation === 'DELETE') {
          const adminOnlyDeleteModels = new Set([
            'empresa', 'proyecto', 'tablero', 'elementoUnifilar', 'subestacion', 'puntoMedicion', 'ccm'
          ]);
          if (adminOnlyDeleteModels.has(modelName) && String(req.user?.role || '').toUpperCase() !== 'ADMIN') {
            conflicts.push({ id, entity, error: 'Permisos insuficientes: solo un Administrador puede eliminar este registro.' });
            continue;
          }

          if (existingRecord) {
            if ('deletedAt' in existingRecord) {
              const updated = await delegate.update({
                where: { id },
                data: {
                  deletedAt: new Date(),
                  version: (existingRecord.version || 1) + 1
                }
              });
              applied.push({ id, entity, operation, version: updated.version });
            } else {
              await delegate.delete({ where: { id } });
              applied.push({ id, entity, operation });
            }
          } else {
            applied.push({ id, entity, operation: 'ALREADY_DELETED' });
          }
          console.log(`[SYNC SERVER] 🗑️ ${entity} (${id}) eliminado exitosamente`);
          continue;
        }

        // Si el registro ya fue eliminado por otro dispositivo (soft-delete o hard-delete),
        // NO resucitarlo ni lanzar error 500: informar deletedOnServer para limpiar el fantasma en el cliente.
        if (existingRecord && 'deletedAt' in existingRecord && existingRecord.deletedAt !== null) {
          applied.push({ id, entity, operation: 'UPDATE', deletedOnServer: true });
          console.log(`[SYNC SERVER] 🧹 ${entity} (${id}) ya estaba eliminado en servidor; evitando resurrección.`);
          continue;
        }
        if (operation === 'UPDATE' && !existingRecord) {
          applied.push({ id, entity, operation: 'UPDATE', deletedOnServer: true });
          console.log(`[SYNC SERVER] 🧹 UPDATE ignorado para ${entity} (${id}): no existe en servidor (eliminado).`);
          continue;
        }

        // Sanitización y normalización del payload
        const rawData = { ...(data || {}) };
        FORBIDDEN_MUTATION_FIELDS.forEach((field) => delete rawData[field]);
        delete rawData.id;
        delete rawData.createdAt;
        delete rawData.fotoBlob;
        delete rawData.previewUrl;
        delete rawData.elementosPorCrear;

        if (rawData.foto) {
          rawData.foto = sanitizeFotoServer(rawData.foto);
        }
        if (rawData.fotoUrl) {
          rawData.fotoUrl = sanitizeFotoServer(rawData.fotoUrl);
        }

        // Normalización específica por entidad para evitar rechazos de esquema y rescatar estructuras antiguas
        if (modelName === 'elementoUnifilar') {
          // 1. Nombre seguro obligatorio
          rawData.nombre = String(rawData.nombre || rawData.codigo || rawData.tag || 'Elemento Unifilar').trim();
          if (!rawData.nombre) rawData.nombre = 'Elemento Unifilar';

          // 2. Validar enum TipoElemento de Prisma mediante cleanTipoElemento
          rawData.tipoElemento = cleanTipoElemento(rawData.tipoElemento);

          // 3. Deserializar y normalizar datosTecnicos (Json obligatorio en PostgreSQL)
          let dt = {};
          if (typeof rawData.datosTecnicos === 'string') {
            try {
              dt = JSON.parse(rawData.datosTecnicos);
            } catch {
              dt = {};
            }
          } else if (typeof rawData.datosTecnicos === 'object' && rawData.datosTecnicos !== null) {
            dt = { ...rawData.datosTecnicos };
          }

          // Rescatar campos legados u obsoletos hacia datosTecnicos
          if (rawData.codigo && !dt.codigo) dt.codigo = rawData.codigo;
          if (rawData.tag && !dt.tag) dt.tag = rawData.tag;
          if (rawData.orden !== undefined && dt.orden === undefined) dt.orden = rawData.orden;
          if (rawData.voltajeAcometida && !dt.tension) dt.tension = rawData.voltajeAcometida;
          if (rawData.voltaje && !dt.tension) dt.tension = rawData.voltaje;
          if (rawData.tension && !dt.tension) dt.tension = rawData.tension;
          if (rawData.capacidadPolos && !dt.maxPoles) dt.maxPoles = Number(rawData.capacidadPolos);
          if (rawData.corrienteNominal && !rawData.breakerAmperaje) rawData.breakerAmperaje = parseFloat(rawData.corrienteNominal);
          if (rawData.marca && !rawData.breakerMarca) rawData.breakerMarca = rawData.marca;

          // Inyectar valores normalizados según Norma Técnica Venezolana COVENIN 159:1997 / CEN 200
          if (!dt.tension) dt.tension = '208Y/120 V'; // Tensión normalizada BT COVENIN 159:1997
          if (!dt.frecuencia) dt.frecuencia = '60 Hz'; // Frecuencia estándar del SEN (Venezuela)
          if (dt.fases === undefined) dt.fases = rawData.fases !== undefined ? Number(rawData.fases) : 3;
          if (dt.hilos === undefined) dt.hilos = 4;
          if (dt.maxPoles === undefined) dt.maxPoles = rawData.maxPolos !== undefined ? Number(rawData.maxPolos) : 42;
          if (!dt.norma) dt.norma = 'COVENIN 159:1997 / CEN 200';
          if (!Array.isArray(dt.circuits)) {
            dt.circuits = Array.isArray(dt.circuitos) ? dt.circuitos : (Array.isArray(rawData.circuits) ? rawData.circuits : (Array.isArray(rawData.circuitos) ? rawData.circuitos : []));
          }

          // Si es TRANSFORMADOR, calcular corrientes nominales y normalizar tipo de conexión
          if (rawData.tipoElemento === 'TRANSFORMADOR') {
            const canonConexion = normalizarTipoConexion(
              dt.tipoConexion || dt.conexionTrafo || dt.conexion,
              dt.conexion,
              dt.fases
            );
            dt.tipoConexion = canonConexion;
            dt.conexion = canonConexion;
            const potKva = dt.potenciaKva || dt.kva || rawData.potenciaEstimada;
            const v1 = dt.tensionPrimaria || dt.voltajePrimario;
            const u1 = dt.unidadTensionPrimaria || 'kV';
            const v2 = dt.tensionSecundaria || dt.voltajeSecundario;
            const uPot = dt.unidadPotencia || 'kVA';

            const calc = calcularCorrientesTrafo({
              potencia: potKva,
              unidadPotencia: uPot,
              tensionPrimaria: v1,
              unidadTensionPrimaria: u1,
              tensionSecundaria: v2,
              tipoConexion: canonConexion,
              fases: dt.fases
            });
            dt.fases = String(calc.fases);
            dt.corrientePrimariaCalculada = calc.i1;
            dt.corrienteSecundariaCalculada = calc.i2;
            if (!dt.amperiosPrimaria && calc.i1 != null) dt.amperiosPrimaria = String(calc.i1);
            if (!dt.amperiosSecundaria && calc.i2 != null) dt.amperiosSecundaria = String(calc.i2);
            if (calc.i2 != null) {
              dt.corrienteNominalA = calc.i2;
              dt.corrienteNominalB = calc.i2;
              dt.corrienteNominalC = calc.i2;
              dt.corrienteSecundaria = calc.i2;
            }
          }

          rawData.datosTecnicos = dt;

          // 4. Normalización segura de tipos numéricos y textos para Prisma
          if (rawData.breakerAmperaje !== undefined && rawData.breakerAmperaje !== null && rawData.breakerAmperaje !== '') {
            const parsedAmp = parseFloat(rawData.breakerAmperaje);
            rawData.breakerAmperaje = !isNaN(parsedAmp) ? parsedAmp : 0;
          } else {
            rawData.breakerAmperaje = 0;
          }

          if (rawData.potenciaEstimada !== undefined && rawData.potenciaEstimada !== null && rawData.potenciaEstimada !== '') {
            rawData.potenciaEstimada = String(rawData.potenciaEstimada);
          } else {
            rawData.potenciaEstimada = '';
          }

          rawData.circuitoOrigen = typeof rawData.circuitoOrigen === 'string' ? rawData.circuitoOrigen : '';
          rawData.calibreConductor = typeof rawData.calibreConductor === 'string' ? rawData.calibreConductor : '';
          rawData.breakerMarca = typeof rawData.breakerMarca === 'string' ? rawData.breakerMarca : '';
          rawData.breakerTipo = typeof rawData.breakerTipo === 'string' ? rawData.breakerTipo : '';
          rawData.ubicacion = typeof rawData.ubicacion === 'string' ? rawData.ubicacion : '';
          rawData.alimentadoPor = typeof rawData.alimentadoPor === 'string' ? rawData.alimentadoPor : '';
          rawData.observacionesGenerales = typeof rawData.observacionesGenerales === 'string' ? rawData.observacionesGenerales : '';

          const validEstados = ['ACTIVO', 'RESERVA', 'PENDIENTE_CREAR'];
          rawData.estadoVinculo = validEstados.includes(rawData.estadoVinculo) ? rawData.estadoVinculo : 'ACTIVO';

          if (rawData.companyId && !rawData.empresaId) {
            rawData.empresaId = rawData.companyId;
          }
          if (rawData.pendiente !== undefined || dt.pendiente !== undefined) {
            dt.pendiente = rawData.pendiente !== undefined ? Boolean(rawData.pendiente) : Boolean(dt.pendiente);
          } else if (existingRecord?.datosTecnicos?.pendiente !== undefined && dt.pendiente === undefined) {
            dt.pendiente = Boolean(existingRecord.datosTecnicos.pendiente);
          }
        } else if (modelName === 'subestacion') {
          if (rawData.companyId && !rawData.empresaId) rawData.empresaId = rawData.companyId;
          if (!rawData.nombre) rawData.nombre = 'Subestación Principal';
          if (!rawData.ubicacion) rawData.ubicacion = 'Sede Principal';
          if (!rawData.fecha) rawData.fecha = new Date().toISOString().split('T')[0];
          if (!rawData.hora) rawData.hora = '08:00';
          if (!rawData.inspector) rawData.inspector = 'Inspector';
          if (!rawData.nivelTension) rawData.nivelTension = '13.8 kV';
          const prevEstadoEntorno = (existingRecord && typeof existingRecord.estadoEntorno === 'object' && existingRecord.estadoEntorno !== null)
            ? existingRecord.estadoEntorno
            : {};
          const nextEstadoEntorno = typeof rawData.estadoEntorno === 'object' && rawData.estadoEntorno !== null
            ? { ...prevEstadoEntorno, ...rawData.estadoEntorno }
            : { ...prevEstadoEntorno };
          if (rawData.pendiente !== undefined || rawData.estadoEntorno?.__pendiente !== undefined) {
            nextEstadoEntorno.__pendiente = rawData.pendiente !== undefined
              ? Boolean(rawData.pendiente)
              : Boolean(rawData.estadoEntorno?.__pendiente);
          }
          rawData.estadoEntorno = nextEstadoEntorno;
          rawData.obrasCiviles = typeof rawData.obrasCiviles === 'object' && rawData.obrasCiviles !== null ? rawData.obrasCiviles : {};
          rawData.equiposPrincipales = typeof rawData.equiposPrincipales === 'object' && rawData.equiposPrincipales !== null ? rawData.equiposPrincipales : {};
          rawData.puestaTierra = typeof rawData.puestaTierra === 'object' && rawData.puestaTierra !== null ? rawData.puestaTierra : {};
          rawData.edificioControl = typeof rawData.edificioControl === 'object' && rawData.edificioControl !== null ? rawData.edificioControl : {};
        } else if (modelName === 'puntoMedicion') {
          if (rawData.companyId && !rawData.empresaId) rawData.empresaId = rawData.companyId;
          if (!rawData.nombre) rawData.nombre = 'Punto de Medición';
          const prevObs = typeof existingRecord?.observaciones === 'string' ? existingRecord.observaciones : '';
          const hadPendiente = prevObs.includes('[[PENDIENTE]]');
          const hasExplicitPendiente = rawData.pendiente !== undefined;
          const nextPendiente = hasExplicitPendiente ? Boolean(rawData.pendiente) : hadPendiente;
          if (hasExplicitPendiente || rawData.observaciones !== undefined) {
            const baseObs = (rawData.observaciones !== undefined ? String(rawData.observaciones || '') : prevObs)
              .replace(/\s*\[\[PENDIENTE\]\]/g, '')
              .trim();
            rawData.observaciones = nextPendiente
              ? (baseObs ? `${baseObs} [[PENDIENTE]]` : '[[PENDIENTE]]')
              : baseObs;
          }
        } else if (modelName === 'ccm') {
          if (rawData.companyId && !rawData.empresaId) rawData.empresaId = rawData.companyId;
          if (!rawData.nombre) rawData.nombre = 'CCM Principal';
          if (rawData.pendiente !== undefined || rawData.parametrosElectricos?.__pendiente !== undefined || existingRecord?.parametrosElectricos) {
            const prevParams = (existingRecord && typeof existingRecord.parametrosElectricos === 'object' && existingRecord.parametrosElectricos !== null)
              ? existingRecord.parametrosElectricos
              : {};
            const nextParams = (typeof rawData.parametrosElectricos === 'object' && rawData.parametrosElectricos !== null)
              ? { ...prevParams, ...rawData.parametrosElectricos }
              : { ...prevParams };
            if (rawData.pendiente !== undefined || rawData.parametrosElectricos?.__pendiente !== undefined) {
              nextParams.__pendiente = rawData.pendiente !== undefined
                ? Boolean(rawData.pendiente)
                : Boolean(rawData.parametrosElectricos?.__pendiente);
            }
            rawData.parametrosElectricos = nextParams;
          }
        } else if (modelName === 'tablero') {
          if (rawData.companyId && !rawData.empresaId) rawData.empresaId = rawData.companyId;
          if (!rawData.nombre) rawData.nombre = 'Tablero Principal';
        } else if (modelName === 'circuito') {
          if (rawData.posicionPolo !== undefined) rawData.posicionPolo = Number(rawData.posicionPolo) || 1;
          if (rawData.numPolos !== undefined) rawData.numPolos = Number(rawData.numPolos) || 1;
        } else if (modelName === 'proyecto') {
          if (rawData.companyId && !rawData.empresaId) rawData.empresaId = rawData.companyId;
          if (!rawData.nombre) rawData.nombre = 'Proyecto Principal';
          if (rawData.responsable && typeof rawData.responsable === 'object') {
            if (rawData.responsableNombre === undefined) rawData.responsableNombre = rawData.responsable.nombre || '';
            if (rawData.responsableTelefono === undefined) rawData.responsableTelefono = rawData.responsable.telefono || '';
            if (rawData.responsableEmail === undefined) rawData.responsableEmail = rawData.responsable.email || '';
          }
          if (rawData.ubicacion !== undefined && rawData.direccion === undefined) {
            rawData.direccion = rawData.ubicacion;
          }
          if (!rawData.direccion) rawData.direccion = 'Sin dirección registrada';
        } else if (modelName === 'inspeccionTanqueCombustible') {
          const toNullableFloat = (v) => {
            if (v === undefined || v === null || v === '') return null;
            const n = Number(v);
            return Number.isFinite(n) ? n : null;
          };
          if (rawData.companyId && !rawData.empresaId) rawData.empresaId = rawData.companyId;
          if (!rawData.nombre) rawData.nombre = 'Inspección Tanque de Combustible';
          if (rawData.capacidadLitros !== undefined && rawData.capacidadTotalLitros === undefined) {
            rawData.capacidadTotalLitros = toNullableFloat(rawData.capacidadLitros);
          } else if (rawData.capacidadTotalLitros !== undefined) {
            rawData.capacidadTotalLitros = toNullableFloat(rawData.capacidadTotalLitros);
          }
          if (rawData.nivelCombustible !== undefined && rawData.nivelActualPorcentaje === undefined) {
            rawData.nivelActualPorcentaje = toNullableFloat(rawData.nivelCombustible);
          }
          if (rawData.nivelPorcentaje !== undefined && rawData.nivelActualPorcentaje === undefined) {
            rawData.nivelActualPorcentaje = toNullableFloat(rawData.nivelPorcentaje);
          } else if (rawData.nivelActualPorcentaje !== undefined) {
            rawData.nivelActualPorcentaje = toNullableFloat(rawData.nivelActualPorcentaje);
          }
          if (rawData.consumoLh !== undefined && rawData.consumoGeneradorLh === undefined) {
            rawData.consumoGeneradorLh = toNullableFloat(rawData.consumoLh);
          } else if (rawData.consumoGeneradorLh !== undefined) {
            rawData.consumoGeneradorLh = toNullableFloat(rawData.consumoGeneradorLh);
          }
          if (rawData.diqueContencion !== undefined && rawData.diqueContencion110 === undefined) {
            rawData.diqueContencion110 = String(rawData.diqueContencion);
          }
        }

        // Manejo seguro de eliminación o persistencia de fotos (incluye URLs R2 en JSON para modelos sin columna foto)
        const incomingFotoCandidate =
          rawData.foto ||
          rawData.fotoUrl ||
          rawData.imagen ||
          rawData.datos?.foto ||
          rawData.datosTecnicos?.foto ||
          null;
        const isPhotoRemoval = (
          rawData.foto === '__DELETE__' ||
          rawData.fotoUrl === '__DELETE__' ||
          rawData.deletePhoto === true ||
          rawData.deletePhoto === 'true' ||
          rawData.eliminarFoto === true ||
          rawData.eliminarFoto === 'true'
        );
        if (isPhotoRemoval) {
          rawData.foto = null;
          const prevFoto =
            existingRecord?.foto ||
            existingRecord?.estadoEntorno?.__foto ||
            existingRecord?.parametrosElectricos?.__foto ||
            null;
          const oldR2Key = extraerR2KeyDeUrl(prevFoto);
          if (oldR2Key) {
            await eliminarImagenDeR2(oldR2Key);
          }
          if (modelName === 'subestacion') {
            rawData.estadoEntorno = { ...(rawData.estadoEntorno || {}), __foto: null };
          } else if (modelName === 'ccm') {
            rawData.parametrosElectricos = { ...(rawData.parametrosElectricos || {}), __foto: null };
          }
        } else if (typeof incomingFotoCandidate === 'string' && incomingFotoCandidate.trim()) {
          const sanitizedFoto = sanitizeFotoServer(incomingFotoCandidate);
          if (sanitizedFoto) {
            rawData.foto = sanitizedFoto;
            if (modelName === 'subestacion') {
              rawData.estadoEntorno = { ...(rawData.estadoEntorno || {}), __foto: sanitizedFoto };
            } else if (modelName === 'ccm') {
              rawData.parametrosElectricos = { ...(rawData.parametrosElectricos || {}), __foto: sanitizedFoto };
            }
          } else {
            delete rawData.foto;
          }
        } else {
          delete rawData.foto;
        }
        delete rawData.fotoUrl;
        delete rawData.imagen;
        delete rawData.deletePhoto;
        delete rawData.eliminarFoto;

        // Asegurar restricciones de claves foráneas para circuitos (tableroId)
        if (modelName === 'circuito' && rawData.tableroId) {
          const parentTablero = await prisma.tablero.findUnique({ where: { id: rawData.tableroId } });
          if (!parentTablero) {
            let projId = rawData.proyectoId;
            if (!projId) {
              const firstP = await prisma.proyecto.findFirst();
              projId = firstP ? firstP.id : 'proj-auto';
            }
            await prisma.tablero.create({
              data: {
                id: rawData.tableroId,
                nombre: 'Tablero Principal Auto',
                ubicacion: 'General',
                proyectoId: projId
              }
            });
            console.log(`[SYNC AUTO-PARENT] ✅ Tablero padre creado automáticamente para circuito: ${rawData.tableroId}`);
          }
        }

        // Validar existencia de proyecto y empresa padre (sin crear registros ficticios)
        if (['elementoUnifilar', 'subestacion', 'tablero', 'puntoMedicion', 'ccm', 'alimentador', 'inspeccionTermografica', 'inspeccionAterramiento', 'inspeccionTanqueCombustible'].includes(modelName)) {
          const projId = rawData.proyectoId;
          if (!projId) {
            throw new Error(`El campo proyectoId es obligatorio para sincronizar ${entity} (${id}).`);
          }

          const targetProj = await prisma.proyecto.findUnique({ where: { id: projId } });
          if (!targetProj) {
            throw new Error(`El proyecto padre (${projId}) no existe en la base de datos para ${entity} (${id}).`);
          }

          // Asegurar que empresaId apunte a la empresa válida del proyecto
          if (rawData.empresaId) {
            const empCheck = await prisma.empresa.findUnique({ where: { id: rawData.empresaId } });
            if (!empCheck) {
              rawData.empresaId = targetProj.empresaId;
            }
          } else {
            rawData.empresaId = targetProj.empresaId;
          }

          // Para alimentadoPorId autorreferencial: distinguir explícitamente entre undefined vs null/"" (vaciado)
          if (modelName === 'elementoUnifilar') {
            const explicitClearParent =
              rawData.alimentadoPorId === null ||
              rawData.alimentadoPorId === '' ||
              rawData.limpiarAlimentadores === true ||
              rawData.limpiarAlimentadores === 'true' ||
              (('alimentadoPor' in rawData) && (rawData.alimentadoPor === null || String(rawData.alimentadoPor).trim() === ''));

            if (explicitClearParent && !rawData.alimentadoPorId) {
              rawData.alimentadoPorId = null;
              rawData.alimentadoPor = typeof rawData.alimentadoPor === 'string' ? rawData.alimentadoPor : '';
              rawData.datosTecnicos = {
                ...(rawData.datosTecnicos || {}),
                alimentadoPorId: null,
                alimentadorId: null,
                alimentadoPor: rawData.alimentadoPor
              };
            } else {
              const desiredParentId = rawData.alimentadoPorId !== undefined
                ? (rawData.alimentadoPorId || null)
                : (rawData.datosTecnicos?.alimentadoPorId || null);

              if (desiredParentId && desiredParentId !== id) {
                rawData.datosTecnicos = {
                  ...(rawData.datosTecnicos || {}),
                  alimentadoPorId: desiredParentId
                };
                const parentElementCheck = await prisma.elementoUnifilar.findUnique({ where: { id: desiredParentId } });
                if (!parentElementCheck) {
                  pendingHierarchyLinks.push({
                    childId: id,
                    parentId: desiredParentId,
                    alimentadoPor: rawData.alimentadoPor || ''
                  });
                  rawData.alimentadoPorId = null;
                } else {
                  rawData.alimentadoPorId = desiredParentId;
                }
              } else {
                rawData.alimentadoPorId = null;
                if (rawData.datosTecnicos && typeof rawData.datosTecnicos === 'object') {
                  rawData.datosTecnicos = {
                    ...rawData.datosTecnicos,
                    alimentadoPorId: null
                  };
                }
              }
            }

            if (existingRecord?.alimentadoPorId && existingRecord.alimentadoPorId !== rawData.alimentadoPorId) {
              await limpiarReferenciaHijoEnPadreAnterior(existingRecord.alimentadoPorId, id, existingRecord.nombre);
            }
          }
        }

        // Filtrar payload ÚNICAMENTE con los campos reconocidos por el modelo en Prisma
        const allowedFields = MODEL_ALLOWED_FIELDS[modelName] || new Set();
        const sanitizedPayload = {};
        for (const [key, val] of Object.entries(rawData)) {
          if (allowedFields.has(key)) {
            sanitizedPayload[key] = val;
          }
        }

        // Ejecución tolerante a fallos: Upsert seguro bidireccional (Create-Or-Update)
        if (existingRecord) {
          const currentVersion = existingRecord.version || 1;
          const nextVersion = currentVersion + 1;
          if ('version' in existingRecord) {
            sanitizedPayload.version = nextVersion;
          }

          try {
            const updatedRecord = await delegate.update({
              where: { id },
              data: sanitizedPayload
            });

            applied.push({ id, entity, operation: 'UPDATE', version: updatedRecord.version || nextVersion, record: updatedRecord });
            console.log(`[SYNC SERVER] ✅ ${entity} (${id}) actualizado exitosamente a v${updatedRecord.version || nextVersion}`);
          } catch (updErr) {
            // Si el registro desapareció entre el find y el update, crear de respaldo
            if (updErr.code === 'P2025') {
              console.warn(`[SYNC SERVER] ⚠️ Registro no encontrado en update para ${entity} (${id}). Creando en su lugar...`);
              const createdRecord = await delegate.create({
                data: { ...sanitizedPayload, id }
              });
              applied.push({ id, entity, operation: 'CREATE', version: createdRecord.version || 1, record: createdRecord });
            } else {
              throw updErr;
            }
          }
        } else {
          // Crear nuevo registro con fallback a update si ya existía por conflicto de clave única (P2002)
          if (['elementoUnifilar', 'subestacion', 'tablero', 'circuito', 'puntoMedicion', 'ccm', 'inspeccionTermografica', 'inspeccionAterramiento', 'inspeccionTanqueCombustible'].includes(modelName)) {
            sanitizedPayload.version = 1;
          }

          try {
            const createdRecord = await delegate.create({
              data: { ...sanitizedPayload, id }
            });

            applied.push({ id, entity, operation: 'CREATE', version: createdRecord.version || 1, record: createdRecord });
            console.log(`[SYNC SERVER] 🌟 ${entity} (${id}) creado exitosamente en base de datos`);
          } catch (createErr) {
            // Manejo de conflicto de ID o clave única (P2002): Upsert fallback
            if (createErr.code === 'P2002' || createErr.message?.includes('Unique constraint') || createErr.message?.includes('ya existe')) {
              console.warn(`[SYNC SERVER] ⚠️ Conflicto de unicidad en create para ${entity} (${id}). Ejecutando fallback a update (Upsert)...`);
              const updatedRecord = await delegate.update({
                where: { id },
                data: sanitizedPayload
              });
              applied.push({ id, entity, operation: 'UPDATE', version: updatedRecord.version || 2, record: updatedRecord });
              console.log(`[SYNC SERVER] ✅ ${entity} (${id}) persistido exitosamente vía fallback Upsert`);
            } else {
              throw createErr;
            }
          }
        }
      } catch (itemErr) {
        console.error(`❌ [SYNC SERVER] Error en mutación para ${entity} (${id}):`, itemErr.message);
        conflicts.push({ id, entity, error: itemErr.message });
      }
    }

    // SEGUNDA PASADA: Resolver vínculos padre-hijo (alimentadoPorId) cuyos padres fueron creados dentro del mismo lote
    if (pendingHierarchyLinks.length > 0) {
      for (const link of pendingHierarchyLinks) {
        try {
          const parentExists = await prisma.elementoUnifilar.findUnique({
            where: { id: link.parentId },
            select: { id: true, nombre: true }
          });
          if (parentExists) {
            const updatedChild = await prisma.elementoUnifilar.update({
              where: { id: link.childId },
              data: {
                alimentadoPorId: link.parentId,
                ...(link.alimentadoPor ? { alimentadoPor: link.alimentadoPor } : { alimentadoPor: parentExists.nombre })
              }
            });
            const appliedEntry = applied.find((a) => a.id === link.childId);
            if (appliedEntry) {
              appliedEntry.record = updatedChild;
            }
            console.log(`[SYNC SERVER] 🔗 Jerarquía diferida vinculada: ${link.childId} -> padre ${link.parentId}`);
          }
        } catch (linkErr) {
          console.warn(`[SYNC SERVER] ⚠️ No se pudo vincular jerarquía diferida (${link.childId} -> ${link.parentId}):`, linkErr.message);
        }
      }
    }

    // Re-vincular hijos que hayan llegado antes y guardado su alimentadoPorId pendiente en datosTecnicos
    const upsertedElementEntries = applied.filter((a) => mapEntityToPrismaModel(a.entity) === 'elementoUnifilar');
    const upsertedElementIds = upsertedElementEntries.map((a) => a.id);
    if (upsertedElementIds.length > 0) {
      try {
        const affectedProjectIds = [
          ...new Set(upsertedElementEntries.map((a) => a.record?.proyectoId).filter(Boolean))
        ];
        const orphanChildren = await prisma.elementoUnifilar.findMany({
          where: {
            alimentadoPorId: null,
            deletedAt: null,
            ...(affectedProjectIds.length > 0 ? { proyectoId: { in: affectedProjectIds } } : {})
          },
          select: { id: true, datosTecnicos: true }
        });
        const parentSet = new Set(upsertedElementIds);
        for (const child of orphanChildren) {
          const dtParentId = child.datosTecnicos && typeof child.datosTecnicos === 'object'
            ? child.datosTecnicos.alimentadoPorId
            : null;
          if (dtParentId && parentSet.has(dtParentId) && dtParentId !== child.id) {
            await prisma.elementoUnifilar.update({
              where: { id: child.id },
              data: { alimentadoPorId: dtParentId }
            });
            console.log(`[SYNC SERVER] 🔗 Hijo previo re-vinculado automáticamente: ${child.id} -> padre ${dtParentId}`);
          }
        }
      } catch (relinkErr) {
        console.warn('[SYNC SERVER] ⚠️ Aviso en re-vinculación automática de hijos:', relinkErr.message);
      }
    }

    console.log(`[SYNC SERVER] 🏁 Lote completado: ${applied.length} aplicados, ${conflicts.length} conflictos.`);

    return res.status(200).json({
      ok: true,
      message: `Sincronización procesada. ${applied.length} aplicados, ${conflicts.length} conflictos.`,
      appliedCount: applied.length,
      conflictCount: conflicts.length,
      applied,
      conflicts,
      appliedIds: applied.map((a) => a.id),
      conflictIds: conflicts.map((c) => c.id)
    });
  } catch (error) {
    console.error('❌ [SYNC CRITICAL] Error crítico en procesarSincronizacionBatch:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
};

// ENDPOINT PULL: Traer datos actualizados desde el servidor
// Filtrado por lastSyncTimestamp para obtener solo cambios desde última sincronización
export const pullData = async (req, res) => {
  try {
    const user = req.user || {};
    const tenantCompanyId = user.empresaId || user.companyId;
    const { lastSyncTimestamp } = req.query;

    const where = {};

    // Multitenancy: usuarios CLIENT solo ven su empresa; ADMIN, INSPECTOR y WORKER ven todas las empresas activas
    if (String(user.role || '').toUpperCase() === 'CLIENT' && tenantCompanyId) {
      where.id = tenantCompanyId;
    }

    // Filtrar por última fecha de sincronización de forma inclusiva (si la empresa o cualquiera de sus proyectos/elementos hijos cambió después de ts)
    if (lastSyncTimestamp) {
      const ts = new Date(lastSyncTimestamp);
      if (!isNaN(ts.getTime())) {
        where.OR = [
          { updatedAt: { gte: ts } },
          {
            proyectos: {
              some: {
                OR: [
                  { updatedAt: { gte: ts } },
                  { elementosUnifilares: { some: { updatedAt: { gte: ts } } } },
                  { tableros: { some: { updatedAt: { gte: ts } } } },
                  { subestaciones: { some: { updatedAt: { gte: ts } } } },
                  { puntosMedicion: { some: { updatedAt: { gte: ts } } } },
                  { ccmList: { some: { updatedAt: { gte: ts } } } },
                  { inspeccionesTermograficas: { some: { updatedAt: { gte: ts } } } },
                  { inspeccionesAterramiento: { some: { updatedAt: { gte: ts } } } },
                  { inspeccionesTanquesCombustible: { some: { updatedAt: { gte: ts } } } }
                ]
              }
            }
          }
        ];
      }
    }

    // Traer empresas con todas sus relaciones anidadas activas (deletedAt: null) de schema.prisma
    const companies = await prisma.empresa.findMany({
      where,
      include: {
        proyectos: {
          include: {
            tableros: {
              where: { deletedAt: null },
              include: {
                circuitos: {
                  where: { deletedAt: null },
                  orderBy: {
                    posicionPolo: 'asc'
                  }
                }
              }
            },
            elementosUnifilares: { where: { deletedAt: null } },
            subestaciones: { where: { deletedAt: null } },
            puntosMedicion: { where: { deletedAt: null } },
            ccmList: { where: { deletedAt: null } },
            alimentadores: true,
            inspeccionesTermograficas: { where: { deletedAt: null } },
            inspeccionesAterramiento: { where: { deletedAt: null } },
            inspeccionesTanquesCombustible: { where: { deletedAt: null } }
          }
        }
      }
    });

    // Formatear datos para el frontend asegurando que foto y fotoUrl viajen en todos los tipos
    const formattedCompanies = companies.map(company => ({
      ...company,
      proyectos: (company.proyectos || []).map(proyecto => {
        const elemFotoMap = new Map(
          (proyecto.elementosUnifilares || [])
            .filter(e => e?.id && e?.foto)
            .map(e => [String(e.id), e.foto])
        );
        const elemPendienteMap = new Map(
          (proyecto.elementosUnifilares || [])
            .filter(e => e?.id)
            .map(e => [String(e.id), Boolean(e.datosTecnicos?.pendiente)])
        );

        const formattedSubs = (proyecto.subestaciones || []).map(sub => {
          const resolvedSubFoto = sub.estadoEntorno?.__foto || sub.foto || elemFotoMap.get(String(sub.id)) || null;
          const resolvedSubPendiente = Boolean(sub.estadoEntorno?.__pendiente || elemPendienteMap.get(String(sub.id)));
          return {
            ...sub,
            foto: resolvedSubFoto,
            fotoUrl: resolvedSubFoto,
            pendiente: resolvedSubPendiente
          };
        });

        return {
          ...proyecto,
          tableros: (proyecto.tableros || []).map(tablero => {
            const resolvedTabFoto = tablero.foto || elemFotoMap.get(String(tablero.id)) || null;
            return {
              ...tablero,
              foto: resolvedTabFoto,
              fotoUrl: resolvedTabFoto,
              pendiente: Boolean(tablero.datosTecnicos?.pendiente || elemPendienteMap.get(String(tablero.id))),
              circuitos: tablero.circuitos || []
            };
          }),
          elementosUnifilares: (proyecto.elementosUnifilares || []).map(elem => {
            const resolvedElemFoto = elem.foto || elem.datosTecnicos?.foto || null;
            return {
              ...elem,
              foto: resolvedElemFoto,
              fotoUrl: resolvedElemFoto,
              fotoBlob: null,
              pendiente: Boolean(elem.datosTecnicos?.pendiente)
            };
          }),
          inspeccionesSubestacion: formattedSubs,
          subestaciones: formattedSubs,
          puntosMedicion: (proyecto.puntosMedicion || []).map(pm => {
            const resolvedPmFoto = pm.foto || elemFotoMap.get(String(pm.id)) || null;
            const rawObs = typeof pm.observaciones === 'string' ? pm.observaciones : '';
            const hasPendienteTag = rawObs.includes('[[PENDIENTE]]');
            const cleanObs = rawObs ? rawObs.replace(/\s*\[\[PENDIENTE\]\]/g, '').trim() : pm.observaciones;
            return {
              ...pm,
              observaciones: cleanObs,
              foto: resolvedPmFoto,
              fotoUrl: resolvedPmFoto,
              pendiente: Boolean(hasPendienteTag || elemPendienteMap.get(String(pm.id)))
            };
          }),
          ccmList: (proyecto.ccmList || []).map(ccm => {
            const resolvedCcmFoto = ccm.parametrosElectricos?.__foto || ccm.foto || elemFotoMap.get(String(ccm.id)) || null;
            return {
              ...ccm,
              foto: resolvedCcmFoto,
              fotoUrl: resolvedCcmFoto,
              pendiente: Boolean(ccm.parametrosElectricos?.__pendiente || elemPendienteMap.get(String(ccm.id)))
            };
          }),
          alimentadores: proyecto.alimentadores || [],
          inspeccionesTermograficas: (proyecto.inspeccionesTermograficas || []).map(i => ({ ...i, pendiente: Boolean(i.pendiente || elemPendienteMap.get(String(i.id))) })),
          inspeccionesAterramiento: (proyecto.inspeccionesAterramiento || []).map(i => ({ ...i, pendiente: Boolean(i.pendiente || elemPendienteMap.get(String(i.id))) })),
          inspeccionesTanquesCombustible: (proyecto.inspeccionesTanquesCombustible || []).map(i => ({ ...i, pendiente: Boolean(i.pendiente || elemPendienteMap.get(String(i.id))) }))
        };
      })
    }));

    return res.status(200).json({
      ok: true,
      data: formattedCompanies,
      lastSyncTimestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error en pullData:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
};

/**
 * POST /api/sync/elemento-multipart y /api/sync/upload
 * Procesa la sincronización individual de un elemento con foto binaria vía FormData (Multer).
 * Soporta Zero-Disk (Base64 dataURL / buffer en memoria), auto-resolución de dependencias padre
 * (proyectoId, empresaId, alimentadoPorId) y Upsert resiliente para evitar bloqueos en la syncQueue.
 */
export const sincronizarElementoMultipart = async (req, res) => {
  try {
    const {
      id,
      nombre,
      tipoElemento,
      ubicacion,
      alimentadoPor,
      observacionesGenerales,
      datosTecnicos,
      proyectoId,
      empresaId,
      fotoUrl,
      eliminarFoto,
      alimentadoPorId,
      circuitoOrigen,
      calibreConductor,
      breakerAmperaje,
      breakerMarca,
      breakerTipo,
      potenciaEstimada,
      estadoVinculo,
      detallesFormato
    } = req.body;

    const elementId = id || req.body.localId || `elem-${Date.now()}`;
    const cleanNombre = (nombre || req.body.codigo || req.body.tag || 'Elemento Unifilar').trim();
    const cleanTipo = cleanTipoElemento(tipoElemento);

    console.log(`[SYNC MULTIPART] 📸 Procesando elemento con binario: '${cleanNombre}' (${elementId}) tipo: ${cleanTipo}`);

    // 1. Determinar y procesar la foto (Buffer en memoria de Multer o DataURL o URL)
    let finalFoto = req.body.foto || fotoUrl || null;
    const isPhotoRemoval = (
      eliminarFoto === 'true' ||
      eliminarFoto === true ||
      req.body.deletePhoto === 'true' ||
      req.body.deletePhoto === true ||
      req.body.foto === '__DELETE__' ||
      req.body.fotoUrl === '__DELETE__'
    );

    if (isPhotoRemoval) {
      finalFoto = null;
    } else if (req.file && req.file.buffer) {
      // Zero-Disk: Guardar como DataURL Base64 directamente compatible con PostgreSQL
      finalFoto = `data:${req.file.mimetype || 'image/jpeg'};base64,${req.file.buffer.toString('base64')}`;
    } else if (req.file && req.file.filename) {
      finalFoto = `/uploads/${req.file.filename}`;
    } else if (typeof finalFoto === 'string') {
      finalFoto = sanitizeFotoServer(finalFoto);
    }

    // 2. Parsear y auto-curar datosTecnicos con estándares COVENIN 159:1997 / CEN 200
    let parsedDatosTecnicos = {};
    if (datosTecnicos) {
      if (typeof datosTecnicos === 'string') {
        try {
          parsedDatosTecnicos = JSON.parse(datosTecnicos);
        } catch (e) {
          console.warn('[SYNC MULTIPART] ⚠️ Error al deserializar datosTecnicos JSON:', e.message);
          parsedDatosTecnicos = {};
        }
      } else if (typeof datosTecnicos === 'object' && datosTecnicos !== null) {
        parsedDatosTecnicos = { ...datosTecnicos };
      }
    }
    if (req.body.codigo && !parsedDatosTecnicos.codigo) {
      parsedDatosTecnicos.codigo = req.body.codigo;
    }
    if (req.body.tag && !parsedDatosTecnicos.tag) {
      parsedDatosTecnicos.tag = req.body.tag;
    }
    if (req.body.pendiente !== undefined) {
      parsedDatosTecnicos.pendiente = req.body.pendiente === true || req.body.pendiente === 'true';
    }
    // Rescatar campos legados en raíz
    if (req.body.tension && !parsedDatosTecnicos.tension) parsedDatosTecnicos.tension = req.body.tension;
    if (req.body.voltaje && !parsedDatosTecnicos.tension) parsedDatosTecnicos.tension = req.body.voltaje;
    if (req.body.voltajeAcometida && !parsedDatosTecnicos.tension) parsedDatosTecnicos.tension = req.body.voltajeAcometida;

    // Inyectar valores normalizados COVENIN 159:1997
    if (!parsedDatosTecnicos.tension) parsedDatosTecnicos.tension = '208Y/120 V';
    if (!parsedDatosTecnicos.frecuencia) parsedDatosTecnicos.frecuencia = '60 Hz';
    if (parsedDatosTecnicos.fases === undefined) parsedDatosTecnicos.fases = 3;
    if (parsedDatosTecnicos.hilos === undefined) parsedDatosTecnicos.hilos = 4;
    if (parsedDatosTecnicos.maxPoles === undefined) parsedDatosTecnicos.maxPoles = 42;
    if (!parsedDatosTecnicos.norma) parsedDatosTecnicos.norma = 'COVENIN 159:1997 / CEN 200';
    if (!Array.isArray(parsedDatosTecnicos.circuits)) {
      parsedDatosTecnicos.circuits = Array.isArray(parsedDatosTecnicos.circuitos) ? parsedDatosTecnicos.circuitos : [];
    }

    // Si es TRANSFORMADOR, calcular corrientes nominales y normalizar tipo de conexión
    if (cleanTipo === 'TRANSFORMADOR') {
      const canonConexion = normalizarTipoConexion(
        parsedDatosTecnicos.tipoConexion || parsedDatosTecnicos.conexionTrafo || parsedDatosTecnicos.conexion,
        parsedDatosTecnicos.conexion,
        parsedDatosTecnicos.fases
      );
      parsedDatosTecnicos.tipoConexion = canonConexion;
      parsedDatosTecnicos.conexion = canonConexion;
      const potKva = parsedDatosTecnicos.potenciaKva || parsedDatosTecnicos.kva || req.body.potenciaEstimada;
      const v1 = parsedDatosTecnicos.tensionPrimaria || parsedDatosTecnicos.voltajePrimario;
      const u1 = parsedDatosTecnicos.unidadTensionPrimaria || 'kV';
      const v2 = parsedDatosTecnicos.tensionSecundaria || parsedDatosTecnicos.voltajeSecundario;
      const uPot = parsedDatosTecnicos.unidadPotencia || 'kVA';

      const calc = calcularCorrientesTrafo({
        potencia: potKva,
        unidadPotencia: uPot,
        tensionPrimaria: v1,
        unidadTensionPrimaria: u1,
        tensionSecundaria: v2,
        tipoConexion: canonConexion,
        fases: parsedDatosTecnicos.fases
      });
      parsedDatosTecnicos.fases = String(calc.fases);
      parsedDatosTecnicos.corrientePrimariaCalculada = calc.i1;
      parsedDatosTecnicos.corrienteSecundariaCalculada = calc.i2;
      if (!parsedDatosTecnicos.amperiosPrimaria && calc.i1 != null) parsedDatosTecnicos.amperiosPrimaria = String(calc.i1);
      if (!parsedDatosTecnicos.amperiosSecundaria && calc.i2 != null) parsedDatosTecnicos.amperiosSecundaria = String(calc.i2);
      if (calc.i2 != null) {
        parsedDatosTecnicos.corrienteNominalA = calc.i2;
        parsedDatosTecnicos.corrienteNominalB = calc.i2;
        parsedDatosTecnicos.corrienteNominalC = calc.i2;
        parsedDatosTecnicos.corrienteSecundaria = calc.i2;
      }
    }

    // 3. Validar existencia de Proyecto y Empresa padre (sin auto-crear registros ficticios)
    const resolvedProyectoId = proyectoId;
    if (!resolvedProyectoId) {
      return res.status(400).json({
        ok: false,
        success: false,
        error: 'El campo proyectoId es obligatorio para sincronizar el elemento.'
      });
    }

    const targetProj = await prisma.proyecto.findUnique({ where: { id: resolvedProyectoId } });
    if (!targetProj) {
      return res.status(422).json({
        ok: false,
        success: false,
        error: `El proyecto padre (${resolvedProyectoId}) no existe en la base de datos.`
      });
    }

    const resolvedEmpresaId = targetProj.empresaId;

    // 4. Verificar alimentadoPorId distinguiendo explícitamente undefined vs null/"" (vaciado intencional)
    const explicitClearParent =
      alimentadoPorId === null ||
      alimentadoPorId === '' ||
      alimentadoPorId === 'null' ||
      req.body.limpiarAlimentadores === true ||
      req.body.limpiarAlimentadores === 'true' ||
      (('alimentadoPor' in req.body) && (req.body.alimentadoPor === null || String(req.body.alimentadoPor).trim() === ''));

    let validAlimentadoPorId = null;
    let finalAlimentadoPorText = alimentadoPor || '';

    if (explicitClearParent && (!alimentadoPorId || alimentadoPorId === 'null')) {
      validAlimentadoPorId = null;
      finalAlimentadoPorText = typeof alimentadoPor === 'string' ? alimentadoPor.trim() : '';
      parsedDatosTecnicos.alimentadoPorId = null;
      parsedDatosTecnicos.alimentadorId = null;
      parsedDatosTecnicos.alimentadoPor = finalAlimentadoPorText;
    } else {
      const requestedParentId = alimentadoPorId !== undefined
        ? (alimentadoPorId && alimentadoPorId !== 'null' ? alimentadoPorId : null)
        : (parsedDatosTecnicos.alimentadoPorId || null);
      validAlimentadoPorId = requestedParentId && requestedParentId !== elementId ? requestedParentId : null;
      if (validAlimentadoPorId) {
        parsedDatosTecnicos.alimentadoPorId = validAlimentadoPorId;
        const parentElCheck = await prisma.elementoUnifilar.findUnique({ where: { id: validAlimentadoPorId } });
        if (!parentElCheck) {
          validAlimentadoPorId = null;
        }
      } else {
        parsedDatosTecnicos.alimentadoPorId = null;
        parsedDatosTecnicos.alimentadorId = null;
      }
    }

    // 5. Preparar datos de ElementoUnifilar para Upsert con auto-curación
    let parsedDetallesFormato = undefined;
    if (detallesFormato) {
      if (typeof detallesFormato === 'string') {
        try {
          parsedDetallesFormato = JSON.parse(detallesFormato);
        } catch {
          parsedDetallesFormato = undefined;
        }
      } else if (typeof detallesFormato === 'object' && detallesFormato !== null) {
        parsedDetallesFormato = detallesFormato;
      }
    }

    const elementData = {
      nombre: cleanNombre,
      tipoElemento: cleanTipo,
      ubicacion: ubicacion || '',
      alimentadoPor: finalAlimentadoPorText,
      observacionesGenerales: observacionesGenerales || '',
      datosTecnicos: parsedDatosTecnicos,
      proyectoId: resolvedProyectoId,
      empresaId: resolvedEmpresaId || null,
      foto: finalFoto,
      alimentadoPorId: validAlimentadoPorId,
      circuitoOrigen: circuitoOrigen || '',
      calibreConductor: calibreConductor || '',
      breakerAmperaje: breakerAmperaje !== undefined && breakerAmperaje !== null && breakerAmperaje !== '' ? (parseFloat(breakerAmperaje) || 0) : 0,
      breakerMarca: breakerMarca || '',
      breakerTipo: breakerTipo || '',
      potenciaEstimada: potenciaEstimada !== undefined && potenciaEstimada !== null ? String(potenciaEstimada) : '',
      estadoVinculo: ['ACTIVO', 'RESERVA', 'PENDIENTE_CREAR'].includes(estadoVinculo) ? estadoVinculo : 'ACTIVO',
      detallesFormato: parsedDetallesFormato
    };

    // 6. Upsert en ElementoUnifilar
    const existingElement = await prisma.elementoUnifilar.findUnique({ where: { id: elementId } });
    let savedElement;

    if (existingElement && existingElement.deletedAt !== null) {
      return res.status(200).json({
        ok: true,
        success: true,
        deletedOnServer: true,
        data: existingElement,
        localId: elementId,
        mensaje: 'El elemento ya había sido eliminado en el servidor.'
      });
    }

    if (isPhotoRemoval) {
      const oldKey = extraerR2KeyDeUrl(existingElement?.foto || req.body.previousFotoUrl || '');
      if (oldKey) {
        await eliminarImagenDeR2(oldKey);
      }
    }

    if (existingElement && existingElement.alimentadoPorId && existingElement.alimentadoPorId !== validAlimentadoPorId) {
      await limpiarReferenciaHijoEnPadreAnterior(existingElement.alimentadoPorId, elementId, existingElement.nombre);
    }

    if (existingElement) {
      const updateElementData = { ...elementData };
      if (!isPhotoRemoval && !finalFoto) {
        delete updateElementData.foto;
      }
      savedElement = await prisma.elementoUnifilar.update({
        where: { id: elementId },
        data: {
          ...updateElementData,
          version: (existingElement.version || 1) + 1
        }
      });
      console.log(`[SYNC MULTIPART] 🔄 Elemento actualizado exitosamente: ${elementId} (v${savedElement.version})`);
    } else {
      savedElement = await prisma.elementoUnifilar.create({
        data: {
          id: elementId,
          ...elementData,
          version: 1
        }
      });
      console.log(`[SYNC MULTIPART] 🆕 Elemento creado exitosamente con foto: ${elementId}`);
    }

    // 6.b Re-vincular automáticamente cualquier elemento hijo que haya llegado en el lote JSON antes que este padre con foto
    try {
      const waitingChildren = await prisma.elementoUnifilar.findMany({
        where: {
          proyectoId: resolvedProyectoId,
          alimentadoPorId: null,
          deletedAt: null
        },
        select: { id: true, datosTecnicos: true, alimentadoPor: true }
      });
      for (const child of waitingChildren) {
        const dtParentId = child.datosTecnicos && typeof child.datosTecnicos === 'object'
          ? child.datosTecnicos.alimentadoPorId
          : null;
        if (dtParentId === elementId && child.id !== elementId) {
          await prisma.elementoUnifilar.update({
            where: { id: child.id },
            data: {
              alimentadoPorId: elementId,
              alimentadoPor: child.alimentadoPor || cleanNombre
            }
          });
          console.log(`[SYNC MULTIPART] 🔗 Hijo re-vinculado tras subida de padre multipart: ${child.id} -> ${elementId}`);
        }
      }
    } catch (relinkMultipartErr) {
      console.warn('[SYNC MULTIPART] ⚠️ Aviso al re-vincular hijos tras multipart:', relinkMultipartErr.message);
    }

    // 7. Si es tipo TABLERO, sincronizar también la tabla Tablero de forma no-bloqueante
    if (cleanTipo === 'TABLERO') {
      try {
        const tension = parsedDatosTecnicos.tension || parsedDatosTecnicos.voltajeAcometida || null;
        const fases = parsedDatosTecnicos.fases !== undefined ? parseInt(parsedDatosTecnicos.fases, 10) : 3;
        const maxPolos = parsedDatosTecnicos.maxPoles !== undefined ? parseInt(parsedDatosTecnicos.maxPoles, 10) : 42;
        const alimentadorId = parsedDatosTecnicos.alimentadorId || null;

        await prisma.tablero.upsert({
          where: { id: elementId },
          update: {
            nombre: cleanNombre,
            ubicacion: ubicacion || null,
            maxPolos,
            tension,
            fases,
            alimentadorId,
            proyectoId: resolvedProyectoId,
            empresaId: resolvedEmpresaId || null
          },
          create: {
            id: elementId,
            nombre: cleanNombre,
            ubicacion: ubicacion || 'General',
            maxPolos,
            tension,
            fases,
            alimentadorId,
            proyectoId: resolvedProyectoId,
            empresaId: resolvedEmpresaId || null
          }
        });
      } catch (tableroErr) {
        console.warn(`[SYNC MULTIPART] ⚠️ Aviso sincronizando tabla Tablero auxiliar (${elementId}):`, tableroErr.message);
      }
    }

    return res.status(200).json({
      ok: true,
      success: true,
      data: savedElement,
      localId: elementId,
      foto: savedElement.foto,
      mensaje: 'Elemento y archivo binario sincronizados exitosamente'
    });
  } catch (error) {
    console.error('❌ [SYNC MULTIPART ERROR] Error procesando elemento multipart:', error);
    return res.status(500).json({
      ok: false,
      success: false,
      error: error.message || 'Error interno al procesar archivo en sincronización'
    });
  }
};

// ENDPOINT LOCAL BACKUP: Generar y descargar backup JSON local
export const generarBackupLocal = async (req, res) => {
  try {
    const user = req.user;
    const { tipo = 'completo' } = req.body;

    // WHERE simple: solo filtrar por empresa si es CLIENT
    const where = {};
    if (user.role === 'CLIENT' && user.companyId) {
      where.id = user.companyId;
    }

    // Simplificado: solo traer empresas con proyectos básicos (sin relaciones anidadas profundas)
    // Esto evita el ERROR FUNCTION_INVOCATION_FAILED causado por includes muy profundos
    const empresas = await prisma.empresa.findMany({
      where,
      // MÍNIMO include necesario - solo lo esencial para que funcione
      include: {
        proyectos: {
          select: {
            id: true,
            nombre: true,
            descripcion: true,
            empresaId: true
            // Sin include anidado de tableros, circuitos, etc.
          }
        }
      }
    });

    // Construir datos de backup simplificados pero estructurados
    const data = {
      exportacion: new Date().toISOString(),
      usuarioId: user.id,
      tipo: tipo,
      modo: 'essencial', // Indica que es un backup esencial (rápido y seguro)
      empresas: empresas.map(empresa => ({
        id: empresa.id,
        nombre: empresa.nombre,
        rif: empresa.rif,
        direccion: empresa.direccion,
        creadoAt: empresa.createdAt,
        proyectos: empresa.proyectos || []
      }))
    };

    // Nombre de archivo con timestamp
    const filename = `backup-${user.id}-${tipo}-${Date.now()}.json`;

    // Codificar a base64 de forma segura
    const jsonString = JSON.stringify(data, null, 2);
    const archivoBase64 = Buffer.from(jsonString).toString('base64');

    return res.status(200).json({
      ok: true,
      filename,
      archivo: archivoBase64,
      size: Buffer.byteLength(Buffer.from(jsonString)),
      recordCount: data.empresas.length,
      mensaje: `Backup esencial generado con ${data.empresas.length} empresas`
    });

  } catch (error) {
    console.error('❌ Error en generarBackupLocal (versión simplificada):', error);
    // Intentar error más específico
    return res.status(500).json({ 
      ok: false, 
      error: error.message || 'Error desconocido en backup',
      codigoError: error.code || 'PRISMA_TIMEOUT'
    });
  }
};

const contarRegistros = (data) => {
  let count = 0;
  if (data.empresas) {
    data.empresas.forEach(emp => {
      count += emp.proyectos?.reduce((sum, proj) => {
        return sum + (proj.tableros?.length || 0) + 
                 (proj.elementosUnifilares?.length || 0) + 
                 (proj.puntosMedicion?.length || 0) + 
                 (proj.ccmList?.length || 0) + 
                 (proj.alimentadores?.length || 0) + 
                 (proj.ccmList?.length || 0);
      }, 0) || 0;
    });
  }
  return count;
};

/**
 * Limpia la referencia inversa de un elemento hijo en su padre anterior dentro de PostgreSQL
 * (datosTecnicos.alimentaAIds, alimentaA, salidaCargaId y circuitos vinculados) para evitar
 * que pullData o la hidratación bidireccional resuciten el vínculo viejo tras guardar o recargar.
 */
async function limpiarReferenciaHijoEnPadreAnterior(prevParentId, childId, childName = '') {
  if (!prevParentId || !childId || prevParentId === childId) return;
  try {
    const prevParent = await prisma.elementoUnifilar.findUnique({
      where: { id: String(prevParentId) },
      select: { id: true, datosTecnicos: true, version: true }
    });
    if (!prevParent) return;

    const dt = prevParent.datosTecnicos && typeof prevParent.datosTecnicos === 'object'
      ? { ...prevParent.datosTecnicos }
      : {};
    let changed = false;

    if (Array.isArray(dt.alimentaAIds)) {
      const nextIds = dt.alimentaAIds.filter((cid) => String(cid) !== String(childId));
      if (nextIds.length !== dt.alimentaAIds.length) {
        dt.alimentaAIds = nextIds;
        changed = true;
      }
    }
    if (dt.salidaCargaId && String(dt.salidaCargaId) === String(childId)) {
      dt.salidaCargaId = null;
      dt.salidaCargaNombre = '';
      changed = true;
    }
    if (typeof dt.alimentaA === 'string' && dt.alimentaA.trim()) {
      const cleanChildUpper = String(childName || '').trim().toUpperCase();
      const parts = dt.alimentaA.split(',').map((s) => s.trim()).filter(Boolean);
      const nextParts = parts.filter((p) => {
        const up = p.toUpperCase();
        if (cleanChildUpper && up === cleanChildUpper) return false;
        if (up.includes(String(childId).toUpperCase())) return false;
        return true;
      });
      if (nextParts.length !== parts.length) {
        dt.alimentaA = nextParts.join(', ');
        changed = true;
      }
    }
    if (Array.isArray(dt.circuits)) {
      const nextCircuits = dt.circuits.map((c) => {
        if (!c) return c;
        const destId = c.elementoDestinoId || c.vinculadoId;
        if (destId && String(destId) === String(childId)) {
          changed = true;
          return {
            ...c,
            elementoDestinoId: null,
            vinculadoId: null,
            tipoDestino: 'RESERVA',
            equipo: 'RESERVA',
            estado: 'reserva'
          };
        }
        return c;
      });
      if (changed) dt.circuits = nextCircuits;
    }

    if (changed) {
      await prisma.elementoUnifilar.update({
        where: { id: prevParent.id },
        data: {
          datosTecnicos: dt,
          version: (prevParent.version || 1) + 1
        }
      });
      console.log(`[SYNC HIERARCHY] 🧹 Referencia inversa de ${childId} limpiada en padre anterior ${prevParent.id}`);
    }
  } catch (err) {
    console.warn(`[SYNC HIERARCHY] ⚠️ No se pudo limpiar referencia inversa en padre ${prevParentId}:`, err?.message);
  }
}

/**
 * POST /api/sync/upload-image
 * Recibe una imagen comprimida (máx 3MB), la sube a Cloudflare R2 bajo imagenes/<ts>-<rand>.jpg
 * y devuelve la URL corta persistente (/api/sync/image/...).
 */
export const subirImagenR2Controller = async (req, res) => {
  try {
    const file =
      req.file ||
      req.files?.foto?.[0] ||
      req.files?.image?.[0] ||
      null;

    if (!file || !file.buffer) {
      return res.status(400).json({
        ok: false,
        error: 'No se recibió ninguna imagen para subir.'
      });
    }

    const randomId = crypto.randomBytes(6).toString('hex');
    const mimeType = file.mimetype || 'image/jpeg';
    const ext = mimeType.includes('png')
      ? 'png'
      : mimeType.includes('webp')
        ? 'webp'
        : mimeType.includes('avif')
          ? 'avif'
          : mimeType.includes('heic')
            ? 'heic'
            : mimeType.includes('heif')
              ? 'heif'
              : 'jpg';
    const key = `imagenes/${Date.now()}-${randomId}.${ext}`;

    const uploadRes = await subirImagenAR2(file.buffer, mimeType, key);
    if (!uploadRes.subido) {
      return res.status(uploadRes.httpStatus || 503).json({
        ok: false,
        error: uploadRes.error || 'No se pudo almacenar la imagen en Cloudflare R2.',
        code: uploadRes.code || 'R2_UPLOAD_ERROR',
        httpStatus: uploadRes.httpStatus || 503
      });
    }

    const url = `/api/sync/image?key=${encodeURIComponent(key)}`;
    return res.status(200).json({
      ok: true,
      url,
      key
    });
  } catch (error) {
    console.error('❌ [SyncController] Error en subirImagenR2Controller:', error?.name, error?.message);
    return res.status(500).json({
      ok: false,
      error: error.message || 'Error interno al subir imagen a Cloudflare R2.',
      code: error?.Code || error?.name || 'SYNC_UPLOAD_ERROR',
      httpStatus: error?.$metadata?.httpStatusCode || 500
    });
  }
};

export const manejarErrorMulterImagenR2 = (err, req, res, next) => {
  if (!err) return next();
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      ok: false,
      error: 'La imagen excede el límite máximo permitido de 4 MB.',
      code: 'LIMIT_FILE_SIZE'
    });
  }
  return res.status(400).json({
    ok: false,
    error: err.message || 'Error al procesar el archivo de imagen recibido.',
    code: err.code || 'UPLOAD_VALIDATION_ERROR'
  });
};

/**
 * GET /api/sync/r2-diagnostic
 * Endpoint administrativo para verificar conectividad real con Cloudflare R2 (HeadBucketCommand).
 */
export const diagnosticarR2Controller = async (req, res) => {
  try {
    const diag = await diagnosticarR2();
    return res.status(diag.ok ? 200 : 503).json(diag);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      code: error?.Code || error?.name || 'R2_DIAGNOSTIC_ERROR',
      error: error?.message || 'Error ejecutando diagnóstico R2'
    });
  }
};

/**
 * GET /api/sync/image?key=... (y compatibilidad /api/sync/image/*key)
 * Lee la imagen desde Cloudflare R2 y la devuelve como Buffer con su Content-Type y caché pública inmutable.
 */
export const obtenerImagenR2Controller = async (req, res) => {
  try {
    const queryKey = typeof req.query?.key === 'string' ? req.query.key.trim() : '';
    const rawParam = Array.isArray(req.params?.key)
      ? req.params.key.join('/')
      : (req.params?.key || req.params?.[0] || '');
    const rawKey = queryKey || String(rawParam || '').trim();

    let decodedKey = rawKey;
    try {
      decodedKey = decodeURIComponent(rawKey);
    } catch {
      decodedKey = rawKey;
    }
    decodedKey = decodedKey.replace(/^\/+/, '').trim();

    if (!decodedKey || decodedKey.includes('..') || !decodedKey.startsWith('imagenes/')) {
      return res.status(400).json({ ok: false, error: 'Clave de imagen inválida.' });
    }

    const imageObj = await obtenerImagenDeR2(decodedKey);
    if (!imageObj || !imageObj.buffer) {
      return res.status(404).json({ ok: false, error: 'Imagen no encontrada en Cloudflare R2.' });
    }

    res.setHeader('Content-Type', imageObj.contentType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).send(imageObj.buffer);
  } catch (error) {
    console.error('❌ [SyncController] Error en obtenerImagenR2Controller:', error?.name, error?.message);
    return res.status(500).json({ ok: false, error: error?.message || 'Error al leer imagen desde R2.' });
  }
};

/**
 * DELETE /api/sync/image?key=... (o body.key / body.url)
 * Elimina una imagen del bucket de Cloudflare R2 de forma segura.
 */
export const eliminarImagenR2Controller = async (req, res) => {
  try {
    const rawKey =
      (typeof req.query?.key === 'string' && req.query.key.trim()) ||
      (typeof req.body?.key === 'string' && req.body.key.trim()) ||
      extraerR2KeyDeUrl(req.body?.url || req.query?.url || '') ||
      '';

    let decodedKey = rawKey;
    try {
      decodedKey = decodeURIComponent(rawKey);
    } catch {
      decodedKey = rawKey;
    }
    decodedKey = decodedKey.replace(/^\/+/, '').trim();

    if (!decodedKey || !decodedKey.startsWith('imagenes/') || decodedKey.includes('..')) {
      return res.status(400).json({ ok: false, error: 'Clave de imagen inválida.' });
    }

    const result = await eliminarImagenDeR2(decodedKey);
    return res.status(200).json({ ok: true, ...result });
  } catch (error) {
    console.warn('⚠️ [SyncController] Aviso en eliminarImagenR2Controller:', error?.message);
    return res.status(200).json({ ok: true, eliminado: false, error: error?.message });
  }
};

