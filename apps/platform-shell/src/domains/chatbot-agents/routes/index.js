import React, { lazy } from 'react';
import { Navigate } from 'react-router-dom';

import RouteSuspense from '../../../shared/ui/RouteSuspense';

const ChatbotWorkspacePage = lazy(() => import('../pages/ChatbotWorkspacePage'));
const LiveChatsPage = lazy(() => import('../pages/LiveChatsPage'));

const withSuspense = (Component, message) => (
  <RouteSuspense message={message}>
    <Component />
  </RouteSuspense>
);

export const getChatbotAgentRoutes = () => [
  { index: true, element: withSuspense(ChatbotWorkspacePage, 'Loading chatbot workspace...') },
  { path: 'live', element: withSuspense(LiveChatsPage, 'Loading live chats...') },
  { path: 'live/:sessionId', element: withSuspense(LiveChatsPage, 'Loading live chats...') },
  { path: '*', element: <Navigate to="/app/chatbot-agents" replace /> },
];

