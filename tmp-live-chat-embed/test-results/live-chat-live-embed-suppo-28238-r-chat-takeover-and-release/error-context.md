# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: live-chat.spec.cjs >> live embed supports visitor chat, takeover, and release
- Location: live-chat.spec.cjs:48:1

# Error details

```
Error: Timed out waiting for message in session ca3ceb4b-c27a-4d1a-bb54-da6827b311d9
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - main [ref=e2]:
    - heading "SamAI Rep Live Chat Verification" [level=1] [ref=e3]
    - paragraph [ref=e4]: This is a disposable local page used to verify chatbot embed sessions, human takeover, and release flow.
    - generic [ref=e5]:
      - strong [ref=e6]: "Expected widget:"
      - paragraph [ref=e7]: Open the launcher in the bottom-right corner and send a visitor message to begin the session.
  - generic [ref=e8]:
    - iframe [active] [ref=e10]:
      - generic [ref=f1e2]:
        - generic [ref=f1e3]: Live Takeover Verification Bot
        - generic [ref=f1e4]: http://127.0.0.1:8090
        - generic [ref=f1e6]: Hello! I am here to help. A human can join this chat if needed.
        - generic [ref=f1e7]: Bot is active
        - generic [ref=f1e8]:
          - textbox "Type your message..." [active] [ref=f1e9]: I need a human to help with pricing.
          - button "Send" [ref=f1e10] [cursor=pointer]
    - button "Chat with SamAI" [ref=e11] [cursor=pointer]
```

# Test source

