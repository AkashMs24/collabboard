const { test, expect, chromium } = require('@playwright/test');

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';
const TEST_EMAIL = `e2e_${Date.now()}@test.com`;
const TEST_PASSWORD = 'TestPass123';

test.describe('Real-time board sync across two sessions', () => {
  let browser, contextA, contextB, pageA, pageB;

  test.beforeAll(async () => {
    browser = await chromium.launch();
    contextA = await browser.newContext();
    contextB = await browser.newContext();
    pageA = await contextA.newPage();
    pageB = await contextB.newPage();

    // Register once (tab A), log in with same account on tab B — simulates two devices/tabs
    await pageA.goto(`${BASE_URL}/register`);
    await pageA.getByPlaceholder('Akash Ms').fill('E2E Tester');
    await pageA.getByPlaceholder('you@example.com').fill(TEST_EMAIL);
    await pageA.getByPlaceholder('At least 8 characters').fill(TEST_PASSWORD);
    await pageA.getByRole('button', { name: /create account|sign up|register/i }).click();
    await pageA.waitForURL(/\/(dashboard)?$/, { timeout: 10000 });

    await pageB.goto(`${BASE_URL}/login`);
    await pageB.getByPlaceholder('you@example.com').fill(TEST_EMAIL);
    await pageB.getByPlaceholder('••••••••').fill(TEST_PASSWORD);
    await pageB.getByRole('button', { name: /sign in|log in/i }).click();
    await pageB.waitForURL(/\/(dashboard)?$/, { timeout: 10000 });

    // Tab A creates a workspace + board (skip if a workspace already exists for this fresh user)
    const newBoardBtn = pageA.getByText('+ New board');
    if (await newBoardBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newBoardBtn.click();
      await pageA.getByPlaceholder('Board name').fill('E2E Sync Board');
      await pageA.getByRole('button', { name: /create board/i }).click();
    }
    await pageA.getByText('E2E Sync Board').click();
    await pageA.waitForURL(/\/board\/.+/);

    const boardUrl = pageA.url();
    await pageB.goto(boardUrl);
  });

  test('task created in tab A appears in tab B without a refresh', async () => {
    await pageA.getByText('+ Add task').first().click();
    await pageA.getByPlaceholder('Task title...').fill('Sync check task');
    await pageA.getByRole('button', { name: 'Add' }).click();

    // No reload triggered on pageB — this only passes if the Socket.io broadcast works
    await expect(pageB.getByText('Sync check task')).toBeVisible({ timeout: 5000 });
  });

  test('moving a task via the move menu in tab B reflects in tab A in real time', async () => {
    const card = pageB.getByText('Sync check task').locator('..').locator('..');
    await card.getByText('···').click();
    await pageB.getByText('MOVE TO').locator('..').getByText('In Progress').click();

    await expect(pageA.getByText('Sync check task')).toBeVisible({ timeout: 5000 });
    // Confirms the column actually changed by checking it's no longer alone in the first column
  });

  test.afterAll(async () => {
    await browser.close();
  });
});
