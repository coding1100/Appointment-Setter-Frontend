import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';
import { tenantAPI } from '../../services/api';
import AgentList from '../Agents/AgentList';
import Loader from '../Loader';
import { getAppName } from '../../utils/appName';
import { NAVY } from './WorkspaceShellLayout';

const VoiceAgentsPage = () => {
  const { user } = useAuth();
  const [selectedTenant, setSelectedTenant] = useState('');

  const tenantQuery = useQuery({
    queryKey: ['tenants', 'voice-agents', user?.role, user?.tenant_id || 'global'],
    queryFn: async () => {
      const role = String(user?.role || '').toLowerCase();

      if (role === 'admin') {
        const response = await tenantAPI.listTenants();
        return Array.isArray(response.data) ? response.data : [];
      }

      if (user?.tenant_id) {
        const response = await tenantAPI.getTenant(user.tenant_id);
        return response.data ? [response.data] : [];
      }

      return [];
    },
    enabled: !!user,
  });

  const tenants = useMemo(() => tenantQuery.data || [], [tenantQuery.data]);

  useEffect(() => {
    if (!selectedTenant && tenants.length > 0) {
      setSelectedTenant(tenants[0].id);
    }
  }, [selectedTenant, tenants]);

  if (tenantQuery.isLoading) {
    return <Loader message="Loading voice agents..." />;
  }

  if (tenantQuery.isError) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4">
        <h1 className="text-2xl font-semibold" style={{ color: NAVY }}>
          Voice Agents
        </h1>
        <p className="mt-2 text-sm text-rose-700">
          We could not load the tenant list needed for voice agents.
        </p>
      </div>
    );
  }

  if (tenants.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
        <Building2 className="mx-auto h-14 w-14 text-slate-400" />
        <h1 className="mt-5 text-2xl font-semibold" style={{ color: NAVY }}>
          No tenants available
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500">
          Create a tenant before adding a voice agent workspace. Once a tenant exists, this page
          becomes the focused voice-agent management surface for {getAppName()}.
        </p>
        <Link
          to="/app/appointment-setter/tenants/create"
          className="mt-6 inline-flex rounded-lg px-5 py-3 text-sm font-semibold text-white no-underline transition hover:opacity-90"
          style={{ backgroundColor: NAVY }}
        >
          Create tenant
        </Link>
      </div>
    );
  }

  return (
    <div>
      {selectedTenant ? (
        <AgentList
          tenantId={selectedTenant}
          variant="agentic"
          tenants={tenants}
          selectedTenant={selectedTenant}
          onTenantChange={setSelectedTenant}
        />
      ) : null}
    </div>
  );
};

export default VoiceAgentsPage;
