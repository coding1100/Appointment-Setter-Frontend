import React from "react";
import { Shield, ShieldCheck, User, UserPlus, Users } from "lucide-react";

import { PLATFORM_APPS } from "../../../platform/appCatalog";
import StyledSelect from "../../../shared/ui/StyledSelect";
import { NAVY, TEAL, TEAL_DEEP } from "../../Platform/WorkspaceShellLayout";
import { normalizeAllowedApps } from "../constants";

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#68fadd]/50 focus:outline-none focus:ring-2 focus:ring-[#68fadd]/20 disabled:cursor-not-allowed disabled:bg-slate-50";

const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

const btnPrimary =
  "inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

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

const appPillClass = (enabled) =>
  enabled
    ? "border-[#68fadd]/40 bg-[#68fadd]/15 text-[#006b5c]"
    : "border-slate-200 bg-white text-slate-600";

const PlatformUsersSection = ({
  newRole,
  setNewRole,
  roleTemplates,
  selectedRoleTemplateId,
  setSelectedRoleTemplateId,
  newUser,
  setNewUser,
  permissionCatalog,
  activeRoles,
  creatingRole,
  creatingUser,
  createdPlatformCreds,
  canViewPlatformRoles,
  canManagePlatformUsers,
  canManagePlatformRoles,
  platformUsers,
  savingUserId,
  assigningRoleUserId,
  onCreateRole,
  onApplyRoleTemplate,
  onTogglePermission,
  onCreatePlatformUser,
  onToggleNewUserApp,
  onAssignRole,
  onUpdateAppAccess,
  onSetDefaultApp,
}) => {
  return (
    <div className="space-y-5">
      {createdPlatformCreds ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Created platform user credentials
          </p>
          <div className="mt-3 grid gap-2 text-sm text-emerald-900 md:grid-cols-2">
            <p>
              <span className="font-semibold">Name:</span> {createdPlatformCreds.full_name}
            </p>
            <p>
              <span className="font-semibold">Username:</span> {createdPlatformCreds.username}
            </p>
            <p>
              <span className="font-semibold">Email:</span> {createdPlatformCreds.email}
            </p>
            <p className="md:col-span-2">
              <span className="font-semibold">Temporary password:</span>{" "}
              {createdPlatformCreds.temporary_password}
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2 xl:items-start">
        {canViewPlatformRoles ? (
          <form onSubmit={onCreateRole} className={sectionCardClass}>
            <div className="mb-5 flex items-start gap-3">
              <SectionIcon icon={Shield} />
              <div>
                <h3 className="text-base font-semibold tracking-tight" style={{ color: NAVY }}>
                  Create platform role
                </h3>
                <p className="mt-0.5 text-sm text-slate-500">
                  Define permissions and reuse templates for faster setup.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
              <StyledSelect
                value={selectedRoleTemplateId}
                onChange={(event) => {
                  setSelectedRoleTemplateId(event.target.value);
                  onApplyRoleTemplate(event.target.value);
                }}
                disabled={!canManagePlatformRoles}
              >
                <option value="">Start from template (optional)</option>
                {roleTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </StyledSelect>
              <button
                type="button"
                onClick={() => {
                  setSelectedRoleTemplateId("");
                  setNewRole({ name: "", description: "", permissions: [] });
                }}
                className={btnSecondary}
                disabled={!canManagePlatformRoles}
              >
                Clear
              </button>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <input
                value={newRole.name}
                onChange={(event) => setNewRole((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Role name"
                className={fieldClass}
                disabled={!canManagePlatformRoles}
              />
              <input
                value={newRole.description}
                onChange={(event) =>
                  setNewRole((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Description"
                className={fieldClass}
                disabled={!canManagePlatformRoles}
              />
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {permissionCatalog.map((permission) => (
                <label
                  key={permission.id}
                  className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={newRole.permissions.includes(permission.id)}
                    onChange={() => onTogglePermission(permission.id)}
                    className="mt-0.5 accent-[#006b5c]"
                    disabled={!canManagePlatformRoles}
                  />
                  <span>
                    <span className="block font-semibold text-slate-800">{permission.label}</span>
                    <span className="block text-slate-500">{permission.description}</span>
                  </span>
                </label>
              ))}
            </div>

            <button
              type="submit"
              disabled={creatingRole || !canManagePlatformRoles}
              className={`${btnPrimary} mt-4`}
              style={{ backgroundColor: TEAL_DEEP }}
            >
              {creatingRole ? "Creating role..." : "Create role"}
            </button>
          </form>
        ) : (
          <div className={`${sectionCardClass} text-sm text-slate-500`}>
            Role catalog is hidden for your current permission set.
          </div>
        )}

        <form onSubmit={onCreatePlatformUser} className={sectionCardClass}>
          <div className="mb-5 flex items-start gap-3">
            <SectionIcon icon={UserPlus} />
            <div>
              <h3 className="text-base font-semibold tracking-tight" style={{ color: NAVY }}>
                Create platform user
              </h3>
              <p className="mt-0.5 text-sm text-slate-500">
                Provision staff accounts with app access and optional custom roles.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={newUser.first_name}
              onChange={(event) => setNewUser((prev) => ({ ...prev, first_name: event.target.value }))}
              placeholder="First name"
              className={fieldClass}
              disabled={!canManagePlatformUsers}
            />
            <input
              value={newUser.last_name}
              onChange={(event) => setNewUser((prev) => ({ ...prev, last_name: event.target.value }))}
              placeholder="Last name"
              className={fieldClass}
              disabled={!canManagePlatformUsers}
            />
            <input
              value={newUser.email}
              onChange={(event) => setNewUser((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="Email"
              className={fieldClass}
              disabled={!canManagePlatformUsers}
            />
            <input
              value={newUser.username}
              onChange={(event) => setNewUser((prev) => ({ ...prev, username: event.target.value }))}
              placeholder="Username"
              className={fieldClass}
              disabled={!canManagePlatformUsers}
            />
            <input
              type="password"
              value={newUser.password}
              onChange={(event) => setNewUser((prev) => ({ ...prev, password: event.target.value }))}
              placeholder="Password"
              className={fieldClass}
              disabled={!canManagePlatformUsers}
            />
            <StyledSelect
              value={newUser.membership_role}
              onChange={(event) =>
                setNewUser((prev) => ({ ...prev, membership_role: event.target.value }))
              }
              disabled={!canManagePlatformUsers}
            >
              <option value="platform_staff">Platform Staff</option>
              <option value="platform_owner">Platform Owner</option>
            </StyledSelect>
            <div className="md:col-span-2">
              <StyledSelect
                value={newUser.platform_role_id}
                onChange={(event) =>
                  setNewUser((prev) => ({ ...prev, platform_role_id: event.target.value }))
                }
                disabled={!canManagePlatformUsers || !canViewPlatformRoles}
              >
                <option value="">No custom role</option>
                {activeRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </StyledSelect>
            </div>
          </div>

          <p className="mt-4 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Allowed apps
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {PLATFORM_APPS.map((app) => {
              const enabled = newUser.allowed_app_ids.includes(app.id);
              return (
                <button
                  type="button"
                  key={`new-${app.id}`}
                  onClick={() => onToggleNewUserApp(app.id)}
                  className={`rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide transition ${appPillClass(enabled)}`}
                  disabled={!canManagePlatformUsers}
                >
                  {app.label}
                </button>
              );
            })}
          </div>

          <p className="mt-4 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Default app
          </p>
          <div className="mt-2">
            <StyledSelect
              value={newUser.default_app_id}
              onChange={(event) =>
                setNewUser((prev) => ({ ...prev, default_app_id: event.target.value }))
              }
              disabled={!canManagePlatformUsers}
            >
              {normalizeAllowedApps(newUser.allowed_app_ids).map((appId) => {
                const app = PLATFORM_APPS.find((item) => item.id === appId);
                return (
                  <option key={`default-${appId}`} value={appId}>
                    {app?.label || appId}
                  </option>
                );
              })}
            </StyledSelect>
          </div>

          <button
            type="submit"
            disabled={creatingUser || !canManagePlatformUsers}
            className={`${btnPrimary} mt-4`}
            style={{ backgroundColor: NAVY }}
          >
            {creatingUser ? "Creating user..." : "Create platform user"}
          </button>
        </form>
      </div>

      <div className={`${sectionCardClass} p-0`}>
        <div className="flex flex-col gap-1 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <SectionIcon icon={Users} />
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Directory
              </p>
              <h3 className="mt-0.5 text-lg font-semibold tracking-tight" style={{ color: NAVY }}>
                Platform users
              </h3>
            </div>
          </div>
          <span
            className="inline-flex w-fit rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide"
            style={{ backgroundColor: `${TEAL}22`, color: TEAL_DEEP }}
          >
            {platformUsers.length} total
          </span>
        </div>

        {platformUsers.length > 0 ? (
          <>
            <div className="hidden border-b border-slate-200 bg-slate-50/90 px-5 py-2.5 lg:grid lg:grid-cols-[minmax(0,1.1fr)_220px_minmax(0,1fr)_180px] lg:items-center lg:gap-4">
              {["User", "Role", "Apps", "Default app"].map((col) => (
                <span
                  key={col}
                  className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#1e293b]"
                >
                  {col}
                </span>
              ))}
            </div>

            <div className="divide-y divide-slate-100">
              {platformUsers.map((targetUser) => {
                const allowedApps = normalizeAllowedApps(targetUser.allowed_app_ids);
                const defaultApp = allowedApps.includes(targetUser.default_app_id)
                  ? targetUser.default_app_id
                  : allowedApps[0];
                const isSaving = savingUserId === targetUser.id;
                const isAssigningRole = assigningRoleUserId === targetUser.id;

                return (
                  <div
                    key={targetUser.id}
                    className="px-5 py-4 transition hover:bg-slate-50/80"
                  >
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_220px_minmax(0,1fr)_180px] lg:items-start lg:gap-4">
                      <div className="min-w-0">
                        <div className="flex items-start gap-3">
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-100"
                            style={{ backgroundColor: NAVY }}
                          >
                            <User className="h-4 w-4" style={{ color: TEAL }} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold" style={{ color: NAVY }}>
                              {targetUser.first_name} {targetUser.last_name}
                            </p>
                            <p className="truncate text-xs text-slate-500">{targetUser.email}</p>
                            <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide text-slate-600">
                              <ShieldCheck className="h-3 w-3" />
                              {String(targetUser.role || "user").replace("_", " ")}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="mb-1.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-slate-400 lg:hidden">
                          Role
                        </p>
                        <StyledSelect
                          value={targetUser.platform_role_id || ""}
                          disabled={
                            isAssigningRole ||
                            activeRoles.length === 0 ||
                            !canManagePlatformUsers ||
                            !canViewPlatformRoles
                          }
                          onChange={(event) => onAssignRole(targetUser.id, event.target.value)}
                        >
                          <option value="" disabled>
                            {activeRoles.length > 0 ? "Assign role" : "No roles"}
                          </option>
                          {activeRoles.map((role) => (
                            <option key={`${targetUser.id}-${role.id}`} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                        </StyledSelect>
                      </div>

                      <div>
                        <p className="mb-1.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-slate-400 lg:hidden">
                          Apps
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {PLATFORM_APPS.map((app) => {
                            const enabled = allowedApps.includes(app.id);
                            return (
                              <button
                                type="button"
                                key={`${targetUser.id}-${app.id}`}
                                disabled={isSaving || !canManagePlatformUsers}
                                onClick={() => onUpdateAppAccess(targetUser, app.id)}
                                className={`rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide transition disabled:opacity-60 ${appPillClass(enabled)}`}
                              >
                                {app.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <p className="mb-1.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-slate-400 lg:hidden">
                          Default app
                        </p>
                        <StyledSelect
                          value={defaultApp}
                          disabled={isSaving || !canManagePlatformUsers}
                          onChange={(event) => onSetDefaultApp(targetUser, event.target.value)}
                        >
                          {allowedApps.map((appId) => {
                            const app = PLATFORM_APPS.find((item) => item.id === appId);
                            return (
                              <option key={`${targetUser.id}-default-${appId}`} value={appId}>
                                {app?.label || appId}
                              </option>
                            );
                          })}
                        </StyledSelect>
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
            <p className="mt-4 font-semibold text-slate-700">No platform users found</p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Create a platform user above to start managing roles and app access.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlatformUsersSection;
