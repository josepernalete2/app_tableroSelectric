import { test, expect } from '@playwright/test';

test.describe('Suite 03: Tableros y Circuitos Eléctricos', () => {
  test.beforeEach(async ({ page }) => {
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
    // 1. Entrar a la primera empresa
    const empresaCard = page.locator('div[class*="cursor-pointer"]:has(h3)').first();
    await expect(empresaCard).toBeVisible({ timeout: 10000 });
    await empresaCard.click();

    // 2. Entrar al primer proyecto
    await page.waitForURL(/\/empresa\/[^\/]+$/, { timeout: 10000 });
    const projectCard = page.locator('div[class*="cursor-pointer"]:has(h3)').first();
    await expect(projectCard).toBeVisible({ timeout: 10000 });
    await projectCard.click();

    await page.waitForURL(/\/proyecto\//, { timeout: 10000 });
    await page.waitForTimeout(500);

    // 3. Seleccionar el Tablero Eléctrico existente
    const tableroCard = page.locator('div[class*="cursor-pointer"]:has-text("TAB-"), div[class*="cursor-pointer"]:has-text("Hola1"), div[class*="cursor-pointer"]:has-text("PANEL")').first();
    await expect(tableroCard).toBeVisible({ timeout: 10000 });
    await tableroCard.click();

    await page.waitForURL(/\/tablero\//, { timeout: 10000 });

    // 4. Localizar una celda interactiva de circuito en la tabla
    const circuitCell = page.locator('td').filter({ hasText: /RESERVA/i }).first();
    await expect(circuitCell).toBeVisible({ timeout: 10000 });
    await circuitCell.click();

    // 5. En el ModalEdicionCircuito:
    // Paso 1: Seleccionar "Sí, es un Artefacto"
    const btnArtefacto = page.locator('button').filter({ hasText: /Artefacto/i }).first();
    await expect(btnArtefacto).toBeVisible({ timeout: 5000 });
    await btnArtefacto.click();

    // Paso 2: Llenar formulario de Artefacto
    const inputNombreArtefacto = page.locator('input[placeholder*="Extractor" i], input[placeholder*="Nombre" i]').first();
    await expect(inputNombreArtefacto).toBeVisible({ timeout: 5000 });
    await inputNombreArtefacto.fill('ILUMINACION PLANTA PRINCIPAL E2E');

    const inputAmp = page.locator('input[placeholder*="20, 30" i], input[placeholder*="Ej. 20" i]').first();
    if (await inputAmp.isVisible()) {
      await inputAmp.fill('20');
    }

    const inputCond = page.locator('input[placeholder*="12, 10" i], input[placeholder*="Ej. 12" i]').first();
    if (await inputCond.isVisible()) {
      await inputCond.fill('12 AWG');
    }

    const inputMarca = page.locator('input[placeholder*="GE, EATON" i], input[placeholder*="Ej. GE" i]').first();
    if (await inputMarca.isVisible()) {
      await inputMarca.fill('CHINT');
    }

    // Paso 3: Guardar Ficha dentro del modal
    const btnGuardarFicha = page.locator('button:has-text("Guardar Ficha")').first();
    await expect(btnGuardarFicha).toBeVisible({ timeout: 5000 });
    await btnGuardarFicha.click();
    await page.waitForTimeout(1500);

    // 6. Recargar la página (F5) para verificar persistencia real en la base de datos
    await page.reload();

    // 7. Validar que la tabla mantenga el circuito editado y visible
    await expect(page.locator('body')).toContainText('ILUMINACION PLANTA PRINCIPAL E2E');
  });
});
