import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Suite 04: Subida y Persistencia de Imágenes', () => {
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

  test('Debe cargar una imagen de evidencia fotográfica, guardar y verificar su persistencia tras recargar', async ({ page }) => {
    const uniqueSuffix = Date.now().toString().slice(-4);
    const nombreEmpresa = `EMPRESA FOTOS ${uniqueSuffix}`;
    const nombreProyecto = `PROYECTO FOTOS ${uniqueSuffix}`;

    // 1. Crear empresa dedicada
    await page.locator('button:has-text("Registrar Empresa")').first().click();
    await page.locator('input[placeholder*="Farmatodo" i], form input[type="text"]').first().fill(nombreEmpresa);
    await page.locator('input[placeholder*="J-12345678-9" i]').first().fill(`J-7788${uniqueSuffix}-0`);
    await page.locator('input[placeholder*="Av. Araure" i]').first().fill('Av. Principal, Torre Oeste, Piso 1');
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
    await page.locator('form input[type="text"]').first().fill('TABLERO FOTOGRAFICO SUITE 04');
    await page.locator('button[type="submit"]:has-text("Guardar Plantilla")').first().click();
    await page.waitForTimeout(1000);

    const tableroCard = page.locator('text=TABLERO FOTOGRAFICO SUITE 04').first();
    await expect(tableroCard).toBeVisible({ timeout: 10000 });
    await tableroCard.click();

    await page.waitForURL(/\/tablero\//, { timeout: 10000 });

    // 4. Localizar el input de archivo para subir fotografía
    const fileInput = page.locator('input[type="file"][accept*="image"]').first();
    await expect(fileInput).toBeAttached({ timeout: 10000 });

    const fixturePath = path.resolve(process.cwd(), 'tests', 'fixtures', 'test_image.png');
    await fileInput.setInputFiles(fixturePath);
    await page.waitForTimeout(1500);

    // 5. Recargar la página (F5) para confirmar persistencia real en Postgres
    await page.reload();

    // 6. Validar que la imagen siga presente y renderizada en la vista
    const uploadedImg = page.locator('img[src*="data:image"], img[src*="blob:"], img[src*="/uploads/"]').first();
    await expect(uploadedImg).toBeVisible({ timeout: 10000 });
  });
});
