import React, { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from './AuthContext';
import { platformAPI } from '../services/api';
import { defineAbilityForBootstrap } from '../platform/ability';
import { PLATFORM_APPS, getAppDefinition } from '../platform/appCatalog';

const PlatformContext = createContext(null);

export const usePlatform = () => {
  const context = useContext(PlatformContext);
  if (!context) {
    throw new Error('usePlatform must be used within a PlatformProvider');
  }
  return context;
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

  const bootstrap = bootstrapQuery.data || null;
  const apps = useMemo(() => mergeAppCatalog(bootstrap?.apps), [bootstrap]);

  const allowedAppIds = useMemo(() => {
    if (bootstrap?.allowed_app_ids?.length) {
      return bootstrap.allowed_app_ids;
    }

    if (!user) {
      return [];
    }

    const role = String(user.role || '').toLowerCase();
    if (role === 'admin') {
      return PLATFORM_APPS.map((app) => app.id);
    }

    return user.allowed_app_ids || ['appointment_setter'];
  }, [bootstrap, user]);

  const ability = useMemo(
    () =>
      defineAbilityForBootstrap({
        user,
        allowed_app_ids: allowedAppIds,
        default_app_id: bootstrap?.default_app_id,
      }),
    [allowedAppIds, bootstrap?.default_app_id, user]
  );

  const defaultApp = useMemo(() => {
    const defaultAppId = bootstrap?.default_app_id || user?.default_app_id || allowedAppIds[0] || 'appointment_setter';
    return getAppDefinition(defaultAppId) || apps.find((app) => app.id === defaultAppId) || apps[0] || PLATFORM_APPS[0];
  }, [allowedAppIds, apps, bootstrap?.default_app_id, user?.default_app_id]);

  const value = useMemo(
    () => ({
      bootstrap,
      apps,
      allowedAppIds,
      ability,
      defaultApp,
      loading: isAuthenticated && (authLoading || bootstrapQuery.isLoading),
      error: bootstrapQuery.error || null,
      hasAppAccess: (appId) => ability.can('access', appId) || ability.can('manage', 'all'),
      getDefaultAppRoute: () => defaultApp?.defaultRoute || '/apps',
      refetchBootstrap: bootstrapQuery.refetch,
      logout,
    }),
    [ability, apps, authLoading, bootstrap, bootstrapQuery.error, bootstrapQuery.isLoading, bootstrapQuery.refetch, defaultApp, isAuthenticated, allowedAppIds, logout]
  );

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
};
