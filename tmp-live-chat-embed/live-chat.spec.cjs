const { test, expect } = require('@playwright/test');

const backend = 'http://127.0.0.1:8004';
const accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxZWFhMGY2OC02NDZmLTQ0MGYtYmM3MC04ZWZlMmQ1YzBiMzQiLCJleHAiOjE3NzU4MDI2NDUsInR5cGUiOiJhY2Nlc3MifQ.4ogZKpAFScqRE8yQ5eB_xpzO1d9duy78mc-u4rpkYi4';
const chatbotId = '4096a0cd-f74f-48cf-b19b-ef1db5e37348';

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
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new Error(`API ${path} failed: ${response.status} ${JSON.stringify(data)}`);
  return data;
}

async function pollForSession(runId) {
  for (let i = 0; i < 20; i += 1) {
    const data = await api('/api/v1/chatbot-agents/live-chats?limit=100', { method: 'GET' });
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

async function pollForMessage(sessionId, predicate, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const detail = await api(`/api/v1/chatbot-agents/live-chats/${sessionId}`, { method: 'GET' });
    const found = (detail.messages || []).find(predicate);
    if (found) return { detail, message: found };
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Timed out waiting for message in session ${sessionId}`);
}

test('live embed supports visitor chat, takeover, and release', async ({ page }) => {
  test.setTimeout(180000);
  const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const siteUrl = `http://127.0.0.1:8090/?run=${runId}`;

  await page.goto(siteUrl, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Chat with SamAI' }).click();

  const frame = page.frameLocator('iframe[title="Chatbot Panel"]');
  await expect(frame.locator('#chatbot-input')).toBeEnabled({ timeout: 20000 });
  await expect(frame.locator('#chatbot-title')).not.toHaveText('Loading chatbot...', { timeout: 20000 });

  await frame.locator('#chatbot-input').fill('I need a human to help with pricing.');
  await frame.locator('#chatbot-send').click();

  const session = await pollForSession(runId);
  test.info().annotations.push({ type: 'session-id', description: session.id });

  const visitorPersisted = await pollForMessage(
    session.id,
    (message) => message.sender_type === 'visitor' && message.content === 'I need a human to help with pricing.'
  );
  expect(visitorPersisted.message.content).toBe('I need a human to help with pricing.');

  const takeover = await api(`/api/v1/chatbot-agents/live-chats/${session.id}/takeover`, { method: 'POST', body: '{}' });
  expect(takeover.session.control_mode).toBe('human');

  await expect(frame.locator('#chatbot-status')).toContainText(/Live with|team member joined/i, { timeout: 15000 });
  await expect(frame.locator('.message.system')).toContainText('A team member joined the chat', { timeout: 15000 });

  await api(`/api/v1/chatbot-agents/live-chats/${session.id}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content: 'Hi, this is the human operator taking over now.' }),
  });
  await expect(frame.locator('.message.human')).toContainText('Hi, this is the human operator taking over now.', { timeout: 15000 });

  const release = await api(`/api/v1/chatbot-agents/live-chats/${session.id}/release`, { method: 'POST', body: '{}' });
  expect(release.session.control_mode).toBe('bot');

  await expect(frame.locator('#chatbot-status')).toContainText('Bot is active', { timeout: 15000 });
  await expect(frame.locator('.message.system')).toContainText('The chatbot is back in the conversation.', { timeout: 15000 });

  await frame.locator('#chatbot-input').fill('Thanks, is the bot back now?');
  await frame.locator('#chatbot-send').click();
  const secondVisitorMessage = await pollForMessage(
    session.id,
    (message) => message.sender_type === 'visitor' && message.content === 'Thanks, is the bot back now?'
  );
  expect(secondVisitorMessage.message.content).toBe('Thanks, is the bot back now?');

  let sawBotReply = false;
  for (let i = 0; i < 25; i += 1) {
    const detail = await api(`/api/v1/chatbot-agents/live-chats/${session.id}`, { method: 'GET' });
    if ((detail.messages || []).some((message) => message.sender_type === 'bot' && /pricing|human|help|back/i.test(message.content || ''))) {
      sawBotReply = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  const finalDetail = await api(`/api/v1/chatbot-agents/live-chats/${session.id}`, { method: 'GET' });
  expect(finalDetail.session.control_mode).toBe('bot');
  expect(finalDetail.session.status).toBe('open');
  test.info().annotations.push({ type: 'bot-reply-after-release', description: String(sawBotReply) });
});
