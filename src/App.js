import React from 'react';
import { Link, Navigate, Outlet, RouterProvider, createBrowserRouter, useParams } from 'react-router-dom';

import { AbilityContext } from './platform/ability';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PlatformProvider, usePlatform } from './contexts/PlatformContext';
import LoginForm from './components/Auth/LoginForm';
import RegisterForm from './components/Auth/RegisterForm';
import Dashboard from './components/Dashboard/Dashboard';
import TenantList from './components/Tenants/TenantList';
import TenantCreateForm from './components/Tenants/TenantCreateForm';
import TenantEditForm from './components/Tenants/TenantEditForm';
import TenantDetail from './components/Tenants/TenantDetail';
import VoiceAgentTest from './components/VoiceAgent/VoiceAgentTest';
import TwilioIntegration from './components/TwilioIntegration/TwilioIntegration';
import AppointmentList from './components/Appointments/AppointmentList';
import ChatbotList from './components/Agents/ChatbotList';
import ChatbotLivePage from './components/Agents/ChatbotLivePage';
import ErrorBoundary from './components/ErrorBoundary';
import Loader from './components/Loader';
import LauncherPage from './components/Platform/LauncherPage';
import VoiceAgentsPage from './components/Platform/VoiceAgentsPage';
import { AppWorkspaceLayout, PlatformBootstrapError, PlatformLayout } from './components/Platform/PlatformShell';

const RootRedirect = () => {
  const { isAuthenticated, loading } = useAuth();
  const { loading: platformLoading } = usePlatform();

  if (loading || (isAuthenticated && platformLoading)) {
    return <Loader message="Preparing workspace..." fullScreen />;
  }

  return <Navigate to={isAuthenticated ? '/apps' : '/login'} replace />;
};

const PublicOnlyRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  const { loading: platformLoading } = usePlatform();

  if (loading || (isAuthenticated && platformLoading)) {
    return <Loader message="Preparing workspace..." fullScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/apps" replace />;
  }

  return <Outlet />;
};

const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  const { loading: platformLoading, error, ability } = usePlatform();

  if (loading || platformLoading) {
    return <Loader message="Loading platform..." fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (error) {
    return <PlatformBootstrapError />;
  }

  return (
    <AbilityContext.Provider value={ability}>
      <PlatformLayout />
    </AbilityContext.Provider>
  );
};

const AppGate = ({ appId }) => {
  const { hasAppAccess } = usePlatform();

  if (!hasAppAccess(appId)) {
    return (
      <div className="shell-card p-8">
        <p className="text-xs uppercase tracking-[0.32em] text-slate-400">App Access</p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-50">This app is not assigned to your account.</h1>
        <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">
          Your account does not currently have access to this workspace. Use the launcher to switch to an app your
          account can open.
        </p>
        <Link
          to="/apps"
          className="mt-6 inline-flex rounded-full border border-amber-300/30 bg-amber-200/10 px-5 py-2.5 text-sm font-semibold text-amber-100 no-underline transition hover:bg-amber-200/20"
        >
          Return to launcher
        </Link>
      </div>
    );
  }

  return <AppWorkspaceLayout appId={appId} />;
};

const LegacyTenantDetailRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/app/appointment-setter/tenants/${id}`} replace />;
};

const LegacyTenantEditRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/app/appointment-setter/tenants/${id}/edit`} replace />;
};

const router = createBrowserRouter([
  { path: '/', element: <RootRedirect /> },
  {
    element: <PublicOnlyRoute />,
    children: [
      { path: '/login', element: <LoginForm /> },
      { path: '/register', element: <RegisterForm /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/apps', element: <LauncherPage /> },
      {
        path: '/app/appointment-setter',
        element: <AppGate appId="appointment_setter" />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', element: <Dashboard /> },
          { path: 'appointments', element: <AppointmentList /> },
          { path: 'tenants', element: <TenantList /> },
          { path: 'tenants/create', element: <TenantCreateForm /> },
          { path: 'tenants/:id', element: <TenantDetail /> },
          { path: 'tenants/:id/edit', element: <TenantEditForm /> },
          { path: 'voice-agents', element: <VoiceAgentsPage /> },
          { path: 'voice-testing', element: <VoiceAgentTest /> },
          { path: 'twilio', element: <TwilioIntegration /> },
          // Telephony and Cold Caller routes are intentionally hidden from the active platform rollout for now.
          // { path: 'telephony', element: <TelephonyHub /> },
          // { path: 'cold-caller', element: <ColdCallerPage /> },
        ],
      },
      {
        path: '/app/chatbot-agents',
        element: <AppGate appId="chatbot_agents" />,
        children: [
          { index: true, element: <ChatbotList /> },
          { path: 'live', element: <ChatbotLivePage /> },
          { path: 'live/:sessionId', element: <ChatbotLivePage /> },
        ],
      },
      { path: '/dashboard', element: <Navigate to="/app/appointment-setter/dashboard" replace /> },
      { path: '/appointments', element: <Navigate to="/app/appointment-setter/appointments" replace /> },
      { path: '/tenants', element: <Navigate to="/app/appointment-setter/tenants" replace /> },
      { path: '/tenants/create', element: <Navigate to="/app/appointment-setter/tenants/create" replace /> },
      { path: '/tenants/:id', element: <LegacyTenantDetailRedirect /> },
      { path: '/tenants/:id/edit', element: <LegacyTenantEditRedirect /> },
      { path: '/agents', element: <Navigate to="/app/appointment-setter/voice-agents" replace /> },
      { path: '/voice-agent', element: <Navigate to="/app/appointment-setter/voice-testing" replace /> },
      { path: '/twilio-integration', element: <Navigate to="/app/appointment-setter/twilio" replace /> },
      // Legacy redirects for telephony and cold caller are intentionally disabled with the routes above.
      // { path: '/telephony-hub', element: <Navigate to="/app/appointment-setter/telephony" replace /> },
      // { path: '/cold-caller', element: <Navigate to="/app/appointment-setter/cold-caller" replace /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <PlatformProvider>
          <RouterProvider router={router} />
        </PlatformProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
