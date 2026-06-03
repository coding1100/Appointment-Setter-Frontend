import React from 'react';
import { Ability, AbilityBuilder } from '@casl/ability';
import { createContextualCan } from '@casl/react';

const PLATFORM_APP_IDS = ['appointment_setter', 'chatbot_agents', 'users'];

export const AbilityContext = React.createContext(null);
export const Can = createContextualCan(AbilityContext.Consumer);

export const defineAbilityForBootstrap = (bootstrap) => {
  const { can, build } = new AbilityBuilder(Ability);
  const actor = bootstrap?.actor || bootstrap?.user || {};
  const userRole = String(actor?.role || '').toLowerCase();
  const allowedAppIds = bootstrap?.allowed_app_ids_effective || bootstrap?.allowed_app_ids || [];
  const grantedPermissions = Array.isArray(bootstrap?.permissions) ? bootstrap.permissions : [];
  const permissionSet = new Set(grantedPermissions.map((permission) => String(permission).trim()));
  const memberships = actor?.memberships || [];
  const hasPlatformMembership = memberships.some((membership) => String(membership?.role || '').toLowerCase().startsWith('platform_'));
  const hasPartnerMembership = memberships.some((membership) => String(membership?.role || '').toLowerCase().startsWith('partner_'));
  const isPlatformOwner = memberships.some((membership) => String(membership?.role || '').toLowerCase() === 'platform_owner');

  can('view', 'launcher');

  if (userRole === 'admin' || isPlatformOwner || permissionSet.has('admin:all')) {
    can('manage', 'all');
    PLATFORM_APP_IDS.forEach((appId) => can('access', appId));
    return build();
  }

  allowedAppIds.forEach((appId) => can('access', appId));

  if (permissionSet.has('users:read') || permissionSet.has('users:write')) {
    can('view', 'platform_users');
  }
  if (permissionSet.has('users:write')) {
    can('manage', 'platform_users');
  }

  if (permissionSet.has('roles:read') || permissionSet.has('roles:write')) {
    can('view', 'platform_roles');
  }
  if (permissionSet.has('roles:write')) {
    can('manage', 'platform_roles');
  }

  if (permissionSet.has('partners:read') || permissionSet.has('partners:write') || permissionSet.has('entitlements:write')) {
    can('view', 'partners');
  }
  if (permissionSet.has('partners:write')) {
    can('manage', 'partners');
  }
  if (permissionSet.has('entitlements:write')) {
    can('manage', 'entitlements');
  }

  if (permissionSet.has('customers:read') || permissionSet.has('customers:write')) {
    can('view', 'customers');
  }
  if (permissionSet.has('customers:write')) {
    can('manage', 'customers');
  }
  if (hasPartnerMembership) {
    can('view', 'customers');
  }

  if (userRole === 'tenant_admin' || userRole === 'partner_admin' || userRole === 'customer_owner') {
    can('manage', 'appointment_setter');
  }

  if (
    permissionSet.has('appointment_setter:write') ||
    permissionSet.has('appointment_setter:read')
  ) {
    if (permissionSet.has('appointment_setter:write')) {
      can('manage', 'appointment_setter');
    } else {
      can('view', 'appointment_setter');
    }
  } else if (userRole === 'tenant_user' || userRole === 'user' || userRole === 'partner_staff' || userRole === 'customer_staff' || hasPlatformMembership) {
    can('view', 'appointment_setter');
    can('view', 'chatbot_agents');
  }

  return build();
};
