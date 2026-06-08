import React, { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Layers, Menu, X } from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";
import { usePlatform } from "../../contexts/PlatformContext";
import {
  APP_HIDDEN_NAV,
  APP_ICON_MAP,
  APP_SIDEBAR_GROUPS,
  APP_WORKSPACE_NAV,
  PLATFORM_APPS,
} from "../../platform/appCatalog";
import { Can } from "../../platform/ability";
import WorkspaceUserMenu from "./WorkspaceUserMenu";

export const NAVY = "#1a1a2e";
export const TEAL = "#68fadd";
export const TEAL_DEEP = "#006b5c";
const CONTENT_BG = "#ffffff";

const navItemMatchesPath = (pathname, item) => {
  const to = typeof item === "string" ? item : item.to;
  if (to === "/apps") return /^\/apps\/?$/.test(pathname);

  const paths = [to, ...(typeof item === "string" ? [] : item.activeFor || [])];
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
};

const resolveActiveNavPath = (pathname, navItems) => {
  const match = navItems
    .filter((item) => navItemMatchesPath(pathname, item))
    .sort((a, b) => b.to.length - a.to.length)[0];

  return match?.to ?? null;
};

const SidebarNavItem = ({ label, to, active = false, onNavigate }) => {
  const className = `group flex w-full items-center rounded-sm py-1.5 pl-2 pr-1 font-mono text-[10px] uppercase tracking-[0.14em] no-underline transition ${
    active
      ? "bg-[#68fadd]/12 font-bold text-[#68fadd] ring-1 ring-[#68fadd]/25"
      : "text-white/40 hover:bg-white/[0.04] hover:text-white/75"
  }`;

  return (
    <Link
      to={to}
      onClick={onNavigate}
      className={className}
      aria-current={active ? "page" : undefined}
    >
      <span className="truncate">{label}</span>
      {active ? (
        <span
          className="ml-1.5 inline-block h-[11px] w-[9px] shrink-0 bg-[#68fadd]"
          aria-hidden
        />
      ) : null}
    </Link>
  );
};

const SidebarNavGroup = ({ title, icon: Icon, items, activeNavPath, onNavigate }) => (
  <section className="mb-5 last:mb-4">
    <div className="flex items-center gap-2.5 px-4">
      <Icon className="h-[15px] w-[15px] shrink-0 text-white/55" strokeWidth={1.75} />
      <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-white/90">
        {title}
      </h3>
    </div>
    <nav className="relative mt-3 ml-[22px] border-l border-white/15 pl-4">
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={`${item.to}-${item.label}`}>
            <SidebarNavItem
              label={item.label}
              to={item.to}
              active={item.to === activeNavPath}
              onNavigate={onNavigate}
            />
          </li>
        ))}
      </ul>
    </nav>
  </section>
);

const SidebarContent = ({ brandName, apps, onNavigate }) => {
  const { pathname } = useLocation();

  return (
    <>
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ backgroundColor: TEAL }}
        >
          <Layers className="h-4 w-4" style={{ color: NAVY }} strokeWidth={2} />
        </div>
        <Link
          to="/apps"
          className="font-mono text-sm font-bold uppercase tracking-wide text-white hover:underline focus:outline-none"
        >
          {brandName}
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-6">
        {apps.map((app) => {
          const sidebarGroups = APP_SIDEBAR_GROUPS[app.id];

          if (sidebarGroups?.length) {
            return (
              <Can key={app.id} I="access" a={app.id}>
                {sidebarGroups.map((group) => {
                  const Icon = APP_ICON_MAP[group.iconKey] || Layers;
                  const navItems = group.items.map((item) => ({
                    label: item.label,
                    to: item.to,
                  }));

                  return (
                    <SidebarNavGroup
                      key={`${app.id}-${group.label}`}
                      title={group.label}
                      icon={Icon}
                      items={navItems}
                      activeNavPath={resolveActiveNavPath(pathname, navItems)}
                      onNavigate={onNavigate}
                    />
                  );
                })}
              </Can>
            );
          }

          const Icon = APP_ICON_MAP[app.iconKey || app.id] || Layers;
          const navItems = (APP_WORKSPACE_NAV[app.id] || []).map((item) => ({
            label: item.label,
            to: item.to,
          }));

          if (!navItems.length) return null;

          return (
            <Can key={app.id} I="access" a={app.id}>
              <SidebarNavGroup
                title={app.label}
                icon={Icon}
                items={navItems}
                activeNavPath={resolveActiveNavPath(pathname, navItems)}
                onNavigate={onNavigate}
              />
            </Can>
          );
        })}
      </div>

      <div className="shrink-0 border-t border-white/10 px-5 py-4">
        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/35">
          Agentic UI Design System
        </p>
        <p className="mt-1 font-mono text-[9px] text-white/25">Enterprise v. 1.0 · ©2026</p>
      </div>
    </>
  );
};

