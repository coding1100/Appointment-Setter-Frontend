const { chromium } = require('@playwright/test');

const backend = 'http://127.0.0.1:8004';
const siteBase = 'http://127.0.0.1:8090';
const accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxZWFhMGY2OC02NDZmLTQ0MGYtYmM3MC04ZWZlMmQ1YzBiMzQiLCJleHAiOjE3NzU4MDI2NDUsInR5cGUiOiJhY2Nlc3MifQ.4ogZKpAFScqRE8yQ5eB_xpzO1d9duy78mc-u4rpkYi4';
const embedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MDk2YTBjZC1mNzRmLTQ4Y2YtYjE5Yi1lZjFkYjVlMzczNDgiLCJ0eXBlIjoiY2hhdGJvdF9lbWJlZCIsIm9yaWdpbiI6Imh0dHA6Ly8xMjcuMC4wLjE6ODA5MCIsInZlciI6MSwiaWF0IjoxNzc1ODAyMjY5LCJleHAiOjE3NzU4MDk0Njl9.St1FBRPAYSKMz926HBZOTYsPqqyeleLkSbC0wyWRHWw';
const chatbotId = '4096a0cd-f74f-48cf-b19b-ef1db5e37348';

async function operatorApi(path, options = {}) {
  const response = await fetch(`${backend}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`Operator API ${path} failed: ${response.status} ${JSON.stringify(data)}`);
  return data;
}

async function widgetApi(path, payload) {
  const response = await fetch(`${backend}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`Widget API ${path} failed: ${response.status} ${JSON.stringify(data)}`);
  return data;
}

async function pollForSession(runId) {
  for (let i = 0; i < 20; i += 1) {
    const data = await operatorApi('/api/v1/chatbot-agents/live-chats?limit=100', { method: 'GET' });
    const match = (data || []).find((entry) =>
      entry?.session?.chatbot_id === chatbotId &&
      entry?.session?.status === 'open' &&
      String(entry?.session?.page_url || '').includes(runId)
    );
    if (match) return match.session;
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  throw new Error('Timed out waiting for live chat session');
}

async function pollForBotReply(sessionId, timeoutMs = 25000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const detail = await operatorApi(`/api/v1/chatbot-agents/live-chats/${sessionId}`, { method: 'GET' });
    const botReply = (detail.messages || []).find((message) => message.sender_type === 'bot' && /pricing|help|human|back/i.test(message.content || ''));
    if (botReply) return botReply;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return null;
}

(async () => {
  const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const siteUrl = `${siteBase}/?run=${runId}`;
  const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const page = await browser.newPage();
  const result = { runId, widgetLoaded: false, sessionCreated: false, visitorMessageObserved: false, takeoverObserved: false, operatorMessageObserved: false, releaseObserved: false, botReplyObservedAfterRelease: false };

  try {
    await page.goto(siteUrl, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Chat with SamAI' }).click();
    const frame = page.frameLocator('iframe[title="Chatbot Panel"]');
    await frame.locator('#chatbot-input').waitFor({ state: 'visible', timeout: 20000 });
    await frame.locator('#chatbot-title').waitFor({ state: 'visible', timeout: 20000 });
    result.widgetLoaded = true;

    const session = await pollForSession(runId);
    result.sessionCreated = true;
    result.sessionId = session.id;
    result.visitorSessionId = session.visitor_session_id;

    await widgetApi(`/api/v1/chatbot-embed/sessions/${session.id}/messages?token=${encodeURIComponent(embedToken)}&embed_origin=${encodeURIComponent('http://127.0.0.1:8090')}`, {
      visitor_session_id: session.visitor_session_id,
      message: 'I need a human to help with pricing.',
    });
    await frame.locator('.message.visitor').filter({ hasText: 'I need a human to help with pricing.' }).waitFor({ timeout: 15000 });
    result.visitorMessageObserved = true;

    await operatorApi(`/api/v1/chatbot-agents/live-chats/${session.id}/takeover`, { method: 'POST', body: '{}' });
    await frame.locator('#chatbot-status').filter({ hasText: /Live with|team member joined/i }).waitFor({ timeout: 15000 });
    await frame.locator('.message.system').filter({ hasText: 'A team member joined the chat' }).waitFor({ timeout: 15000 });
    result.takeoverObserved = true;

    await operatorApi(`/api/v1/chatbot-agents/live-chats/${session.id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content: 'Hi, this is the human operator taking over now.' }),
    });
    await frame.locator('.message.human').filter({ hasText: 'Hi, this is the human operator taking over now.' }).waitFor({ timeout: 15000 });
    result.operatorMessageObserved = true;

    await operatorApi(`/api/v1/chatbot-agents/live-chats/${session.id}/release`, { method: 'POST', body: '{}' });
    await frame.locator('#chatbot-status').filter({ hasText: 'Bot is active' }).waitFor({ timeout: 15000 });
    await frame.locator('.message.system').filter({ hasText: 'The chatbot is back in the conversation.' }).waitFor({ timeout: 15000 });
    result.releaseObserved = true;

    await widgetApi(`/api/v1/chatbot-embed/sessions/${session.id}/messages?token=${encodeURIComponent(embedToken)}&embed_origin=${encodeURIComponent('http://127.0.0.1:8090')}`, {
      visitor_session_id: session.visitor_session_id,
      message: 'Thanks, is the bot back now?',
    });
    await frame.locator('.message.visitor').filter({ hasText: 'Thanks, is the bot back now?' }).waitFor({ timeout: 15000 });

    const botReply = await pollForBotReply(session.id);
    if (botReply) {
      result.botReplyObservedAfterRelease = true;
      result.botReplyPreview = botReply.content;
    }

    const finalDetail = await operatorApi(`/api/v1/chatbot-agents/live-chats/${session.id}`, { method: 'GET' });
    result.finalSession = {
      status: finalDetail.session.status,
      control_mode: finalDetail.session.control_mode,
      assigned_operator_name: finalDetail.session.assigned_operator_name,
      last_message_preview: finalDetail.session.last_message_preview,
      message_count: (finalDetail.messages || []).length,
    };

    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    result.error = String(error && error.message ? error.message : error);
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
