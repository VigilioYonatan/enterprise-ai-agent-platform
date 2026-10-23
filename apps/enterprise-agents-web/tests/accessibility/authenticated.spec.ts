import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('authenticated dashboard has no detectable WCAG A/AA violations', async ({
  page,
}) => {
  const user = process.env.E2E_TEST_USER;
  const password = process.env.E2E_TEST_PASSWORD;
  if (!user || !password)
    throw new Error(
      'Authenticated a11y E2E requires real isolated test credentials',
    );
  await page.goto('/');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.locator('#username').fill(user);
  await page.locator('#password').fill(password);
  await page.locator('#kc-login').click();
  await expect(page).toHaveURL(/\/app/);
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(result.violations).toEqual([]);
});
