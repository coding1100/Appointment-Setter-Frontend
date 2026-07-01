import React, { useMemo } from "react";
import { Building2, ShieldAlert, ShieldCheck, UserPlus, Users } from "lucide-react";

import StyledSelect from "../../../shared/ui/StyledSelect";
import { NAVY, TEAL, TEAL_DEEP } from "../../Platform/WorkspaceShellLayout";

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#68fadd]/50 focus:outline-none focus:ring-2 focus:ring-[#68fadd]/20 disabled:cursor-not-allowed disabled:bg-slate-50";

const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

const btnDanger =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50";

const sectionCardClass =
  "overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6";

const SectionIcon = ({ icon: Icon }) => (
  <div
    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-100"
    style={{ backgroundColor: NAVY }}
  >
    <Icon className="h-5 w-5" style={{ color: TEAL }} strokeWidth={1.75} />
  </div>
);

const statusBadgeClass = (status) => {
  const normalized = String(status || "").toLowerCase();
  return normalized === "suspended" ? "bg-rose-50 text-rose-700" : "bg-[#68fadd]/20 text-[#006b5c]";
};

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
  const partnerOptions = isAdmin ? partnerOrgs : partnerScope;

  const visibleCustomers = useMemo(
    () =>
      customerOrgs.filter(
        (org) => isAdmin || partnerScope.some((partner) => partner.id === org.parent_org_id),
      ),
    [customerOrgs, isAdmin, partnerScope],
  );

  return (
    <div className="space-y-5">
      {canManageCustomers ? (
        <form onSubmit={onCreateCustomer} className={sectionCardClass}>
          <div className="mb-5 flex items-start gap-3">
            <SectionIcon icon={UserPlus} />
            <div>
              <h3 className="text-base font-semibold tracking-tight" style={{ color: NAVY }}>
                Create customer
              </h3>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Add a customer organization under an existing partner account.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto] md:items-end">
            <label className="flex flex-col gap-1.5">
              <span className="mb-1.5 block text-sm font-medium text-slate-800">
                Parent partner
              </span>
              <StyledSelect
                value={selectedPartnerOrgId}
                onChange={(event) => setSelectedPartnerOrgId(event.target.value)}
              >
                {partnerOptions.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name}
                  </option>
                ))}
              </StyledSelect>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="mb-1.5 block text-sm font-medium text-slate-800">
                Customer name
              </span>
              <input
                value={newCustomerName}
                onChange={(event) => setNewCustomerName(event.target.value)}
                placeholder="Customer organization name"
                className={fieldClass}
              />
            </label>

            <button
              type="submit"
              disabled={!selectedPartnerOrgId || savingOrgId === selectedPartnerOrgId}
              className={btnPrimary}
              style={{ backgroundColor: TEAL_DEEP }}
            >
              Create customer
            </button>
          </div>
        </form>
      ) : null}

      <div className={`${sectionCardClass} p-0`}>
        <div className="flex flex-col gap-1 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <SectionIcon icon={Users} />
            <div>
            <h3 className="mt-0.5 text-lg font-semibold tracking-tight" style={{ color: NAVY }}>
                Customer organizations
              </h3>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Directory
              </p>
              
            </div>
          </div>
          <span
            className="inline-flex w-fit rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide"
            style={{ backgroundColor: `${TEAL}22`, color: TEAL_DEEP }}
          >
            {visibleCustomers.length} total
          </span>
        </div>

        {visibleCustomers.length > 0 ? (
          <>
            <div className="hidden border-b border-slate-200 bg-slate-50/90 px-5 py-2.5 lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_120px_140px] lg:items-center lg:gap-4">
              {["Customer", "Parent partner", "Status", "Action"].map((col) => (
                <span
                  key={col}
                  className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400"
                >
                  {col}
                </span>
              ))}
            </div>

            <div className="divide-y divide-slate-100">
              {visibleCustomers.map((org) => {
                const partner = partnerOrgs.find((item) => item.id === org.parent_org_id);
                const orgStatus = String(org?.status || "active").toLowerCase();

                return (
                  <div
                    key={org.id}
                    className="px-5 py-4 transition hover:bg-slate-50/80"
                  >
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_120px_140px] lg:items-center lg:gap-4">
                      <div className="min-w-0">
                        <div className="flex items-start gap-3">
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-100"
                            style={{ backgroundColor: NAVY }}
                          >
                            <Users className="h-4 w-4" style={{ color: TEAL }} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold" style={{ color: NAVY }}>
                              {org.name}
                            </p>
                            <p className="truncate font-mono text-[9px] uppercase tracking-wide text-slate-400">
                              {org.id}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="mb-1.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-slate-400 lg:hidden">
                          Parent partner
                        </p>
                        <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                          <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="truncate">{partner?.name || org.parent_org_id}</span>
                        </div>
                      </div>

                      <div>
                        <p className="mb-1.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-slate-400 lg:hidden">
                          Status
                        </p>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide ${statusBadgeClass(orgStatus)}`}
                        >
                          {orgStatus}
                        </span>
                      </div>

                      <div>
                        <p className="mb-1.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-slate-400 lg:hidden">
                          Action
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            onOrgLifecycleAction(
                              org.id,
                              orgStatus === "suspended" ? "reactivate" : "suspend",
                            )
                          }
                          disabled={!canManageCustomers || savingOrgId === org.id}
                          className={
                            orgStatus === "suspended" ? btnPrimary : btnDanger
                          }
                          style={
                            orgStatus === "suspended"
                              ? { backgroundColor: TEAL_DEEP }
                              : undefined
                          }
                        >
                          {orgStatus === "suspended" ? (
                            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2} />
                          ) : (
                            <ShieldAlert className="h-3.5 w-3.5" strokeWidth={2} />
                          )}
                          {orgStatus === "suspended" ? "Reactivate" : "Suspend"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <Users className="h-12 w-12 text-slate-300" strokeWidth={1.25} />
            <p className="mt-4 font-semibold text-slate-700">No customer organizations found</p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Create a customer above to link it to a partner organization.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomersSection;
