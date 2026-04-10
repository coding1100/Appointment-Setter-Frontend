import { APP_WORKSPACE_NAV } from './appCatalog';

describe('chatbot app workspace nav', () => {
  it('includes the live chats monitor entry', () => {
    expect(APP_WORKSPACE_NAV.chatbot_agents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          to: '/app/chatbot-agents/live',
          label: 'Live Chats',
        }),
      ])
    );
  });
});
