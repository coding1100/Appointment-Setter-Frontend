const { chromium } = require('@playwright/test');

(async () => {
  const runId = `debug-${Date.now()}`;
  const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const page = await browser.newPage();
  page.on('response', async (resp) => {
    const url = resp.url();
    if (url.includes('/chatbot-embed/config') || url.includes('/chatbot-embed/sessions') || url.includes('/messages')) {
      let text = '';
      try { text = await resp.text(); } catch {}
      console.log('RESP', resp.status(), url, text.slice(0, 500));
    }
  });
  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('/chatbot-embed/') || url.includes('/messages')) {
      console.log('REQ', req.method(), url, req.postData() || '');
    }
  });
  await page.goto(`http://127.0.0.1:8090/?run=${runId}`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Chat with SamAI' }).click();
  const frame = page.frameLocator('iframe[title="Chatbot Panel"]');
  await frame.locator('#chatbot-input').waitFor({ state: 'visible' });
  await page.waitForTimeout(5000);
  await frame.locator('#chatbot-input').fill('I need a human to help with pricing.');
  await frame.locator('#chatbot-send').click();
  await page.waitForTimeout(8000);
  await browser.close();
})();
