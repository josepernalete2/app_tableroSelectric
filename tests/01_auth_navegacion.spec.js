import { test, expect } from '@playwright/test';

test.describe('Suite 01: Autenticación y Navegación', () => {
  test('Debe autenticarse correctamente y navegar al Dashboard de Empresas', async ({ page }) => {
    // 1. Navegar a la página de login
    await page.goto('/login');
    await expect(page).toHaveTitle(/App Tablero Selectric|Selectric/i);

    // 2. Localizar inputs de credenciales
    const usernameInput = page.locator('input[placeholder*="admin1" i], input[type="text"]').first();
    const passwordInput = page.locator('input[type="password"], input[placeholder="••••••"]').first();
    const submitBtn = page.locator('button[type="submit"], button:has-text("Iniciar Sesión")').first();

    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // 3. Escribir credenciales válidas
    await usernameInput.fill('admin1');
    await passwordInput.fill('tobby 1');

    // 4. Enviar formulario
    await submitBtn.click();

    // 5. Verificar redirección al Dashboard
    await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 10000 });
    await expect(page).not.toHaveURL(/\/login$/);

    // Validar visibilidad del contenedor de empresas o navegación
    const dashboardElement = page.locator('text=/Empresas|Proyectos|Directorio|Resumen/i').first();
    await expect(dashboardElement).toBeVisible({ timeout: 10000 });
  });

  test('Debe persistir la sesión tras recargar la página (F5)', async ({ page }) => {
    await page.goto('/login');
    
    const usernameInput = page.locator('input[placeholder*="admin1" i], input[type="text"]').first();
    const passwordInput = page.locator('input[type="password"], input[placeholder="••••••"]').first();
    const submitBtn = page.locator('button[type="submit"], button:has-text("Iniciar Sesión")').first();

    await usernameInput.fill('admin1');
    await passwordInput.fill('tobby 1');
    await submitBtn.click();

    await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 10000 });

    // Recargar página
    await page.reload();

    // Debe permanecer autenticado sin redirigir a login
    await expect(page).not.toHaveURL(/\/login$/);
    const dashboardElement = page.locator('text=/Empresas|Proyectos|Directorio|Resumen/i').first();
    await expect(dashboardElement).toBeVisible({ timeout: 10000 });
  });
});
