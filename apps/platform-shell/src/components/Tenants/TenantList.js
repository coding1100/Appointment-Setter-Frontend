import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Building, Calendar, Eye, Plus, Settings } from "lucide-react";

import { tenantAPI } from "../../services/api";
import Loader from "../Loader";
import { getAppName } from "../../utils/appName";

const formatTimestamp = (value) =>
  new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

const TenantList = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    return <Loader message="Loading tenants..." />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[0.78rem] uppercase tracking-[0.32em] text-black">
            Tenant Directory
          </p>
          <h1 className="mt-3 text-[2rem] font-semibold tracking-[-0.03em] text-black">
            Tenants
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-black">
            Manage business tenants, ownership details, and operational entry
            points from the same unified {getAppName()} workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={fetchTenants}
            className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-black/5 px-4 py-3 text-sm font-medium text-black transition hover:bg-black/10"
          >
            Refresh
          </button>
          <Link
            to="/app/appointment-setter/tenants/create"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2f66ea] px-5 py-3 text-sm font-semibold text-black shadow-[0_14px_28px_rgba(19,57,150,0.28)] transition hover:bg-[#295ad0] no-underline"
          >
            <Plus className="h-4 w-4" />
            Create Tenant
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-400">
          {error}
        </div>
      )}

      {tenants.length === 0 ? (
        <div className="flex min-h-[380px] flex-col items-center justify-center rounded-[26px] border border-white/8 bg-white/[0.04] px-6 text-center">
          <Building className="h-16 w-16 text-white/34" />
          <h3 className="mt-6 text-2xl font-semibold tracking-[-0.02em] text-black">
            No tenants yet
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">
            Create your first tenant to configure business data, agents, Twilio
            integration, and appointment flows.
          </p>
          <Link
            to="/app/appointment-setter/tenants/create"
            className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-[#2f66ea] px-6 py-3 text-sm font-semibold text-black shadow-[0_14px_28px_rgba(19,57,150,0.28)] transition hover:bg-[#295ad0] no-underline"
          >
            <Plus className="h-5 w-5" />
            Create Tenant
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[26px] border border-white/8 bg-white/[0.04]">
          <div className="hidden grid-cols-[minmax(0,1.2fr)_220px_220px_180px] gap-4 border-b border-white/8 px-4 py-3 text-xs uppercase tracking-[0.28em] text-white/44 xl:grid">
            <div>Tenant</div>
            <div>Created</div>
            <div>Updated</div>
            <div>Actions</div>
          </div>

          <div className="divide-y divide-white/8">
            {tenants.map((tenant) => (
              <div key={tenant.id} className="px-4 py-4">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_220px_220px_180px] xl:items-center">
                  <div className="min-w-0">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-black/8">
                        <Building className="h-5 w-5 text-sky-400" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-semibold text-black">
                          {tenant.name}
                        </h3>
                        <p className="mt-1 truncate text-sm text-white/66">
                          {tenant.owner_email}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-white/70">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-black xl:hidden">
                      Created
                    </div>
                    <div className="mt-1 flex items-center gap-2 xl:mt-0 text-black">
                      <Calendar className="h-4 w-4 text-black" />
                      {formatTimestamp(tenant.created_at)}
                    </div>
                  </div>

                  <div className="text-sm text-white/70">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-black xl:hidden">
                      Updated
                    </div>
                    <div className="mt-1 flex items-center gap-2 xl:mt-0 text-black">
                      <Calendar className="h-4 w-4 text-black" />
                      {formatTimestamp(tenant.updated_at)}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/app/appointment-setter/tenants/${tenant.id}`}
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-3.5 py-2.5 text-sm text-black transition hover:bg-white/10 no-underline"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Link>
                    <Link
                      to={`/app/appointment-setter/tenants/${tenant.id}/edit`}
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-3.5 py-2.5 text-sm text-black transition hover:bg-white/10 no-underline"
                    >
                      <Settings className="h-4 w-4" />
                      Configure
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantList;
