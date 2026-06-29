import { usePlatform } from '../../contexts/PlatformContext';

/**
 * Resolve the operational tenant_id for the SMS app from the active org.
 *
 * Orgs map to legacy tenants via `legacy_tenant_id`. For customer orgs that is
 * the tenant scope all SMS data is keyed on. Falls back to the actor's legacy
 * `tenant_id`, then the org id itself.
 */
export const useSmsTenant = () => {
  const { activeOrg, actor } = usePlatform();
  const tenantId =
    activeOrg?.legacy_tenant_id ||
    actor?.tenant_id ||
    actor?.active_org_id ||
    activeOrg?.id ||
    null;
  return { tenantId, activeOrg };
};
