import { test, expect, Page, APIRequestContext } from 'playwright-test-coverage';

const serviceUrl = 'http://localhost:3000';

function uniqueId() {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
}

async function registerUser(request: APIRequestContext, name: string) {
  const email = `${name.replace(/\s/g, '')}@jwt.com`;
  const res = await request.post(`${serviceUrl}/api/auth`, { data: { name, email, password: 'pw' } });
  expect(res.ok()).toBeTruthy();
  return { name, email };
}

async function openUsersTab(page: Page) {
  await page.goto('/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('admin');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'Admin' }).click();
  await page.getByRole('tab', { name: 'Users' }).click();
}

async function search(page: Page, text: string) {
  await page.getByRole('textbox', { name: 'Filter users' }).fill(text);
  await page.getByRole('button', { name: 'Search' }).click();
}

function userRows(page: Page) {
  return page.getByRole('table', { name: 'Users' }).locator('tbody tr');
}

test('toggle between franchises and users', async ({ page }) => {
  await openUsersTab(page);
  await expect(page.getByRole('table', { name: 'Users' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Franchise' })).toBeHidden();

  await page.getByRole('tab', { name: 'Franchises' }).click();
  await expect(page.getByRole('table', { name: 'Users' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Add Franchise' })).toBeVisible();
});

test('search users by name', async ({ page, request }) => {
  const user = await registerUser(request, `search${uniqueId()}`);
  await openUsersTab(page);
  await search(page, user.name);
  await expect(userRows(page)).toHaveCount(1);
  await expect(userRows(page).first()).toContainText(user.email);
  await expect(userRows(page).first()).toContainText('diner');
});

test('prev on first page stays on page 1', async ({ page }) => {
  const requestedPages: string[] = [];
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (url.pathname === '/api/user') requestedPages.push(url.searchParams.get('page') ?? '');
  });

  await openUsersTab(page);
  await expect(userRows(page).first()).toBeVisible();
  const firstRow = await userRows(page).first().textContent();

  await page.getByRole('button', { name: 'Prev' }).click();
  await page.getByRole('button', { name: 'Prev' }).click();

  await expect(userRows(page).first()).toHaveText(firstRow ?? '');
  expect(requestedPages).not.toContain('0');
});

test('next does not advance past the last page, delete steps back', async ({ page, request }) => {
  test.setTimeout(20000);
  const prefix = `page${uniqueId()}`;
  for (let i = 0; i < 11; i++) {
    await registerUser(request, `${prefix}x${i}`);
  }

  await openUsersTab(page);
  await search(page, prefix);
  await expect(userRows(page)).toHaveCount(10);

  await page.getByRole('button', { name: 'Next' }).click();
  await expect(userRows(page)).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
  await expect(userRows(page)).toHaveCount(1);

  const lastName = (await userRows(page).first().locator('td').first().textContent()) ?? '';
  await page.getByRole('button', { name: `Delete ${lastName}` }).click();
  await page.getByRole('textbox', { name: 'Confirm user name' }).fill(lastName);
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();

  // Page 2 is now empty, so the table steps back to page 1 instead of showing nothing.
  await expect(userRows(page)).toHaveCount(10);
  await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
});

test('delete requires exact name and can be cancelled', async ({ page, request }) => {
  const user = await registerUser(request, `Cancel${uniqueId()}`);
  await openUsersTab(page);
  await search(page, user.name);

  await page.getByRole('button', { name: `Delete ${user.name}` }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText(user.email);
  const deleteButton = dialog.getByRole('button', { name: 'Delete' });
  await expect(deleteButton).toBeDisabled();

  await page.getByRole('textbox', { name: 'Confirm user name' }).fill(user.name.toLowerCase());
  await expect(deleteButton).toBeDisabled();
  await page.getByRole('textbox', { name: 'Confirm user name' }).fill(user.name);
  await expect(deleteButton).toBeEnabled();

  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
  await expect(userRows(page)).toHaveCount(1);
});

test('delete user after confirming name', async ({ page, request }) => {
  const user = await registerUser(request, `doomed${uniqueId()}`);
  await openUsersTab(page);
  await search(page, user.name);

  await page.getByRole('button', { name: `Delete ${user.name}` }).click();
  await page.getByRole('textbox', { name: 'Confirm user name' }).fill(user.name);
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();

  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(userRows(page)).toHaveCount(0);
});
