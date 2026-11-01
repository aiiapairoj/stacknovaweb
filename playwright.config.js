const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests/browser',
    workers: 1,
    retries: 0,
    reporter: 'list',
    use: {
        baseURL: process.env.BASE_URL || 'http://127.0.0.1:8097',
        channel: 'chrome',
        headless: true,
        screenshot: 'only-on-failure'
    }
});
