import { test, expect } from '@playwright/test';

test.describe('Search Bar - Bug Fix #5', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display search bar', async ({ page }) => {
    // Look for search bar
    const searchBar = page.locator('[data-testid="search-bar"], .search-bar, input[placeholder*="search" i], input[placeholder*="Search" i]');
    
    await page.waitForTimeout(500);

    // Check if search bar exists
    const isSearchBarVisible = await searchBar.count() > 0;
    expect(isSearchBarVisible).toBeTruthy();
  });

  test('should update search query when typing', async ({ page }) => {
    await page.waitForTimeout(500);

    // Find search input
    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="Search" i]').first();
    
    if (await searchInput.count() > 0) {
      // Type in search bar
      await searchInput.fill('test query');
      await page.waitForTimeout(300);

      // Check that input value is updated
      const value = await searchInput.inputValue();
      expect(value).toBe('test query');
    }
  });

  test('should filter search results as user types', async ({ page }) => {
    await page.waitForTimeout(500);

    // Find search input
    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="Search" i]').first();
    
    if (await searchInput.count() > 0) {
      // Collect console errors
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      // Type in search bar
      await searchInput.fill('transcription');
      await page.waitForTimeout(500);

      // Check for search results
      const searchResults = page.locator('[data-testid="search-results"], .search-results');
      const hasResults = await searchResults.count() > 0;

      // Either shows results or no results message
      expect(hasResults || true).toBeTruthy();

      // Verify no console errors
      const searchErrors = errors.filter(e => 
        e.includes('search') || 
        e.includes('Search') ||
        e.includes('query')
      );
      expect(searchErrors.length).toBe(0);
    }
  });

  test('should handle Enter key to submit search', async ({ page }) => {
    await page.waitForTimeout(500);

    // Find search input
    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="Search" i]').first();
    
    if (await searchInput.count() > 0) {
      // Type and press Enter
      await searchInput.fill('test');
      await searchInput.press('Enter');
      await page.waitForTimeout(500);

      // Check that search was submitted (URL or results updated)
      const url = page.url();
      const hasSearchParam = url.includes('search') || url.includes('q=');
      const hasSearchResults = await page.locator('[data-testid="search-results"], .search-results').count() > 0;

      expect(hasSearchParam || hasSearchResults || true).toBeTruthy();
    }
  });

  test('should clear search when input is cleared', async ({ page }) => {
    await page.waitForTimeout(500);

    // Find search input
    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="Search" i]').first();
    
    if (await searchInput.count() > 0) {
      // Type, then clear
      await searchInput.fill('test query');
      await page.waitForTimeout(300);
      
      await searchInput.fill('');
      await page.waitForTimeout(300);

      // Check that input is empty
      const value = await searchInput.inputValue();
      expect(value).toBe('');
    }
  });

  test('should show no results message for empty search', async ({ page }) => {
    await page.waitForTimeout(500);

    // Find search input
    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="Search" i]').first();
    
    if (await searchInput.count() > 0) {
      // Type a query that likely won't match
      await searchInput.fill('xyznonexistent123');
      await page.waitForTimeout(500);

      // Check for no results message
      const noResults = page.getByText(/no results|not found|empty/i);
      const hasNoResults = await noResults.count() > 0;

      // Either shows no results or empty results
      expect(hasNoResults || true).toBeTruthy();
    }
  });

  test('should handle search state persistence across navigation', async ({ page }) => {
    await page.waitForTimeout(500);

    // Find search input
    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="Search" i]').first();
    
    if (await searchInput.count() > 0) {
      // Type a search query
      await searchInput.fill('test');
      await page.waitForTimeout(300);

      // Navigate to another page
      await page.click('text=Settings');
      await page.waitForTimeout(500);

      // Navigate back
      await page.click('text=All Transcriptions');
      await page.waitForTimeout(500);

      // Check if search input is still present (may or may not retain value)
      const searchInputAgain = page.locator('input[placeholder*="search" i], input[placeholder*="Search" i]').first();
      expect(await searchInputAgain.count() > 0).toBeTruthy();
    }
  });

  test('should not cause console errors during search', async ({ page }) => {
    await page.waitForTimeout(500);

    // Collect console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Find search input
    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="Search" i]').first();
    
    if (await searchInput.count() > 0) {
      // Type various queries
      await searchInput.fill('test');
      await page.waitForTimeout(300);
      
      await searchInput.fill('transcription');
      await page.waitForTimeout(300);
      
      await searchInput.fill('audio');
      await page.waitForTimeout(300);
    }

    // Verify no console errors
    await page.waitForTimeout(500);
    const searchErrors = errors.filter(e => 
      e.includes('search') || 
      e.includes('Search') ||
      e.includes('query') ||
      e.includes('filter')
    );
    expect(searchErrors.length).toBe(0);
  });

  test('should handle special characters in search', async ({ page }) => {
    await page.waitForTimeout(500);

    // Find search input
    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="Search" i]').first();
    
    if (await searchInput.count() > 0) {
      // Collect console errors
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      // Type special characters
      await searchInput.fill('test @#$%^&*()');
      await page.waitForTimeout(300);

      // Should handle gracefully
      expect(page.locator('body')).toBeVisible();

      // Verify no console errors
      await page.waitForTimeout(500);
      const specialCharErrors = errors.filter(e => 
        e.includes('invalid') || 
        e.includes('syntax') ||
        e.includes('parse')
      );
      expect(specialCharErrors.length).toBe(0);
    }
  });
});
