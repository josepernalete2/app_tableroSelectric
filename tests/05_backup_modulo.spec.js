import { test, expect } from '@playwright/test';

test.describe('Suite 05: Módulo de Respaldos (Backups)', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Iniciar sesión con usuario administrador
    await page.goto('/login');
    const usernameInput = page.locator('input[placeholder*="admin1" i], input[type="text"]').first();
    const passwordInput = page.locator('input[type="password"], input[placeholder="••••••"]').first();
    const submitBtn = page.locator('button[type="submit"], button:has-text("Iniciar Sesión")').first();

    await usernameInput.fill('admin1');
    await passwordInput.fill('tobby 1');
    await submitBtn.click();
    await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 10000 });
  });

  test('Debe navegar a la vista de Respaldos y disparar la descarga de copia local', async ({ page }) => {
    // 2. Navegar a /backups o hacer clic en el menú lateral
    await page.goto('/backups');
    await expect(page).toHaveURL(/\/backups|\/backup/);

    // 3. Verificar que cargue la interfaz de Gestión de Respaldos
    const backupTitle = page.locator('text=/Centro de Resguardo|Respaldos|Seguridad/i').first();
    await expect(backupTitle).toBeVisible({ timeout: 10000 });

    // 4. Localizar el botón de Descarga Local Directa
    const btnDescargaLocal = page.locator('button:has-text("Descarga Directa"), button:has-text("Descargar Copia"), button:has-text("Local Directa"), button:has-text("Descarga Inmediata")').first();
    await expect(btnDescargaLocal).toBeVisible({ timeout: 10000 });

    // 5. Escuchar evento de descarga
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
    await btnDescargaLocal.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.json$/i);
  });

  test('Debe permitir la navegación entre las pestañas de empresas y respaldo global', async ({ page }) => {
    await page.goto('/backups');

    // Cambiar a pestaña Global / Servidor
    const tabGlobal = page.locator('button:has-text("Global"), button:has-text("Nube"), button:has-text("Servidor")').first();
    if (await tabGlobal.isVisible()) {
      await tabGlobal.click();
      const globalContent = page.locator('text=/Exportar|Volcado|Pipeline|Maestro|Servidor/i').first();
      await expect(globalContent).toBeVisible({ timeout: 8000 });
    }
  });
});
