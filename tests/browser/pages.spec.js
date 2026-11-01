const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const publishedEntry = process.env.PAGES_URL || pathToFileURL(path.resolve('index.html')).href;

test('published static entry switches Thai and English without a PHP backend', async ({ page }) => {
    await page.goto(publishedEntry);
    await page.locator('[data-language="th"]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'th');
    await expect(page.locator('h1')).toContainText('ดีไซน์');
    expect(await page.evaluate(() => typeof window.StackNovaI18n)).toBe('object');
    const scripts = await page.locator('script[src]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('src')));
    expect(scripts).toContain('assets/translations.js');
    expect(scripts).toContain('assets/i18n.js');
    expect(scripts).toContain('assets/app.js');
    await page.locator('[data-language="en"]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('h1')).toHaveText('Good design.Great business.');
});
