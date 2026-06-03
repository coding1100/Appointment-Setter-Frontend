import React, { useMemo } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Building2,
  ChevronDown,
  Compass,
  LogOut,
  Sparkles,
} from "lucide-react";
import { motion } from "motion/react";

import { useAuth } from "../../contexts/AuthContext";
import { usePlatform } from "../../contexts/PlatformContext";
import BottomDock from "./BottomDock";
import {
  APP_ICON_MAP,
  APP_WORKSPACE_NAV,
  getAppDefinition,
} from "../../platform/appCatalog";

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
  const isLauncher = location.pathname === "/apps";
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

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="relative px-3 py-3 md:px-5 md:py-4">
        <div
          className={`${isLauncher ? "max-w-[1920px]" : "max-w-[1680px]"} mx-auto`}
        >
          <header className="mb-4 flex items-center justify-between rounded-[26px] border border-slate-200 bg-white px-4 py-3.5 shadow-[0_16px_34px_rgba(15,23,42,0.06)] md:px-6">
            <div className="flex items-center gap-3">
              <Link
                to="/apps"
                className="flex items-center gap-3 text-slate-900 no-underline"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-slate-50">
                  <Sparkles className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <div className="text-[0.78rem] uppercase tracking-[0.2em] text-slate-500">
                    {branding?.brand_name || "MindRind"}
                  </div>
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
                      <div className="text-xs text-slate-500 tracking-[0.2em]">
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
          </header>

          <div className="pb-28">
            <Outlet />
          </div>
        </div>
      </div>

      <BottomDock />
    </div>
  );
};

export const AppWorkspaceLayout = ({ appId }) => {
  const location = useLocation();
  const app = getAppDefinition(appId);
  const Icon = APP_ICON_MAP[app?.iconKey || app?.id] || Sparkles;
  const navItems = APP_WORKSPACE_NAV[appId] || [];
  const activeNavTo = useMemo(() => {
    const path = location.pathname;

    const bestMatch = navItems
      .filter((item) => path === item.to || path.startsWith(`${item.to}/`))
      .sort((a, b) => b.to.length - a.to.length)[0];

    return bestMatch?.to || null;
  }, [location.pathname, navItems]);

  return (
    <div className="workspace-shell overflow-hidden rounded-[28px]">
      <div className="grid gap-0 lg:grid-cols-[238px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 px-3 py-3 lg:min-h-[calc(100vh-7.2rem)] lg:border-b-0 lg:border-r lg:border-slate-200 lg:px-3 lg:py-4">
          <div className="rounded-[22px] bg-slate-50 p-3.5">
            {/* <Link
              to="/apps"
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 no-underline transition hover:text-slate-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to apps
            </Link> */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white">
                <Icon className="h-5 w-5 text-slate-700" />
              </div>
              <div>
                <p className="text-base font-semibold text-slate-900">
                  {app?.label}
                </p>
                <p className="text-xs leading-5 text-slate-500">
                  {app?.description}
                </p>
              </div>
            </div>
          </div>

          <nav className="mt-3.5 space-y-1">
            {navItems.map((item) => {
              const isActive = activeNavTo === item.to;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium no-underline transition ${
                    isActive
                      ? "bg-slate-900 text-white shadow-[inset_0_0_0_1px_rgba(15,23,42,0.14)]"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <item.icon
                    className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-400"}`}
                  />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="min-w-0 px-4 py-4 md:px-5 md:py-5"
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  );
};
