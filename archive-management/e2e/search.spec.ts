import { test, expect, beforeEach } from "@playwright/test";

describe("Search Functionality E2E", () => {
  // Helper function to login
  async function login(page) {
    await page.goto("http://localhost:3000/login");
    await page.fill('input[id="username"]', "admin");
    await page.fill('input[id="password"]', "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/search");
  }

  beforeEach(async ({ page }) => {
    // Login before each test
    await login(page);
  });

  test("should display search page with welcome section", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("档案搜索");
    await expect(page.locator('input[placeholder*="关键词"]')).toBeVisible();
  });

  test("should perform search and display results", async ({ page }) => {
    // Enter search query
    await page.fill('input[placeholder*="关键词"]', "档案");
    await page.press('input[placeholder*="关键词"]', "Enter");

    // Wait for results to load
    await page.waitForSelector('[data-testid="search-results"]', {
      timeout: 5000,
    });

    // Verify results are displayed
    const results = page.locator(".search-result-card");
    await expect(await results.count()).toBeGreaterThan(0);

    // Verify search metadata
    await expect(page.locator("text=/找到.*个结果/")).toBeVisible();
    await expect(page.locator("text=/耗时.*ms/")).toBeVisible();
  });

  test("should highlight search terms in results", async ({ page }) => {
    await page.fill('input[placeholder*="关键词"]', "工作总结");
    await page.press('input[placeholder*="关键词"]', "Enter");

    // Wait for results
    await page.waitForSelector(".search-result-card");

    // Check for highlighted text (mark tags)
    const highlights = page.locator("mark");
    await expect(await highlights.count()).toBeGreaterThan(0);
  });

  test("should display empty state for no results", async ({ page }) => {
    await page.fill('input[placeholder*="关键词"]', "nonexistentterm123");
    await page.press('input[placeholder*="关键词"]', "Enter");

    // Wait for empty state
    await page.waitForSelector("text=未找到相关档案");

    // Verify empty state message
    await expect(page.locator("text=未找到相关档案")).toBeVisible();
    await expect(page.locator("text=没有找到与")).toBeVisible();
  });

  test("should filter by category", async ({ page }) => {
    // Perform search first
    await page.fill('input[placeholder*="关键词"]', "档案");
    await page.press('input[placeholder*="关键词"]', "Enter");
    await page.waitForSelector(".search-result-card");

    // Open category filter
    await page.click('[data-testid="category-filter"]');

    // Select a category
    await page.click('text=/工作总结/');

    // Verify filter is applied
    await expect(page.locator("text=/分类:.*工作总结/")).toBeVisible();
  });

  test("should filter by tags", async ({ page }) => {
    // Perform search first
    await page.fill('input[placeholder*="关键词"]', "档案");
    await page.press('input[placeholder*="关键词"]', "Enter");
    await page.waitForSelector(".search-result-card");

    // Click on a tag chip
    const tagChips = page.locator(".tag-chip");
    const firstTag = tagChips.first();
    await firstTag.click();

    // Verify filter is applied
    await expect(page.locator("text=/标签:/")).toBeVisible();
  });

  test("should clear filters", async ({ page }) => {
    // Perform search with filters
    await page.fill('input[placeholder*="关键词"]', "档案");
    await page.press('input[placeholder*="关键词"]', "Enter");
    await page.waitForSelector(".search-result-card");

    // Apply a filter
    const tagChips = page.locator(".tag-chip");
    if ((await tagChips.count()) > 0) {
      await tagChips.first().click();
    }

    // Click clear filters button
    await page.click('button:has-text("清除筛选")');

    // Verify filters are cleared
    await expect(page.locator("text=/分类:/")).not.toBeVisible();
    await expect(page.locator("text=/标签:/")).not.toBeVisible();
  });

  test("should paginate through results", async ({ page }) => {
    // Perform search
    await page.fill('input[placeholder*="关键词"]', "档案");
    await page.press('input[placeholder*="关键词"]', "Enter");
    await page.waitForSelector(".search-result-card");

    // Check if pagination is visible
    const nextPageButton = page.locator('button:has-text("下一页")');
    const prevPageButton = page.locator('button:has-text("上一页")');

    // First page should not have enabled prev button
    await expect(prevPageButton).toBeDisabled();

    // Click next page if available
    if (!(await nextPageButton.isDisabled())) {
      await nextPageButton.click();
      await page.waitForTimeout(500);

      // Now prev button should be enabled
      await expect(prevPageButton).toBeEnabled();

      // Go back to first page
      await prevPageButton.click();
      await page.waitForTimeout(500);

      // Verify we're back on page 1
      await expect(page.locator("text=/第.*1.*页/")).toBeVisible();
    }
  });

  test("should use page numbers for navigation", async ({ page }) => {
    await page.fill('input[placeholder*="关键词"]', "档案");
    await page.press('input[placeholder*="关键词"]', "Enter");
    await page.waitForSelector(".search-result-card");

    // Look for page number buttons
    const pageButtons = page.locator('.pagination-button:not([disabled])');

    const count = await pageButtons.count();
    if (count > 1) {
      // Click on page 2 if available
      const page2Button = page.locator('button:has-text("2")');
      if (await page2Button.isVisible()) {
        await page2Button.click();
        await page.waitForTimeout(500);

        // Verify URL updated
        const url = page.url();
        expect(url).toContain("page=2");
      }
    }
  });

  test("should display archive details on result card", async ({ page }) => {
    await page.fill('input[placeholder*="关键词"]', "工作总结");
    await page.press('input[placeholder*="关键词"]', "Enter");
    await page.waitForSelector(".search-result-card");

    // Verify card elements
    const firstCard = page.locator(".search-result-card").first();

    // Check title
    await expect(firstCard.locator("a")).toBeVisible();

    // Check metadata fields
    await expect(firstCard.locator("text=/档号:/")).toBeVisible();
    await expect(firstCard.locator("text=/责任者:/")).toBeVisible();

    // Check badge
    const badge = firstCard.locator(".badge");
    if (await badge.isVisible()) {
      await expect(badge).toBeVisible();
    }
  });

  test("should navigate to archive detail page", async ({ page }) => {
    await page.fill('input[placeholder*="关键词"]', "工作总结");
    await page.press('input[placeholder*="关键词"]', "Enter");
    await page.waitForSelector(".search-result-card");

    // Click on first result title
    const firstTitle = page.locator(".search-result-card a").first();
    await firstTitle.click();

    // Wait for navigation to detail page
    await page.waitForURL("**/archives/**", { timeout: 5000 });

    // Verify we're on detail page
    const url = page.url();
    expect(url).toMatch(/\/archives\/[^/]+$/);
  });

  test("should show loading state during search", async ({ page }) => {
    // Type query but don't submit yet
    await page.fill('input[placeholder*="关键词"]', "test query");

    // Click search button
    await page.click('button:has-text("搜索")');

    // Check for loading indicator
    const loader = page.locator('[data-testid="search-loading"]');
    if (await loader.isVisible({ timeout: 100 })) {
      await expect(loader).toBeVisible();
      await expect(loader).not.toBeVisible({ timeout: 5000 });
    }
  });

  test("should handle special characters in search", async ({ page }) => {
    const specialQuery = "测试 & 搜索 (2024)";
    await page.fill('input[placeholder*="关键词"]', specialQuery);
    await page.press('input[placeholder*="关键词"]', "Enter");

    // Should not error
    await page.waitForTimeout(2000);

    // Either results or empty state should be shown
    const hasResults = (await page.locator(".search-result-card").count()) > 0;
    const hasEmptyState = await page.locator("text=未找到相关档案").isVisible();

    expect(hasResults || hasEmptyState).toBe(true);
  });

  test("should persist filters across pagination", async ({ page }) => {
    await page.fill('input[placeholder*="关键词"]', "档案");
    await page.press('input[placeholder*="关键词"]', "Enter");
    await page.waitForSelector(".search-result-card");

    // Apply a filter
    const tagChips = page.locator(".tag-chip");
    const count = await tagChips.count();

    if (count > 0) {
      await tagChips.first().click();
      await page.waitForTimeout(500);

      // Note the current filter
      const activeFilter = await page.locator("text=/标签:/").textContent();

      // Navigate to next page
      const nextPageButton = page.locator('button:has-text("下一页")');
      if (!(await nextPageButton.isDisabled())) {
        await nextPageButton.click();
        await page.waitForTimeout(500);

        // Filter should still be active
        await expect(page.locator("text=/标签:/")).toBeVisible();
      }
    }
  });

  test("should reset to page 1 when changing filters", async ({ page }) => {
    // Go to page 2 first
    await page.fill('input[placeholder*="关键词"]', "档案");
    await page.press('input[placeholder*="关键词"]', "Enter");
    await page.waitForSelector(".search-result-card");

    const nextPageButton = page.locator('button:has-text("下一页")');
    if (!(await nextPageButton.isDisabled())) {
      await nextPageButton.click();
      await page.waitForTimeout(500);

      // Now apply a filter
      const tagChips = page.locator(".tag-chip");
      const count = await tagChips.count();

      if (count > 0) {
        await tagChips.first().click();
        await page.waitForTimeout(1000);

        // Should be back on page 1
        const url = page.url();
        expect(url).toContain("page=1");
      }
    }
  });

  test("should display error state on search failure", async ({ page }) => {
    // Mock a failed search by intercepting the API
    await page.route("**/api/search**", (route) =>
      route.fulfill({
        status: 500,
        json: { error: "搜索服务暂时不可用" },
      })
    );

    await page.fill('input[placeholder*="关键词"]', "test");
    await page.press('input[placeholder*="关键词"]', "Enter");

    // Should show error message
    await expect(page.locator("text=/搜索失败/")).toBeVisible();
  });

  test("should have accessible search input", async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="关键词"]');

    // Check accessibility attributes
    await expect(searchInput).toHaveAttribute("type", "text");
    await expect(searchInput).toHaveAttribute("placeholder");

    // Check keyboard navigation
    await searchInput.focus();
    await expect(searchInput).toBeFocused();

    // Tab to search button
    await page.keyboard.press("Tab");
    const submitButton = page.locator('button[type="submit"], button:has-text("搜索")');
    await expect(submitButton).toBeFocused();
  });
});

describe("Search Authentication E2E", () => {
  test("should redirect to login if not authenticated", async ({ page }) => {
    await page.goto("http://localhost:3000/search");
    await page.waitForURL("**/login", { timeout: 5000 });
  });

  test("should stay on search page after login", async ({ page }) => {
    // Try to access search page (will redirect to login)
    await page.goto("http://localhost:3000/search");

    // Login
    await page.fill('input[id="username"]', "admin");
    await page.fill('input[id="password"]', "admin123");
    await page.click('button[type="submit"]');

    // Should be redirected to search page
    await page.waitForURL("**/search", { timeout: 5000 });
    await expect(page.locator("h1")).toContainText("档案搜索");
  });
});
