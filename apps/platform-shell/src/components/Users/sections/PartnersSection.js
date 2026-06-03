import React, { useEffect, useState } from "react";
import { Mail, Send } from "lucide-react";

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
    <div className="space-y-4">
      {createdOwnerCreds ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Created Owner Credentials</p>
          <div className="mt-2 grid gap-2 md:grid-cols-2 text-sm text-emerald-900">
            <p><span className="font-semibold">Partner:</span> {createdOwnerCreds.partner_name}</p>
            <p><span className="font-semibold">Owner:</span> {createdOwnerCreds.owner_name}</p>
            <p><span className="font-semibold">Email:</span> {createdOwnerCreds.email}</p>
            <p><span className="font-semibold">Username:</span> {createdOwnerCreds.username}</p>
            <p className="md:col-span-2"><span className="font-semibold">Temporary password:</span> {createdOwnerCreds.temporary_password}</p>
          </div>
        </div>
      ) : null}

      {canManagePartners ? (
        <form onSubmit={onCreatePartnerWithOwner} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Onboard Partner</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">Partner Organization Name</span>
              <input
                id="partner_name"
                value={newPartner.name}
                onChange={(event) => setNewPartner((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Partner organization name"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                disabled={!canManagePartners}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">Owner Email</span>
              <input
                id="owner_email"
                value={newPartner.owner_email}
                onChange={(event) => setNewPartner((prev) => ({ ...prev, owner_email: event.target.value }))}
                placeholder="Owner email"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                disabled={!canManagePartners}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">Owner First Name</span>
              <input
                id="owner_first_name"
                value={newPartner.owner_first_name}
                onChange={(event) => setNewPartner((prev) => ({ ...prev, owner_first_name: event.target.value }))}
                placeholder="Owner first name"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                disabled={!canManagePartners}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">Owner Last Name</span>
              <input
                id="owner_last_name"
                value={newPartner.owner_last_name}
                onChange={(event) => setNewPartner((prev) => ({ ...prev, owner_last_name: event.target.value }))}
                placeholder="Owner last name"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                disabled={!canManagePartners}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">Owner Username</span>
              <input
                id="owner_username"
                value={newPartner.owner_username}
                onChange={(event) => setNewPartner((prev) => ({ ...prev, owner_username: event.target.value }))}
                placeholder="Owner username"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                disabled={!canManagePartners}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">Temporary Password</span>
              <input
                id="owner_password"
                value={newPartner.owner_password}
                onChange={(event) => setNewPartner((prev) => ({ ...prev, owner_password: event.target.value }))}
                placeholder="Temporary password"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                disabled={!canManagePartners}
              />
            </label>
            <label className="flex flex-col gap-1 md:col-span-2">
              <span className="text-xs font-medium text-slate-600">Approval Note (Optional)</span>
              <input
                id="approval_notes"
                value={newPartner.approval_notes}
                onChange={(event) => setNewPartner((prev) => ({ ...prev, approval_notes: event.target.value }))}
                placeholder="Approval note (optional)"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                disabled={!canManagePartners}
              />
            </label>
            <label className="flex flex-col gap-1 md:col-span-2">
              <span className="text-xs font-medium text-slate-600">Seat Limit</span>
              <input
                id="partner_seat_limit"
                type="number"
                min={1}
                value={newPartner.seat_limit}
                onChange={(event) => setNewPartner((prev) => ({ ...prev, seat_limit: event.target.value }))}
                placeholder="Seat limit"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                disabled={!canManagePartners}
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={newPartner.send_invite_email}
                onChange={(event) => setNewPartner((prev) => ({ ...prev, send_invite_email: event.target.checked }))}
                disabled={!canManagePartners}
              />
              Send setup invite email
            </label>
            <button
              type="submit"
              disabled={creatingPartner || !canManagePartners}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Mail className="h-4 w-4" />
              {creatingPartner ? "Creating..." : "Create Partner"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="grid grid-cols-[minmax(0,1fr)_140px_140px_180px_220px_220px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs uppercase tracking-[0.18em] text-slate-500">
          <div>Partner</div>
          <div>Status</div>
          <div>Onboarding</div>
          <div>Seat Usage</div>
          <div>Appointment Setter</div>
          <div>Members</div>
        </div>
        <div className="divide-y divide-slate-200">
          {scopedPartners.map((org) => {
            const enabled = Boolean(org?.appointment_setter_enabled);
            const members = Array.isArray(partnerMembersByOrg[org.id]) ? partnerMembersByOrg[org.id] : [];
            const membersLoading = loadingMembersOrgId === org.id;
            const onboardingStatus = String(org?.onboarding_status || "invited").toLowerCase();
            const seatDraft = seatLimitDraftByOrg[org.id] ?? String(org?.seat_limit || 25);
            const seatUsage = Number(org?.seat_usage || 0);
            const seatLimit = Number(org?.seat_limit || 25);
            const seatRemaining = Number(org?.seat_remaining ?? Math.max(seatLimit - seatUsage, 0));
            const orgStatus = String(org?.status || "active").toLowerCase();
            return (
              <div key={org.id} className="px-4 py-3 text-sm">
                <div className="grid grid-cols-[minmax(0,1fr)_140px_140px_180px_220px_220px] gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{org.name}</p>
                    <p className="truncate text-xs text-slate-500">{org.id}</p>
                  </div>
                  <div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                      orgStatus === "suspended" ? "border border-rose-200 bg-rose-50 text-rose-700" : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}>
                      {orgStatus}
                    </span>
                  </div>
                  <div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                      onboardingStatus === "active"
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                        : onboardingStatus === "suspended"
                        ? "border border-rose-200 bg-rose-50 text-rose-700"
                        : "border border-amber-200 bg-amber-50 text-amber-700"
                    }`}>
                      {onboardingStatus}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-slate-700">
                      <span className="font-semibold">{seatUsage}</span> used / <span className="font-semibold">{seatLimit}</span> seats
                    </p>
                    <p className="text-[11px] text-slate-500">{seatRemaining} remaining</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        value={seatDraft}
                        onChange={(event) =>
                          setSeatLimitDraftByOrg((prev) => ({ ...prev, [org.id]: event.target.value }))
                        }
                        className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                        disabled={savingOrgId === org.id || !canToggleEntitlements}
                      />
                      <button
                        onClick={() => onUpdatePartnerSeatLimit(org, seatDraft)}
                        disabled={savingOrgId === org.id || !canToggleEntitlements}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 disabled:opacity-60"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                  <div>
                    <button
                      disabled={savingOrgId === org.id || !canToggleEntitlements}
                      onClick={() => onEntitlementToggle(org.id, enabled)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${
                        enabled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"
                      } ${!canToggleEntitlements ? "cursor-not-allowed opacity-60" : ""}`}
                    >
                      {enabled ? "Enabled" : "Disabled"}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onFetchOrgMembers(org.id, true)}
                      disabled={membersLoading || !canManagePartnerMembers}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {membersLoading ? "Loading..." : "Load members"}
                    </button>
                    <button
                      onClick={() => onOrgLifecycleAction(org.id, orgStatus === "suspended" ? "reactivate" : "suspend")}
                      disabled={savingOrgId === org.id || !canManagePartners}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 disabled:opacity-60"
                    >
                      {orgStatus === "suspended" ? "Reactivate" : "Suspend"}
                    </button>
                  </div>
                </div>

                {members.length > 0 ? (
                  <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                    <div className="grid grid-cols-[minmax(0,1fr)_160px_130px] gap-2 bg-slate-50 px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                      <div>Member</div>
                      <div>Role</div>
                      <div>Action</div>
                    </div>
                    <div className="divide-y divide-slate-200">
                      {members.map((member) => {
                        const memberKey = `${org.id}:${member.user_id}`;
                        const user = usersById[String(member.user_id)];
                        const userDisplayName = user
                          ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email || member.user_id
                          : member.user_id;
                        return (
                          <div key={member.id || memberKey} className="grid grid-cols-[minmax(0,1fr)_160px_130px] gap-2 px-3 py-2 text-xs">
                            <div className="min-w-0">
                              <p className="truncate text-slate-800">{userDisplayName}</p>
                              {user?.email ? <p className="truncate text-slate-600">{user.email}</p> : null}
                              <p className="truncate text-slate-500">{member.status}</p>
                            </div>
                            <div className="truncate text-slate-700">{member.role}</div>
                            <div>
                              <button
                                onClick={() => onResendSetupInvite(org.id, member.user_id)}
                                disabled={resendingInviteKey === memberKey || !canManagePartnerMembers}
                                className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 disabled:opacity-60"
                              >
                                {resendingInviteKey === memberKey ? "Sending..." : "Resend Invite"}
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
      </div>
    </div>
  );
};

export default PartnersSection;
