import React from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';

import { getAccessToken } from '@mindrind/auth/session';

const shell = {
  minHeight: '100vh',
  background: '#f8fafc',
  color: '#0f172a',
  fontFamily: 'Manrope, sans-serif',
  padding: '40px 24px',
};

const card = {
  maxWidth: '980px',
  margin: '0 auto',
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '28px',
  boxShadow: '0 20px 45px rgba(15, 23, 42, 0.08)',
  padding: '32px',
};

const WorkspacePage = () => {
  const location = useLocation();
  const hasToken = Boolean(getAccessToken());

  return (
    <div style={shell}>
      <div style={card}>
        <p style={{ letterSpacing: '0.28em', fontSize: '12px', textTransform: 'uppercase', color: '#64748b' }}>
          Chatbot Agents Microfrontend
        </p>
        <h1 style={{ marginTop: '16px', fontSize: '40px', lineHeight: 1.05 }}>Workspace Scaffold Ready</h1>
        <p style={{ marginTop: '12px', maxWidth: '760px', color: '#475569', lineHeight: 1.7 }}>
          This app is now a dedicated microfrontend target for all routes under <strong>/app/chatbot-agents/*</strong>.
          The platform shell can keep running safely while live chats, embed management, and chatbot flows move here in phases.
        </p>
        <div style={{ display: 'grid', gap: '14px', marginTop: '28px' }}>
          <div><strong>Current path:</strong> {location.pathname}</div>
          <div><strong>Session detected:</strong> {hasToken ? 'yes' : 'no'}</div>
          <div><strong>Next migration targets:</strong> chatbot list, form flows, live chats, embed management, and runtime controls.</div>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '28px', flexWrap: 'wrap' }}>
          <Link to="/" style={{ textDecoration: 'none', background: '#0f172a', color: '#fff', padding: '12px 18px', borderRadius: '999px', fontWeight: 700 }}>
            Open Platform Shell
          </Link>
          <a href="/apps" style={{ textDecoration: 'none', border: '1px solid #cbd5e1', color: '#334155', padding: '12px 18px', borderRadius: '999px', fontWeight: 600 }}>
            Back to Launcher
          </a>
        </div>
      </div>
    </div>
  );
};

const App = () => (
  <Routes>
    <Route path="*" element={<WorkspacePage />} />
  </Routes>
);

export default App;
