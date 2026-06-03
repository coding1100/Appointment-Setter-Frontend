import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';

import { useAuth } from './AuthContext';
import { platformAPI } from '../services/api';
import { defineAbilityForBootstrap } from '../platform/ability';
import { PLATFORM_APPS, getAppDefinition } from '../platform/appCatalog';

const PlatformContext = createContext(null);

const DEFAULT_BRANDING = {
  brand_name: 'MindRind',
  logo_url: null,
  primary_color: '#0f172a',
  secondary_color: '#ffffff',
  accent_color: '#f59e0b',
};

const isOrgStatusBlocked = (status) => {
  const normalized = String(status || '').trim().toLowerCase();
  return normalized === 'inactive' || normalized === 'suspended';
};

const mergeAppCatalog = (apps = []) => {
  const backendApps = Array.isArray(apps) ? apps : [];
  if (backendApps.length === 0) {
    return PLATFORM_APPS;
  }

  return backendApps.map((app) => {
    const fallback = getAppDefinition(app.id);
    return {
      ...fallback,
      ...app,
      iconKey: app.icon_key || fallback?.iconKey || app.id,
      defaultRoute: app.default_route || fallback?.defaultRoute || '/apps',
    };
  });
};

const applyBrandingTheme = (branding) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const safe = { ...DEFAULT_BRANDING, ...(branding || {}) };

  root.style.setProperty('--brand-primary', safe.primary_color || DEFAULT_BRANDING.primary_color);
  root.style.setProperty('--brand-secondary', safe.secondary_color || DEFAULT_BRANDING.secondary_color);
  root.style.setProperty('--brand-accent', safe.accent_color || DEFAULT_BRANDING.accent_color);
  root.style.setProperty('--color-text', safe.primary_color || DEFAULT_BRANDING.primary_color);
};

export const usePlatform = () => {
  const context = useContext(PlatformContext);
  if (!context) {
    throw new Error('usePlatform must be used within a PlatformProvider');
  }
  return context;
};

export const PlatformProvider = ({ children }) => {
  const { isAuthenticated, loading: authLoading, user, logout } = useAuth();

  const bootstrapQuery = useQuery({
    queryKey: ['platform', 'bootstrap'],
    queryFn: async () => {
      const response = await platformAPI.getBootstrap();
      return response.data;
    },
    enabled: isAuthenticated && !authLoading,
    staleTime: 60 * 1000,
  });

  const switchOrgMutation = useMutation({
    mutationFn: async (orgId) => {
      await platformAPI.setActiveOrg(orgId);
      return orgId;
    },
    onSuccess: async () => {
      await bootstrapQuery.refetch();
    },
  });

  const bootstrap = bootstrapQuery.data || null;
  const actor = bootstrap?.actor || (bootstrap?.user ? { ...bootstrap.user, memberships: user?.org_memberships || [] } : user) || null;
  const branding = bootstrap?.branding || DEFAULT_BRANDING;
  const apps = useMemo(() => mergeAppCatalog(bootstrap?.apps), [bootstrap]);
  const activeOrg = bootstrap?.active_org || null;
  const accessibleOrgs = bootstrap?.accessible_orgs || [];
  const switchableOrgs = useMemo(() => accessibleOrgs.filter((org) => !isOrgStatusBlocked(org?.status)), [accessibleOrgs]);
  const entitlements = bootstrap?.entitlements || { appointment_setter_enabled: true };
  const actorRole = String(actor?.role || '').toLowerCase();
  const isPlatformAdmin = useMemo(() => {
    const membershipRoles = (actor?.memberships || []).map((membership) => String(membership?.role || '').toLowerCase());
    return actorRole === 'admin' || membershipRoles.some((role) => role.startsWith('platform_'));
  }, [actor?.memberships, actorRole]);
  const canSwitchOrg = !isPlatformAdmin && switchableOrgs.length > 1;
  const accessBlocked = bootstrapQuery.error?.response?.status === 403;
  const accessBlockedMessage =
    bootstrapQuery.error?.response?.data?.detail || 'Your organization access is currently unavailable.';

  const allowedAppIds = useMemo(() => {
    if (bootstrap?.allowed_app_ids_effective?.length) {
      return bootstrap.allowed_app_ids_effective;
    }
    if (bootstrap?.allowed_app_ids?.length) {
      return bootstrap.allowed_app_ids;
    }
    if (bootstrap?.user?.allowed_app_ids?.length) {
      return bootstrap.user.allowed_app_ids;
    }

    const role = String(actor?.role || '').toLowerCase();
    if (role === 'admin' || role.startsWith('platform_')) {
      return PLATFORM_APPS.map((app) => app.id);
    }
    return ['appointment_setter'];
  }, [bootstrap, actor?.role]);

  const ability = useMemo(
    () =>
      defineAbilityForBootstrap({
        actor,
        user: actor,
        allowed_app_ids: allowedAppIds,
        allowed_app_ids_effective: allowedAppIds,
        permissions: bootstrap?.permissions || [],
        default_app_id: bootstrap?.default_app_id,
      }),
    [actor, allowedAppIds, bootstrap?.default_app_id, bootstrap?.permissions]
  );

  const defaultApp = useMemo(() => {
    const defaultAppId = bootstrap?.default_app_id || bootstrap?.user?.default_app_id || allowedAppIds[0] || 'appointment_setter';
    return getAppDefinition(defaultAppId) || apps.find((app) => app.id === defaultAppId) || apps[0] || PLATFORM_APPS[0];
  }, [allowedAppIds, apps, bootstrap?.default_app_id, bootstrap?.user?.default_app_id]);

  useEffect(() => {
    applyBrandingTheme(branding);
  }, [branding]);

  const value = useMemo(
    () => ({
      bootstrap,
      actor,
      activeOrg,
      accessibleOrgs,
      switchableOrgs,
      branding,
      entitlements,
      isPlatformAdmin,
      canSwitchOrg,
      apps,
      allowedAppIds,
      ability,
      defaultApp,
      loading: isAuthenticated && (authLoading || bootstrapQuery.isLoading),
      error: bootstrapQuery.error || null,
      accessBlocked,
      accessBlockedMessage,
      hasAppAccess: (appId) => ability.can('access', appId) || ability.can('manage', 'all'),
      getDefaultAppRoute: () => defaultApp?.defaultRoute || '/apps',
      refetchBootstrap: bootstrapQuery.refetch,
      switchActiveOrg: (orgId) => switchOrgMutation.mutateAsync(orgId),
      switchOrgLoading: switchOrgMutation.isPending,
      logout,
    }),
    [
      ability,
      activeOrg,
      actor,
      apps,
      authLoading,
      bootstrap,
      bootstrapQuery.error,
      bootstrapQuery.isLoading,
      bootstrapQuery.refetch,
      accessBlocked,
      accessBlockedMessage,
      branding,
      defaultApp,
      entitlements,
      isPlatformAdmin,
      canSwitchOrg,
      isAuthenticated,
      allowedAppIds,
      logout,
      accessibleOrgs,
      switchableOrgs,
      switchOrgMutation.isPending,
      switchOrgMutation.mutateAsync,
    ]
  );

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
};
