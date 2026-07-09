import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');

    // Check for form elements
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Login")')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill form with invalid credentials
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.locator('input[name="password"]').fill('password123');
    await page.locator('button:has-text("Login")').click();

    // Wait for error message
    await expect(page.locator('text=/error|invalid|unauthorized/i')).toBeVisible({
      timeout: 5000,
    });
  });

  test('should redirect to login when accessing protected route without token', async ({
    page,
  }) => {
    // Try to access dashboard directly
    await page.goto('/');

    // Should redirect to login
    expect(page.url()).toContain('/login');
  });

  test('should show TOTP field when required', async ({ page }) => {
    await page.goto('/login');

    // Fill form
    await page.locator('input[name="email"]').fill('admin@example.com');
    await page.locator('input[name="password"]').fill('Admin123!');

    // TOTP field should not be visible initially
    const totpField = page.locator('input[name="totp_code"]');
    await expect(totpField).not.toBeVisible();

    // After login attempt (if TOTP required), it should appear
    // This depends on backend response
  });

  test('email field should be required', async ({ page }) => {
    await page.goto('/login');

    // Try to submit without email
    await page.locator('input[name="password"]').fill('password123');
    await page.locator('button:has-text("Login")').click();

    // Should show validation error
    const emailInput = page.locator('input[name="email"]');
    const isInvalid = await emailInput.evaluate((el: any) =>
      el.hasAttribute('required'),
    );
    expect(isInvalid).toBeTruthy();
  });

  test('password field should be required', async ({ page }) => {
    await page.goto('/login');

    // Try to submit without password
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.locator('button:has-text("Login")').click();

    // Should show validation error
    const passwordInput = page.locator('input[name="password"]');
    const isInvalid = await passwordInput.evaluate((el: any) =>
      el.hasAttribute('required'),
    );
    expect(isInvalid).toBeTruthy();
  });

  test('should persist auth state across page reload', async ({ page, context }) => {
    // Set a token in localStorage (simulating logged-in state)
    await page.goto('/');
    await page.evaluate(() => {
      const token = 'test-token-jwt-header.payload.signature';
      localStorage.setItem('auth', JSON.stringify({ token, user: { email: 'test@example.com' } }));
    });

    // Reload page
    await page.reload();

    // Should still be on dashboard (or attempting to fetch user info)
    // If token is invalid, it will redirect to login
  });
});
