/**
 * Servidor / Servicios - r2Backup.service.js
 * Servicio de almacenamiento en Cloudflare R2 (API compatible con AWS S3)
 * para respaldos de la base de datos de tableros eléctricos.
 */

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

/**
 * Obtiene el cliente de S3 configurado para Cloudflare R2 si las credenciales están disponibles.
 * @returns {S3Client|null}
 */
function getR2Client() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    return null;
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY
    }
  });
}

/**
 * Sube un buffer de respaldo JSON directamente a un bucket de Cloudflare R2.
 * 
 * @param {Buffer} buffer Contenido del archivo de respaldo en memoria
 * @param {string} filename Nombre del archivo (Key en el bucket)
 * @returns {Promise<{ subido: boolean, motivo?: string, bucket?: string, key?: string, tamanoBytes?: number, error?: string }>}
 */
export async function subirBackupAR2(buffer, filename) {
  const bucketName = process.env.R2_BUCKET_NAME || 'tableros-backups';
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
  const bucketName = bucketNameOverride || process.env.R2_BUCKET_NAME || 'tableros-backups';
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
