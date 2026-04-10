import React from 'react';
import { Ability, AbilityBuilder } from '@casl/ability';
import { createContextualCan } from '@casl/react';

import { PLATFORM_APPS } from './appCatalog';

export const AbilityContext = React.createContext(null);
export const Can = createContextualCan(AbilityContext.Consumer);

export const defineAbilityForBootstrap = (bootstrap) => {
  const { can, build } = new AbilityBuilder(Ability);
  const userRole = String(bootstrap?.user?.role || '').toLowerCase();
  const allowedAppIds = bootstrap?.allowed_app_ids || [];

  can('view', 'launcher');

  if (userRole === 'admin') {
    can('manage', 'all');
    PLATFORM_APPS.forEach((app) => can('access', app.id));
    return build();
  }

  allowedAppIds.forEach((appId) => can('access', appId));

  if (userRole === 'tenant_admin') {
    can('manage', 'appointment_setter');
  }

  if (userRole === 'tenant_user' || userRole === 'user') {
    can('view', 'appointment_setter');
    can('view', 'chatbot_agents');
  }

  return build();
};
