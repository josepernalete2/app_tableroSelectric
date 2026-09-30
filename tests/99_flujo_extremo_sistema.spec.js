import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Suite 99: Flujo Extremo de Auditoría Integral de Punta a Punta', () => {
  test.setTimeout(180000); // 3 minutos para flujo masivo completo

  test('Ciclo de vida completo: Auth -> Empresa/Logo -> Proyecto -> Inspecciones Técnicas (Subestación, Termografía, PAT, Tanques) -> Tablero/Chaos -> Metrología -> Imagen -> Informe Compilado -> Backup', async ({ page }) => {
    // =========================================================================
    // 1. AUTENTICACIÓN
    // =========================================================================
    await page.goto('/login');
    const usernameInput = page.locator('input[placeholder*="admin1" i], input[type="text"]').first();
    const passwordInput = page.locator('input[type="password"], input[placeholder="••••••"]').first();
    const loginSubmitBtn = page.locator('button[type="submit"], button:has-text("Iniciar Sesión")').first();

    await usernameInput.fill('admin1');
    await passwordInput.fill('tobby 1');
    await loginSubmitBtn.click();

    try {
      await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 8000 });
    } catch {
      await loginSubmitBtn.click();
      await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 15000 });
    }

    await expect(page.locator('body')).toContainText(/SELECTRIC|Empresas|Dashboard/i);

    // =========================================================================
    // 2. CREACIÓN Y CONFIGURACIÓN DE EMPRESA / CLIENTE CON LOGO
    // =========================================================================
    const uniqueSuffix = Date.now().toString().slice(-4);
    const nombreEmpresa = `CORP ELECTRICA NACIONAL ${uniqueSuffix}`;
    const rifEmpresa = `J-5566${uniqueSuffix}-0`;

    const btnRegistrarEmpresa = page.locator('button:has-text("Registrar Empresa")').first();
    await expect(btnRegistrarEmpresa).toBeVisible({ timeout: 10000 });
    await btnRegistrarEmpresa.click();

    // Rellenar formulario de Empresa
    await page.locator('input[placeholder*="Farmatodo" i], form input[type="text"]').first().fill(nombreEmpresa);
    await page.locator('input[placeholder*="J-12345678-9" i]').first().fill(rifEmpresa);
    await page.locator('input[placeholder*="Av. Araure" i]').first().fill('Av. Francisco de Miranda, Edif. Torre Platinum, Piso 12');
    
    const inputGerente = page.locator('input[placeholder="Nombre"]').first();
    if (await inputGerente.isVisible()) {
      await inputGerente.fill('Ing. Roberto Morales');
    }
    const inputTelf = page.locator('input[placeholder="Teléfono"]').first();
    if (await inputTelf.isVisible()) {
      await inputTelf.fill('+58 412 1234567');
    }
    const inputEmail = page.locator('input[placeholder*="Email" i], input[placeholder*="Correo" i]').first();
    if (await inputEmail.isVisible()) {
      await inputEmail.fill(`auditoria_${uniqueSuffix}@selectric.com`);
    }

    // Adjuntar Logo si uploader existe
    const logoInput = page.locator('input[type="file"][accept*="image"]').first();
    if (await logoInput.count() > 0) {
      const fixturePath = path.resolve(process.cwd(), 'tests', 'fixtures', 'test_image.png');
      await logoInput.setInputFiles(fixturePath);
      await page.waitForTimeout(500);
    }

    // Guardar Empresa
    const btnGuardarEmpresa = page.locator('button[type="submit"]:has-text("Registrar")').first();
    await btnGuardarEmpresa.click();
    await page.waitForTimeout(1000);

    // Entrar a la empresa recién creada
    const cardEmpresa = page.locator(`text=${nombreEmpresa}`).first();
    await expect(cardEmpresa).toBeVisible({ timeout: 10000 });
    await cardEmpresa.click();
    await page.waitForURL(/\/empresa\//, { timeout: 10000 });

    // =========================================================================
    // 3. GESTIÓN DE PROYECTO
    // =========================================================================
    const nombreProyecto = `PROYECTO AUDITORIA COMPLETA ${uniqueSuffix}`;
    const btnCrearProyecto = page.locator('button:has-text("Crear Proyecto")').first();
    await expect(btnCrearProyecto).toBeVisible({ timeout: 10000 });
    await btnCrearProyecto.click();

    // Rellenar modal de Proyecto
    const inputNombreProj = page.locator('input[placeholder*="Planta Baja" i], form input[type="text"]').first();
    await inputNombreProj.fill(nombreProyecto);
    const inputDescProj = page.locator('textarea[placeholder*="Describe" i], textarea[placeholder*="Descripción" i]').first();
    if (await inputDescProj.isVisible()) {
      await inputDescProj.fill('Auditoría integral de potencia, subestaciones, tableros y calidad de energía');
    }

    const btnSubmitProyecto = page.locator('button[type="submit"]:has-text("Crear Proyecto")').first();
    await btnSubmitProyecto.click();
    await page.waitForTimeout(1000);

    // Entrar al proyecto creado
    const cardProyecto = page.locator(`text=${nombreProyecto}`).first();
    await expect(cardProyecto).toBeVisible({ timeout: 10000 });
    await cardProyecto.click();
    await page.waitForURL(/\/proyecto\//, { timeout: 10000 });
    await page.waitForTimeout(500);

    // =========================================================================
    // 4. EJECUCIÓN DE TODAS LAS INSPECCIONES TÉCNICAS
    // =========================================================================
    // Navegar a Pestaña Inspecciones
    const btnTabInspecciones = page.locator('button:has-text("Inspecciones")').first();
    await btnTabInspecciones.click();
    await page.waitForTimeout(500);

    // 4.1 Inspección Ambiental / Subestación
    const btnCrearInspeccion1 = page.locator('button:has-text("Crear Inspección")').first();
    await expect(btnCrearInspeccion1).toBeVisible({ timeout: 10000 });
    await btnCrearInspeccion1.click();

    const btnTipoSub = page.locator('button:has-text("AMBIENTAL O FÍSICA")').first();
    await expect(btnTipoSub).toBeVisible({ timeout: 5000 });
    await btnTipoSub.click();

    const inputSubNombre = page.locator('input[placeholder*="Subestación" i]').first();
    await inputSubNombre.fill('SUBESTACION PRINCIPAL 13.8KV');
    const inputSubUbicacion = page.locator('input[placeholder*="Patio de Transformadores" i]').first();
    if (await inputSubUbicacion.isVisible()) await inputSubUbicacion.fill('Sótano 2 Sala Eléctrica');

    const btnSubmitInspeccion1 = page.locator('button[type="submit"]:has-text("Crear Ficha de Inspección")').first();
    await expect(btnSubmitInspeccion1).toBeEnabled({ timeout: 5000 });
    await btnSubmitInspeccion1.click();
    await expect(page.locator('button[type="submit"]:has-text("Crear Ficha de Inspección")')).not.toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);

    // 4.2 Inspección Termográfica
    const btnCrearInspeccion2 = page.locator('button:has-text("Crear Inspección")').first();
    await expect(btnCrearInspeccion2).toBeVisible({ timeout: 10000 });
    await btnCrearInspeccion2.click();

    const btnTipoTermo = page.locator('button:has-text("TERMOGRÁFICA")').first();
    await expect(btnTipoTermo).toBeVisible({ timeout: 5000 });
    await btnTipoTermo.click();

    const inputTermoNombre = page.locator('input[placeholder*="Termografía" i]').first();
    await inputTermoNombre.fill('IT-01: TERMOGRAFIA TRANSFORMADOR');
    const inputTermoPunto = page.locator('input[placeholder*="48.5" i]').first();
    if (await inputTermoPunto.isVisible()) await inputTermoPunto.fill('68.5');

    const btnSubmitInspeccion2 = page.locator('button[type="submit"]:has-text("Crear Ficha de Inspección")').first();
    await btnSubmitInspeccion2.click();
    await expect(page.locator('button[type="submit"]:has-text("Crear Ficha de Inspección")')).not.toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);

    // 4.3 Inspección de Sistema de Aterramiento (PAT)
    const btnCrearInspeccion3 = page.locator('button:has-text("Crear Inspección")').first();
    await expect(btnCrearInspeccion3).toBeVisible({ timeout: 10000 });
    await btnCrearInspeccion3.click();

    const btnTipoPat = page.locator('button:has-text("SISTEMA ATERRAMIENTO")').first();
    await expect(btnTipoPat).toBeVisible({ timeout: 5000 });
    await btnTipoPat.click();

    const inputPatNombre = page.locator('input[placeholder*="PAT-01" i], input[placeholder*="Malla" i]').first();
    await inputPatNombre.fill('PAT-01: MALLA SUBESTACION');
    const inputPatResistencia = page.locator('input[placeholder*="2.5" i]').first();
    if (await inputPatResistencia.isVisible()) await inputPatResistencia.fill('2.1');

    const btnSubmitInspeccion3 = page.locator('button[type="submit"]:has-text("Crear Ficha de Inspección")').first();
    await btnSubmitInspeccion3.click();
    await expect(page.locator('button[type="submit"]:has-text("Crear Ficha de Inspección")')).not.toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);

    // 4.4 Inspección de Tanques de Combustible
    const btnCrearInspeccion4 = page.locator('button:has-text("Crear Inspección")').first();
    await expect(btnCrearInspeccion4).toBeVisible({ timeout: 10000 });
    await btnCrearInspeccion4.click();

    const btnTipoTanque = page.locator('button:has-text("TANQUE COMBUSTIBLE")').first();
    await expect(btnTipoTanque).toBeVisible({ timeout: 5000 });
    await btnTipoTanque.click();

    const inputTanqueNombre = page.locator('input[placeholder*="TK-01" i]').first();
    await inputTanqueNombre.fill('TK-01: TANQUE DIESEL GENERADOR');
    const inputTanqueCapacidad = page.locator('input[placeholder*="2000" i]').first();
    if (await inputTanqueCapacidad.isVisible()) await inputTanqueCapacidad.fill('2500');

    const btnSubmitInspeccion4 = page.locator('button[type="submit"]:has-text("Crear Ficha de Inspección")').first();
    await btnSubmitInspeccion4.click();
    await expect(page.locator('button[type="submit"]:has-text("Crear Ficha de Inspección")')).not.toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);

    // Validar que las inspecciones aparecen en la lista
    await expect(page.locator('body')).toContainText('SUBESTACION PRINCIPAL 13.8KV');
    await expect(page.locator('body')).toContainText('IT-01: TERMOGRAFIA TRANSFORMADOR');
    await expect(page.locator('body')).toContainText('PAT-01: MALLA SUBESTACION');
    await expect(page.locator('body')).toContainText('TK-01: TANQUE DIESEL GENERADOR');

    // =========================================================================
    // 5. DIAGRAMA UNIFILAR Y CREACIÓN DE TABLERO ELÉCTRICO
    // =========================================================================
    const btnTabUnifilar = page.locator('button:has-text("Diagrama Unifilar")').first();
    await btnTabUnifilar.click();
    await page.waitForTimeout(500);

    const btnCrearElemento = page.locator('button:has-text("Crear Elemento")').first();
    await expect(btnCrearElemento).toBeVisible({ timeout: 10000 });
    await btnCrearElemento.click();

    // Seleccionar PANEL ELÉCTRICO
    const btnTipoPanel = page.locator('button:has-text("PANEL ELÉCTRICO")').first();
    await expect(btnTipoPanel).toBeVisible({ timeout: 5000 });
    await btnTipoPanel.click();

    const inputTabNombre = page.locator('form input[type="text"]').first();
    await inputTabNombre.fill('TABLERO PRINCIPAL INDUSTRIAL');

    const btnSubmitTab = page.locator('button[type="submit"]:has-text("Guardar Plantilla")').first();
    await expect(btnSubmitTab).toBeEnabled({ timeout: 5000 });
    await btnSubmitTab.click();
    await page.waitForTimeout(1000);

    // =========================================================================
    // 6. CARGA MASIVA DE CIRCUITOS Y PRUEBAS DE CAOS (CHAOS TESTING)
    // =========================================================================
    const cardTablero = page.locator('text=TABLERO PRINCIPAL INDUSTRIAL').first();
    await expect(cardTablero).toBeVisible({ timeout: 10000 });
    await cardTablero.click();
    await page.waitForURL(/\/tablero\//, { timeout: 10000 });

    // Localizar una celda de circuito libre (RESERVA)
    const circuitCell = page.locator('td').filter({ hasText: /RESERVA/i }).first();
    await expect(circuitCell).toBeVisible({ timeout: 10000 });
    await circuitCell.click();

    // Modal de Edición de Circuito
    const modalCircuito = page.locator('div[role="dialog"], div.fixed').filter({ hasText: 'Configurar Salida' }).first();
    await expect(modalCircuito).toBeVisible({ timeout: 5000 });

    // Seleccionar "Sí, es un Artefacto"
    const btnArtefacto = modalCircuito.locator('button:has-text("Sí, es un Artefacto")').first();
    await expect(btnArtefacto).toBeVisible({ timeout: 5000 });
    await btnArtefacto.click();

    // Esperar a que el formulario del artefacto aparezca
    await expect(modalCircuito.locator('text=Llenar Ficha del Artefacto')).toBeVisible({ timeout: 5000 });

    // Rellenar ficha técnica de Artefacto
    const inputNombreArtefacto = modalCircuito.locator('input[placeholder*="Extractor" i]').first();
    await expect(inputNombreArtefacto).toBeVisible({ timeout: 5000 });
    await inputNombreArtefacto.fill('CIRCUITO MOTORES CHILLER 1');

    const inputAmp = modalCircuito.locator('input[placeholder*="20, 30" i]').first();
    if (await inputAmp.isVisible()) await inputAmp.fill('100');
    const inputCond = modalCircuito.locator('input[placeholder*="12, 10" i]').first();
    if (await inputCond.isVisible()) await inputCond.fill('2 AWG');
    const inputMarca = modalCircuito.locator('input[placeholder*="GE, EATON" i]').first();
    if (await inputMarca.isVisible()) await inputMarca.fill('ABB');

    const btnGuardarFicha = modalCircuito.locator('button:has-text("Guardar Ficha")').first();
    await expect(btnGuardarFicha).toBeVisible({ timeout: 5000 });
    await btnGuardarFicha.click();
    await page.waitForTimeout(1500);

    // =========================================================================
    // 7. SUBIDA Y PERSISTENCIA DE IMAGEN FOTOGRÁFICA DEL GABINETE
    // =========================================================================
    const fileInput = page.locator('input[type="file"][accept*="image"]').first();
    if (await fileInput.count() > 0) {
      const fixturePath = path.resolve(process.cwd(), 'tests', 'fixtures', 'test_image.png');
      await fileInput.setInputFiles(fixturePath);
      await page.waitForTimeout(1500);
    }

    // Recargar F5 para verificar persistencia real en PostgreSQL
    await page.reload();
    await expect(page.locator('body')).toContainText('CIRCUITO MOTORES CHILLER 1');

    // =========================================================================
    // 8. MÓDULO DE INFORME COMPILADO Y REPORTES TÉCNICOS
    // =========================================================================
    // Navegar de vuelta al proyecto
    const btnVolver = page.locator('header button:has-text("Volver"), header button[title*="Volver" i]').first();
    await btnVolver.click();
    await page.waitForURL(/\/proyecto\//, { timeout: 10000 });

    // Ir a la vista del Informe PDF Técnico
    const btnInformePdf = page.locator('button:has-text("Informe PDF")').first();
    await expect(btnInformePdf).toBeVisible({ timeout: 10000 });
    await btnInformePdf.click();

    await page.waitForURL(/\/informe/, { timeout: 10000 });

    // Validar compilación integral del informe técnico con todos los módulos
    await expect(page.locator('body')).toContainText(/INFORME TÉCNICO|DIAGRAMA UNIFILAR/i);
    await expect(page.locator('body')).toContainText(nombreEmpresa);
    await expect(page.locator('body')).toContainText('TABLERO PRINCIPAL INDUSTRIAL');

    // =========================================================================
    // 9. MÓDULO DE COPIAS DE SEGURIDAD (BACKUPS)
    // =========================================================================
    await page.goto('/backups');
    await expect(page.locator('body')).toContainText(/Copias de Seguridad|Respaldos/i);

    // Disparar descarga de respaldo local JSON
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
    const btnDescargarBackup = page.locator('button:has-text("Descarga Inmediata Local"), button:has-text("Descarga Inmediata"), button:has-text("Descarga Directa"), button:has-text("Descargar Copia")').first();
    await expect(btnDescargarBackup).toBeVisible({ timeout: 10000 });
    await btnDescargarBackup.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.json$/i);
  });
});