```ts
  1   | ﻿const { test, expect } = require('@playwright/test');
  2   | 
  3   | const backend = 'http://127.0.0.1:8004';
  4   | const accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxZWFhMGY2OC02NDZmLTQ0MGYtYmM3MC04ZWZlMmQ1YzBiMzQiLCJleHAiOjE3NzU4MDI2NDUsInR5cGUiOiJhY2Nlc3MifQ.4ogZKpAFScqRE8yQ5eB_xpzO1d9duy78mc-u4rpkYi4';
  5   | const chatbotId = '4096a0cd-f74f-48cf-b19b-ef1db5e37348';
  6   | 
  7   | async function api(path, options = {}) {
  8   |   const response = await fetch(`${backend}${path}`, {
  9   |     ...options,
  10  |     headers: {
  11  |       Authorization: `Bearer ${accessToken}`,
  12  |       'Content-Type': 'application/json',
  13  |       ...(options.headers || {}),
  14  |     },
  15  |   });
  16  |   const text = await response.text();
  17  |   let data = null;
  18  |   try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  19  |   if (!response.ok) throw new Error(`API ${path} failed: ${response.status} ${JSON.stringify(data)}`);
  20  |   return data;
  21  | }
  22  | 
  23  | async function pollForSession(runId) {
  24  |   for (let i = 0; i < 20; i += 1) {
  25  |     const data = await api('/api/v1/chatbot-agents/live-chats?limit=100', { method: 'GET' });
  26  |     const match = (data || []).find((entry) =>
  27  |       entry?.session?.chatbot_id === chatbotId &&
  28  |       entry?.session?.status === 'open' &&
  29  |       String(entry?.session?.page_url || '').includes(runId)
  30  |     );
  31  |     if (match) return match.session;
  32  |     await new Promise((resolve) => setTimeout(resolve, 750));
  33  |   }
  34  |   throw new Error('Timed out waiting for live chat session');
  35  | }
  36  | 
  37  | async function pollForMessage(sessionId, predicate, timeoutMs = 20000) {
  38  |   const started = Date.now();
  39  |   while (Date.now() - started < timeoutMs) {
  40  |     const detail = await api(`/api/v1/chatbot-agents/live-chats/${sessionId}`, { method: 'GET' });
  41  |     const found = (detail.messages || []).find(predicate);
  42  |     if (found) return { detail, message: found };
  43  |     await new Promise((resolve) => setTimeout(resolve, 1000));
  44  |   }
> 45  |   throw new Error(`Timed out waiting for message in session ${sessionId}`);
      |         ^ Error: Timed out waiting for message in session ca3ceb4b-c27a-4d1a-bb54-da6827b311d9
  46  | }
  47  | 
  48  | test('live embed supports visitor chat, takeover, and release', async ({ page }) => {
  49  |   test.setTimeout(180000);
  50  |   const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  51  |   const siteUrl = `http://127.0.0.1:8090/?run=${runId}`;
  52  | 
  53  |   await page.goto(siteUrl, { waitUntil: 'networkidle' });
  54  |   await page.getByRole('button', { name: 'Chat with SamAI' }).click();
  55  | 
  56  |   const frame = page.frameLocator('iframe[title="Chatbot Panel"]');
  57  |   await expect(frame.locator('#chatbot-input')).toBeEnabled({ timeout: 20000 });
  58  |   await expect(frame.locator('#chatbot-title')).not.toHaveText('Loading chatbot...', { timeout: 20000 });
  59  | 
  60  |   await frame.locator('#chatbot-input').fill('I need a human to help with pricing.');
  61  |   await frame.locator('#chatbot-send').click();
  62  | 
  63  |   const session = await pollForSession(runId);
  64  |   test.info().annotations.push({ type: 'session-id', description: session.id });
  65  | 
  66  |   const visitorPersisted = await pollForMessage(
  67  |     session.id,
  68  |     (message) => message.sender_type === 'visitor' && message.content === 'I need a human to help with pricing.'
  69  |   );
  70  |   expect(visitorPersisted.message.content).toBe('I need a human to help with pricing.');
  71  | 
  72  |   const takeover = await api(`/api/v1/chatbot-agents/live-chats/${session.id}/takeover`, { method: 'POST', body: '{}' });
  73  |   expect(takeover.session.control_mode).toBe('human');
  74  | 
  75  |   await expect(frame.locator('#chatbot-status')).toContainText(/Live with|team member joined/i, { timeout: 15000 });
  76  |   await expect(frame.locator('.message.system')).toContainText('A team member joined the chat', { timeout: 15000 });
  77  | 
  78  |   await api(`/api/v1/chatbot-agents/live-chats/${session.id}/messages`, {
  79  |     method: 'POST',
  80  |     body: JSON.stringify({ content: 'Hi, this is the human operator taking over now.' }),
  81  |   });
  82  |   await expect(frame.locator('.message.human')).toContainText('Hi, this is the human operator taking over now.', { timeout: 15000 });
  83  | 
  84  |   const release = await api(`/api/v1/chatbot-agents/live-chats/${session.id}/release`, { method: 'POST', body: '{}' });
  85  |   expect(release.session.control_mode).toBe('bot');
  86  | 
  87  |   await expect(frame.locator('#chatbot-status')).toContainText('Bot is active', { timeout: 15000 });
  88  |   await expect(frame.locator('.message.system')).toContainText('The chatbot is back in the conversation.', { timeout: 15000 });
  89  | 
  90  |   await frame.locator('#chatbot-input').fill('Thanks, is the bot back now?');
  91  |   await frame.locator('#chatbot-send').click();
  92  |   const secondVisitorMessage = await pollForMessage(
  93  |     session.id,
  94  |     (message) => message.sender_type === 'visitor' && message.content === 'Thanks, is the bot back now?'
  95  |   );
  96  |   expect(secondVisitorMessage.message.content).toBe('Thanks, is the bot back now?');
  97  | 
  98  |   let sawBotReply = false;
  99  |   for (let i = 0; i < 25; i += 1) {
  100 |     const detail = await api(`/api/v1/chatbot-agents/live-chats/${session.id}`, { method: 'GET' });
  101 |     if ((detail.messages || []).some((message) => message.sender_type === 'bot' && /pricing|human|help|back/i.test(message.content || ''))) {
  102 |       sawBotReply = true;
  103 |       break;
  104 |     }
  105 |     await new Promise((resolve) => setTimeout(resolve, 1000));
  106 |   }
  107 | 
  108 |   const finalDetail = await api(`/api/v1/chatbot-agents/live-chats/${session.id}`, { method: 'GET' });
  109 |   expect(finalDetail.session.control_mode).toBe('bot');
  110 |   expect(finalDetail.session.status).toBe('open');
  111 |   test.info().annotations.push({ type: 'bot-reply-after-release', description: String(sawBotReply) });
  112 | });
  113 | 
```