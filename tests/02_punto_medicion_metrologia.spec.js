import { test, expect } from '@playwright/test';

test.describe('Suite 02: Punto de Medición y Metrología Eléctrica', () => {
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

  test('Debe ingresar a una ficha técnica con Metrología, editar valores y persistir tras recargar', async ({ page }) => {
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

    // 3. Localizar elemento Punto de Suministro o crear uno
    let ptoCard = page.locator('div[class*="cursor-pointer"]:has-text("SUM-"), div[class*="cursor-pointer"]:has-text("SUMINISTRO")').first();
    if (!(await ptoCard.isVisible())) {
      const btnCrear = page.locator('button:has-text("Crear Elemento")').first();
      await btnCrear.click();
      await page.locator('button:has-text("PTO. SUMINISTRO")').first().click();
      await page.locator('form input[type="text"]').first().fill('PTO SUMINISTRO METROLOGIA E2E');
      await page.locator('button[type="submit"]:has-text("Guardar Plantilla")').first().click();
      await page.waitForTimeout(1000);
      ptoCard = page.locator('text=PTO SUMINISTRO METROLOGIA E2E').first();
    }

    await expect(ptoCard).toBeVisible({ timeout: 10000 });
    await ptoCard.click();

    await page.waitForURL(/\/tablero\//, { timeout: 10000 });

    // 4. Activar modo de edición "Editar Plantilla"
    const btnEditarPlantilla = page.locator('button:has-text("Editar Plantilla")').first();
    await expect(btnEditarPlantilla).toBeVisible({ timeout: 10000 });
    await btnEditarPlantilla.click();

    // 5. Localizar y rellenar inputs de Metrología Eléctrica
    const inputL1L2 = page.locator('input[placeholder="Ej. 208"]').nth(0);
    const inputL1L3 = page.locator('input[placeholder="Ej. 208"]').nth(1);
    const inputL2L3 = page.locator('input[placeholder="Ej. 208"]').nth(2);

    const inputL1N = page.locator('input[placeholder="Ej. 120"]').nth(0);
    const inputL2N = page.locator('input[placeholder="Ej. 120"]').nth(1);
    const inputL3N = page.locator('input[placeholder="Ej. 120"]').nth(2);

    const inputIL1 = page.locator('input[placeholder="Ej. 650"]').first();
    const inputIL2 = page.locator('input[placeholder="Ej. 630"]').first();
    const inputIL3 = page.locator('input[placeholder="Ej. 640"]').first();
    const inputIN = page.locator('input[placeholder="Ej. 35"]').first();
    const inputIPE = page.locator('input[placeholder="Ej. 0.5"]').first();

    await expect(inputL1L2).toBeVisible({ timeout: 5000 });

    // Rellenar valores de prueba
    await inputL1L2.fill('214.5');
    await inputL1L3.fill('213.8');
    await inputL2L3.fill('215.1');

    await inputL1N.fill('122.3');
    await inputL2N.fill('121.7');
    await inputL3N.fill('123.0');

    await inputIL1.fill('340.5');
    await inputIL2.fill('335.2');
    await inputIL3.fill('342.8');
    await inputIN.fill('12.4');
    await inputIPE.fill('0.45');

    // 6. Guardar cambios
    const btnGuardar = page.locator('button:has-text("Guardar Cambios")').first();
    await btnGuardar.click();
    await page.waitForTimeout(1500);

    // 7. Recargar la página (F5) para verificar persistencia real en la base de datos
    await page.reload();

    // 8. Activar nuevamente "Editar Plantilla" si está en modo solo lectura para verificar los inputs
    const btnEditarAfterReload = page.locator('button:has-text("Editar Plantilla")').first();
    if (await btnEditarAfterReload.isVisible()) {
      await btnEditarAfterReload.click();
    }

    // 9. Validar persistencia exacta de los valores ingresados
    await expect(page.locator('input[placeholder="Ej. 208"]').nth(0)).toHaveValue('214.5');
    await expect(page.locator('input[placeholder="Ej. 208"]').nth(1)).toHaveValue('213.8');
    await expect(page.locator('input[placeholder="Ej. 208"]').nth(2)).toHaveValue('215.1');

    await expect(page.locator('input[placeholder="Ej. 120"]').nth(0)).toHaveValue('122.3');
    await expect(page.locator('input[placeholder="Ej. 120"]').nth(1)).toHaveValue('121.7');
    await expect(page.locator('input[placeholder="Ej. 120"]').nth(2)).toHaveValue('123.0');

    await expect(page.locator('input[placeholder="Ej. 650"]').first()).toHaveValue('340.5');
    await expect(page.locator('input[placeholder="Ej. 630"]').first()).toHaveValue('335.2');
    await expect(page.locator('input[placeholder="Ej. 640"]').first()).toHaveValue('342.8');
    await expect(page.locator('input[placeholder="Ej. 35"]').first()).toHaveValue('12.4');
    await expect(page.locator('input[placeholder="Ej. 0.5"]').first()).toHaveValue('0.45');
  });
});
