import prisma from '../db.js';

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
    'capacidadLitros', 'nivelCombustible', 'estadoTanque', 'diqueContencion110',
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

          // 2. Validar enum TipoElemento de Prisma
          const validTipos = ['TABLERO', 'PUNTO_SUMINISTRO', 'SUBESTACION', 'TRANSFORMADOR', 'GENERADOR', 'PUESTA_TIERRA', 'TRANSFER', 'PUNTO_MEDICION', 'CCM', 'BANCO_CONDENSADOR', 'AMBIENTAL_FISICA', 'TERMOGRAFICA', 'SISTEMA_ATERRAMIENTO', 'TANQUE_COMBUSTIBLE', 'OTRO'];
          if (!rawData.tipoElemento || !validTipos.includes(rawData.tipoElemento)) {
            rawData.tipoElemento = 'TABLERO';
          }

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
        } else if (modelName === 'subestacion') {
          if (rawData.companyId && !rawData.empresaId) rawData.empresaId = rawData.companyId;
          if (!rawData.nombre) rawData.nombre = 'Subestación Principal';
          if (!rawData.ubicacion) rawData.ubicacion = 'Sede Principal';
          if (!rawData.fecha) rawData.fecha = new Date().toISOString().split('T')[0];
          if (!rawData.hora) rawData.hora = '08:00';
          if (!rawData.inspector) rawData.inspector = 'Inspector';
          if (!rawData.nivelTension) rawData.nivelTension = '13.8 kV';
          rawData.estadoEntorno = typeof rawData.estadoEntorno === 'object' && rawData.estadoEntorno !== null ? rawData.estadoEntorno : {};
          rawData.obrasCiviles = typeof rawData.obrasCiviles === 'object' && rawData.obrasCiviles !== null ? rawData.obrasCiviles : {};
          rawData.equiposPrincipales = typeof rawData.equiposPrincipales === 'object' && rawData.equiposPrincipales !== null ? rawData.equiposPrincipales : {};
          rawData.puestaTierra = typeof rawData.puestaTierra === 'object' && rawData.puestaTierra !== null ? rawData.puestaTierra : {};
          rawData.edificioControl = typeof rawData.edificioControl === 'object' && rawData.edificioControl !== null ? rawData.edificioControl : {};
        } else if (modelName === 'puntoMedicion') {
          if (rawData.companyId && !rawData.empresaId) rawData.empresaId = rawData.companyId;
          if (!rawData.nombre) rawData.nombre = 'Punto de Medición';
        } else if (modelName === 'ccm') {
          if (rawData.companyId && !rawData.empresaId) rawData.empresaId = rawData.companyId;
          if (!rawData.nombre) rawData.nombre = 'CCM Principal';
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
        }

        // Manejo de eliminación de fotos
        const isPhotoRemoval = (
          rawData.foto === null ||
          rawData.foto === '' ||
          rawData.foto === 'null' ||
          rawData.fotoUrl === null ||
          rawData.fotoUrl === '' ||
          rawData.deletePhoto === true ||
          rawData.eliminarFoto === true
        );
        if (isPhotoRemoval) {
          rawData.foto = null;
        }
        delete rawData.fotoUrl;
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

        // Asegurar restricciones de claves foráneas para proyectos y empresas (ej. IDs temporales o generados offline)
        if (['elementoUnifilar', 'subestacion', 'tablero', 'puntoMedicion', 'ccm', 'alimentador', 'inspeccionTermografica', 'inspeccionAterramiento', 'inspeccionTanqueCombustible'].includes(modelName)) {
          let projId = rawData.proyectoId;
          if (!projId) {
            const firstProj = await prisma.proyecto.findFirst();
            if (firstProj) {
              projId = firstProj.id;
              rawData.proyectoId = projId;
            }
          }

          if (projId) {
            let targetProj = await prisma.proyecto.findUnique({ where: { id: projId } });
            if (!targetProj) {
              // Si el proyecto referenciado no existe aún en PostgreSQL, garantizar su creación
              let empId = rawData.empresaId;
              let targetEmp = empId ? await prisma.empresa.findUnique({ where: { id: empId } }) : null;
              if (!targetEmp) {
                targetEmp = await prisma.empresa.findFirst();
                if (!targetEmp) {
                  targetEmp = await prisma.empresa.create({
                    data: {
                      id: empId || `empresa-${Date.now()}`,
                      nombre: 'Empresa Principal',
                      rif: `J-${Date.now()}`,
                      direccionFiscal: 'Sede Principal'
                    }
                  });
                }
              }

              targetProj = await prisma.proyecto.create({
                data: {
                  id: projId,
                  nombre: 'Proyecto Principal Offline',
                  direccion: 'Sede de Operaciones',
                  empresaId: targetEmp.id
                }
              });
              console.log(`[SYNC AUTO-PARENT] ✅ Proyecto padre creado automáticamente para resolver clave foránea: ${projId}`);
            }

            // Asegurar que empresaId apunte a una empresa válida si se proporciona
            if (rawData.empresaId) {
              const empCheck = await prisma.empresa.findUnique({ where: { id: rawData.empresaId } });
              if (!empCheck) {
                rawData.empresaId = targetProj.empresaId;
              }
            }
          }

          // Para alimentadoPorId autorreferencial, verificar existencia para evitar error de FK
          if (modelName === 'elementoUnifilar' && rawData.alimentadoPorId) {
            const parentElementCheck = await prisma.elementoUnifilar.findUnique({ where: { id: rawData.alimentadoPorId } });
            if (!parentElementCheck) {
              rawData.alimentadoPorId = null;
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
    const user = req.user;
    const { empresaId } = user;
    const { lastSyncTimestamp } = req.query;

    const where = {};

    // Multitenancy: usuarios CLIENT solo ven su empresa
    if (user.role === 'CLIENT' && empresaId) {
      where.id = empresaId;
    }

    // Filtrar por última fecha de sincronización si viene del cliente
    if (lastSyncTimestamp) {
      const ts = new Date(lastSyncTimestamp);
      where.updatedAt = { gte: ts };
    }

    // Traer empresas con todas sus relaciones anidadas válidas de schema.prisma
    const companies = await prisma.empresa.findMany({
      where,
      include: {
        proyectos: {
          include: {
            tableros: {
              include: {
                circuitos: true
              }
            },
            elementosUnifilares: true,
            subestaciones: true,
            puntosMedicion: true,
            ccmList: true,
            alimentadores: true,
            inspeccionesTermograficas: true,
            inspeccionesAterramiento: true,
            inspeccionesTanquesCombustible: true
          }
        }
      }
    });

    // Formatear datos para el frontend
    const formattedCompanies = companies.map(company => ({
      ...company,
      proyectos: (company.proyectos || []).map(proyecto => ({
        ...proyecto,
        tableros: (proyecto.tableros || []).map(tablero => ({
          ...tablero,
          circuitos: tablero.circuitos || []
        })),
        elementosUnifilares: (proyecto.elementosUnifilares || []).map(elem => ({
          ...elem,
          foto: elem.foto || null,
          fotoBlob: null
        })),
        inspeccionesSubestacion: (proyecto.subestaciones || []).map(sub => ({
          ...sub,
          foto: sub.foto || null
        })),
        subestaciones: (proyecto.subestaciones || []),
        puntosMedicion: (proyecto.puntosMedicion || []).map(pm => ({
          ...pm,
          foto: pm.foto || null
        })),
        ccmList: (proyecto.ccmList || []).map(ccm => ({
          ...ccm,
          foto: ccm.foto || null
        })),
        alimentadores: proyecto.alimentadores || [],
        inspeccionesTermograficas: proyecto.inspeccionesTermograficas || [],
        inspeccionesAterramiento: proyecto.inspeccionesAterramiento || [],
        inspeccionesTanquesCombustible: proyecto.inspeccionesTanquesCombustible || []
      }))
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
    const validTipos = ['TABLERO', 'PUNTO_SUMINISTRO', 'SUBESTACION', 'TRANSFORMADOR', 'GENERADOR', 'PUESTA_TIERRA', 'TRANSFER', 'PUNTO_MEDICION', 'CCM', 'BANCO_CONDENSADOR', 'AMBIENTAL_FISICA', 'TERMOGRAFICA', 'SISTEMA_ATERRAMIENTO', 'TANQUE_COMBUSTIBLE', 'OTRO'];
    const cleanTipo = validTipos.includes(tipoElemento) ? tipoElemento : 'TABLERO';

    console.log(`[SYNC MULTIPART] 📸 Procesando elemento con binario: '${cleanNombre}' (${elementId}) tipo: ${cleanTipo}`);

    // 1. Determinar y procesar la foto (Buffer en memoria de Multer o DataURL o URL)
    let finalFoto = req.body.foto || fotoUrl || null;
    const isPhotoRemoval = (
      eliminarFoto === 'true' ||
      eliminarFoto === true ||
      req.body.deletePhoto === 'true' ||
      req.body.deletePhoto === true ||
      req.body.foto === '' ||
      req.body.foto === 'null' ||
      req.body.foto === null
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

    // 3. Auto-resolución de dependencias padre (Proyecto y Empresa) para garantizar integridad referencial
    let resolvedProyectoId = proyectoId;
    let resolvedEmpresaId = empresaId || req.body.companyId || req.user?.empresaId || req.user?.companyId;

    if (!resolvedProyectoId) {
      const firstProj = await prisma.proyecto.findFirst();
      if (firstProj) {
        resolvedProyectoId = firstProj.id;
        if (!resolvedEmpresaId) resolvedEmpresaId = firstProj.empresaId;
      }
    }

    if (resolvedProyectoId) {
      let targetProj = await prisma.proyecto.findUnique({ where: { id: resolvedProyectoId } });
      if (!targetProj) {
        // Garantizar empresa padre
        let targetEmp = resolvedEmpresaId ? await prisma.empresa.findUnique({ where: { id: resolvedEmpresaId } }) : null;
        if (!targetEmp) {
          targetEmp = await prisma.empresa.findFirst();
          if (!targetEmp) {
            targetEmp = await prisma.empresa.create({
              data: {
                id: resolvedEmpresaId || `empresa-${Date.now()}`,
                nombre: 'Empresa Principal',
                rif: `J-${Date.now()}`,
                direccionFiscal: 'Sede Principal'
              }
            });
          }
        }
        targetProj = await prisma.proyecto.create({
          data: {
            id: resolvedProyectoId,
            nombre: 'Proyecto Principal Offline',
            direccion: 'Sede de Operaciones',
            empresaId: targetEmp.id
          }
        });
        console.log(`[SYNC MULTIPART] ✅ Proyecto padre creado automáticamente para resolver clave foránea: ${resolvedProyectoId}`);
      }
      if (!resolvedEmpresaId || resolvedEmpresaId !== targetProj.empresaId) {
        resolvedEmpresaId = targetProj.empresaId;
      }
    }

    // 4. Verificar alimentadoPorId para evitar fallo de FK autorreferencial
    let validAlimentadoPorId = alimentadoPorId || null;
    if (validAlimentadoPorId) {
      const parentElCheck = await prisma.elementoUnifilar.findUnique({ where: { id: validAlimentadoPorId } });
      if (!parentElCheck) {
        validAlimentadoPorId = null;
      }
    }

    // 5. Preparar datos de ElementoUnifilar para Upsert con auto-curación
    const elementData = {
      nombre: cleanNombre,
      tipoElemento: cleanTipo,
      ubicacion: ubicacion || '',
      alimentadoPor: alimentadoPor || '',
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
      detallesFormato: typeof detallesFormato === 'object' && detallesFormato !== null ? detallesFormato : undefined
    };

    // 6. Upsert en ElementoUnifilar
    const existingElement = await prisma.elementoUnifilar.findUnique({ where: { id: elementId } });
    let savedElement;

    if (existingElement) {
      savedElement = await prisma.elementoUnifilar.update({
        where: { id: elementId },
        data: {
          ...elementData,
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
      where.rif = user.companyId; // Usar rif como identificador de empresa para CLIENT
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

