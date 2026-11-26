/**
 * Servidor / Servicios - r2Backup.service.js
 * Servicio de almacenamiento en Cloudflare R2 (API compatible con AWS S3)
 * para respaldos de la base de datos de tableros eléctricos.
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';

const cleanEnv = (val) =>
  String(val || '')
    .replace(/[\r\n\t]+/g, '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .trim();

const getR2EnvSummary = () => ({
  ep: Boolean(cleanEnv(process.env.R2_ENDPOINT)),
  acc: Boolean(cleanEnv(process.env.R2_ACCOUNT_ID)),
  bkt: Boolean(cleanEnv(process.env.R2_BUCKET_NAME) || cleanEnv(process.env.R2_BUCKET)),
  key: Boolean(cleanEnv(process.env.R2_ACCESS_KEY_ID)),
  sec: Boolean(cleanEnv(process.env.R2_SECRET_ACCESS_KEY))
});

const extractStackLocation = (err) => {
  const lines = String(err?.stack || '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('at '));
  return lines[0] ? lines[0].replace(/^at\s+/, '').slice(0, 120) : 'sin-stack';
};

const normalizeR2Endpoint = (rawEndpoint, accountId) => {
  let ep = cleanEnv(rawEndpoint);
  const acc = cleanEnv(accountId)
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .replace(/\s+/g, '');

  // Si R2_ENDPOINT contiene un enlace Markdown [https://...](https://...), extraer la URL R2 válida
  if (ep) {
    const r2UrlMatch = ep.match(/https?:\/\/[^\s)\]"'<>]*r2\.cloudflarestorage\.com/i);
    if (r2UrlMatch) {
      ep = r2UrlMatch[0];
    } else {
      const anyUrlMatch = ep.match(/https?:\/\/[^\s)\]"'<>]+/i);
      if (anyUrlMatch) {
        ep = anyUrlMatch[0];
      }
    }
  }

  if (ep) {
    const candidate = /^https?:\/\//i.test(ep) ? ep : `https://${ep}`;
    try {
      const parsed = new URL(candidate);
      const normalized = `${parsed.protocol}//${parsed.host}`;
      new URL(normalized);
      return normalized;
    } catch (urlErr) {
      // Si R2_ENDPOINT es inválido pero R2_ACCOUNT_ID es válido, usar fallback automático
      if (acc) {
        const fallback = `https://${acc}.r2.cloudflarestorage.com`;
        new URL(fallback);
        return fallback;
      }
      throw new Error(`Endpoint R2 inválido ("${candidate}"): ${urlErr?.message || 'Invalid URL'}`);
    }
  }

  if (acc) {
    const fallback = `https://${acc}.r2.cloudflarestorage.com`;
    new URL(fallback);
    return fallback;
  }

  throw new Error('Faltan variables en Vercel: R2_ENDPOINT y R2_ACCOUNT_ID están vacíos en runtime');
};

/**
 * Devuelve el estado de configuración de Cloudflare R2 sin exponer credenciales.
 */
export function getR2ConfigStatus() {
  const accountId = cleanEnv(process.env.R2_ACCOUNT_ID);
  const accessKeyId = cleanEnv(process.env.R2_ACCESS_KEY_ID);
  const secretAccessKey = cleanEnv(process.env.R2_SECRET_ACCESS_KEY);
  const bucketName = cleanEnv(process.env.R2_BUCKET_NAME) || cleanEnv(process.env.R2_BUCKET) || 'tableros-backups';
  let endpoint = '';
  try {
    endpoint = normalizeR2Endpoint(process.env.R2_ENDPOINT, accountId);
  } catch {
    endpoint = '';
  }

  const missingVars = [];
  if (!endpoint) missingVars.push('R2_ENDPOINT / R2_ACCOUNT_ID');
  if (!accessKeyId) missingVars.push('R2_ACCESS_KEY_ID');
  if (!secretAccessKey) missingVars.push('R2_SECRET_ACCESS_KEY');

  return {
    configurado: Boolean(endpoint && accessKeyId && secretAccessKey),
    bucket: bucketName,
    endpoint,
    env: getR2EnvSummary(),
    missingVars
  };
}

/**
 * Obtiene el contexto S3 configurado para Cloudflare R2 si las credenciales están disponibles.
 * Nunca cachea un cliente mal instanciado.
 * @returns {{ client: S3Client, bucketName: string, endpoint: string }}
 */
function getR2Context() {
  const accountId = cleanEnv(process.env.R2_ACCOUNT_ID);
  const accessKeyId = cleanEnv(process.env.R2_ACCESS_KEY_ID);
  const secretAccessKey = cleanEnv(process.env.R2_SECRET_ACCESS_KEY);
  const bucketName = cleanEnv(process.env.R2_BUCKET_NAME) || cleanEnv(process.env.R2_BUCKET) || 'tableros-backups';
  const endpoint = normalizeR2Endpoint(process.env.R2_ENDPOINT, accountId);

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('Faltan variables en Vercel: R2_ACCESS_KEY_ID o R2_SECRET_ACCESS_KEY están vacíos en runtime');
  }

  const client = new S3Client({
    region: 'auto',
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId,
      secretAccessKey
    },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED'
  });

  return { client, bucketName, endpoint };
}

