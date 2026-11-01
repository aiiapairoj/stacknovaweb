const { test, expect } = require('@playwright/test');
const crypto = require('node:crypto');

const password = 'Browser-test-only-password!47';

test('real UI: registration, persisted XSS, estimate, logout and login', async ({ page }) => {
    const pageErrors = [];
    let dialogs = 0;
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('dialog', async (dialog) => {
        dialogs += 1;
        await dialog.dismiss();
    });
    await page.goto('/');
    await expect(page.locator('#messages')).toContainText('Hello!');
    await page.locator('#chatToggle').click();
    const payloads = ['<script>alert(1)</script>', '" onmouseover="alert(1)', '<img src=x onerror="window.__xss=1">', 'Website pricing'];
    for (const payload of payloads) {
        await page.locator('#chatInput').fill(payload);
        await page.locator('#chatForm button').click();
        await expect(page.locator('#chatInput')).toHaveValue('');
        await expect(page.locator('.message.user').last()).toHaveText(payload);
    }
    await expect(page.locator('#messages script, #messages img')).toHaveCount(0);
    await page.reload();
    await expect(page.locator('.message.user')).toHaveCount(payloads.length);
    await expect(page.locator('#messages')).toContainText(payloads[0]);
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
    expect(dialogs).toBe(0);
    const email = crypto.randomUUID() + '@example.test';
    await page.locator('.nav-login').click();
    await page.locator('#registerTab').click();
    await page.locator('#accountName').fill('<script>alert(1)</script>');
    await page.locator('#accountEmail').fill(email);
    await page.locator('#accountPassword').fill(password);
    await page.locator('#authForm button').click();
    await expect(page.locator('#authStatus')).toContainText('Account created');
    await expect(page.locator('#accountSummary')).toContainText('<script>alert(1)</script>');
    await expect(page.locator('#accountSummary script')).toHaveCount(0);
    await page.locator('#authDialog [data-close]').click();
    await page.getByRole('button', { name: 'Get my free estimate', exact: true }).click();
    await page.locator('#estimateForm button').click();
    await expect(page.locator('#estimateResult')).toContainText('Saved:');
    await page.locator('#estimateDialog [data-close]').click();
    await page.locator('.nav-login').click();
    await page.locator('#historyButton').click();
    await expect(page.locator('#historyList')).toContainText('website');
    await page.locator('#logoutButton').click();
    await expect(page.locator('#authStatus')).toContainText('logged out');
    await expect(page.locator('#messages')).not.toContainText(payloads[0]);
    await page.locator('#loginTab').click();
    await page.locator('#accountEmail').fill(email);
    await page.locator('#accountPassword').fill(password);
    await page.locator('#authForm button').click();
    await expect(page.locator('#authStatus')).toContainText('signed in');
    await expect(page.locator('#messages')).toContainText(payloads[0]);
    await page.locator('#signedInPanel details summary').click();
    await page.locator('#deletePassword').fill(password);
    await page.locator('#deleteForm button').click();
    await expect(page.locator('#authStatus')).toContainText('permanently deleted');
    expect(dialogs).toBe(0);
    expect(pageErrors).toEqual([]);
});

test('network failure does not report a saved estimate', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#messages')).toContainText('Hello!');
    await page.route('**/api/estimates', (route) => route.abort());
    await page.getByRole('button', { name: 'Get my free estimate', exact: true }).click();
    await page.locator('#estimateForm button').click();
    await expect(page.locator('#estimateResult')).toContainText('Nothing has been confirmed saved');
    await expect(page.locator('#estimateForm button')).toBeEnabled();
});

test('mobile: chat stays fixed and back-to-top appears after hero', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.locator('#messages')).toContainText('Hello!');
    const before = await page.locator('#chatToggle').boundingBox();
    await page.locator('#chatToggle').click();
    expect(await page.locator('#chatToggle').boundingBox()).toEqual(before);
    await expect(page.locator('#backTop')).toBeHidden();
    await page.locator('#closeChat').click();
    await page.locator('#services').scrollIntoViewIfNeeded();
    await expect(page.locator('#backTop')).toBeVisible();
    const top = await page.locator('#backTop').boundingBox();
    const chat = await page.locator('#chatToggle').boundingBox();
    expect(Math.round(chat.x - top.x - top.width)).toBe(5);
    expect(Math.round(chat.y)).toBe(Math.round(top.y));
});
