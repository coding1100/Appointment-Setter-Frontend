import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  LifeBuoy,
  Plug,
  Settings,
  Waves,
} from "lucide-react";
import { motion } from "motion/react";

import { useAuth } from "../../contexts/AuthContext";
import { usePlatform } from "../../contexts/PlatformContext";
import { APP_ICON_MAP } from "../../platform/appCatalog";
import { Can } from "../../platform/ability";
import WorkspaceShellLayout, { NAVY, TEAL, TEAL_DEEP } from "./WorkspaceShellLayout";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const getCompactDescription = (appId) => {
  if (appId === "appointment_setter") return "Calling and scheduling";
  if (appId === "chatbot_agents") return "Launchers and embeds";
  if (appId === "users") return "Staff and access";
  return "Workspace module";
};

const LauncherTile = ({ app, index }) => {
  const Icon = APP_ICON_MAP[app.iconKey || app.id] || Waves;

  return (
    <Can I="access" a={app.id}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.22 }}
      >
        <Link
          to={app.defaultRoute}
          className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 no-underline shadow-sm transition hover:border-[#68fadd]/40 hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-3">
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: TEAL_DEEP }}
            >
              Application
            </span>
            <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:text-[#006b5c]" />
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: NAVY }}
            >
              <Icon className="h-5 w-5" style={{ color: TEAL }} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold" style={{ color: NAVY }}>
                {app.label}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{getCompactDescription(app.id)}</p>
            </div>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-500 transition group-hover:text-[#006b5c]">
              Open workspace →
            </p>
          </div>
        </Link>
      </motion.div>
    </Can>
  );
};

const LauncherPage = () => {
  const { user } = useAuth();
  const { activeOrg, apps, branding, entitlements, isPlatformAdmin } = usePlatform();

  const brandName = branding?.brand_name || "MindRind";
  const displayName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.first_name || "there";
  const orgLabel = isPlatformAdmin ? "MindRind Admin" : activeOrg?.name || "—";

  const quickActions = [
    { label: "Configure", icon: Settings, hint: "Settings" },
    { label: "Integrations", icon: Plug, hint: "Connect" },
    { label: "Insights", icon: BarChart3, hint: "Activity" },
    { label: "Support", icon: LifeBuoy, hint: "Help" },
  ];

  return (
    <WorkspaceShellLayout>
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1
            className="text-[1.65rem] font-semibold tracking-tight md:text-[1.85rem]"
            style={{ color: NAVY }}
          >
            {getGreeting()}, {displayName}
          </h1>
          <p className="mt-3 text-sm text-slate-500">
            Organization:{" "}
            <span className="font-semibold" style={{ color: TEAL_DEEP }}>
              {orgLabel}
            </span>
            <span className="mx-2 text-slate-300">|</span>
            Apps: <span className="font-semibold text-slate-800">{apps.length}</span>
          </p>
          {!entitlements?.appointment_setter_enabled && (
            <p
              className="mt-3 inline-flex rounded-md border px-2.5 py-1 text-xs font-medium"
              style={{
                borderColor: `${TEAL}4d`,
                backgroundColor: `${TEAL}1a`,
                color: TEAL_DEEP,
              }}
            >
              Appointment Setter is pending partner approval
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickActions.map((action) => (
            <div
              key={action.label}
              className="flex min-w-[108px] flex-col items-center rounded-xl border border-slate-200 bg-white px-3 py-4 text-center shadow-sm"
            >
              <action.icon className="h-5 w-5" style={{ color: TEAL_DEEP }} strokeWidth={1.5} />
              <p className="mt-2 text-xs font-semibold" style={{ color: NAVY }}>
                {action.label}
              </p>
              <p className="mt-1 flex items-center gap-0.5 text-[10px] text-slate-400">
                {action.hint}
                <ArrowRight className="h-3 w-3" style={{ color: TEAL }} />
              </p>
            </div>
          ))}
        </div>
      </div>

      <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Workspace status
            </span>
            <span
              className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              style={{
                backgroundColor: `${TEAL}22`,
                color: TEAL_DEEP,
              }}
            >
              Active
            </span>
          </div>
          <Link
            to={apps[0]?.defaultRoute || "/apps"}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white no-underline transition hover:opacity-90"
            style={{ backgroundColor: NAVY }}
          >
            Launch
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid md:grid-cols-3">
          <div className="border-b border-slate-100 p-5 md:border-b-0 md:border-r">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Summary
            </p>
            <ul className="mt-4 space-y-3 text-sm">
              {[
                { label: "Available apps", value: String(apps.length) },
                { label: "Organization", value: activeOrg?.name || brandName },
                { label: "Access level", value: isPlatformAdmin ? "Admin" : "Member" },
              ].map((row) => (
                <li key={row.label} className="flex justify-between gap-4">
                  <span className="text-slate-500">{row.label}</span>
                  <span className="font-semibold text-slate-800">{row.value}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="border-b border-slate-100 p-5 md:border-b-0 md:border-r">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Quick access
            </p>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Pick an application below to open its workspace. Each module keeps its own
              navigation and tools.
            </p>
          </div>
          <div className="p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Platform
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-50 px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Brand
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{brandName}</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Modules
                </p>
                <p className="mt-1 text-sm font-semibold" style={{ color: TEAL_DEEP }}>
                  {apps.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5">
        <div className="flex items-center gap-4">
          <p
            className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: TEAL_DEEP }}
          >
            Applications
          </p>
          <div className="h-px flex-1 rounded-full" style={{ backgroundColor: `${TEAL}55` }} />
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {apps.map((app, index) => (
            <LauncherTile key={app.id} app={app} index={index} />
          ))}
        </div>
      </section>
    </WorkspaceShellLayout>
  );
};

export default LauncherPage;
