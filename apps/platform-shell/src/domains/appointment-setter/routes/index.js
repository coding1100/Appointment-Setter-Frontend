import React, { lazy } from 'react';
import { Navigate } from 'react-router-dom';

import RouteSuspense from '../../../shared/ui/RouteSuspense';

const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const AppointmentListPage = lazy(() => import('../pages/AppointmentListPage'));
const TenantListPage = lazy(() => import('../pages/TenantListPage'));
const TenantCreatePage = lazy(() => import('../pages/TenantCreatePage'));
const TenantDetailPage = lazy(() => import('../pages/TenantDetailPage'));
const TenantEditPage = lazy(() => import('../pages/TenantEditPage'));
const VoiceAgentsPage = lazy(() => import('../pages/VoiceAgentsPage'));
const VoiceTestingPage = lazy(() => import('../pages/VoiceTestingPage'));
const TwilioPage = lazy(() => import('../pages/TwilioPage'));

const withSuspense = (Component, message) => (
  <RouteSuspense message={message}>
    <Component />
  </RouteSuspense>
);

export const getAppointmentSetterRoutes = () => [
  { index: true, element: <Navigate to="dashboard" replace /> },
  { path: 'dashboard', element: withSuspense(DashboardPage, 'Loading dashboard...') },
  { path: 'appointments', element: withSuspense(AppointmentListPage, 'Loading appointments...') },
  { path: 'tenants', element: withSuspense(TenantListPage, 'Loading tenants...') },
  { path: 'tenants/create', element: withSuspense(TenantCreatePage, 'Loading tenant form...') },
  { path: 'tenants/:id', element: withSuspense(TenantDetailPage, 'Loading tenant details...') },
  { path: 'tenants/:id/edit', element: withSuspense(TenantEditPage, 'Loading tenant form...') },
  { path: 'voice-agents', element: withSuspense(VoiceAgentsPage, 'Loading voice agents...') },
  { path: 'voice-testing', element: withSuspense(VoiceTestingPage, 'Loading voice testing...') },
  { path: 'twilio', element: withSuspense(TwilioPage, 'Loading Twilio workspace...') },
  { path: '*', element: <Navigate to="/app/appointment-setter/dashboard" replace /> },
];

