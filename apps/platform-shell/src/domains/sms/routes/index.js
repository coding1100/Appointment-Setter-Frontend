import React, { lazy } from 'react';
import { Navigate } from 'react-router-dom';

import RouteSuspense from '../../../shared/ui/RouteSuspense';

const SmsDashboardPage = lazy(() => import('../pages/SmsDashboardPage'));
const SmsLeadsPage = lazy(() => import('../pages/SmsLeadsPage'));
const SmsCampaignsPage = lazy(() => import('../pages/SmsCampaignsPage'));
const SmsInboxPage = lazy(() => import('../pages/SmsInboxPage'));
const SmsSuppressionsPage = lazy(() => import('../pages/SmsSuppressionsPage'));
const SmsSettingsPage = lazy(() => import('../pages/SmsSettingsPage'));
const SmsTestPage = lazy(() => import('../pages/SmsTestPage'));

const withSuspense = (Component, message) => (
  <RouteSuspense message={message}>
    <Component />
  </RouteSuspense>
);

export const getSmsRoutes = () => [
  { index: true, element: <Navigate to="/app/sms/dashboard" replace /> },
  { path: 'dashboard', element: withSuspense(SmsDashboardPage, 'Loading SMS overview...') },
  { path: 'leads', element: withSuspense(SmsLeadsPage, 'Loading leads...') },
  { path: 'campaigns', element: withSuspense(SmsCampaignsPage, 'Loading campaigns...') },
  { path: 'inbox', element: withSuspense(SmsInboxPage, 'Loading inbox...') },
  { path: 'suppressions', element: withSuspense(SmsSuppressionsPage, 'Loading suppressions...') },
  { path: 'settings', element: withSuspense(SmsSettingsPage, 'Loading settings...') },
  { path: 'test', element: withSuspense(SmsTestPage, 'Loading test...') },
  { path: '*', element: <Navigate to="/app/sms/dashboard" replace /> },
];