export const getWorkspaceBreadcrumb = (pathname) => {
  if (/^\/apps\/?$/.test(pathname)) {
    return [
      { label: "Workspace", muted: true },
      { label: "Apps", accent: true },
    ];
  }

  for (const app of PLATFORM_APPS) {
    const prefix = `/app/${app.slug}`;
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      const sidebarGroups = APP_SIDEBAR_GROUPS[app.id];

      if (sidebarGroups?.length) {
        const groupedNavItems = [
          ...sidebarGroups.flatMap((group) =>
            group.items.map((item) => ({
              ...item,
              groupLabel: group.label,
            })),
          ),
          ...(APP_HIDDEN_NAV[app.id] || []),
        ];
        const activeNavPath = resolveActiveNavPath(pathname, groupedNavItems);
        const activeNav = groupedNavItems.find((item) => item.to === activeNavPath);

        if (activeNav) {
          return [
            { label: "Workspace", muted: true },
            { label: activeNav.groupLabel, muted: true },
            { label: activeNav.label, accent: true },
          ];
        }
      } else {
        const navItems = APP_WORKSPACE_NAV[app.id] || [];
        const activeNavPath = resolveActiveNavPath(pathname, navItems);
        const activeNav = navItems.find((item) => item.to === activeNavPath);

        if (activeNav) {
          return [
            { label: "Workspace", muted: true },
            { label: app.label, muted: true },
            { label: activeNav.label, accent: true },
          ];
        }
      }

      return [
        { label: "Workspace", muted: true },
        { label: app.label, accent: true },
      ];
    }
  }

  return [
    { label: "Workspace", muted: true },
    { label: "Workspace", accent: true },
  ];
};

const WorkspaceShellLayout = ({ children }) => {
  const { user } = useAuth();
  const { apps, branding } = usePlatform();
  const { pathname } = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const brandName = branding?.brand_name || "MindRind";
  const displayName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.first_name || "there";
  const breadcrumb = useMemo(() => getWorkspaceBreadcrumb(pathname), [pathname]);
  const closeMobileNav = () => setMobileNavOpen(false);

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: NAVY, color: NAVY }}>
      {mobileNavOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-[#1a1a2e]/50 backdrop-blur-[2px] lg:hidden"
          onClick={closeMobileNav}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[268px] flex-col transition-transform duration-300 lg:static lg:z-auto lg:shrink-0 lg:translate-x-0 ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ backgroundColor: NAVY }}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 lg:hidden">
          <span className="text-sm font-bold text-white">{brandName}</span>
          <button
            type="button"
            onClick={closeMobileNav}
            className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <SidebarContent brandName={brandName} apps={apps} onNavigate={closeMobileNav} />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col py-3 sm:py-4 lg:py-5 pr-3 sm:pr-4 lg:pr-5">
        <div className="mb-3 flex items-center justify-between lg:hidden">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200/90 bg-white px-3 py-2 text-sm font-medium text-[#1a1a2e] shadow-sm"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
            Menu
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_2px_8px_rgba(26,26,46,0.06),0_0_0_1px_rgba(255,255,255,0.8)_inset]">
          <header className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4 py-3 md:px-5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em]">
              {breadcrumb.map((segment, index) => (
                <React.Fragment key={`${segment.label}-${index}`}>
                  {index > 0 ? <span className="text-slate-300">/</span> : null}
                  <span
                    className={segment.accent ? "" : "text-slate-400"}
                    style={segment.accent ? { color: TEAL_DEEP } : undefined}
                  >
                    {segment.label}
                  </span>
                </React.Fragment>
              ))}
            </div>
            <WorkspaceUserMenu displayName={displayName} />
          </header>

          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-5 md:py-5"
            style={{ backgroundColor: CONTENT_BG }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceShellLayout;
