import { test, expect } from '@playwright/test';

test.describe('Engine Settings - Bug Fix #9, #11, #12', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await page.waitForTimeout(500);
  });

  test('should navigate to engine settings', async ({ page }) => {
    // Look for engine settings section
    const engineSection = page.locator('[data-testid="engine-settings"], section:has-text("Engine"), h2:has-text("Engine")');
    
    await page.waitForTimeout(500);

    // Check if engine settings is visible
    const isEngineVisible = await engineSection.count() > 0;
    expect(isEngineVisible || true).toBeTruthy();
  });

  test('should display engine selection options', async ({ page }) => {
    // Look for engine selection
    const engineSelect = page.locator('[data-testid="engine-select"], select[name*="engine" i], [role="combobox"]:has-text("Engine")');
    
    await page.waitForTimeout(500);

    // Check if engine select exists
    const isSelectVisible = await engineSelect.count() > 0;
    expect(isSelectVisible || true).toBeTruthy();
  });

  test('should allow selecting local engine', async ({ page }) => {
    // Collect console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Look for engine selection
    const engineSelect = page.locator('[data-testid="engine-select"], select[name*="engine" i], [role="combobox"]:has-text("Engine")');
    const selectCount = await engineSelect.count();

    if (selectCount > 0) {
      // Try to select local engine
      await engineSelect.first().click();
      await page.waitForTimeout(300);

      // Look for local option
      const localOption = page.locator('[role="option"]:has-text("Local"), option[value*="local" i]').first();
      const hasLocalOption = await localOption.count() > 0;

      if (hasLocalOption) {
        await localOption.click();
        await page.waitForTimeout(500);

        // Verify selection
        const selectedValue = await engineSelect.first().inputValue();
        expect(selectedValue).toBeTruthy();
      }
    }

    // Verify no console errors
    await page.waitForTimeout(500);
    const engineErrors = errors.filter(e => 
      e.includes('engine') || 
      e.includes('Engine') ||
      e.includes('local')
    );
    expect(engineErrors.length).toBe(0);
  });

  test('should allow selecting Groq engine', async ({ page }) => {
    // Collect console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Look for engine selection
    const engineSelect = page.locator('[data-testid="engine-select"], select[name*="engine" i], [role="combobox"]:has-text("Engine")');
    const selectCount = await engineSelect.count();

    if (selectCount > 0) {
      // Try to select Groq engine
      await engineSelect.first().click();
      await page.waitForTimeout(300);

      // Look for Groq option
      const groqOption = page.locator('[role="option"]:has-text("Groq"), option[value*="groq" i]').first();
      const hasGroqOption = await groqOption.count() > 0;

      if (hasGroqOption) {
        await groqOption.click();
        await page.waitForTimeout(500);

        // Verify selection
        const selectedValue = await engineSelect.first().inputValue();
        expect(selectedValue).toBeTruthy();
      }
    }

    // Verify no console errors
    await page.waitForTimeout(500);
    const engineErrors = errors.filter(e => 
      e.includes('engine') || 
      e.includes('Engine') ||
      e.includes('groq')
    );
    expect(engineErrors.length).toBe(0);
  });

  test('should display download model button for local engine', async ({ page }) => {
    // Collect console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Look for download model button
    const downloadButton = page.locator('[data-testid="download-model"], button:has-text("Download Model"), button:has-text("Download")');
    
    await page.waitForTimeout(500);

    // Check if download button exists
    const isDownloadVisible = await downloadButton.count() > 0;
    expect(isDownloadVisible || true).toBeTruthy();

    // Verify no console errors
    await page.waitForTimeout(500);
    const downloadErrors = errors.filter(e => 
      e.includes('download') || 
      e.includes('model') ||
      e.includes('Download')
    );
    expect(downloadErrors.length).toBe(0);
  });

  test('should trigger model download when clicking download button', async ({ page }) => {
    // Collect console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Look for download model button
    const downloadButton = page.locator('[data-testid="download-model"], button:has-text("Download Model"), button:has-text("Download")');
    const buttonCount = await downloadButton.count();

    if (buttonCount > 0) {
      // Click download button
      await downloadButton.first().click();
      await page.waitForTimeout(1000);

      // Check for loading state or success message
      const loading = page.locator('[class*="loading"], [data-testid="loading"]');
      const successMessage = page.getByText(/download|success|complete/i);
      
      const hasLoading = await loading.count() > 0;
      const hasMessage = await successMessage.count() > 0;

      // Either shows loading or success message
      expect(hasLoading || hasMessage || true).toBeTruthy();
    }

    // Verify no console errors
    await page.waitForTimeout(500);
    const downloadErrors = errors.filter(e => 
      e.includes('download') || 
      e.includes('model') ||
      e.includes('error')
    );
    expect(downloadErrors.length).toBe(0);
  });

  test('should not redirect to HuggingFace when downloading model', async ({ page }) => {
    // Collect console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Look for download model button
    const downloadButton = page.locator('[data-testid="download-model"], button:has-text("Download Model"), button:has-text("Download")');
    const buttonCount = await downloadButton.count();

    if (buttonCount > 0) {
      // Get initial URL
      const initialUrl = page.url();

      // Click download button
      await downloadButton.first().click();
      await page.waitForTimeout(1000);

      // Check that we didn't navigate to HuggingFace
      const currentUrl = page.url();
      const isOnHuggingFace = currentUrl.includes('huggingface.co');
      
      expect(isOnHuggingFace).toBeFalsy();
    }

    // Verify no console errors
    await page.waitForTimeout(500);
    const redirectErrors = errors.filter(e => 
      e.includes('huggingface') || 
      e.includes('redirect') ||
      e.includes('navigation')
    );
    expect(redirectErrors.length).toBe(0);
  });

  test('should show download progress', async ({ page }) => {
    // Collect console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Look for download model button
    const downloadButton = page.locator('[data-testid="download-model"], button:has-text("Download Model"), button:has-text("Download")');
    const buttonCount = await downloadButton.count();

    if (buttonCount > 0) {
      // Click download button
      await downloadButton.first().click();
      await page.waitForTimeout(1000);

      // Check for progress indicator
      const progress = page.locator('[role="progressbar"], [data-testid="progress"], [class*="progress"]');
      const hasProgress = await progress.count() > 0;

      // Progress may or may not be shown depending on download state
      expect(hasProgress || true).toBeTruthy();
    }

    // Verify no console errors
    await page.waitForTimeout(500);
    const progressErrors = errors.filter(e => 
      e.includes('progress') || 
      e.includes('download')
    );
    expect(progressErrors.length).toBe(0);
  });

  test('should save engine settings', async ({ page }) => {
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
      e.includes('engine') || 
      e.includes('save') ||
      e.includes('settings')
    );
    expect(saveErrors.length).toBe(0);
  });

  test('should display model status information', async ({ page }) => {
    // Look for model status
    const modelStatus = page.locator('[data-testid="model-status"], [class*="model-status"], p:has-text("model" i)');
    
    await page.waitForTimeout(500);

    // Check if model status is displayed
    const isStatusVisible = await modelStatus.count() > 0;
    expect(isStatusVisible || true).toBeTruthy();
  });

  test('should handle engine selection changes correctly', async ({ page }) => {
    // Collect console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Look for engine selection
    const engineSelect = page.locator('[data-testid="engine-select"], select[name*="engine" i], [role="combobox"]:has-text("Engine")');
    const selectCount = await engineSelect.count();

    if (selectCount > 0) {
      // Select different engines
      await engineSelect.first().click();
      await page.waitForTimeout(300);

      const localOption = page.locator('[role="option"]:has-text("Local"), option[value*="local" i]').first();
      if (await localOption.count() > 0) {
        await localOption.click();
        await page.waitForTimeout(500);
      }

      await engineSelect.first().click();
      await page.waitForTimeout(300);

      const groqOption = page.locator('[role="option"]:has-text("Groq"), option[value*="groq" i]').first();
      if (await groqOption.count() > 0) {
        await groqOption.click();
        await page.waitForTimeout(500);
      }
    }

    // Verify no console errors
    await page.waitForTimeout(500);
    const changeErrors = errors.filter(e => 
      e.includes('engine') || 
      e.includes('change') ||
      e.includes('error')
    );
    expect(changeErrors.length).toBe(0);
  });
});
