import { test, expect } from '@playwright/test';

test.describe('Suite 03: Tableros y Circuitos Eléctricos', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    await page.goto('/login');
    const usernameInput = page.locator('input[placeholder*="admin1" i], input[type="text"]').first();
    const passwordInput = page.locator('input[type="password"], input[placeholder="••••••"]').first();
    const submitBtn = page.locator('button[type="submit"], button:has-text("Iniciar Sesión")').first();

    await usernameInput.fill('admin1');
    await passwordInput.fill('tobby 1');
    await submitBtn.click();
    await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 10000 });
  });

  test('Debe ingresar a un tablero, editar un circuito con ModalEdicionCircuito y persistir tras recargar', async ({ page }) => {
    const uniqueSuffix = Date.now().toString().slice(-4);
    const nombreEmpresa = `EMPRESA TABLEROS ${uniqueSuffix}`;
    const nombreProyecto = `PROYECTO TABLEROS ${uniqueSuffix}`;

    // 1. Crear empresa dedicada
    await page.locator('button:has-text("Registrar Empresa")').first().click();
    await page.locator('input[placeholder*="Farmatodo" i], form input[type="text"]').first().fill(nombreEmpresa);
    await page.locator('input[placeholder*="J-12345678-9" i]').first().fill(`J-8899${uniqueSuffix}-0`);
    await page.locator('input[placeholder*="Av. Araure" i]').first().fill('Av. Francisco de Miranda, Torre Este, Piso 3');
    await page.locator('button[type="submit"]:has-text("Registrar")').first().click();
    await page.waitForTimeout(1000);

    // Entrar a la empresa
    const cardEmpresa = page.locator(`text=${nombreEmpresa}`).first();
    await expect(cardEmpresa).toBeVisible({ timeout: 10000 });
    await cardEmpresa.click();
    await page.waitForURL(/\/empresa\//, { timeout: 10000 });

    // 2. Crear proyecto dedicado
    await page.locator('button:has-text("Crear Proyecto")').first().click();
    await page.locator('form input[type="text"]').first().fill(nombreProyecto);
    await page.locator('button[type="submit"]:has-text("Crear Proyecto")').first().click();
    await page.waitForTimeout(1000);

    // Entrar al proyecto
    const cardProj = page.locator(`text=${nombreProyecto}`).first();
    await expect(cardProj).toBeVisible({ timeout: 10000 });
    await cardProj.click();
    await page.waitForURL(/\/proyecto\//, { timeout: 10000 });

    // 3. Crear Tablero Eléctrico
    await page.locator('button:has-text("Crear Elemento")').first().click();
    await page.locator('button:has-text("PANEL ELÉCTRICO")').first().click();
    await page.locator('form input[type="text"]').first().fill('TABLERO GENERAL SUITE 03');
    await page.locator('button[type="submit"]:has-text("Guardar Plantilla")').first().click();
    await page.waitForTimeout(1000);

    const tableroCard = page.locator('text=TABLERO GENERAL SUITE 03').first();
    await expect(tableroCard).toBeVisible({ timeout: 10000 });
    await tableroCard.click();

    await page.waitForURL(/\/tablero\//, { timeout: 10000 });

    // 4. Localizar una celda interactiva de circuito en la tabla
    const circuitCell = page.locator('td').filter({ hasText: /RESERVA/i }).first();
    await expect(circuitCell).toBeVisible({ timeout: 10000 });
    await circuitCell.click();

    // 5. En el ModalEdicionCircuito:
    const modalCircuito = page.locator('div[role="dialog"], div.fixed').filter({ hasText: 'Configurar Salida' }).first();
    await expect(modalCircuito).toBeVisible({ timeout: 5000 });

    // Seleccionar "Sí, es un Artefacto"
    const btnArtefacto = modalCircuito.locator('button:has-text("Sí, es un Artefacto")').first();
    await expect(btnArtefacto).toBeVisible({ timeout: 5000 });
    await btnArtefacto.click();

    await expect(modalCircuito.locator('text=Llenar Ficha del Artefacto')).toBeVisible({ timeout: 5000 });

    // Llenar formulario de Artefacto
    const inputNombreArtefacto = modalCircuito.locator('input[placeholder*="Extractor" i]').first();
    await expect(inputNombreArtefacto).toBeVisible({ timeout: 5000 });
    await inputNombreArtefacto.fill('ILUMINACION PLANTA PRINCIPAL E2E');

    const inputAmp = modalCircuito.locator('input[placeholder*="20, 30" i]').first();
    if (await inputAmp.isVisible()) await inputAmp.fill('20');

    const inputCond = modalCircuito.locator('input[placeholder*="12, 10" i]').first();
    if (await inputCond.isVisible()) await inputCond.fill('12 AWG');

    const inputMarca = modalCircuito.locator('input[placeholder*="GE, EATON" i]').first();
    if (await inputMarca.isVisible()) await inputMarca.fill('CHINT');

    // Guardar Ficha dentro del modal
    const btnGuardarFicha = modalCircuito.locator('button:has-text("Guardar Ficha")').first();
    await expect(btnGuardarFicha).toBeVisible({ timeout: 5000 });
    await btnGuardarFicha.click();
    await page.waitForTimeout(1500);

    // 6. Recargar la página (F5) para verificar persistencia real en la base de datos
    await page.reload();

    // 7. Validar que la tabla mantenga el circuito editado y visible
    await expect(page.locator('body')).toContainText('ILUMINACION PLANTA PRINCIPAL E2E');
  });

  test('Debe probar Flujo A (Reserva/Carga Directa) y Flujo B (Sub-Elemento Por Crear)', async ({ page }) => {
    const uniqueSuffix = Date.now().toString().slice(-4);
    const nombreEmpresa = `EMPRESA FLUJOS ${uniqueSuffix}`;
    const nombreProyecto = `PROYECTO FLUJOS ${uniqueSuffix}`;

    // 1. Crear empresa y proyecto
    await page.locator('button:has-text("Registrar Empresa")').first().click();
    await page.locator('input[placeholder*="Farmatodo" i], form input[type="text"]').first().fill(nombreEmpresa);
    await page.locator('input[placeholder*="J-12345678-9" i]').first().fill(`J-7788${uniqueSuffix}-0`);
    await page.locator('input[placeholder*="Av. Araure" i]').first().fill('Av. Principal, Edificio Central');
    await page.locator('button[type="submit"]:has-text("Registrar")').first().click();
    await page.waitForTimeout(1000);

    const cardEmpresa = page.locator(`text=${nombreEmpresa}`).first();
    await expect(cardEmpresa).toBeVisible({ timeout: 10000 });
    await cardEmpresa.click();
    await page.waitForURL(/\/empresa\//, { timeout: 10000 });

    await page.locator('button:has-text("Crear Proyecto")').first().click();
    await page.locator('form input[type="text"]').first().fill(nombreProyecto);
    await page.locator('button[type="submit"]:has-text("Crear Proyecto")').first().click();
    await page.waitForTimeout(1000);

    const cardProj = page.locator(`text=${nombreProyecto}`).first();
    await expect(cardProj).toBeVisible({ timeout: 10000 });
    await cardProj.click();
    await page.waitForURL(/\/proyecto\//, { timeout: 10000 });

    // Crear tablero de prueba
    await page.locator('button:has-text("Crear Elemento")').first().click();
    await page.locator('button:has-text("PANEL ELÉCTRICO")').first().click();
    await page.locator('form input[type="text"]').first().fill('TABLERO TEST FLUJOS');
    await page.locator('button[type="submit"]:has-text("Guardar Plantilla")').first().click();
    await page.waitForTimeout(1000);

    const tableroCard = page.locator('text=TABLERO TEST FLUJOS').first();
    await expect(tableroCard).toBeVisible({ timeout: 10000 });
    await tableroCard.click();
    await page.waitForURL(/\/tablero\//, { timeout: 10000 });

    // --- PROBAR FLUJO A: No alimenta a otro elemento (Reserva / Carga Directa) ---
    const cellCircuito1 = page.locator('td').filter({ hasText: /^RESERVA$/i }).first();
    await expect(cellCircuito1).toBeVisible({ timeout: 10000 });
    await cellCircuito1.click();

    const modal1 = page.locator('div[role="dialog"], div.fixed').filter({ hasText: 'Configurar Salida' }).first();
    await expect(modal1).toBeVisible({ timeout: 5000 });

    // "No es un Artefacto" -> "No, no alimenta otro elemento" (Flujo A)
    await modal1.locator('button:has-text("No es un Artefacto")').first().click();
    await modal1.locator('button:has-text("No, no alimenta otro elemento")').first().click();

    // Validar que en Flujo A se muestren únicamente los campos estándar y "Guardar Cambios"
    await expect(modal1.locator('text=Rótulo del Circuito / Descripción')).toBeVisible();
    await expect(modal1.locator('text=Conductor (Calibre opcional)')).toBeVisible();
    await expect(modal1.locator('text=Fotografía de Evidencia / Circuito')).toBeVisible();
    await expect(modal1.locator('button:has-text("Guardar Cambios")')).toBeVisible();
    // Y que NO aparezca la sección de elementos por crear o pendientes
    await expect(modal1.locator('text=¿Agregar a la Lista de Elementos por Crear?')).not.toBeVisible();

    const inputRotulo = modal1.locator('input[placeholder*="RESERVA, VACÍO" i]').first();
    await inputRotulo.fill('CIRCUITO DIRECTO SALIDA 1');
    await page.waitForTimeout(300);
    await modal1.locator('button:has-text("Guardar Cambios")').first().click();
    await page.waitForTimeout(1000);

    // --- PROBAR FLUJO B: Sí alimenta a otro elemento y no está creado todavía ---
    const cellCircuito2 = page.locator('td').filter({ hasText: /^RESERVA$/i }).first();
    await expect(cellCircuito2).toBeVisible({ timeout: 10000 });
    await cellCircuito2.click();

    const modal2 = page.locator('div.fixed').filter({ hasText: 'Configurar Salida' }).first();
    await expect(modal2).toBeVisible({ timeout: 5000 });

    const btnNoArtefacto = modal2.locator('button:has-text("No es un Artefacto")').first();
    await expect(btnNoArtefacto).toBeVisible({ timeout: 5000 });
    await btnNoArtefacto.click();
    await page.waitForTimeout(300);

    const btnSiAlimenta = modal2.locator('button:has-text("Sí, alimenta a otro elemento")').first();
    await expect(btnSiAlimenta).toBeVisible({ timeout: 5000 });
    await btnSiAlimenta.click();
    await page.waitForTimeout(300);

    const btnNoCreado = modal2.locator('button:has-text("No está creado")').first();
    await expect(btnNoCreado).toBeVisible({ timeout: 5000 });
    await btnNoCreado.click();
    await page.waitForTimeout(300);

    // Validar que en Flujo B se muestre exclusivamente la sección del nuevo panel y "Agregar a la Lista de Pendientes"
    await expect(modal2.locator('text=Nombre del Nuevo Tablero / Sub-Elemento')).toBeVisible({ timeout: 5000 });
    await expect(modal2.locator('text=¿Agregar a la Lista de Elementos por Crear?')).toBeVisible({ timeout: 5000 });
    await expect(modal2.locator('button:has-text("Agregar a la Lista de Pendientes")')).toBeVisible({ timeout: 5000 });
    // Y que NO aparezca el botón de guardar simple o fotos de reserva simple
    await expect(modal2.locator('button:has-text("Guardar Cambios")')).not.toBeVisible();

    const inputSubNombre = modal2.locator('input[placeholder*="SUB-TABLERO PISO 2" i]').first();
    await inputSubNombre.fill('SUB-TABLERO BOMBAS SECUNDARIO');
    await page.waitForTimeout(500);

    const btnAgregarPendiente = page.locator('button:has-text("Agregar a la Lista de Pendientes")').first();
    await expect(btnAgregarPendiente).toBeVisible({ timeout: 5000 });
    await btnAgregarPendiente.click({ force: true });
    
    // Esperar que el modal se cierre tras guardar
    await expect(modal2).not.toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // Validar que en la vista del tablero se observe el elemento pendiente y el circuito de reserva guardado
    await expect(page.locator('body')).toContainText('CIRCUITO DIRECTO SALIDA 1');
    await expect(page.locator('body')).toContainText('SUB-TABLERO BOMBAS SECUNDARIO');
  });
});
