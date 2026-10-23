import { expect, test } from '@playwright/test';

/** Real Keycloak + backend + Postgres. Provision a verified test user in an isolated staging realm. */
test('a real verified user can log in and navigate the AgentOps console', async ({
  page,
}) => {
  const user = process.env.E2E_TEST_USER;
  const password = process.env.E2E_TEST_PASSWORD;
  if (!user || !password)
    throw new Error(
      'E2E_TEST_USER and E2E_TEST_PASSWORD required; never replace this with a fake session',
    );
  await page.goto('/');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/realms\/agentops\//);
  await page.locator('#username').fill(user);
  await page.locator('#password').fill(password);
  await page.locator('#kc-login').click();
  await expect(page).toHaveURL(/\/app/);
  await expect(
    page.getByRole('navigation', { name: 'Primary navigation' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Agents' }).click();
  await expect(page.getByRole('heading', { name: /agents/i })).toBeVisible();
  await page.getByRole('link', { name: 'Workflows' }).click();
  await expect(page.getByRole('heading', { name: /workflows/i })).toBeVisible();
});
