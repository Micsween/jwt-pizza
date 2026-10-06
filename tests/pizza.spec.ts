import { test, expect } from 'playwright-test-coverage';


test('home page', async ({ page }) => {
  await page.goto('/');

  expect(await page.title()).toBe('JWT Pizza');

});
test('purchase with login', async ({ page }) => {
    await page.route('**/api/order', async (route) => {
        if (route.request().method() !== 'POST') {
            return route.fallback();
        }
        const orderReq = route.request().postDataJSON();
        const orderRes = { order: { ...orderReq, id: 23 }, jwt: 'eyJpYXQ' };
        await route.fulfill({ json: orderRes });
    });
    const payload =  { vendor: { id: 'test' }, diner: { name: 'pizza diner' } } 
    await page.route('**/api/order/verify', async (route) => {
        expect(route.request().postDataJSON()).toEqual({ jwt: 'eyJpYXQ' });
        const verifyRes = { message: 'valid', payload : payload};
        await route.fulfill({ json: verifyRes });
    });

    await page.goto('/');
    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('admin');
    await page.getByRole('button', { name: 'Login' }).click();
    await page.getByRole('button', { name: 'Order now' }).click();
    await page.getByRole('link', { name: 'Image Description Margarita' }).click();
    await page.getByRole('link', { name: 'Image Description Crusty A' }).click();
    await page.locator('div').filter({ hasText: /^choose storeSLC$/ }).click();
    await page.getByRole('combobox').selectOption('1');
    await page.getByRole('button', { name: 'Checkout' }).click();
    await page.getByRole('button', { name: 'Pay now' }).click();

    await expect(page.getByRole('heading', { name: 'Here is your JWT Pizza!' })).toBeVisible();
    await expect(page.getByRole('main')).toContainText('order ID: 23');
    await expect(page.getByRole('main')).toContainText('pie count: 2');
    await expect(page.getByRole('main')).toContainText('0.007 ₿');
    await expect(page.getByText('eyJpYXQ')).toBeVisible();

    // The verify dialog shows the mocked factory response.
    await page.getByRole('button', { name: 'Verify' }).click();
    await expect(page.getByRole('heading', { name: 'JWT Pizza - valid' })).toBeVisible();
    await expect(page.locator('#hs-jwt-modal')).toContainText('pizza diner');
    
});
test('view franchise page as non-franchisee', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('navigation', { name: 'Global' }).getByRole('link', { name: 'Franchise' }).click();
    await expect(page.getByRole('main')).toContainText("Owning a franchise with JWT Pizza can be highly profitable. With our proven business model and strong brand recognition, you can expect to generate significant revenue. Our profit forecasts show consistent growth year after year, making it a lucrative investment opportunity.")
});


test('Open and close store as franchisee', async ({ page }) => {
  //f@jwt.com", "password":"franchisee"await page.getByRole('link', { name: 'Login', exact: true }).click();
  await page.goto('/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('f@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('franchisee');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('link', { name: 'Logout' })).toBeVisible();
  await page.getByRole('navigation', { name: 'Global' }).getByRole('link', { name: 'Franchise' }).click();
 
  await page.getByRole('button', { name: 'Create store' }).click();
  await page.getByRole('textbox', { name: 'store name' }).fill('leonskennedy');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByRole('row', { name: 'leonskennedy 0 ₿ Close' })).toContainText('0 ₿');
  await page.getByRole('row', { name: 'leonskennedy 0 ₿ Close' }).getByRole('button').click();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('button', { name: 'Create store' })).toBeVisible();   
  await expect(page.getByRole('row', { name: 'leonskennedy 0 ₿ Close' })).toHaveCount(0);

});

test('create and close franchise as admin', async ({ page }) => {
  const franchiseName = `test-franchise-${Date.now()}`;
  const franchiseRow = page.getByRole('row').filter({ has: page.getByRole('cell', { name: franchiseName, exact: true }) });

  async function returnToDashboardAndFilter(action: () => Promise<void>) {
    const dashboardLoaded = page.waitForResponse((r) => r.url().includes('/api/franchise?page=0&limit=3'));
    await action();
    await dashboardLoaded;
    await page.getByPlaceholder('Filter franchises').fill(franchiseName);
    await page.getByRole('button', { name: 'Submit' }).click();
  }

  await page.goto('/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('admin');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'Admin' }).click();
  await expect(page.getByRole('heading', { name: "Mama Ricci's kitchen" })).toBeVisible();

  await page.getByRole('button', { name: 'Add Franchise' }).click();
  await page.getByRole('textbox', { name: 'franchise name' }).fill(franchiseName);
  await page.getByRole('textbox', { name: 'franchisee admin email' }).fill('f@jwt.com');
  await returnToDashboardAndFilter(() => page.getByRole('button', { name: 'Create' }).click());
  await expect(franchiseRow).toContainText('pizza franchisee');

  await franchiseRow.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('main')).toContainText(`Are you sure you want to close the ${franchiseName} franchise?`);
  await returnToDashboardAndFilter(() => page.getByRole('button', { name: 'Close' }).click());
  await expect(page.getByRole('button', { name: 'Add Franchise' })).toBeVisible();
  await expect(franchiseRow).toHaveCount(0);
});
