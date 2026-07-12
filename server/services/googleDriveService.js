import { google } from 'googleapis';
import { Readable } from 'stream';

/**
 * Sube un archivo JSON de respaldo a una carpeta específica en Google Drive
 * utilizando credenciales de una Cuenta de Servicio.
 * 
 * @param {Object} jsonData - Datos de la base de datos a respaldar.
 * @param {string} folderId - ID de la carpeta destino en Google Drive.
 * @param {Object} credentials - Objeto JSON de credenciales de Google Service Account.
 */
export const uploadBackupToGDrive = async (jsonData, folderId, credentials) => {
  try {
    if (!credentials || !credentials.client_email || !credentials.private_key) {
      throw new Error('Credenciales de Cuenta de Servicio incompletas (falta client_email o private_key).');
    }

    // El JWT requiere formatear la llave privada correctamente
    const formattedPrivateKey = credentials.private_key.replace(/\\n/g, '\n');

    const auth = new google.auth.JWT(
      credentials.client_email,
      null,
      formattedPrivateKey,
      ['https://www.googleapis.com/auth/drive.file']
    );

    const drive = google.drive({ version: 'v3', auth });

    // Crear un timestamp legible para el nombre del archivo
    const timestamp = new Date().toISOString()
      .replace(/T/, '_')
      .replace(/\..+/, '')
      .replace(/:/g, '-');
    const fileName = `respaldo_tableros_${timestamp}.json`;

    const fileMetadata = {
      name: fileName,
      parents: folderId ? [folderId] : []
    };

    // Convertir el JSON de base de datos en un Stream legible para la carga
    const buffer = Buffer.from(JSON.stringify(jsonData, null, 2));
    const media = {
      mimeType: 'application/json',
      body: Readable.from(buffer)
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink'
    });

    return {
      success: true,
      fileId: response.data.id,
      fileName: response.data.name,
      webViewLink: response.data.webViewLink
    };
  } catch (error) {
    console.error('Error al subir archivo a Google Drive:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
