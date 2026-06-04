import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CalendarRange,
  Edit,
  Info,
  Mic2,
  Phone,
  RefreshCw,
  Settings,
  Users,
} from "lucide-react";

import { tenantAPI, agentAPI } from "../../services/api";
import Loader from "../Loader";
import { NAVY, TEAL, TEAL_DEEP } from "../Platform/WorkspaceShellLayout";

const formatTimestamp = (value) =>
  new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const getAgentStatusBadge = (status) => {
  if (status === "active") {
    return "bg-[#68fadd]/25 text-[#006b5c]";
  }
  return "bg-slate-100 text-slate-600";
};

const Section = ({ title, icon: Icon, children, action }) => (
  <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-100"
          style={{ backgroundColor: NAVY }}
        >
          <Icon className="h-4 w-4" style={{ color: TEAL }} strokeWidth={1.75} />
        </div>
        <h2 className="text-base font-semibold tracking-tight" style={{ color: NAVY }}>
          {title}
        </h2>
      </div>
      {action}
    </div>
    <div className="px-4 py-4 sm:px-5">{children}</div>
  </section>
);

const DetailField = ({ label, value }) => (
  <div>
    <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
      {label}
    </dt>
    <dd className="mt-1.5 text-sm font-medium text-slate-800">{value || "Not configured"}</dd>
  </div>
);

