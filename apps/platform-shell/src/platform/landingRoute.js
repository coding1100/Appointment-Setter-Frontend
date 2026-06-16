export const LAUNCHER_ROUTE = '/apps';
export const APPOINTMENT_SETTER_DASHBOARD_ROUTE = '/app/appointment-setter/dashboard';

export const isBasicUserRole = (user) => String(user?.role || '').toLowerCase() === 'user';

export const getLandingRouteForUser = (user) =>
  isBasicUserRole(user) ? APPOINTMENT_SETTER_DASHBOARD_ROUTE : LAUNCHER_ROUTE;
