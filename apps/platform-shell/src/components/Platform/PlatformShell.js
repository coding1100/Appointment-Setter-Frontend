import React, { useMemo } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Building2,
  ChevronDown,
  LogOut,
  Sparkles,
} from "lucide-react";
import { motion } from "motion/react";

import { useAuth } from "../../contexts/AuthContext";
import { usePlatform } from "../../contexts/PlatformContext";
import BottomDock from "./BottomDock";
import WorkspaceShellLayout from "./WorkspaceShellLayout";

const initialsFromUser = (user) => {
  const first = user?.first_name?.[0] || "";
  const last = user?.last_name?.[0] || "";
  return `${first}${last}`.toUpperCase() || "AI";
};

const roleLabelFromUser = (user) => {
  const platformRoleName = String(user?.platform_role_name || "").trim();
  if (platformRoleName) {
    return platformRoleName.toUpperCase();
  }
  return String(user?.role || "")
    .replace("_", " ")
    .toUpperCase();
};

export const PlatformBootstrapError = () => {
  const { refetchBootstrap, logout } = usePlatform();

  return (
    <div className="min-h-screen bg-white px-4 py-12 text-slate-900">
      <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center">
        <div className="shell-card w-full p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Platform Bootstrap
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">
            We could not load your workspace.
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            The platform shell is up, but the launcher bootstrap call did not
            succeed. Retry the bootstrap fetch or sign out and back in if the
            session may be stale.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => refetchBootstrap()}
              className="rounded-full border border-slate-200 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-slate-800"
            >
              Retry bootstrap
            </button>
            <button
              onClick={() => logout()}
              className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const PlatformAccessBlocked = () => {
  const { accessBlockedMessage, logout } = usePlatform();

  return (
    <div className="min-h-screen bg-white px-4 py-12 text-slate-900">
      <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center">
        <div className="shell-card w-full p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Workspace Access
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">
            Your organization access is currently blocked.
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            {accessBlockedMessage || "Your active organization is inactive or suspended. Please contact your administrator."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => logout()}
              className="rounded-full border border-slate-200 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-slate-800"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const PlatformLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { actor, activeOrg, switchableOrgs, apps, branding, switchActiveOrg, switchOrgLoading, canSwitchOrg, isPlatformAdmin } = usePlatform();
  const isLauncher = /^\/apps\/?$/.test(location.pathname);
  const isAppWorkspace = location.pathname.startsWith("/app/");
  const displayActor = actor || user;

  const currentApp = useMemo(() => {
    if (!location.pathname.startsWith("/app/")) {
      return null;
    }

    const [, , slug] = location.pathname.split("/");
    return apps.find((app) => app.slug === slug) || null;
  }, [apps, location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const handleOrgSwitch = async (event) => {
    const orgId = event.target.value;
    if (!orgId || orgId === activeOrg?.id) return;
    await switchActiveOrg(orgId);
  };

  const headerInner = (
    <>
      <div className="flex items-center gap-3">
        <Link
          to="/apps"
          className="flex items-center gap-3 text-slate-900 no-underline"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50">
            <Sparkles className="h-5 w-5 text-slate-700" />
          </div>
          <div className="text-[0.78rem] uppercase tracking-[0.2em] text-slate-500">
            {branding?.brand_name || "MindRind"}
          </div>
        </Link>
        {currentApp && (
          <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600 md:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {currentApp.label}
          </div>
        )}
        {activeOrg && (
          <div className="hidden md:flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            <span className="max-w-[190px] truncate">
              {isPlatformAdmin ? "MindRind Admin" : activeOrg.name}
            </span>
            {canSwitchOrg && !isPlatformAdmin ? (
              <select
                value={activeOrg.id}
                onChange={handleOrgSwitch}
                disabled={switchOrgLoading}
                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700"
              >
                {switchableOrgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-2 py-2 pr-4 text-left transition hover:bg-slate-50">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#ffd24d] text-base font-bold text-slate-900">
                {initialsFromUser(displayActor)}
              </div>
              <div className="hidden md:block">
                <div className="text-sm font-semibold text-slate-900">
                  {displayActor?.first_name} {displayActor?.last_name}
                </div>
                <div className="text-xs tracking-[0.2em] text-slate-500">
                  {roleLabelFromUser(displayActor)}
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              sideOffset={10}
              className="z-50 min-w-[220px] rounded-2xl border border-slate-200 bg-white p-2 text-slate-900 shadow-xl"
            >
              <DropdownMenu.Item asChild></DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={handleLogout}
                className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm outline-none transition hover:bg-slate-50"
              >
                <LogOut className="h-4 w-4 text-rose-500" />
                Sign out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </>
  );

  const useWorkspaceChrome = isLauncher || isAppWorkspace;

  return (
    <div
      className={`min-h-screen ${
        useWorkspaceChrome ? "bg-[#1a1a2e]" : "bg-white text-slate-900"
      }`}
    >
      {useWorkspaceChrome ? (
        <Outlet />
      ) : (
        <div className="relative px-3 py-3 md:px-5 md:py-4">
          <div className="mx-auto max-w-[1680px]">
            <header className="mb-4 flex items-center justify-between rounded-[26px] border border-slate-200 bg-white px-4 py-3.5 shadow-[0_16px_34px_rgba(15,23,42,0.06)] md:px-6">
              {headerInner}
            </header>

            <div className="pb-28">
              <Outlet />
            </div>
          </div>
        </div>
      )}

      <BottomDock />
    </div>
  );
};

export const AppWorkspaceLayout = () => {
  const location = useLocation();

  return (
    <WorkspaceShellLayout>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <Outlet />
      </motion.div>
    </WorkspaceShellLayout>
  );
};
