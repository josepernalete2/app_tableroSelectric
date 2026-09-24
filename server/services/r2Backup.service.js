/**
 * Servidor / Servicios - r2Backup.service.js
 * Servicio de almacenamiento en Cloudflare R2 (API compatible con AWS S3)
 * para respaldos de la base de datos de tableros eléctricos.
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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
