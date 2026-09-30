# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 04_subida_imagenes.spec.js >> Suite 04: Subida y Persistencia de Imágenes >> Debe cargar una imagen de evidencia fotográfica, guardar y verificar su persistencia tras recargar
- Location: tests\04_subida_imagenes.spec.js:17:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('div[class*="cursor-pointer"]:has-text("SUM-"), div[class*="cursor-pointer"]:has-text("SUMINISTRO")').first()
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('div[class*="cursor-pointer"]:has-text("SUM-"), div[class*="cursor-pointer"]:has-text("SUMINISTRO")').first() with timeout 10000ms
  - waiting for locator('div[class*="cursor-pointer"]:has-text("SUM-"), div[class*="cursor-pointer"]:has-text("SUMINISTRO")').first()

```

```yaml
- text: Conectado. Todos los datos están sincronizados con el servidor.
- complementary:
  - button "Colapsar Menú"
  - link "SELECTRIC Inspección de Red":
    - /url: /
  - text: Menú Principal
  - link "Empresas":
    - /url: /
  - button "Mensajería / Chat"
  - button "Gestión de Usuarios"
  - link "Reportes y Auditoría":
    - /url: /reportes
  - link "Copias de Seguridad":
    - /url: /backups
  - paragraph: 👑 Administrador
  - paragraph: admin1
  - button "Cerrar Sesión"
- heading "Proyecto o Empresa no encontrado" [level=2]
- button "Volver a la Empresa"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import path from 'path';
  3  | 
  4  | test.describe('Suite 04: Subida y Persistencia de Imágenes', () => {
  5  |   test.beforeEach(async ({ page }) => {
  6  |     await page.goto('/login');
  7  |     const usernameInput = page.locator('input[placeholder*="admin1" i], input[type="text"]').first();
  8  |     const passwordInput = page.locator('input[type="password"], input[placeholder="••••••"]').first();
  9  |     const submitBtn = page.locator('button[type="submit"], button:has-text("Iniciar Sesión")').first();
  10 | 
  11 |     await usernameInput.fill('admin1');
  12 |     await passwordInput.fill('tobby 1');
  13 |     await submitBtn.click();
  14 |     await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 10000 });
  15 |   });
  16 | 
  17 |   test('Debe cargar una imagen de evidencia fotográfica, guardar y verificar su persistencia tras recargar', async ({ page }) => {
  18 |     // 1. Navegar a la primera empresa
  19 |     const empresaCard = page.locator('div[class*="cursor-pointer"]:has(h3)').first();
  20 |     await expect(empresaCard).toBeVisible({ timeout: 10000 });
  21 |     await empresaCard.click();
  22 | 
  23 |     // 2. Entrar al primer proyecto
  24 |     await page.waitForURL(/\/empresa\/[^\/]+$/, { timeout: 10000 });
  25 |     const projectCard = page.locator('div[class*="cursor-pointer"]:has(h3)').first();
  26 |     await expect(projectCard).toBeVisible({ timeout: 10000 });
  27 |     await projectCard.click();
  28 | 
  29 |     await page.waitForURL(/\/proyecto\//, { timeout: 10000 });
  30 |     await page.waitForTimeout(500);
  31 | 
  32 |     // 3. Entrar al elemento con Ficha Técnica
  33 |     const elementCard = page.locator('div[class*="cursor-pointer"]:has-text("SUM-"), div[class*="cursor-pointer"]:has-text("SUMINISTRO")').first();
> 34 |     await expect(elementCard).toBeVisible({ timeout: 10000 });
     |                               ^ Error: expect(locator).toBeVisible() failed
  35 |     await elementCard.click();
  36 | 
  37 |     await page.waitForURL(/\/tablero\//, { timeout: 10000 });
  38 | 
  39 |     // 4. Activar modo de edición "Editar Plantilla"
  40 |     const btnEditarPlantilla = page.locator('button:has-text("Editar Plantilla")').first();
  41 |     await expect(btnEditarPlantilla).toBeVisible({ timeout: 10000 });
  42 |     await btnEditarPlantilla.click();
  43 | 
  44 |     // 5. Localizar el input de archivo para subir fotografía
  45 |     const fileInput = page.locator('input[type="file"][accept*="image"]').first();
  46 |     await expect(fileInput).toBeAttached({ timeout: 10000 });
  47 | 
  48 |     const fixturePath = path.resolve(process.cwd(), 'tests', 'fixtures', 'test_image.png');
  49 |     await fileInput.setInputFiles(fixturePath);
  50 |     await page.waitForTimeout(500);
  51 | 
  52 |     // 6. Guardar cambios
  53 |     const btnGuardar = page.locator('button:has-text("Guardar Cambios")').first();
  54 |     await btnGuardar.click();
  55 |     await page.waitForTimeout(1500);
  56 | 
  57 |     // 7. Recargar la página (F5) para confirmar persistencia real
  58 |     await page.reload();
  59 | 
  60 |     // 8. Validar que la imagen siga presente y renderizada en la vista
  61 |     const uploadedImg = page.locator('img[src*="data:image"], img[src*="blob:"], img[src*="/uploads/"]').first();
  62 |     await expect(uploadedImg).toBeVisible({ timeout: 10000 });
  63 |   });
  64 | });
  65 | 
```