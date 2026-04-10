jest.mock('axios', () => {
  const instance = {
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };

  return {
    create: jest.fn(() => instance),
  };
});

const { chatbotAgentAPI } = require('./api');

describe('chatbotAgentAPI', () => {
  it('builds a websocket url for the operator live stream', () => {
    const url = chatbotAgentAPI.getLiveChatStreamUrl('session-123', 'token-value');

    expect(url).toContain('/api/v1/chatbot-agents/live-chats/session-123/stream');
    expect(url).toContain('access_token=token-value');
    expect(url.startsWith('ws://') || url.startsWith('wss://')).toBe(true);
  });
});
