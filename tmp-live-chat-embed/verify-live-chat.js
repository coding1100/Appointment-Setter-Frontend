const { chromium } = require('playwright');

const backend = 'http://localhost:8000';
const siteUrl = 'http://127.0.0.1:8090';
const accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxZWFhMGY2OC02NDZmLTQ0MGYtYmM3MC04ZWZlMmQ1YzBiMzQiLCJleHAiOjE3NzU4MDI2NDUsInR5cGUiOiJhY2Nlc3MifQ.4ogZKpAFScqRE8yQ5eB_xpzO1d9duy78mc-u4rpkYi4';
const chatbotId = '4096a0cd-f74f-48cf-b19b-ef1db5e37348';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function api(path, options = {}) {
  const response = await fetch(`${backend}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_error) {
    data = text;
  }

  if (!response.ok) {
    throw new Error(`API ${path} failed: ${response.status} ${JSON.stringify(data)}`);
  }

  return data;
}

async function pollForSession(timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const data = await api('/api/v1/chatbot-agents/live-chats?limit=100', { method: 'GET' });
    const match = (data || []).find((entry) => entry?.session?.chatbot_id === chatbotId && entry?.session?.status === 'open');
    if (match) return match.session;
    await sleep(750);
  }
  throw new Error('Timed out waiting for live chat session to appear');
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  });
  const page = await browser.newPage();
  const result = {
    pageLoaded: false,
    launcherOpened: false,
    widgetInitialized: false,
    sessionId: null,
    visitorMessageSent: false,
    takeoverStatusObserved: false,
    operatorMessageObserved: false,
    releaseStatusObserved: false,
    releaseSystemMessageObserved: false,
    postReleaseVisitorMessageSent: false,
    botReplyObservedAfterRelease: false,
    transcriptSample: [],
  };

  try {
    await page.goto(siteUrl, { waitUntil: 'networkidle' });
    result.pageLoaded = true;

    const launcherButton = page.locator('button', { hasText: 'Chat with SamAI' });
    await launcherButton.waitFor({ timeout: 15000 });
    await launcherButton.click();
    result.launcherOpened = true;

    const frameHandle = await page.waitForSelector('iframe[title="Chatbot Panel"]', { timeout: 15000 });
    const frame = await frameHandle.contentFrame();
    if (!frame) throw new Error('Chatbot panel iframe was not available');

    await frame.waitForSelector('#chatbot-input:not([disabled])', { timeout: 20000 });
    await frame.waitForFunction(() => {
      const title = document.getElementById('chatbot-title');
      return title && title.textContent && title.textContent !== 'Loading chatbot...';
    }, { timeout: 20000 });
    result.widgetInitialized = true;

    await frame.fill('#chatbot-input', 'I need a human to help with pricing.');
    await frame.click('#chatbot-send');
    await frame.waitForFunction(() => document.body.innerText.includes('I need a human to help with pricing.'), { timeout: 15000 });
    result.visitorMessageSent = true;

    const session = await pollForSession();
    result.sessionId = session.id;

    const detailBeforeTakeover = await api(`/api/v1/chatbot-agents/live-chats/${session.id}`, { method: 'GET' });
    result.transcriptSample = (detailBeforeTakeover.messages || []).slice(-3).map((message) => ({
      sender_type: message.sender_type,
      content: message.content,
    }));

    const takeover = await api(`/api/v1/chatbot-agents/live-chats/${session.id}/takeover`, { method: 'POST', body: '{}' });
    result.takeoverControlMode = takeover.session.control_mode;

    await frame.waitForFunction(() => {
      const status = document.getElementById('chatbot-status');
      return status && /Live with|team member joined/i.test(status.textContent || '');
    }, { timeout: 15000 });
    result.takeoverStatusObserved = true;

    await api(`/api/v1/chatbot-agents/live-chats/${session.id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content: 'Hi, this is the human operator taking over now.' }),
    });
    await frame.waitForFunction(() => document.body.innerText.includes('Hi, this is the human operator taking over now.'), { timeout: 15000 });
    result.operatorMessageObserved = true;

    const release = await api(`/api/v1/chatbot-agents/live-chats/${session.id}/release`, { method: 'POST', body: '{}' });
    result.releaseControlMode = release.session.control_mode;

    await frame.waitForFunction(() => {
      const status = document.getElementById('chatbot-status');
      return status && /Bot is active/i.test(status.textContent || '');
    }, { timeout: 15000 });
    result.releaseStatusObserved = true;

    await frame.waitForFunction(() => document.body.innerText.includes('The chatbot is back in the conversation.'), { timeout: 15000 });
    result.releaseSystemMessageObserved = true;

    await frame.fill('#chatbot-input', 'Thanks, is the bot back now?');
    await frame.click('#chatbot-send');
    await frame.waitForFunction(() => document.body.innerText.includes('Thanks, is the bot back now?'), { timeout: 15000 });
    result.postReleaseVisitorMessageSent = true;

    const started = Date.now();
    while (Date.now() - started < 25000) {
      const detail = await api(`/api/v1/chatbot-agents/live-chats/${session.id}`, { method: 'GET' });
      const botReply = (detail.messages || []).find((message) => message.sender_type === 'bot' && /bot back now|pricing|help|human/i.test(message.content || ''));
      if (botReply) {
        result.botReplyObservedAfterRelease = true;
        result.botReplyPreview = botReply.content;
        break;
      }
      await sleep(1000);
    }

    const finalDetail = await api(`/api/v1/chatbot-agents/live-chats/${session.id}`, { method: 'GET' });
    result.finalSession = {
      status: finalDetail.session.status,
      control_mode: finalDetail.session.control_mode,
      assigned_operator_name: finalDetail.session.assigned_operator_name,
      last_message_preview: finalDetail.session.last_message_preview,
    };
    result.finalMessageCount = (finalDetail.messages || []).length;

    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('E2E verification failed:', error);
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
