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
    // 1. Navegar a la primera empresa
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

    // 3. Entrar al elemento con Ficha Técnica
    const elementCard = page.locator('div[class*="cursor-pointer"]:has-text("SUM-"), div[class*="cursor-pointer"]:has-text("SUMINISTRO")').first();
    await expect(elementCard).toBeVisible({ timeout: 10000 });
    await elementCard.click();

    await page.waitForURL(/\/tablero\//, { timeout: 10000 });

    // 4. Activar modo de edición "Editar Plantilla"
    const btnEditarPlantilla = page.locator('button:has-text("Editar Plantilla")').first();
    await expect(btnEditarPlantilla).toBeVisible({ timeout: 10000 });
    await btnEditarPlantilla.click();

    // 5. Localizar el input de archivo para subir fotografía
    const fileInput = page.locator('input[type="file"][accept*="image"]').first();
    await expect(fileInput).toBeAttached({ timeout: 10000 });

    const fixturePath = path.resolve(process.cwd(), 'tests', 'fixtures', 'test_image.png');
    await fileInput.setInputFiles(fixturePath);
    await page.waitForTimeout(500);

    // 6. Guardar cambios
    const btnGuardar = page.locator('button:has-text("Guardar Cambios")').first();
    await btnGuardar.click();
    await page.waitForTimeout(1500);

    // 7. Recargar la página (F5) para confirmar persistencia real
    await page.reload();

    // 8. Validar que la imagen siga presente y renderizada en la vista
    const uploadedImg = page.locator('img[src*="data:image"], img[src*="blob:"], img[src*="/uploads/"]').first();
    await expect(uploadedImg).toBeVisible({ timeout: 10000 });
  });
});
