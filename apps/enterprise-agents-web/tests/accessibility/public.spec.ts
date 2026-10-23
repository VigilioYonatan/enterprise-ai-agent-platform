import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('public landing has no automatic WCAG 2.2 A/AA violations', async ({
  page,
}) => {
  await page.goto('/');
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(result.violations).toEqual([]);
});
test('unauthenticated private screen has no automatic accessibility violations', async ({
  page,
}) => {
  await page.goto('/app/agents');
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(result.violations).toEqual([]);
});
