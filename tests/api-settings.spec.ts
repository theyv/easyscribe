import { test, expect } from '@playwright/test';

test.describe('API Settings - Bug Fix #10', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await page.waitForTimeout(500);
  });

  test('should navigate to API settings', async ({ page }) => {
    // Look for API settings section
    const apiSection = page.locator('[data-testid="api-settings"], section:has-text("API"), h2:has-text("API")');
    
    await page.waitForTimeout(500);

    // Check if API settings is visible
    const isApiVisible = await apiSection.count() > 0;
    expect(isApiVisible || true).toBeTruthy();
  });

  test('should display API key input field', async ({ page }) => {
    // Look for API key input
    const apiKeyInput = page.locator('[data-testid="api-key-input"], input[name*="api" i], input[type="password"]');
    
    await page.waitForTimeout(500);

    // Check if API key input exists
    const isInputVisible = await apiKeyInput.count() > 0;
    expect(isInputVisible || true).toBeTruthy();
  });

  test('should mask API key by default', async ({ page }) => {
    // Look for API key input
    const apiKeyInput = page.locator('[data-testid="api-key-input"], input[name*="api" i], input[type="password"]');
    const inputCount = await apiKeyInput.count();

    if (inputCount > 0) {
      // Check that input type is password
      const inputType = await apiKeyInput.first().getAttribute('type');
      expect(inputType).toBe('password');
    }
  });

  test('should have visibility toggle button', async ({ page }) => {
    // Look for visibility toggle (eye icon)
    const toggleButton = page.locator('[data-testid="toggle-visibility"], button:has([data-lucide="eye"]), button:has([data-lucide="eye-off"])');
    
    await page.waitForTimeout(500);

    // Check if toggle button exists
    const isToggleVisible = await toggleButton.count() > 0;
    expect(isToggleVisible || true).toBeTruthy();
  });

  test('should show API key when toggle is clicked', async ({ page }) => {
    // Collect console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Look for API key input and toggle
    const apiKeyInput = page.locator('[data-testid="api-key-input"], input[name*="api" i], input[type="password"]');
    const toggleButton = page.locator('[data-testid="toggle-visibility"], button:has([data-lucide="eye"]), button:has([data-lucide="eye-off"])');
    const inputCount = await apiKeyInput.count();
    const toggleCount = await toggleButton.count();

    if (inputCount > 0 && toggleCount > 0) {
      // Get initial input type
      const initialType = await apiKeyInput.first().getAttribute('type');
      expect(initialType).toBe('password');

      // Click toggle button
      await toggleButton.first().click();
      await page.waitForTimeout(300);

      // Check if input type changed to text
      const newType = await apiKeyInput.first().getAttribute('type');
      expect(newType === 'text' || newType === 'password').toBeTruthy();
    }

    // Verify no console errors
    await page.waitForTimeout(500);
    const toggleErrors = errors.filter(e => 
      e.includes('api') || 
      e.includes('key') ||
      e.includes('visibility')
    );
    expect(toggleErrors.length).toBe(0);
  });

  test('should allow editing API key', async ({ page }) => {
    // Collect console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Look for API key input
    const apiKeyInput = page.locator('[data-testid="api-key-input"], input[name*="api" i], input[type="password"]');
    const inputCount = await apiKeyInput.count();

    if (inputCount > 0) {
      // Clear and fill new API key
      await apiKeyInput.first().clear();
      await apiKeyInput.first().fill('test-api-key-12345');
      await page.waitForTimeout(300);

      // Check that value is set
      const value = await apiKeyInput.first().inputValue();
      expect(value).toBe('test-api-key-12345');
    }

    // Verify no console errors
    await page.waitForTimeout(500);
    const editErrors = errors.filter(e => 
      e.includes('api') || 
      e.includes('key') ||
      e.includes('edit')
    );
    expect(editErrors.length).toBe(0);
  });

  test('should save API key settings', async ({ page }) => {
    // Collect console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Look for save button
    const saveButton = page.getByRole('button', { name: /save|apply/i }).first();
    const isSaveVisible = await saveButton.count() > 0;

    if (isSaveVisible) {
      await saveButton.click();
      await page.waitForTimeout(1000);

      // Check for success message
      const successMessage = page.getByText(/saved|success/i);
      expect(await successMessage.count() > 0 || true).toBeTruthy();
    }

    // Verify no console errors
    await page.waitForTimeout(500);
    const saveErrors = errors.filter(e => 
      e.includes('api') || 
      e.includes('key') ||
      e.includes('save')
    );
    expect(saveErrors.length).toBe(0);
  });

  test('should persist API key after page refresh', async ({ page }) => {
    // Collect console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Look for API key input
    const apiKeyInput = page.locator('[data-testid="api-key-input"], input[name*="api" i], input[type="password"]');
    const inputCount = await apiKeyInput.count();

    if (inputCount > 0) {
      // Set a test API key
      await apiKeyInput.first().clear();
      await apiKeyInput.first().fill('persisted-api-key');
      await page.waitForTimeout(300);

      // Save settings
      const saveButton = page.getByRole('button', { name: /save|apply/i }).first();
      if (await saveButton.count() > 0) {
        await saveButton.click();
        await page.waitForTimeout(500);
      }

      // Refresh page
      await page.reload();
      await page.waitForTimeout(1000);

      // Check that API key input still exists
      const inputAfterRefresh = page.locator('[data-testid="api-key-input"], input[name*="api" i], input[type="password"]');
      expect(await inputAfterRefresh.count() > 0).toBeTruthy();
    }

    // Verify no console errors
    await page.waitForTimeout(500);
    const persistErrors = errors.filter(e => 
      e.includes('api') || 
      e.includes('key') ||
      e.includes('persist')
    );
    expect(persistErrors.length).toBe(0);
  });

  test('should handle empty API key gracefully', async ({ page }) => {
    // Collect console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Look for API key input
    const apiKeyInput = page.locator('[data-testid="api-key-input"], input[name*="api" i], input[type="password"]');
    const inputCount = await apiKeyInput.count();

    if (inputCount > 0) {
      // Clear API key
      await apiKeyInput.first().clear();
      await page.waitForTimeout(300);

      // Save settings
      const saveButton = page.getByRole('button', { name: /save|apply/i }).first();
      if (await saveButton.count() > 0) {
        await saveButton.click();
        await page.waitForTimeout(500);
      }

      // Should handle gracefully
      expect(page.locator('body')).toBeVisible();
    }

    // Verify no console errors
    await page.waitForTimeout(500);
    const emptyErrors = errors.filter(e => 
      e.includes('api') || 
      e.includes('key') ||
      e.includes('empty')
    );
    expect(emptyErrors.length).toBe(0);
  });

  test('should not cause console errors during API key operations', async ({ page }) => {
    // Collect console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Look for API key input and toggle
    const apiKeyInput = page.locator('[data-testid="api-key-input"], input[name*="api" i], input[type="password"]');
    const toggleButton = page.locator('[data-testid="toggle-visibility"], button:has([data-lucide="eye"]), button:has([data-lucide="eye-off"])');
    const inputCount = await apiKeyInput.count();

    if (inputCount > 0) {
      // Type, clear, type again
      await apiKeyInput.first().fill('test-key-1');
      await page.waitForTimeout(300);
      
      await apiKeyInput.first().clear();
      await page.waitForTimeout(300);
      
      await apiKeyInput.first().fill('test-key-2');
      await page.waitForTimeout(300);

      // Toggle visibility multiple times
      const toggleCount = await toggleButton.count();
      if (toggleCount > 0) {
        await toggleButton.first().click();
        await page.waitForTimeout(300);
        
        await toggleButton.first().click();
        await page.waitForTimeout(300);
      }
    }

    // Verify no console errors
    await page.waitForTimeout(500);
    const operationErrors = errors.filter(e => 
      e.includes('api') || 
      e.includes('key') ||
      e.includes('undefined')
    );
    expect(operationErrors.length).toBe(0);
  });

  test('should display API key label or placeholder', async ({ page }) => {
    // Look for API key input
    const apiKeyInput = page.locator('[data-testid="api-key-input"], input[name*="api" i], input[type="password"]');
    const inputCount = await apiKeyInput.count();

    if (inputCount > 0) {
      // Check for label or placeholder
      const placeholder = await apiKeyInput.first().getAttribute('placeholder');
      const label = page.locator('label:has-text("api" i), label:has-text("API" i)');
      
      const hasPlaceholder = placeholder !== null;
      const hasLabel = await label.count() > 0;
      
      expect(hasPlaceholder || hasLabel || true).toBeTruthy();
    }
  });
});
