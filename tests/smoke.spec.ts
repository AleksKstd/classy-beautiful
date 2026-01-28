import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('home page loads and carousel renders', async ({ page }) => {
    await page.goto('/');
    
    // Check page title or main content loads
    await expect(page).toHaveTitle(/Classy|Beautiful/i);
    
    // Check hero section exists
    const heroSection = page.locator('section').first();
    await expect(heroSection).toBeVisible();
    
    // Check carousel has at least 1 image (either from Supabase or fallback)
    const carouselImages = page.locator('[class*="embla"] img, [class*="carousel"] img');
    await expect(carouselImages.first()).toBeVisible({ timeout: 10000 });
  });

  test('reservation page loads and shows step 1', async ({ page }) => {
    await page.goto('/rezervacii');
    
    // Check page loads
    await expect(page.locator('body')).toBeVisible();
    
    // Check reservation form/wizard exists
    // Step 1 typically shows office selection
    const officeSelection = page.getByText(/София|Лом|офис|локация/i).first();
    await expect(officeSelection).toBeVisible({ timeout: 10000 });
  });

  test('procedures page loads', async ({ page }) => {
    await page.goto('/proceduri');
    
    // Check page loads with procedures content
    await expect(page.locator('body')).toBeVisible();
    
    // Check for procedure categories or items
    const procedureContent = page.locator('main');
    await expect(procedureContent).toBeVisible();
  });
});
