import { expect, test } from '@playwright/test';

test('home provides an accessible login entry', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /agent workflows you can trust/i }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
});
