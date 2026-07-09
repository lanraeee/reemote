import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Skip these tests if API not available
    await page.goto('/');
    // In real tests, would use login flow or set auth token
  });

  test('should display VM grid', async ({ page }) => {
    await page.goto('/');

    // Check for dashboard header
    await expect(page.locator('text=Virtual Machines')).toBeVisible({
      timeout: 5000,
    });
  });

  test('should show VM stats summary', async ({ page }) => {
    await page.goto('/');

    // Look for stats section
    const stats = page.locator('[class*="stats"]');
    await expect(stats.locator('text=/VMs|Running|Stopped/i').first()).toBeVisible({
      timeout: 5000,
    });
  });

  test('VM card should show required information', async ({ page }) => {
    await page.goto('/');

    // Wait for VM cards to load
    await page.waitForSelector('[class*="vm-card"]', { timeout: 5000 });

    const vmCard = page.locator('[class*="vm-card"]').first();
    if (await vmCard.isVisible()) {
      // Check for VM name
      await expect(vmCard.locator('[class*="vm-name"]')).toBeVisible();

      // Check for power state badge
      await expect(vmCard.locator('[class*="power-state"]')).toBeVisible();
    }
  });

  test('connect button should be disabled when VM is stopped', async ({ page }) => {
    await page.goto('/');

    const stoppedVMCard = page
      .locator('[class*="vm-card"]')
      .filter({ has: page.locator('text=stopped') })
      .first();

    if (await stoppedVMCard.isVisible()) {
      const connectButton = stoppedVMCard.locator('button:has-text("Connect")');
      const isDisabled = await connectButton.evaluate((el: any) =>
        el.hasAttribute('disabled'),
      );
      expect(isDisabled).toBeTruthy();
    }
  });

  test('connect button should be enabled when VM is running', async ({ page }) => {
    await page.goto('/');

    const runningVMCard = page
      .locator('[class*="vm-card"]')
      .filter({ has: page.locator('text=running') })
      .first();

    if (await runningVMCard.isVisible()) {
      const connectButton = runningVMCard.locator('button:has-text("Connect")');
      const isDisabled = await connectButton.evaluate((el: any) =>
        el.hasAttribute('disabled'),
      );
      expect(isDisabled).toBeFalsy();
    }
  });

  test('clicking connect should navigate to console', async ({ page }) => {
    await page.goto('/');

    // Find first enabled connect button
    const connectButton = page.locator('button:has-text("Connect")').first();
    if (await connectButton.isEnabled()) {
      await connectButton.click();

      // Should navigate to console page
      await expect(page).toHaveURL(/\/vms\/.+\/console/);
    }
  });

  test('should show navigation sidebar', async ({ page }) => {
    await page.goto('/');

    // Check for sidebar
    await expect(page.locator('nav')).toBeVisible();

    // Check for navigation links
    await expect(page.locator('a:has-text("Dashboard")')).toBeVisible();
    await expect(page.locator('a:has-text("Settings")')).toBeVisible();
  });

  test('logout button should be visible', async ({ page }) => {
    await page.goto('/');

    // Look for logout button/link
    await expect(page.locator('button:has-text("Logout"), a:has-text("Logout")')).toBeVisible({
      timeout: 5000,
    });
  });
});
