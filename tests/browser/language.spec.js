const { test, expect } = require('@playwright/test');
const crypto = require('node:crypto');

async function selectThai(page) {
    await page.locator('[data-language="th"]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'th');
}

test('Thai/EN translates page, metadata, accessibility labels and persists preference', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await selectThai(page);
    await expect(page.locator('h1')).toContainText('ดีไซน์');
    await expect(page.locator('.nav-login')).toHaveText('เข้าสู่ระบบ');
    await expect(page.locator('#serviceType option').first()).toContainText('เว็บไซต์');
    await expect(page.locator('#chatInput')).toHaveAttribute('placeholder', /[ก-๙]/);
    await expect(page.locator('#chatToggle')).toHaveAttribute('aria-label', /[ก-๙]/);
    expect(await page.title()).toMatch(/[ก-๙]/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /[ก-๙]/);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'th');
    await expect(page.locator('[data-language="th"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('[data-language="en"]').click();
    await expect(page.locator('h1')).toHaveText('Good design.Great business.');
    await expect(page.locator('.nav-login')).toHaveText('Log in');
    await expect(page.locator('#serviceType')).toHaveValue('website');
    await expect(page.locator('#chatInput')).toHaveAttribute('placeholder', 'Ask us something…');
});

test('Thai chat handles Thai topics and never translates or interprets user input', async ({ page }) => {
    let alerts = 0;
    page.on('dialog', async (dialog) => {
        alerts += 1;
        await dialog.dismiss();
    });
    await page.goto('/');
    await selectThai(page);
    await page.locator('#chatToggle').click();
    const input = page.locator('#chatInput');
    for (const message of ['ราคาเว็บไซต์', 'Log in', '<script>alert(1)</script>', '" onmouseover="alert(1)']) {
        await input.fill(message);
        await page.locator('#chatForm button').click();
        await expect(input).toHaveValue('');
        await expect(page.locator('.message.user').last()).toHaveText(message);
    }
    await expect(page.locator('.message:not(.user)').first()).toContainText('สวัสดี');
    await expect(page.locator('.message:not(.user)').nth(1)).toContainText('35,000');
    await expect(page.locator('.message:not(.user)').nth(1)).toContainText('เว็บไซต์');
    await expect(page.locator('#messages script')).toHaveCount(0);
    await page.locator('#closeChat').click();
    await page.locator('[data-language="en"]').click();
    await expect(page.locator('.message.user').nth(1)).toHaveText('Log in');
    await expect(page.locator('.message:not(.user)').nth(1)).toContainText('Website planning starts');
    await page.reload();
    await expect(page.locator('.message.user')).toHaveCount(4);
    expect(alerts).toBe(0);
    expect(await page.evaluate(() => window.StackNovaI18n.setLanguage('<script>alert(1)</script>'))).toBe(false);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('Thai auth errors and saved estimates translate live without losing entered fields', async ({ page }) => {
    await page.goto('/');
    await selectThai(page);
    await expect(page.locator('#messages')).toContainText('สวัสดี');
    await page.locator('.nav-login').click();
    const email = crypto.randomUUID() + '@example.test';
    await page.locator('#accountEmail').fill(email);
    await page.locator('#accountPassword').fill('Incorrect-password-for-test');
    await page.locator('#authForm button').click();
    await expect(page.locator('#authStatus')).toContainText('ไม่ถูกต้อง');
    await page.locator('#registerTab').click();
    await page.locator('#accountName').fill('Log in <img src=x onerror=alert(1)>');
    await page.locator('#accountPassword').fill('Language-test-only-password!47');
    await page.locator('#authDialog [data-close]').click();
    await page.locator('[data-language="en"]').click();
    await page.locator('.nav-login').click();
    await expect(page.locator('#accountEmail')).toHaveValue(email);
    await expect(page.locator('#accountName')).toHaveValue('Log in <img src=x onerror=alert(1)>');
    await page.locator('#authForm button').click();
    await expect(page.locator('#authStatus')).toContainText('Account created');
    await page.locator('#authDialog [data-close]').click();
    await page.locator('[data-language="th"]').click();
    await page.locator('.hero-actions [data-modal="estimate"]').click();
    await page.locator('#estimateForm button').click();
    await expect(page.locator('#estimateResult')).toContainText('35,000');
    await expect(page.locator('#estimateResult')).toContainText('บันทึก');
    await page.locator('#estimateDialog [data-close]').click();
    await page.locator('.nav-login').click();
    await expect(page.locator('#accountSummary')).toContainText('Log in <img src=x onerror=alert(1)>');
    await expect(page.locator('#accountSummary img')).toHaveCount(0);
    await page.locator('#historyButton').click();
    await expect(page.locator('#historyList')).toContainText('เว็บไซต์');
    await page.locator('#authDialog [data-close]').click();
    await page.locator('[data-language="en"]').click();
    await page.locator('.nav-login').click();
    await expect(page.locator('#historyList')).toContainText('website');
    await page.locator('#logoutButton').click();
    await expect(page.locator('#authStatus')).toContainText('logged out');
    await page.locator('#authDialog [data-close]').click();
    await selectThai(page);
    await expect(page.locator('#historyList')).toBeEmpty();
    await expect(page.locator('#estimateResult')).toBeEmpty();
});

test('invalid saved locale falls back and storage denial does not break the switch', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('stacknova.language', '<img src=x onerror=alert(1)>'));
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).not.toHaveAttribute('lang', /</);
    await selectThai(page);
    await page.evaluate(() => {
        Object.defineProperty(Storage.prototype, 'setItem', { value() { throw new Error('Denied'); } });
    });
    await page.locator('[data-language="en"]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

for (const width of [320, 390, 768, 1280]) {
    test(`Thai layout fits viewport ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto('/');
        await selectThai(page);
        await page.evaluate(() => document.fonts.ready);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        const header = await page.locator('header .wrap').boundingBox();
        const switcher = await page.locator('.language-switch').boundingBox();
        expect(switcher.x + switcher.width).toBeLessThanOrEqual(header.x + header.width + 1);
        await expect(page.locator('[data-language="en"]')).toBeVisible();
    });
}
