import React from "react";
import { Building2 } from "lucide-react";

const CustomersSection = ({
  isAdmin,
  partnerOrgs,
  partnerScope,
  selectedPartnerOrgId,
  setSelectedPartnerOrgId,
  newCustomerName,
  setNewCustomerName,
  canManageCustomers,
  savingOrgId,
  customerOrgs,
  onCreateCustomer,
  onOrgLifecycleAction,
}) => {
  return (
    <>
      {canManageCustomers ? (
        <form onSubmit={onCreateCustomer} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Create Customer</p>
          <div className="mt-3 grid gap-3 md:grid-cols-[220px_minmax(0,1fr)_140px]">
            <select
              value={selectedPartnerOrgId}
              onChange={(event) => setSelectedPartnerOrgId(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            >
              {(isAdmin ? partnerOrgs : partnerScope).map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name}
                </option>
              ))}
            </select>
            <input
              value={newCustomerName}
              onChange={(event) => setNewCustomerName(event.target.value)}
              placeholder="Customer organization name"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            />
            <button
              type="submit"
              disabled={!selectedPartnerOrgId || savingOrgId === selectedPartnerOrgId}
              className="rounded-xl border border-slate-200 bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
            >
              Create
            </button>
          </div>
        </form>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_140px_140px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs uppercase tracking-[0.18em] text-slate-500">
          <div>Customer</div>
          <div>Parent Partner</div>
          <div>Status</div>
          <div>Action</div>
        </div>
        <div className="divide-y divide-slate-200">
          {customerOrgs
            .filter((org) => isAdmin || partnerScope.some((partner) => partner.id === org.parent_org_id))
            .map((org) => {
              const partner = partnerOrgs.find((item) => item.id === org.parent_org_id);
              const orgStatus = String(org?.status || "active").toLowerCase();
              return (
                <div key={org.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_140px_140px] gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{org.name}</p>
                    <p className="truncate text-xs text-slate-500">{org.id}</p>
                  </div>
                  <div className="min-w-0 text-slate-600">
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-xs">
                      <Building2 className="h-3.5 w-3.5 text-slate-500" />
                      <span className="truncate">{partner?.name || org.parent_org_id}</span>
                    </div>
                  </div>
                  <div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                      orgStatus === "suspended" ? "border border-rose-200 bg-rose-50 text-rose-700" : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}>
                      {orgStatus}
                    </span>
                  </div>
                  <div>
                    <button
                      onClick={() => onOrgLifecycleAction(org.id, orgStatus === "suspended" ? "reactivate" : "suspend")}
                      disabled={!canManageCustomers || savingOrgId === org.id}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 disabled:opacity-60"
                    >
                      {orgStatus === "suspended" ? "Reactivate" : "Suspend"}
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </>
  );
};

export default CustomersSection;
