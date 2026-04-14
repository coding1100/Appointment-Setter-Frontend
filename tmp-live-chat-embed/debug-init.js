const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const page = await browser.newPage();
  page.on('console', (msg) => console.log('PAGE-CONSOLE', msg.type(), msg.text()));
  page.on('response', async (resp) => {
    const url = resp.url();
    if (url.includes('/chatbot-embed/config') || url.includes('/chatbot-embed/sessions')) {
      let text = '';
      try { text = await resp.text(); } catch {}
      console.log('RESP', resp.status(), url, text.slice(0, 500));
    }
  });
  page.on('pageerror', (err) => console.log('PAGE-ERROR', err.message));
  await page.goto('http://127.0.0.1:8090', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Chat with SamAI' }).click();
  await page.waitForTimeout(20000);
  await browser.close();
})();
