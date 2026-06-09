import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Building2, Eye, Plus, RefreshCw, Settings } from "lucide-react";

import { tenantAPI } from "../../services/api";
import Loader from "../Loader";
import { NAVY, TEAL } from "../Platform/WorkspaceShellLayout";
import { getAppName } from "../../utils/appName";

const iconBtnBase =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1";

const formatTimestamp = (value) =>
  new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const TenantRowActions = ({ tenantId, tenantName }) => (
  <div
    className="inline-flex flex-nowrap items-center justify-center rounded-md border border-slate-200 bg-white p-0.5 shadow-sm"
    role="group"
    aria-label={`Actions for ${tenantName}`}
  >
    <Link
      to={`/app/appointment-setter/tenants/${tenantId}`}
      title="View"
      aria-label={`View ${tenantName}`}
      className={`${iconBtnBase} rounded-l-[5px] text-slate-600 no-underline hover:bg-slate-100 focus-visible:outline-slate-400`}
    >
      <Eye className="h-4 w-4" strokeWidth={2} />
    </Link>
    <Link
      to={`/app/appointment-setter/tenants/${tenantId}/edit`}
      title="Configure"
      aria-label={`Configure ${tenantName}`}
      className={`${iconBtnBase} rounded-r-[5px] border-l border-slate-200 text-slate-600 no-underline hover:bg-slate-100 focus-visible:outline-slate-400`}
    >
      <Settings className="h-4 w-4" strokeWidth={2} />
    </Link>
  </div>
);

const TenantList = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hoveredId, setHoveredId] = useState(null);

  const fetchTenants = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await tenantAPI.listTenants();
      const tenantsList = Array.isArray(response.data)
        ? response.data
        : response.data?.tenants || [];

      if (Array.isArray(tenantsList)) {
        setTenants(tenantsList);
      } else {
        console.error("Invalid tenants data structure:", tenantsList);
        setTenants([]);
        setError("Invalid data structure received from server");
      }
    } catch (fetchError) {
      setError("Failed to fetch tenants");
      console.error("Error fetching tenants:", fetchError);
      setTenants([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  if (loading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center">
        <Loader message="Loading customers..." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: NAVY }}>
            Customers
          </h1>
          <p className="mt-0.5 max-w-2xl text-sm text-slate-500">
            Manage business tenants, ownership details, and operational entry points in{" "}
            {getAppName()}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 sm:justify-end">
          <button
            type="button"
            onClick={fetchTenants}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={2} />
            Refresh
          </button>
          <Link
            to="/app/appointment-setter/tenants/create"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-white no-underline transition hover:opacity-90"
            style={{ backgroundColor: NAVY }}
          >
            <Plus className="h-4 w-4" />
            Create tenant
          </Link>
        </div>
      </div>

      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchTenants}
            className="font-mono text-[10px] font-semibold uppercase tracking-wider text-rose-700 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      ) : null}

      {tenants.length === 0 ? (
        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center">
          <Building2 className="h-12 w-12 text-slate-300" strokeWidth={1.25} />
          <h3 className="mt-5 text-xl font-semibold" style={{ color: NAVY }}>
            No customers yet
          </h3>
          <p className="mt-2 max-w-md text-sm text-slate-500">
            Create your first tenant to configure business data, voice agents, Twilio integration,
            and appointment flows.
          </p>
          <Link
            to="/app/appointment-setter/tenants/create"
            className="mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-white no-underline transition hover:opacity-90"
            style={{ backgroundColor: NAVY }}
          >
            <Plus className="h-4 w-4" />
            Create tenant
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden border-b border-slate-200 bg-slate-50/90 px-4 py-2 md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(112px,120px)] md:items-center md:justify-items-center md:gap-4">
            {["Customer / tenant", "Created", "Updated", "Actions"].map((col) => (
              <span
                key={col}
                className={`w-full font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#1e293b] ${
                  col === "Customer / tenant" ? "justify-self-start text-left" : "text-center"
                }`}
              >
                {col}
              </span>
            ))}
          </div>

          <div className="divide-y divide-slate-100">
            {tenants.map((tenant) => {
              const isHighlighted = hoveredId === tenant.id;

              return (
                <div
                  key={tenant.id}
                  className={`relative px-4 py-2.5 transition ${
                    isHighlighted
                      ? "bg-[#68fadd]/[0.04] shadow-[inset_3px_0_0_0_#68fadd]"
                      : "hover:bg-slate-50/80"
                  }`}
                  onMouseEnter={() => setHoveredId(tenant.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(112px,120px)] md:items-center md:justify-items-center md:gap-4">
                    <div className="flex w-full min-w-0 items-center justify-start gap-3 text-left md:justify-self-start">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-100"
                        style={{ backgroundColor: NAVY }}
                      >
                        <Building2 className="h-5 w-5" style={{ color: TEAL }} strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0">
                        <Link
                          to={`/app/appointment-setter/tenants/${tenant.id}`}
                          className="truncate font-semibold no-underline transition hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68fadd]/60"
                          style={{ color: NAVY }}
                        >
                          {tenant.name}
                        </Link>
                        <p className="mt-0.5 truncate text-xs text-slate-500">{tenant.owner_email}</p>
                      </div>
                    </div>

                    <div className="w-full text-center text-sm text-slate-600">
                      <p className="font-mono text-[9px] uppercase tracking-wide text-slate-400 md:hidden">
                        Created
                      </p>
                      <p className="md:mt-0">{formatTimestamp(tenant.created_at)}</p>
                    </div>

                    <div className="w-full text-center text-sm text-slate-600">
                      <p className="font-mono text-[9px] uppercase tracking-wide text-slate-400 md:hidden">
                        Updated
                      </p>
                      <p className="md:mt-0">{formatTimestamp(tenant.updated_at)}</p>
                    </div>

                    <div className="flex w-full justify-center">
                      <TenantRowActions tenantId={tenant.id} tenantName={tenant.name} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Total customers
            </p>
            <p className="text-sm font-semibold" style={{ color: NAVY }}>
              {tenants.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantList;
