import React, { lazy } from "react";
import {
  Link,
  Navigate,
  Outlet,
  createBrowserRouter,
  useParams,
} from "react-router-dom";

import RouteSuspense from "../../shared/ui/RouteSuspense";
import { AbilityContext } from "../../shared/permissions/ability";
import { useAuth } from "../../contexts/AuthContext";
import { usePlatform } from "../../contexts/PlatformContext";
import Loader from "../../components/Loader";
import {
  AppWorkspaceLayout,
  PlatformBootstrapError,
  PlatformLayout,
} from "../../components/Platform/PlatformShell";
import { getAppointmentSetterRoutes } from "../../domains/appointment-setter/routes";
import { getChatbotAgentRoutes } from "../../domains/chatbot-agents/routes";

const LoginForm = lazy(() => import("../../components/Auth/LoginForm"));
const RegisterForm = lazy(() => import("../../components/Auth/RegisterForm"));
const LauncherPage = lazy(
  () => import("../../components/Platform/LauncherPage"),
);

const RootRedirect = () => {
  const { isAuthenticated, loading } = useAuth();
  const { loading: platformLoading } = usePlatform();

  if (loading || (isAuthenticated && platformLoading)) {
    return <Loader message="Preparing workspace..." fullScreen />;
  }

  return <Navigate to={isAuthenticated ? "/apps" : "/login"} replace />;
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
        <p className="text-xs uppercase tracking-[0.32em] text-slate-400">
          App Access
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">
          This app is not assigned to your account.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">
          Your account does not currently have access to this workspace. Use the
          launcher to switch to an app your account can open.
        </p>
        <Link
          to="/apps"
          className="mt-6 inline-flex rounded-full border border-slate-200 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-black no-underline transition hover:bg-slate-800"
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

const withSuspense = (Component, message, fullScreen = false) => (
  <RouteSuspense message={message}>
    <Component fullScreen={fullScreen} />
  </RouteSuspense>
);

export const createAppRouter = () =>
  createBrowserRouter([
    { path: "/", element: <RootRedirect /> },
    {
      element: <PublicOnlyRoute />,
      children: [
        {
          path: "/login",
          element: withSuspense(LoginForm, "Preparing sign in..."),
        },
        {
          path: "/register",
          element: withSuspense(RegisterForm, "Preparing registration..."),
        },
      ],
    },
    {
      element: <ProtectedRoute />,
      children: [
        {
          path: "/apps",
          element: withSuspense(LauncherPage, "Loading launcher..."),
        },
        {
          path: "/app/appointment-setter",
          element: <AppGate appId="appointment_setter" />,
          children: getAppointmentSetterRoutes(),
        },
        {
          path: "/app/chatbot-agents",
          element: <AppGate appId="chatbot_agents" />,
          children: getChatbotAgentRoutes(),
        },
        {
          path: "/dashboard",
          element: <Navigate to="/app/appointment-setter/dashboard" replace />,
        },
        {
          path: "/appointments",
          element: (
            <Navigate to="/app/appointment-setter/appointments" replace />
          ),
        },
        {
          path: "/tenants",
          element: <Navigate to="/app/appointment-setter/tenants" replace />,
        },
        {
          path: "/tenants/create",
          element: (
            <Navigate to="/app/appointment-setter/tenants/create" replace />
          ),
        },
        { path: "/tenants/:id", element: <LegacyTenantDetailRedirect /> },
        { path: "/tenants/:id/edit", element: <LegacyTenantEditRedirect /> },
        {
          path: "/agents",
          element: (
            <Navigate to="/app/appointment-setter/voice-agents" replace />
          ),
        },
        {
          path: "/voice-agent",
          element: (
            <Navigate to="/app/appointment-setter/voice-testing" replace />
          ),
        },
        {
          path: "/twilio-integration",
          element: <Navigate to="/app/appointment-setter/twilio" replace />,
        },
      ],
    },
    { path: "*", element: <Navigate to="/" replace /> },
  ]);
