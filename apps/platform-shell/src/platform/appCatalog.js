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
import { getAppName } from '../utils/appName';

export const PLATFORM_APPS = [
  {
    id: 'appointment_setter',
    slug: 'appointment-setter',
    label: getAppName(),
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
  chatbot_agents: Bot,
  users: Users,
};

export const APP_WORKSPACE_NAV = {
  appointment_setter: [
    { to: '/app/appointment-setter/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/app/appointment-setter/tenants', label: 'Customers', icon: Users },
    { to: '/app/appointment-setter/voice-agents', label: 'Voice Agents', icon: Mic2 },
    { to: '/app/appointment-setter/appointments', label: 'Appointments', icon: CalendarRange },
    { to: '/app/appointment-setter/voice-testing', label: 'Voice Testing', icon: RadioTower },
    { to: '/app/appointment-setter/twilio', label: 'Twilio', icon: Settings2 },
    // Telephony and Cold Caller are intentionally hidden from the active platform nav for now.
    // { to: '/app/appointment-setter/telephony', label: 'Telephony', icon: Network },
    // { to: '/app/appointment-setter/cold-caller', label: 'Cold Caller', icon: PhoneCall },
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
