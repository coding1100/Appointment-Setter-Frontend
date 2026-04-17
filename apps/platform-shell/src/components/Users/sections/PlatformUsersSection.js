import React from "react";
import { ShieldCheck, User } from "lucide-react";

import { PLATFORM_APPS } from "../../../platform/appCatalog";
import { normalizeAllowedApps } from "../constants";

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
    <>
      {createdPlatformCreds ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Created Platform User Credentials</p>
          <div className="mt-2 grid gap-2 md:grid-cols-2 text-sm text-emerald-900">
            <p><span className="font-semibold">Name:</span> {createdPlatformCreds.full_name}</p>
            <p><span className="font-semibold">Username:</span> {createdPlatformCreds.username}</p>
            <p><span className="font-semibold">Email:</span> {createdPlatformCreds.email}</p>
            <p className="md:col-span-2"><span className="font-semibold">Temporary password:</span> {createdPlatformCreds.temporary_password}</p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {canViewPlatformRoles ? (
          <form onSubmit={onCreateRole} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Create Platform Role</p>
            <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_180px]">
              <select
                value={selectedRoleTemplateId}
                onChange={(event) => {
                  setSelectedRoleTemplateId(event.target.value);
                  onApplyRoleTemplate(event.target.value);
                }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                disabled={!canManagePlatformRoles}
              >
                <option value="">Start from template (optional)</option>
                {roleTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  setSelectedRoleTemplateId("");
                  setNewRole({ name: "", description: "", permissions: [] });
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                disabled={!canManagePlatformRoles}
              >
                Clear
              </button>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <input
                value={newRole.name}
                onChange={(event) => setNewRole((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Role name"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                disabled={!canManagePlatformRoles}
              />
              <input
                value={newRole.description}
                onChange={(event) => setNewRole((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Description"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                disabled={!canManagePlatformRoles}
              />
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {permissionCatalog.map((permission) => (
                <label key={permission.id} className="flex items-start gap-2 rounded-lg border border-slate-200 px-2 py-2 text-xs">
                  <input
                    type="checkbox"
                    checked={newRole.permissions.includes(permission.id)}
                    onChange={() => onTogglePermission(permission.id)}
                    className="mt-0.5"
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
              className="mt-3 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {creatingRole ? "Creating role..." : "Create Role"}
            </button>
          </form>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            Role catalog is hidden for your current permission set.
          </div>
        )}

        <form onSubmit={onCreatePlatformUser} className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Create Platform User</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <input
              value={newUser.first_name}
              onChange={(event) => setNewUser((prev) => ({ ...prev, first_name: event.target.value }))}
              placeholder="First name"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              disabled={!canManagePlatformUsers}
            />
            <input
              value={newUser.last_name}
              onChange={(event) => setNewUser((prev) => ({ ...prev, last_name: event.target.value }))}
              placeholder="Last name"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              disabled={!canManagePlatformUsers}
            />
            <input
              value={newUser.email}
              onChange={(event) => setNewUser((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="Email"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              disabled={!canManagePlatformUsers}
            />
            <input
              value={newUser.username}
              onChange={(event) => setNewUser((prev) => ({ ...prev, username: event.target.value }))}
              placeholder="Username"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              disabled={!canManagePlatformUsers}
            />
            <input
              type="password"
              value={newUser.password}
              onChange={(event) => setNewUser((prev) => ({ ...prev, password: event.target.value }))}
              placeholder="Password"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              disabled={!canManagePlatformUsers}
            />
            <select
              value={newUser.membership_role}
              onChange={(event) => setNewUser((prev) => ({ ...prev, membership_role: event.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              disabled={!canManagePlatformUsers}
            >
              <option value="platform_staff">Platform Staff</option>
              <option value="platform_owner">Platform Owner</option>
            </select>
            <select
              value={newUser.platform_role_id}
              onChange={(event) => setNewUser((prev) => ({ ...prev, platform_role_id: event.target.value }))}
              className="md:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              disabled={!canManagePlatformUsers || !canViewPlatformRoles}
            >
              <option value="">No custom role</option>
              {activeRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {PLATFORM_APPS.map((app) => {
              const enabled = newUser.allowed_app_ids.includes(app.id);
              return (
                <button
                  type="button"
                  key={`new-${app.id}`}
                  onClick={() => onToggleNewUserApp(app.id)}
                  className={`rounded-full border px-2.5 py-1 text-xs ${
                    enabled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600"
                  }`}
                  disabled={!canManagePlatformUsers}
                >
                  {app.label}
                </button>
              );
            })}
          </div>
          <select
            value={newUser.default_app_id}
            onChange={(event) => setNewUser((prev) => ({ ...prev, default_app_id: event.target.value }))}
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
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
          </select>
          <button
            type="submit"
            disabled={creatingUser || !canManagePlatformUsers}
            className="mt-3 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {creatingUser ? "Creating user..." : "Create Platform User"}
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="grid grid-cols-[minmax(0,1.1fr)_220px_minmax(0,1fr)_180px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs uppercase tracking-[0.16em] text-slate-500">
          <div>User</div>
          <div>Role</div>
          <div>Apps</div>
          <div>Default App</div>
        </div>
        <div className="divide-y divide-slate-200">
          {platformUsers.map((targetUser) => {
            const allowedApps = normalizeAllowedApps(targetUser.allowed_app_ids);
            const defaultApp = allowedApps.includes(targetUser.default_app_id) ? targetUser.default_app_id : allowedApps[0];
            const isSaving = savingUserId === targetUser.id;
            const isAssigningRole = assigningRoleUserId === targetUser.id;

            return (
              <div
                key={targetUser.id}
                className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1.1fr)_220px_minmax(0,1fr)_180px]"
              >
                <div className="min-w-0">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                      <User className="h-4 w-4 text-slate-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {targetUser.first_name} {targetUser.last_name}
                      </p>
                      <p className="truncate text-xs text-slate-500">{targetUser.email}</p>
                      <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] uppercase text-slate-600">
                        <ShieldCheck className="h-3 w-3" />
                        {String(targetUser.role || "user").replace("_", " ")}
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <select
                    value={targetUser.platform_role_id || ""}
                    disabled={isAssigningRole || activeRoles.length === 0 || !canManagePlatformUsers || !canViewPlatformRoles}
                    onChange={(event) => onAssignRole(targetUser.id, event.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="" disabled>
                      {activeRoles.length > 0 ? "Assign role" : "No roles"}
                    </option>
                    {activeRoles.map((role) => (
                      <option key={`${targetUser.id}-${role.id}`} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap gap-2">
                  {PLATFORM_APPS.map((app) => {
                    const enabled = allowedApps.includes(app.id);
                    return (
                      <button
                        key={`${targetUser.id}-${app.id}`}
                        disabled={isSaving || !canManagePlatformUsers}
                        onClick={() => onUpdateAppAccess(targetUser, app.id)}
                        className={`rounded-full border px-2.5 py-1 text-xs ${
                          enabled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600"
                        } disabled:opacity-60`}
                      >
                        {app.label}
                      </button>
                    );
                  })}
                </div>
                <div>
                  <select
                    value={defaultApp}
                    disabled={isSaving || !canManagePlatformUsers}
                    onChange={(event) => onSetDefaultApp(targetUser, event.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    {allowedApps.map((appId) => {
                      const app = PLATFORM_APPS.find((item) => item.id === appId);
                      return (
                        <option key={`${targetUser.id}-default-${appId}`} value={appId}>
                          {app?.label || appId}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            );
          })}
          {platformUsers.length === 0 ? <div className="px-4 py-3 text-sm text-slate-500">No platform users found.</div> : null}
        </div>
      </div>
    </>
  );
};

export default PlatformUsersSection;
