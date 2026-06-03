import React, { lazy } from "react";
import { Navigate } from "react-router-dom";

import RouteSuspense from "../../../shared/ui/RouteSuspense";
import { usePlatform } from "../../../contexts/PlatformContext";

const PlatformUsersPage = lazy(() => import("../pages/PlatformUsersPage"));
const PartnersPage = lazy(() => import("../pages/PartnersPage"));
const CustomersPage = lazy(() => import("../pages/CustomersPage"));

const UsersIndexRedirect = () => {
  const { actor, bootstrap } = usePlatform();
  const isPlatformAdmin =
    String(actor?.role || "").toLowerCase() === "admin" ||
    (actor?.memberships || []).some((membership) =>
      String(membership?.role || "").toLowerCase() === "platform_owner"
    );
  const permissions = new Set((bootstrap?.permissions || []).map((permission) => String(permission).trim()));
  const isPartnerScoped = (actor?.memberships || []).some((membership) =>
    String(membership?.role || "").toLowerCase().startsWith("partner_")
  );

  if (isPlatformAdmin || permissions.has("users:read") || permissions.has("users:write") || permissions.has("roles:read") || permissions.has("roles:write")) {
    return <Navigate to="/app/users/platform-users" replace />;
  }

  if (permissions.has("partners:read") || permissions.has("partners:write") || permissions.has("entitlements:write")) {
    return <Navigate to="/app/users/partners" replace />;
  }

  if (isPartnerScoped || permissions.has("customers:read") || permissions.has("customers:write")) {
    return <Navigate to="/app/users/customers" replace />;
  }

  return <Navigate to="/app/users/platform-users" replace />;
};

const withSuspense = (Component, message) => (
  <RouteSuspense message={message}>
    <Component />
  </RouteSuspense>
);

export const getUsersRoutes = () => [
  { index: true, element: <UsersIndexRedirect /> },
  { path: "platform-users", element: withSuspense(PlatformUsersPage, "Loading platform users...") },
  { path: "partners", element: withSuspense(PartnersPage, "Loading partners...") },
  { path: "customers", element: withSuspense(CustomersPage, "Loading customers...") },
  { path: "*", element: <Navigate to="/app/users" replace /> },
];
