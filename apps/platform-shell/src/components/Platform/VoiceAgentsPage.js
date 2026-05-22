import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Mic2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';
import { tenantAPI } from '../../services/api';
import AgentList from '../Agents/AgentList';
import Loader from '../Loader';
import { getAppName } from '../../utils/appName';

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
      <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4">
        <h1 className="text-2xl font-semibold text-slate-50">Voice Agents</h1>
        <p className="mt-2 text-sm text-rose-700">We could not load the tenant list needed for voice agents.</p>
      </div>
    );
  }

  if (tenants.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
        <Building2 className="mx-auto h-14 w-14 text-slate-500" />
        <h1 className="mt-5 text-2xl font-semibold text-slate-50">No tenants available</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-300">
          Create a tenant before adding a voice agent workspace. Once a tenant exists, this page becomes the focused
          voice-agent management surface for {getAppName()}.
        </p>
        <Link
          to="/app/appointment-setter/tenants/create"
          className="mt-6 inline-flex rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-700 no-underline transition hover:bg-amber-50"
        >
          Create tenant
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[0.78rem] uppercase tracking-[0.32em] text-slate-700">Voice Agent Workspace</p>
          <h1 className="mt-3 flex items-center gap-3 text-3xl font-semibold text-black">
            <Mic2 className="h-7 w-7 text-amber-700" />
            Voice Agents
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-700">
            Keep agent setup, activation, and behavior adjustments inside one compact workspace for each tenant.
          </p>
        </div>

        {tenants.length > 1 && (
          <div className="w-full max-w-sm">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.28em] text-slate-700">
              Active tenant
            </label>
            <select
              value={selectedTenant}
              onChange={(event) => setSelectedTenant(event.target.value)}
              className="shell-input"
            >
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {selectedTenant && <AgentList tenantId={selectedTenant} />}
    </div>
  );
};

export default VoiceAgentsPage;
