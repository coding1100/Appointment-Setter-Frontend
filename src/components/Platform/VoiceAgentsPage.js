import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Mic2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';
import { tenantAPI } from '../../services/api';
import AgentList from '../Agents/AgentList';
import Loader from '../Loader';

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
      <div className="rounded-[24px] border border-rose-300/18 bg-rose-400/10 px-5 py-4">
        <h1 className="text-2xl font-semibold text-slate-50">Voice Agents</h1>
        <p className="mt-2 text-sm text-rose-100">We could not load the tenant list needed for voice agents.</p>
      </div>
    );
  }

  if (tenants.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-white/12 bg-white/[0.03] px-6 py-12 text-center">
        <Building2 className="mx-auto h-14 w-14 text-slate-500" />
        <h1 className="mt-5 text-2xl font-semibold text-slate-50">No tenants available</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-300">
          Create a tenant before adding a voice agent workspace. Once a tenant exists, this page becomes the focused
          voice-agent management surface for Appointment Setter.
        </p>
        <Link
          to="/app/appointment-setter/tenants/create"
          className="mt-6 inline-flex rounded-2xl border border-amber-300/30 bg-amber-200/10 px-5 py-3 text-sm font-semibold text-amber-100 no-underline transition hover:bg-amber-200/20"
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
          <p className="text-[0.78rem] uppercase tracking-[0.32em] text-white/68">Voice Agent Workspace</p>
          <h1 className="mt-3 flex items-center gap-3 text-3xl font-semibold text-slate-50">
            <Mic2 className="h-7 w-7 text-amber-200" />
            Voice Agents
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-white/72">
            Keep agent setup, activation, and behavior adjustments inside one compact workspace for each tenant.
          </p>
        </div>

        {tenants.length > 1 && (
          <div className="w-full max-w-sm">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
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
