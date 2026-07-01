import React, { useEffect, useState } from "react";
import {
  Building2,
  HeartHandshake,
  Mail,
  Send,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";

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

const statusBadgeClass = (status, type = "org") => {
  const normalized = String(status || "").toLowerCase();
  if (type === "onboarding") {
    if (normalized === "active") return "bg-[#68fadd]/20 text-[#006b5c]";
    if (normalized === "suspended") return "bg-rose-50 text-rose-700";
    return "bg-amber-50 text-amber-700";
  }
  return normalized === "suspended" ? "bg-rose-50 text-rose-700" : "bg-[#68fadd]/20 text-[#006b5c]";
};

const fieldLabelClass = "mb-1.5 block text-sm font-medium text-slate-800";

const FormField = ({ id, label, className = "", children }) => (
  <div className={className}>
    <label htmlFor={id} className={fieldLabelClass}>
      {label}
    </label>
    {children}
  </div>
);

const PartnersSection = ({
  isAdmin,
  newPartner,
  setNewPartner,
  creatingPartner,
  createdOwnerCreds,
  canManagePartners,
  canToggleEntitlements,
  canManagePartnerMembers,
  partnerOrgs,
  partnerScope,
  partnerMembersByOrg,
  usersById,
  loadingMembersOrgId,
  savingOrgId,
  resendingInviteKey,
  onCreatePartnerWithOwner,
  onEntitlementToggle,
  onUpdatePartnerSeatLimit,
  onOrgLifecycleAction,
  onFetchOrgMembers,
  onResendSetupInvite,
}) => {
  const [seatLimitDraftByOrg, setSeatLimitDraftByOrg] = useState({});

  const scopedPartners = isAdmin ? partnerOrgs : partnerScope;

  useEffect(() => {
    const next = {};
    scopedPartners.forEach((org) => {
      next[org.id] = String(org.seat_limit || 25);
    });
    setSeatLimitDraftByOrg(next);
  }, [scopedPartners]);

  return (
    <div className="space-y-5">
      {createdOwnerCreds ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Created owner credentials
          </p>
          <div className="mt-3 grid gap-2 text-sm text-emerald-900 md:grid-cols-2">
            <p>
              <span className="font-semibold">Partner:</span> {createdOwnerCreds.partner_name}
            </p>
            <p>
              <span className="font-semibold">Owner:</span> {createdOwnerCreds.owner_name}
            </p>
            <p>
              <span className="font-semibold">Email:</span> {createdOwnerCreds.email}
            </p>
            <p>
              <span className="font-semibold">Username:</span> {createdOwnerCreds.username}
            </p>
            <p className="md:col-span-2">
              <span className="font-semibold">Temporary password:</span>{" "}
              {createdOwnerCreds.temporary_password}
            </p>
          </div>
        </div>
      ) : null}

      {canManagePartners ? (
        <form onSubmit={onCreatePartnerWithOwner} className={sectionCardClass}>
          <div className="mb-5 flex items-start gap-3">
            <SectionIcon icon={HeartHandshake} />
            <div>
            <h3 className="mt-0.5 text-lg font-semibold tracking-tight" style={{ color: NAVY }}>
                Onboard partner
              </h3>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Create a partner organization, owner account, and optional setup invite.
              </p>
              
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField id="partner_name" label="Partner organization name">
              <input
                id="partner_name"
                value={newPartner.name}
                onChange={(event) => setNewPartner((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Partner organization name"
                className={fieldClass}
                disabled={!canManagePartners}
              />
            </FormField>

            <FormField id="owner_email" label="Owner email">
              <input
                id="owner_email"
                value={newPartner.owner_email}
                onChange={(event) =>
                  setNewPartner((prev) => ({ ...prev, owner_email: event.target.value }))
                }
                placeholder="Owner email"
                className={fieldClass}
                disabled={!canManagePartners}
              />
            </FormField>

            <FormField id="owner_first_name" label="Owner first name">
              <input
                id="owner_first_name"
                value={newPartner.owner_first_name}
                onChange={(event) =>
                  setNewPartner((prev) => ({ ...prev, owner_first_name: event.target.value }))
                }
                placeholder="Owner first name"
                className={fieldClass}
                disabled={!canManagePartners}
              />
            </FormField>

            <FormField id="owner_last_name" label="Owner last name">
              <input
                id="owner_last_name"
                value={newPartner.owner_last_name}
                onChange={(event) =>
                  setNewPartner((prev) => ({ ...prev, owner_last_name: event.target.value }))
                }
                placeholder="Owner last name"
                className={fieldClass}
                disabled={!canManagePartners}
              />
            </FormField>

            <FormField id="owner_username" label="Owner username">
              <input
                id="owner_username"
                value={newPartner.owner_username}
                onChange={(event) =>
                  setNewPartner((prev) => ({ ...prev, owner_username: event.target.value }))
                }
                placeholder="Owner username"
                className={fieldClass}
                disabled={!canManagePartners}
              />
            </FormField>

            <FormField id="owner_password" label="Temporary password">
              <input
                id="owner_password"
                value={newPartner.owner_password}
                onChange={(event) =>
                  setNewPartner((prev) => ({ ...prev, owner_password: event.target.value }))
                }
                placeholder="Temporary password"
                className={fieldClass}
                disabled={!canManagePartners}
              />
            </FormField>

            <FormField id="approval_notes" label="Approval note (optional)">
              <input
                id="approval_notes"
                value={newPartner.approval_notes}
                onChange={(event) =>
                  setNewPartner((prev) => ({ ...prev, approval_notes: event.target.value }))
                }
                placeholder="Approval note (optional)"
                className={fieldClass}
                disabled={!canManagePartners}
              />
            </FormField>

            <FormField id="partner_seat_limit" label="Seat limit">
              <input
                id="partner_seat_limit"
                type="number"
                min={1}
                value={newPartner.seat_limit}
                onChange={(event) =>
                  setNewPartner((prev) => ({ ...prev, seat_limit: event.target.value }))
                }
                placeholder="Seat limit"
                className={fieldClass}
                disabled={!canManagePartners}
              />
            </FormField>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={newPartner.send_invite_email}
                onChange={(event) =>
                  setNewPartner((prev) => ({ ...prev, send_invite_email: event.target.checked }))
                }
                className="accent-[#006b5c]"
                disabled={!canManagePartners}
              />
              Send setup invite email
            </label>
            <button
              type="submit"
              disabled={creatingPartner || !canManagePartners}
              className={btnPrimary}
              style={{ backgroundColor: TEAL_DEEP }}
            >
              <Mail className="h-4 w-4" strokeWidth={2} />
              {creatingPartner ? "Creating..." : "Create partner"}
            </button>
          </div>
        </form>
      ) : null}

      <div className={`${sectionCardClass} p-0`}>
        <div className="flex flex-col gap-1 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <SectionIcon icon={Building2} />
            <div>
            <h3 className="mt-0.5 text-lg font-semibold tracking-tight" style={{ color: NAVY }}>
                Partner organizations
              </h3>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Directory
              </p>
              
            </div>
          </div>
          <span
            className="inline-flex w-fit rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide"
            style={{ backgroundColor: `${TEAL}22`, color: TEAL_DEEP }}
          >
            {scopedPartners.length} total
          </span>
        </div>

        {scopedPartners.length > 0 ? (
          <>
            <div className="hidden border-b border-slate-200 bg-slate-50/90 px-5 py-2.5 xl:grid xl:grid-cols-[minmax(0,1.2fr)_110px_120px_160px_140px_minmax(0,1fr)] xl:items-center xl:gap-4">
              {["Partner", "Status", "Onboarding", "Seat usage", "App access", "Actions"].map(
                (col) => (
                  <span
                    key={col}
                    className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#1e293b]"
                  >
                    {col}
                  </span>
                ),
              )}
            </div>

            <div className="divide-y divide-slate-100">
              {scopedPartners.map((org) => {
                const enabled = Boolean(org?.appointment_setter_enabled);
                const members = Array.isArray(partnerMembersByOrg[org.id])
                  ? partnerMembersByOrg[org.id]
                  : [];
                const membersLoading = loadingMembersOrgId === org.id;
                const onboardingStatus = String(org?.onboarding_status || "invited").toLowerCase();
                const seatDraft = seatLimitDraftByOrg[org.id] ?? String(org?.seat_limit || 25);
                const seatUsage = Number(org?.seat_usage || 0);
                const seatLimit = Number(org?.seat_limit || 25);
                const seatRemaining = Number(
                  org?.seat_remaining ?? Math.max(seatLimit - seatUsage, 0),
                );
                const orgStatus = String(org?.status || "active").toLowerCase();

                return (
                  <div key={org.id} className="px-5 py-4 transition hover:bg-slate-50/80">
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_110px_120px_160px_140px_minmax(0,1fr)] xl:items-start xl:gap-4">
                      <div className="min-w-0">
                        <div className="flex items-start gap-3">
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-100"
                            style={{ backgroundColor: NAVY }}
                          >
                            <Building2 className="h-4 w-4" style={{ color: TEAL }} />
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
                        <p className="mb-1.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-slate-400 xl:hidden">
                          Status
                        </p>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide ${statusBadgeClass(orgStatus)}`}
                        >
                          {orgStatus}
                        </span>
                      </div>

                      <div>
                        <p className="mb-1.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-slate-400 xl:hidden">
                          Onboarding
                        </p>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide ${statusBadgeClass(onboardingStatus, "onboarding")}`}
                        >
                          {onboardingStatus}
                        </span>
                      </div>

                      <div>
                        <p className="mb-1.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-slate-400 xl:hidden">
                          Seat usage
                        </p>
                        <p className="text-xs text-slate-700">
                          <span className="font-semibold">{seatUsage}</span> used /{" "}
                          <span className="font-semibold">{seatLimit}</span> seats
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">{seatRemaining} remaining</p>
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            value={seatDraft}
                            onChange={(event) =>
                              setSeatLimitDraftByOrg((prev) => ({
                                ...prev,
                                [org.id]: event.target.value,
                              }))
                            }
                            className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:border-[#68fadd]/50 focus:outline-none focus:ring-2 focus:ring-[#68fadd]/20"
                            disabled={savingOrgId === org.id || !canToggleEntitlements}
                          />
                          <button
                            type="button"
                            onClick={() => onUpdatePartnerSeatLimit(org, seatDraft)}
                            disabled={savingOrgId === org.id || !canToggleEntitlements}
                            className={btnSecondary}
                          >
                            Save
                          </button>
                        </div>
                      </div>

                      <div>
                        <p className="mb-1.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-slate-400 xl:hidden">
                          App access
                        </p>
                        <button
                          type="button"
                          disabled={savingOrgId === org.id || !canToggleEntitlements}
                          onClick={() => onEntitlementToggle(org.id, enabled)}
                          className={`rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-50 ${
                            enabled
                              ? "border-[#68fadd]/40 bg-[#68fadd]/15 text-[#006b5c]"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                          }`}
                        >
                          {enabled ? "Enabled" : "Disabled"}
                        </button>
                      </div>

                      <div>
                        <p className="mb-1.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-slate-400 xl:hidden">
                          Actions
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => onFetchOrgMembers(org.id, true)}
                            disabled={membersLoading || !canManagePartnerMembers}
                            className={btnSecondary}
                          >
                            <Send className="h-3.5 w-3.5" strokeWidth={2} />
                            {membersLoading ? "Loading..." : "Load members"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onOrgLifecycleAction(
                                org.id,
                                orgStatus === "suspended" ? "reactivate" : "suspend",
                              )
                            }
                            disabled={savingOrgId === org.id || !canManagePartners}
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

                    {members.length > 0 ? (
                      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-slate-50/50">
                        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2.5">
                          <Users className="h-4 w-4 text-slate-400" />
                          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                            Members
                          </p>
                        </div>
                        <div className="hidden border-b border-slate-200 bg-white px-4 py-2 md:grid md:grid-cols-[minmax(0,1fr)_160px_130px] md:gap-2">
                          {["Member", "Role", "Action"].map((col) => (
                            <span
                              key={col}
                              className="font-mono text-[9px] font-semibold uppercase tracking-wide text-slate-400"
                            >
                              {col}
                            </span>
                          ))}
                        </div>
                        <div className="divide-y divide-slate-100">
                          {members.map((member) => {
                            const memberKey = `${org.id}:${member.user_id}`;
                            const user = usersById[String(member.user_id)];
                            const userDisplayName = user
                              ? `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
                                user.email ||
                                member.user_id
                              : member.user_id;
                            return (
                              <div
                                key={member.id || memberKey}
                                className="px-4 py-3 md:grid md:grid-cols-[minmax(0,1fr)_160px_130px] md:items-center md:gap-2"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-slate-800">
                                    {userDisplayName}
                                  </p>
                                  {user?.email ? (
                                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                                  ) : null}
                                  <p className="truncate font-mono text-[9px] uppercase tracking-wide text-slate-400">
                                    {member.status}
                                  </p>
                                </div>
                                <div className="mt-2 truncate text-xs text-slate-600 md:mt-0">
                                  <span className="font-mono text-[9px] uppercase tracking-wide text-slate-400 md:hidden">
                                    Role:{" "}
                                  </span>
                                  {member.role}
                                </div>
                                <div className="mt-2 md:mt-0">
                                  <button
                                    type="button"
                                    onClick={() => onResendSetupInvite(org.id, member.user_id)}
                                    disabled={
                                      resendingInviteKey === memberKey || !canManagePartnerMembers
                                    }
                                    className={btnSecondary}
                                  >
                                    {resendingInviteKey === memberKey ? "Sending..." : "Resend invite"}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <HeartHandshake className="h-12 w-12 text-slate-300" strokeWidth={1.25} />
            <p className="mt-4 font-semibold text-slate-700">No partner organizations found</p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Onboard a partner above to manage entitlements, seat limits, and members.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PartnersSection;
