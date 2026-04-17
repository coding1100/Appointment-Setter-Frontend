import React from "react";
import { Link } from "react-router-dom";
import { CloudSun, Compass, Waves } from "lucide-react";
import { motion } from "motion/react";

import { useAuth } from "../../contexts/AuthContext";
import { usePlatform } from "../../contexts/PlatformContext";
import { APP_ICON_MAP } from "../../platform/appCatalog";
import { Can } from "../../platform/ability";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const getTileTone = (appId) => {
  if (appId === "appointment_setter") {
    return {
      iconWrap: "from-emerald-50 via-white to-emerald-100",
      iconColor: "text-emerald-500",
    };
  }

  if (appId === "chatbot_agents") {
    return {
      iconWrap: "from-sky-50 via-white to-indigo-100",
      iconColor: "text-sky-500",
    };
  }
  if (appId === "users") {
    return {
      iconWrap: "from-emerald-50 via-white to-teal-100",
      iconColor: "text-emerald-600",
    };
  }

  return {
    iconWrap: "from-white to-slate-100",
    iconColor: "text-slate-700",
  };
};

const getCompactDescription = (appId) => {
  if (appId === "appointment_setter") return "Calling and scheduling";
  if (appId === "chatbot_agents") return "Launchers and embeds";
  if (appId === "users") return "Staff and access";
  return "Workspace";
};

const LauncherTile = ({ app, index }) => {
  const Icon = APP_ICON_MAP[app.iconKey || app.id] || Waves;
  const tone = getTileTone(app.id);

  return (
    <Can I="access" a={app.id}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.2 }}
        className="flex justify-center"
      >
        <Link
          to={app.defaultRoute}
          className="group flex w-[136px] flex-col items-center text-center no-underline md:w-[152px]"
        >
          <div
            className={`flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-gradient-to-br ${tone.iconWrap} shadow-[0_14px_30px_rgba(12,18,32,0.18)] transition duration-200 group-hover:-translate-y-1 group-hover:shadow-[0_20px_34px_rgba(12,18,32,0.28)] md:h-[78px] md:w-[78px]`}
          >
            <Icon className={`h-8 w-8 ${tone.iconColor}`} />
          </div>
          <div className="mt-4 text-[1rem] font-semibold tracking-[-0.02em] text-slate-900 md:text-[1.08rem]">
            {app.label}
          </div>
          <div className="mt-1 text-xs leading-5 text-slate-500">
            {getCompactDescription(app.id)}
          </div>
        </Link>
      </motion.div>
    </Can>
  );
};

const LauncherPage = () => {
  const { user } = useAuth();
  const { activeOrg, apps, branding, entitlements } = usePlatform();

  return (
    <div className="flex flex-col justify-center">
      <section className="launcher-panel relative overflow-hidden rounded-[34px] px-5 py-5 md:px-8 md:py-8 xl:px-10 xl:py-9">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.7),rgba(248,250,252,0.78)),radial-gradient(circle_at_30%_12%,rgba(59,130,246,0.08),transparent_18%),radial-gradient(circle_at_85%_20%,rgba(148,163,184,0.12),transparent_22%)]" />

        <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.8fr)_460px] xl:gap-8">
          <div className="min-w-0 xl:pr-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex items-start gap-4">
                <div className="mt-1 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.24)] md:h-14 md:w-14">
                  <CloudSun className="h-7 w-7 text-slate-700" />
                </div>
                <div>
                  <h1 className="text-[1.95rem] font-normal tracking-[-0.03em] text-slate-900 md:text-[2.2rem]">
                    {getGreeting()}, {user?.first_name || "there"}!
                  </h1>
                  <p className="mt-2 text-sm text-slate-500">
                    {branding?.brand_name || "MindRind"} workspace
                    {activeOrg?.name ? ` - ${activeOrg.name}` : ""}
                  </p>
                  {!entitlements?.appointment_setter_enabled && (
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">
                      Appointment Setter is pending partner approval
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-12">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[0.8rem] tracking-[0.2em] text-slate-500">
                    AI Apps
                  </p>
                </div>
              </div>

              <div className="grid max-w-[760px] grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
                {apps.map((app, index) => (
                  <LauncherTile key={app.id} app={app} index={index} />
                ))}
              </div>
            </div>
          </div>

          <aside className="border-slate-200 xl:border-l xl:pl-8">
            <p className="text-[0.8rem] tracking-[0.2em] text-slate-500">
              Insights
            </p>
            <div className="mt-6 rounded-[28px] bg-slate-50 p-4">
              <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[24px] bg-white px-7 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-100">
                  <Compass className="h-10 w-10 text-slate-400" />
                </div>
                <h2 className="mt-7 text-[1.85rem] font-semibold tracking-[-0.02em] text-slate-900">
                  You&apos;re all caught up!
                </h2>
                <p className="mt-3 max-w-sm text-sm leading-7 text-slate-500">
                  Check back for platform updates, app activity, and shared
                  insights once we connect real workspace feeds.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
};

export default LauncherPage;