/**
 * @returns {S3Client|null}
 */
function getR2Client() {
  try {
    return getR2Context()?.client || null;
  } catch {
    return null;
  }
}

/**
 * Sube un buffer de respaldo JSON directamente a un bucket de Cloudflare R2.
 * 
 * @param {Buffer} buffer Contenido del archivo de respaldo en memoria
 * @param {string} filename Nombre del archivo (Key en el bucket)
 * @returns {Promise<{ subido: boolean, motivo?: string, bucket?: string, key?: string, tamanoBytes?: number, error?: string }>}
 */
export async function subirBackupAR2(buffer, filename) {
  const bucketName = cleanEnv(process.env.R2_BUCKET_NAME) || cleanEnv(process.env.R2_BUCKET) || 'tableros-backups';
  const client = getR2Client();

  if (!client) {
    console.info('ℹ️ [Cloudflare R2] Respaldo en R2 omitido: variables R2_ACCOUNT_ID, R2_ACCESS_KEY_ID o R2_SECRET_ACCESS_KEY no configuradas.');
    return {
      subido: false,
      motivo: 'NO_CONFIGURADO',
      mensaje: 'Variables de Cloudflare R2 no configuradas en el entorno'
    };
  }

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: filename,
      Body: buffer,
      ContentType: 'application/json'
    });

    await client.send(command);
    console.log(`☁️ [Cloudflare R2] Respaldo subido exitosamente a R2: ${bucketName}/${filename}`);

    return {
      subido: true,
      bucket: bucketName,
      key: filename,
      tamanoBytes: buffer.length
    };
  } catch (error) {
    console.error(`❌ [Cloudflare R2] Error al subir respaldo "${filename}" a R2:`, error.message);
    return {
      subido: false,
      error: error.message
    };
  }
}

/**
 * Descarga y parsea un archivo JSON de respaldo desde Cloudflare R2.
 *
 * @param {string} key Nombre del archivo (Key) en el bucket
 * @param {string|null} bucketNameOverride Nombre opcional del bucket
 * @returns {Promise<object|null>}
 */
export async function descargarBackupDeR2(key, bucketNameOverride = null) {
  const bucketName = cleanEnv(bucketNameOverride) || cleanEnv(process.env.R2_BUCKET_NAME) || cleanEnv(process.env.R2_BUCKET) || 'tableros-backups';
  const client = getR2Client();

  if (!client || !key) {
    return null;
  }

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key
    });

    const response = await client.send(command);
    if (!response || !response.Body) return null;

    let rawString = '';
    if (typeof response.Body.transformToString === 'function') {
      rawString = await response.Body.transformToString('utf-8');
    } else {
      const chunks = [];
      for await (const chunk of response.Body) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      rawString = Buffer.concat(chunks).toString('utf-8');
    }

    return JSON.parse(rawString);
  } catch (error) {
    console.error(`❌ [Cloudflare R2] Error al descargar respaldo "${key}" de R2:`, error.message);
    return null;
  }
}

/**
 * Elimina un objeto de respaldo de Cloudflare R2 de forma tolerante a fallos.
 */
export async function eliminarBackupDeR2(key, bucketNameOverride = null) {
  const bucketName = cleanEnv(bucketNameOverride) || cleanEnv(process.env.R2_BUCKET_NAME) || cleanEnv(process.env.R2_BUCKET) || 'tableros-backups';
  const client = getR2Client();

  if (!client || !key) {
    return { eliminado: false, motivo: 'NO_CONFIGURADO_O_SIN_KEY' };
  }

  try {
    await client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
    return { eliminado: true, bucket: bucketName, key };
  } catch (error) {
    console.warn(`⚠️ [Cloudflare R2] No se pudo eliminar "${key}" de R2:`, error.message);
    return { eliminado: false, error: error.message };
  }
}

/**
 * Sube una imagen comprimida (Buffer) directamente a Cloudflare R2.
 *
 * @param {Buffer} buffer Contenido binario de la imagen
 * @param {string} mimeType Tipo MIME (ej. image/jpeg)
 * @param {string} key Ruta/Key del objeto en R2 (ej. imagenes/1732550000-abc123.jpg)
 * @returns {Promise<{ subido: boolean, bucket?: string, key?: string, error?: string }>}
 */
