import {
  Building2,
  Bot,
  CalendarRange,
  CircleEllipsis,
  LayoutDashboard,
  Mic2,
  RadioTower,
  Settings2,
  Users,
} from 'lucide-react';
export const PLATFORM_APPS = [
  {
    id: 'appointment_setter',
    slug: 'appointment-setter',
    label: 'Dashboard',
    iconKey: 'appointment_setter',
    defaultRoute: '/app/appointment-setter/dashboard',
    accent: 'from-amber-400/30 via-amber-300/10 to-transparent',
  },
  {
    id: 'chatbot_agents',
    slug: 'chatbot-agents',
    label: 'Chatbot Agents',
    iconKey: 'chatbot_agents',
    defaultRoute: '/app/chatbot-agents',
    accent: 'from-sky-400/30 via-sky-300/10 to-transparent',
  },
  {
    id: 'users',
    slug: 'users',
    label: 'Users',
    iconKey: 'users',
    defaultRoute: '/app/users',
    accent: 'from-emerald-400/30 via-emerald-300/10 to-transparent',
  },
];

export const APP_ICON_MAP = {
  appointment_setter: CalendarRange,
  dashboard: LayoutDashboard,
  agent: Mic2,
  chatbot_agents: Bot,
  users: Users,
};

const APPOINTMENT_SETTER_SIDEBAR_GROUPS = [
  {
    label: 'Dashboard',
    iconKey: 'dashboard',
    items: [
      { to: '/app/appointment-setter/dashboard', label: 'Overview', icon: LayoutDashboard },
      { to: '/app/appointment-setter/tenants', label: 'Customers', icon: Users },
    ],
  },
  {
    label: 'Agent',
    iconKey: 'agent',
    items: [
      {
        to: '/app/appointment-setter/voice-agents',
        label: 'Voice Agents',
        icon: Mic2,
        activeFor: ['/app/appointment-setter/voice-testing'],
      },
      { to: '/app/appointment-setter/twilio', label: 'Telephony', icon: Settings2 },
    ],
  },
];

const APPOINTMENT_SETTER_HIDDEN_NAV = [
  {
    to: '/app/appointment-setter/voice-testing',
    label: 'Agent Configuration',
    groupLabel: 'Agent',
    icon: RadioTower,
  },
];

export const APP_SIDEBAR_GROUPS = {
  appointment_setter: APPOINTMENT_SETTER_SIDEBAR_GROUPS,
};

export const APP_HIDDEN_NAV = {
  appointment_setter: APPOINTMENT_SETTER_HIDDEN_NAV,
};

export const APP_WORKSPACE_NAV = {
  appointment_setter: [
    ...APPOINTMENT_SETTER_SIDEBAR_GROUPS.flatMap((group) => group.items),
    ...APPOINTMENT_SETTER_HIDDEN_NAV,
  ],
  chatbot_agents: [
    { to: '/app/chatbot-agents', label: 'Workspace', icon: Bot },
    { to: '/app/chatbot-agents/live', label: 'Live Chats', icon: CircleEllipsis },
  ],
  users: [
    { to: '/app/users/platform-users', label: 'Platform Users', icon: Users },
    { to: '/app/users/partners', label: 'Partners', icon: Building2 },
    { to: '/app/users/customers', label: 'Customers', icon: CircleEllipsis },
  ],
};

export const getAppDefinition = (appId) => PLATFORM_APPS.find((app) => app.id === appId) || null;
