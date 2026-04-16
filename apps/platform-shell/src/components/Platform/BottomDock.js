import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, LayoutGrid, Sparkles } from "lucide-react";
import { getAppName } from "../../utils/appName";

const PATHS = {
  apps: "/apps",
  home: "/app",
  chatbotAgents: "/app/chatbot-agents",
  appointmentSetterDashboard: "/app/appointment-setter/dashboard",
};

const getDockLinks = (pathname) => {
  const path = pathname || "";
  const appointmentSetterName = getAppName();

  const isAppsRoute = path === PATHS.apps;
  const isChatbotAgentsRoute =
    path === PATHS.chatbotAgents || path.startsWith(`${PATHS.chatbotAgents}/`);
  const isAppointmentSetterDashboardRoute =
    path === PATHS.appointmentSetterDashboard ||
    path.startsWith(`${PATHS.appointmentSetterDashboard}/`);

  if (isAppsRoute) {
    return [
      { to: PATHS.chatbotAgents, label: "Chatbot Agents", icon: Sparkles },
      {
        to: PATHS.appointmentSetterDashboard,
        label: appointmentSetterName,
        icon: LayoutGrid,
      },
    ];
  }

  if (isChatbotAgentsRoute) {
    return [
      { to: PATHS.home, label: "Home", icon: Home },
      {
        to: PATHS.appointmentSetterDashboard,
        label: appointmentSetterName,
        icon: LayoutGrid,
      },
    ];
  }

  if (isAppointmentSetterDashboardRoute) {
    return [
      { to: PATHS.home, label: "Home", icon: Home },
      { to: PATHS.chatbotAgents, label: "Chatbot Agents", icon: Sparkles },
    ];
  }

  return [
    { to: PATHS.home, label: "Home", icon: Home },
    { to: PATHS.apps, label: "Apps", icon: LayoutGrid },
  ];
};

const BottomDock = () => {
  const location = useLocation();
  const pathname = location?.pathname || "";

  if (pathname === PATHS.apps || pathname === `${PATHS.apps}/`) {
    return null;
  }

  const dockLinks = getDockLinks(pathname);

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4">
      <div className="launcher-dock pointer-events-auto">
        {dockLinks.map((item, index) => {
          const Icon = item.icon;
          const isPrimary = index === 1;

          return (
            <Link
              key={item.label}
              to={item.to}
              className={`flex h-14 w-14 items-center justify-center rounded-[18px] border no-underline transition border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
              aria-label={item.label}
            >
              <Icon className="h-5 w-5" />
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default BottomDock;