export async function subirImagenAR2(buffer, mimeType, key) {
  const status = getR2ConfigStatus();
  let ctx = null;

  try {
    ctx = getR2Context();
    await ctx.client.send(new PutObjectCommand({
      Bucket: ctx.bucketName,
      Key: key,
      Body: buffer,
      ContentType: mimeType || 'image/jpeg',
      CacheControl: 'public, max-age=31536000'
    }));

    return {
      subido: true,
      bucket: ctx.bucketName,
      key
    };
  } catch (error) {
    const diagEndpoint = ctx?.endpoint || status.endpoint || cleanEnv(process.env.R2_ENDPOINT) || '';
    const diagBucket = ctx?.bucketName || status.bucket || '';
    const envFlags = getR2EnvSummary();
    const at = extractStackLocation(error);
    const baseMsg = error?.message || 'Error al subir imagen a Cloudflare R2';
    const detailedError = `${baseMsg} [endpoint="${diagEndpoint}", bucket="${diagBucket}", env=${JSON.stringify(envFlags)}, at=${at}]`;

    console.error(`❌ [Cloudflare R2] Error al subir imagen "${key}": [${error?.Code || error?.name}]`, detailedError);
    return {
      subido: false,
      code: error?.Code || error?.name || 'R2_UPLOAD_ERROR',
      httpStatus: error?.$metadata?.httpStatusCode || 503,
      error: detailedError
    };
  }
}

/**
 * Ejecuta un diagnóstico real contra Cloudflare R2 mediante HeadBucketCommand.
 */
export async function diagnosticarR2() {
  const status = getR2ConfigStatus();

  try {
    const ctx = getR2Context();
    await ctx.client.send(new HeadBucketCommand({ Bucket: ctx.bucketName }));
    return {
      ok: true,
      bucket: ctx.bucketName,
      endpoint: ctx.endpoint,
      env: status.env
    };
  } catch (error) {
    return {
      ok: false,
      bucket: status.bucket,
      endpoint: status.endpoint,
      env: status.env,
      code: error?.Code || error?.name || 'R2_HEAD_BUCKET_ERROR',
      httpStatus: error?.$metadata?.httpStatusCode || 502,
      error: `${error?.message || 'Error al verificar bucket en Cloudflare R2'} [at=${extractStackLocation(error)}]`
    };
  }
}

/**
 * Obtiene una imagen almacenada en Cloudflare R2 como Buffer junto a su Content-Type.
 *
 * @param {string} key Key del objeto en R2
 * @returns {Promise<{ buffer: Buffer, contentType: string }|null>}
 */
export async function obtenerImagenDeR2(key) {
  if (!key) return null;

  try {
    const ctx = getR2Context();
    const response = await ctx.client.send(new GetObjectCommand({
      Bucket: ctx.bucketName,
      Key: key
    }));

    if (!response || !response.Body) return null;

    let buffer;
    if (typeof response.Body.transformToByteArray === 'function') {
      const bytes = await response.Body.transformToByteArray();
      buffer = Buffer.from(bytes);
    } else {
      const chunks = [];
      for await (const chunk of response.Body) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      buffer = Buffer.concat(chunks);
    }

    return {
      buffer,
      contentType: response.ContentType || 'image/jpeg'
    };
  } catch (error) {
    console.error(`❌ [Cloudflare R2] Error al obtener imagen "${key}": [${error?.Code || error?.name || 'Error'}] ${error?.message}`);
    return null;
  }
}

/**
 * Extrae la key de Cloudflare R2 (imagenes/...) a partir de una URL (/api/sync/image?key=... o /api/sync/image/...).
 */
export function extraerR2KeyDeUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  try {
    if (trimmed.includes('?key=') || trimmed.includes('&key=')) {
      const idx = trimmed.indexOf('?');
      const params = new URLSearchParams(trimmed.slice(idx + 1));
      const k = params.get('key');
      if (k && k.startsWith('imagenes/') && !k.includes('..')) return k;
    }
    const marker = '/api/sync/image/';
    const mIdx = trimmed.indexOf(marker);
    if (mIdx !== -1) {
      const raw = decodeURIComponent(trimmed.slice(mIdx + marker.length).split('?')[0]).replace(/^\/+/, '');
      if (raw.startsWith('imagenes/') && !raw.includes('..')) return raw;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Elimina una imagen almacenada en Cloudflare R2 (tolerante a fallos).
 * Nunca lanza excepción para no bloquear el borrado en PostgreSQL.
 */
export async function eliminarImagenDeR2(key) {
  const ctx = getR2Context();
  if (!ctx || !key || typeof key !== 'string' || !key.startsWith('imagenes/') || key.includes('..')) {
    return { eliminado: false, motivo: 'NO_CONFIGURADO_O_KEY_INVALIDA' };
  }

  try {
    await ctx.client.send(new DeleteObjectCommand({
      Bucket: ctx.bucketName,
      Key: key
    }));
    console.log(`🗑️ [Cloudflare R2] Imagen eliminada del bucket: ${ctx.bucketName}/${key}`);
    return { eliminado: true, bucket: ctx.bucketName, key };
  } catch (error) {
    console.warn(`⚠️ [Cloudflare R2] No se pudo eliminar imagen "${key}" de R2:`, error?.message);
    return { eliminado: false, error: error?.message };
  }
}
