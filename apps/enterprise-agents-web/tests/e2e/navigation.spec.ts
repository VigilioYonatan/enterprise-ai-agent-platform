import { expect, test } from '@playwright/test';

test.describe('public shell and access control', () => {
  test('landing entry is keyboard-operable', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Agent workflows',
    );
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(['A', 'BUTTON']).toContain(focused);
  });
  test('private screens do not expose data without a session', async ({
    page,
  }) => {
    await page.goto('/app/runs');
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await expect(page.locator('main')).not.toContainText('Recent executions');
  });
  test('unknown routes return to public landing', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
