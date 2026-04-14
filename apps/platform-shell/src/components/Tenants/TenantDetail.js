import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building, Calendar, Edit, Info, Mail, Phone, Settings, Users } from 'lucide-react';

import { tenantAPI, agentAPI } from '../../services/api';
import Loader from '../Loader';

const formatTimestamp = (value) =>
  new Date(value).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

const Section = ({ title, icon: Icon, children, action }) => (
  <section className="rounded-[24px] border border-white/8 bg-white/[0.04] p-5">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/8">
          <Icon className="h-4.5 w-4.5 text-sky-200" />
        </div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </div>
      {action}
    </div>
    {children}
  </section>
);

const DetailField = ({ label, value, muted = false }) => (
  <div>
    <dt className="text-[11px] uppercase tracking-[0.2em] text-white/42">{label}</dt>
    <dd className={`mt-2 text-sm leading-6 ${muted ? 'text-white/60' : 'text-white/84'}`}>{value || 'Not configured'}</dd>
  </div>
);

const TenantDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [tenant, setTenant] = useState(null);
  const [businessInfo, setBusinessInfo] = useState(null);
  const [agentSettings, setAgentSettings] = useState(null);
  const [twilioIntegration, setTwilioIntegration] = useState(null);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchTenantDetails();
    }
  }, [id]);

  const fetchTenantDetails = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError('');

      const [tenantRes, businessRes, settingsRes, integrationRes, agentsRes] = await Promise.allSettled([
        tenantAPI.getTenant(id),
        tenantAPI.getBusinessInfo(id).catch(() => null),
        tenantAPI.getAgentSettings(id).catch(() => null),
        tenantAPI.getTwilioIntegration(id).catch(() => null),
        agentAPI.listAgents(id).catch(() => ({ data: [] })),
      ]);

      if (tenantRes.status === 'fulfilled') {
        setTenant(tenantRes.value.data);
      } else {
        throw new Error('Failed to fetch tenant information');
      }

      if (businessRes.status === 'fulfilled' && businessRes.value) {
        setBusinessInfo(businessRes.value.data);
      }

      if (settingsRes.status === 'fulfilled' && settingsRes.value) {
        setAgentSettings(settingsRes.value.data);
      }

      if (integrationRes.status === 'fulfilled' && integrationRes.value) {
        setTwilioIntegration(integrationRes.value.data);
      }

      if (agentsRes.status === 'fulfilled') {
        setAgents(agentsRes.value.data || []);
      }
    } catch (fetchError) {
      const errorDetail = fetchError.response?.data?.detail || fetchError.message;
      setError(typeof errorDetail === 'string' ? errorDetail : 'Failed to load tenant details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loader message="Loading tenant details..." />;
  }

  if (error && !tenant) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate('/app/appointment-setter/tenants')}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tenants
        </button>
        <div className="rounded-2xl border border-rose-300/18 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</div>
      </div>
    );
  }

  if (!tenant) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/app/appointment-setter/tenants')}
            className="mt-1 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white transition hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="text-[0.78rem] uppercase tracking-[0.32em] text-white/68">Tenant Profile</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-white">{tenant.name}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-white/72">
              View tenant identity, business setup, agent readiness, and integration status from a single workspace page.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={fetchTenantDetails}
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Refresh
          </button>
          <Link
            to={`/app/appointment-setter/tenants/${tenant.id}/edit`}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2f66ea] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(19,57,150,0.28)] transition hover:bg-[#295ad0] no-underline"
          >
            <Edit className="h-4 w-4" />
            Edit Tenant
          </Link>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-rose-300/18 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</div>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_340px]">
        <div className="space-y-6">
          <Section title="Basic Information" icon={Info}>
            <dl className="grid gap-5 md:grid-cols-2">
              <DetailField label="Tenant Name" value={tenant.name} />
              <DetailField label="Owner Email" value={tenant.owner_email} />
              <DetailField label="Created" value={formatTimestamp(tenant.created_at)} />
              <DetailField label="Last Updated" value={formatTimestamp(tenant.updated_at)} />
            </dl>
          </Section>

          {businessInfo && (
            <Section title="Business Information" icon={Building}>
              <dl className="grid gap-5 md:grid-cols-2">
                <DetailField label="Business Name" value={businessInfo.business_name} />
                <DetailField label="Phone" value={businessInfo.phone} />
                <DetailField label="Email" value={businessInfo.email} />
                <DetailField label="Address" value={businessInfo.address} />
              </dl>
            </Section>
          )}

          <Section
            title={`Agents (${agents.length})`}
            icon={Users}
            action={
              <Link
                to="/app/appointment-setter/voice-agents"
                className="text-sm font-medium text-sky-100 no-underline transition hover:text-white"
              >
                Manage agents
              </Link>
            }
          >
            {agents.length > 0 ? (
              <div className="space-y-3">
                {agents.slice(0, 6).map((agent) => (
                  <div
                    key={agent.id}
                    className="flex flex-col gap-3 rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{agent.name}</p>
                      <p className="mt-1 text-xs text-white/56">{agent.service_type || 'Service type not set'}</p>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                        agent.status === 'active' ? 'bg-emerald-400/14 text-emerald-200' : 'bg-white/10 text-white/60'
                      }`}
                    >
                      {agent.status}
                    </span>
                  </div>
                ))}
                {agents.length > 6 && <p className="text-sm text-white/52">+{agents.length - 6} more agents</p>}
              </div>
            ) : (
              <p className="text-sm text-white/58">No agents configured yet.</p>
            )}
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Twilio Integration" icon={Phone}>
            {twilioIntegration ? (
              <div className="space-y-3">
                <span className="inline-flex rounded-full bg-emerald-400/14 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                  Connected
                </span>
                {twilioIntegration.account_sid && (
                  <p className="text-sm text-white/66">Account SID: {twilioIntegration.account_sid.substring(0, 10)}...</p>
                )}
                <Link
                  to="/app/appointment-setter/twilio"
                  className="inline-flex text-sm font-medium text-sky-100 no-underline transition hover:text-white"
                >
                  Manage integration
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <span className="inline-flex rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                  Not connected
                </span>
                <Link
                  to="/app/appointment-setter/twilio"
                  className="inline-flex text-sm font-medium text-sky-100 no-underline transition hover:text-white"
                >
                  Set up integration
                </Link>
              </div>
            )}
          </Section>

          {agentSettings && (
            <Section title="Agent Settings" icon={Settings}>
              <p className="text-sm leading-7 text-white/66">
                Custom agent settings are configured for this tenant and are ready to be managed inside the voice agent
                workspace.
              </p>
            </Section>
          )}

          <Section title="Quick Actions" icon={Calendar}>
            <div className="space-y-2">
              <Link
                to="/app/appointment-setter/voice-agents"
                className="block rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/84 no-underline transition hover:bg-white/[0.06]"
              >
                Manage Agents
              </Link>
              <Link
                to="/app/appointment-setter/twilio"
                className="block rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/84 no-underline transition hover:bg-white/[0.06]"
              >
                Twilio Integration
              </Link>
              <Link
                to="/app/appointment-setter/voice-testing"
                className="block rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/84 no-underline transition hover:bg-white/[0.06]"
              >
                Test Voice Agent
              </Link>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
};

export default TenantDetail;