const QuickActionLink = ({ to, children }) => (
  <Link
    to={to}
    className="block rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-center font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-700 no-underline transition hover:border-[#68fadd]/40 hover:bg-slate-50"
  >
    {children}
  </Link>
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
  const [error, setError] = useState("");

  useEffect(() => {
    if (id) {
      fetchTenantDetails();
    }
  }, [id]);

  const fetchTenantDetails = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const [tenantRes, businessRes, settingsRes, integrationRes, agentsRes] =
        await Promise.allSettled([
          tenantAPI.getTenant(id),
          tenantAPI.getBusinessInfo(id).catch(() => null),
          tenantAPI.getAgentSettings(id).catch(() => null),
          tenantAPI.getTwilioIntegration(id).catch(() => null),
          agentAPI.listAgents(id).catch(() => ({ data: [] })),
        ]);

      if (tenantRes.status === "fulfilled") {
        setTenant(tenantRes.value.data);
      } else {
        throw new Error("Failed to fetch tenant information");
      }

      if (businessRes.status === "fulfilled" && businessRes.value) {
        setBusinessInfo(businessRes.value.data);
      }

      if (settingsRes.status === "fulfilled" && settingsRes.value) {
        setAgentSettings(settingsRes.value.data);
      }

      if (integrationRes.status === "fulfilled" && integrationRes.value) {
        setTwilioIntegration(integrationRes.value.data);
      }

      if (agentsRes.status === "fulfilled") {
        setAgents(agentsRes.value.data || []);
      }
    } catch (fetchError) {
      const errorDetail =
        fetchError.response?.data?.detail || fetchError.message;
      setError(
        typeof errorDetail === "string"
          ? errorDetail
          : "Failed to load tenant details",
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center">
        <Loader message="Loading customer profile..." />
      </div>
    );
  }

  if (error && !tenant) {
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => navigate("/app/appointment-setter/tenants")}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to customers
        </button>
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </div>
      </div>
    );
  }

  if (!tenant) {
    return null;
  }

  const voiceTestingCreate = `/app/appointment-setter/voice-testing?mode=create&tenantId=${encodeURIComponent(tenant.id)}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate("/app/appointment-setter/tenants")}
            className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
            aria-label="Back to customers"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Customer profile
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight" style={{ color: NAVY }}>
              {tenant.name}
            </h1>
            <p className="mt-0.5 max-w-2xl text-sm text-slate-500">
              Tenant identity, agents, and integration status in one workspace view.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
          <button
            type="button"
            onClick={fetchTenantDetails}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={2} />
            Refresh
          </button>
          <Link
            to={`/app/appointment-setter/tenants/${tenant.id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-white no-underline transition hover:opacity-90"
            style={{ backgroundColor: NAVY }}
          >
            <Edit className="h-4 w-4" />
            Edit tenant
          </Link>
        </div>
      </div>

      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchTenantDetails}
            className="font-mono text-[10px] font-semibold uppercase tracking-wider text-rose-700 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_300px]">
        <div className="space-y-5">
          <Section title="Basic information" icon={Info}>
            <dl className="grid gap-5 sm:grid-cols-2">
              <DetailField label="Tenant name" value={tenant.name} />
              <DetailField label="Owner email" value={tenant.owner_email} />
              <DetailField label="Created" value={formatTimestamp(tenant.created_at)} />
              <DetailField label="Last updated" value={formatTimestamp(tenant.updated_at)} />
            </dl>
          </Section>

          {businessInfo ? (
            <Section title="Business information" icon={Building2}>
              <dl className="grid gap-5 sm:grid-cols-2">
                <DetailField label="Business name" value={businessInfo.business_name} />
                <DetailField label="Phone" value={businessInfo.phone} />
                <DetailField label="Email" value={businessInfo.email} />
                <DetailField label="Address" value={businessInfo.address} />
              </dl>
            </Section>
          ) : null}

          <Section
            title={`Voice agents (${agents.length})`}
            icon={Users}
            action={
              <Link
                to="/app/appointment-setter/voice-agents"
                className="font-mono text-[10px] font-semibold uppercase tracking-wider no-underline transition hover:underline"
                style={{ color: TEAL_DEEP }}
              >
                Manage agents
              </Link>
            }
          >
            {agents.length > 0 ? (
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {agents.slice(0, 6).map((agent) => (
                  <div
                    key={agent.id}
                    className="flex flex-col gap-2 px-4 py-3 transition hover:bg-slate-50/80 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-100"
                        style={{ backgroundColor: NAVY }}
                      >
                        <Mic2 className="h-4 w-4" style={{ color: TEAL }} />
                      </div>
                      <div className="min-w-0">
                        <Link
                          to={`/app/appointment-setter/voice-testing?mode=edit&tenantId=${encodeURIComponent(tenant.id)}&agentId=${encodeURIComponent(agent.id)}`}
                          className="truncate text-sm font-semibold no-underline transition hover:underline"
                          style={{ color: NAVY }}
                        >
                          {agent.name}
                        </Link>
                        <p className="mt-0.5 truncate text-xs capitalize text-slate-500">
                          {agent.service_type || "Service type not set"}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex w-fit rounded-full px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide ${getAgentStatusBadge(agent.status)}`}
                    >
                      {agent.status === "active" ? "Deployed" : agent.status}
                    </span>
                  </div>
                ))}
                {agents.length > 6 ? (
                  <p className="px-4 py-2 text-xs text-slate-500">
                    +{agents.length - 6} more agents in voice workspace
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No voice agents configured yet.</p>
            )}
          </Section>
        </div>

        <div className="space-y-5">
          <Section title="Twilio integration" icon={Phone}>
            {twilioIntegration ? (
              <div className="space-y-3">
                <span className="inline-flex rounded-full bg-[#68fadd]/25 px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide text-[#006b5c]">
                  Connected
                </span>
                {twilioIntegration.account_sid ? (
                  <p className="font-mono text-xs text-slate-600">
                    Account SID: {twilioIntegration.account_sid.substring(0, 12)}…
                  </p>
                ) : null}
                <Link
                  to="/app/appointment-setter/twilio"
                  className="inline-block font-mono text-[10px] font-semibold uppercase tracking-wider no-underline transition hover:underline"
                  style={{ color: TEAL_DEEP }}
                >
                  Manage integration
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide text-slate-600">
                  Not connected
                </span>
                <Link
                  to="/app/appointment-setter/twilio"
                  className="inline-block font-mono text-[10px] font-semibold uppercase tracking-wider no-underline transition hover:underline"
                  style={{ color: TEAL_DEEP }}
                >
                  Set up integration
                </Link>
              </div>
            )}
          </Section>

          {agentSettings ? (
            <Section title="Agent settings" icon={Settings}>
              <p className="text-sm leading-6 text-slate-600">
                Custom agent settings are configured for this tenant. Manage them in the voice
                agent workspace.
              </p>
            </Section>
          ) : null}

          <Section title="Quick actions" icon={CalendarRange}>
            <div className="space-y-2">
              <QuickActionLink to="/app/appointment-setter/voice-agents">
                Manage agents
              </QuickActionLink>
              <QuickActionLink to="/app/appointment-setter/twilio">
                Twilio integration
              </QuickActionLink>
              <QuickActionLink to={voiceTestingCreate}>Test voice agent</QuickActionLink>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
};

export default TenantDetail;
