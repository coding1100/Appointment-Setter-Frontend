import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";

import { authAPI, orgAPI, platformAPI } from "../../services/api";
import Loader from "../Loader";
import { useAuth } from "../../contexts/AuthContext";
import { usePlatform } from "../../contexts/PlatformContext";
import {
  EMPTY_PARTNER_FORM,
  EMPTY_ROLE_FORM,
  EMPTY_USER_FORM,
  SECTION_META,
  isPlatformAdminUser,
  isPlatformMember,
  normalizeAllowedApps,
} from "./constants";
import CustomersSection from "./sections/CustomersSection";
import PartnersSection from "./sections/PartnersSection";
import PlatformUsersSection from "./sections/PlatformUsersSection";

const generateTempPassword = () => {
  const randomPart = Math.random().toString(36).slice(-6);
  const randomNumber = String(Math.floor(100 + Math.random() * 900));
  return `Mr!${randomPart}A${randomNumber}`;
};

const UsersManagement = ({ section = "platform-users" }) => {
  const { user: currentUser } = useAuth();
  const { actor, bootstrap, refetchBootstrap } = usePlatform();

  const [users, setUsers] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [roles, setRoles] = useState([]);
  const [roleTemplates, setRoleTemplates] = useState([]);
  const [permissionCatalog, setPermissionCatalog] = useState([]);

  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);

  const [savingUserId, setSavingUserId] = useState(null);
  const [savingOrgId, setSavingOrgId] = useState(null);
  const [assigningRoleUserId, setAssigningRoleUserId] = useState(null);
  const [creatingRole, setCreatingRole] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [creatingPartner, setCreatingPartner] = useState(false);
  const [loadingMembersOrgId, setLoadingMembersOrgId] = useState(null);
  const [resendingInviteKey, setResendingInviteKey] = useState(null);

  const [error, setError] = useState("");
  const [orgError, setOrgError] = useState("");
  const [success, setSuccess] = useState("");

  const [newRole, setNewRole] = useState(EMPTY_ROLE_FORM);
  const [selectedRoleTemplateId, setSelectedRoleTemplateId] = useState("");
  const [newUser, setNewUser] = useState({
    ...EMPTY_USER_FORM,
    password: generateTempPassword(),
  });
  const [newPartner, setNewPartner] = useState({
    ...EMPTY_PARTNER_FORM,
    owner_password: generateTempPassword(),
  });
  const [newCustomerName, setNewCustomerName] = useState("");
  const [selectedPartnerOrgId, setSelectedPartnerOrgId] = useState("");
  const [partnerMembersByOrg, setPartnerMembersByOrg] = useState({});
  const [createdOwnerCreds, setCreatedOwnerCreds] = useState(null);
  const [createdPlatformCreds, setCreatedPlatformCreds] = useState(null);

  const showPlatformUsers = section === "platform-users";
  const showPartners = section === "partners";
  const showCustomers = section === "customers";

  const isAdmin = isPlatformAdminUser(currentUser);
  const actorMemberships = actor?.memberships || [];
  const isPartnerScoped = actorMemberships.some((m) => String(m?.role || "").toLowerCase().startsWith("partner_"));
  const permissionSet = useMemo(
    () => new Set((bootstrap?.permissions || []).map((permission) => String(permission).trim())),
    [bootstrap?.permissions]
  );

  const hasPermission = useCallback(
    (permission) => isAdmin || permissionSet.has("admin:all") || permissionSet.has(permission),
    [isAdmin, permissionSet]
  );

  const canViewPlatformRoles = hasPermission("roles:read") || hasPermission("roles:write");
  const canViewPlatformUsers = hasPermission("users:read") || hasPermission("users:write") || canViewPlatformRoles;
  const canManagePlatformUsers = hasPermission("users:write");
  const canManagePlatformRoles = hasPermission("roles:write");
  const canViewPartners = isAdmin || isPartnerScoped || hasPermission("partners:read") || hasPermission("partners:write") || hasPermission("entitlements:write");
  const canManagePartners = isAdmin || hasPermission("partners:write");
  const canToggleEntitlements = isAdmin || hasPermission("entitlements:write");
  const canViewCustomers = isAdmin || isPartnerScoped || hasPermission("customers:read") || hasPermission("customers:write");
  const canManageCustomers = isAdmin || isPartnerScoped || hasPermission("customers:write");
  const canManagePartnerMembers = isAdmin || isPartnerScoped || canManagePartners;

  const activeRoles = useMemo(
    () => roles.filter((role) => String(role?.status || "active").toLowerCase() === "active"),
    [roles]
  );
  const platformUsers = useMemo(() => users.filter(isPlatformMember), [users]);
  const partnerOrgs = useMemo(() => orgs.filter((org) => String(org.org_type) === "partner"), [orgs]);
  const customerOrgs = useMemo(() => orgs.filter((org) => String(org.org_type) === "customer"), [orgs]);

  const partnerScope = useMemo(() => {
    if (isAdmin) return partnerOrgs;
    const ids = new Set(
      actorMemberships
        .filter((m) => String(m?.role || "").toLowerCase().startsWith("partner_"))
        .map((m) => m.org_id)
    );
    return partnerOrgs.filter((org) => ids.has(org.id));
  }, [actorMemberships, isAdmin, partnerOrgs]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const response = await authAPI.listUsers(200, 0);
      const usersList = Array.isArray(response.data) ? response.data : response.data?.users || [];
      setUsers(usersList);
    } catch (fetchError) {
      setError(fetchError?.response?.data?.detail || "Failed to load users.");
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const fetchRolesAndPermissions = useCallback(async () => {
    try {
      setLoadingRoles(true);
      const [rolesResponse, permissionResponse, roleTemplatesResponse] = await Promise.all([
        platformAPI.listPlatformRoles(),
        platformAPI.listPermissionCatalog(),
        platformAPI.listPlatformRoleTemplates(),
      ]);
      setRoles(Array.isArray(rolesResponse.data) ? rolesResponse.data : []);
      setPermissionCatalog(Array.isArray(permissionResponse.data) ? permissionResponse.data : []);
      setRoleTemplates(Array.isArray(roleTemplatesResponse.data) ? roleTemplatesResponse.data : []);
    } catch (fetchError) {
      setError(fetchError?.response?.data?.detail || "Failed to load roles.");
    } finally {
      setLoadingRoles(false);
    }
  }, []);

  const fetchOrgs = useCallback(async () => {
    try {
      setLoadingOrgs(true);
      const response = await orgAPI.listOrgs({ limit: 500, offset: 0 });
      setOrgs(Array.isArray(response.data) ? response.data : []);
    } catch (fetchError) {
      setOrgError(fetchError?.response?.data?.detail || "Failed to load organizations.");
      setOrgs([]);
    } finally {
      setLoadingOrgs(false);
    }
  }, []);

  const fetchOrgMembers = useCallback(async (orgId, force = false) => {
    if (!orgId) return;
    if (!force && Array.isArray(partnerMembersByOrg[orgId])) return;
    try {
      setLoadingMembersOrgId(orgId);
      const response = await orgAPI.listOrgMembers(orgId);
      setPartnerMembersByOrg((prev) => ({ ...prev, [orgId]: Array.isArray(response.data) ? response.data : [] }));
    } catch (fetchError) {
      setOrgError(fetchError?.response?.data?.detail || "Failed to load organization members.");
    } finally {
      setLoadingMembersOrgId(null);
    }
  }, [partnerMembersByOrg]);

  useEffect(() => {
    if (showPlatformUsers && canViewPlatformUsers) {
      fetchUsers();
      if (canViewPlatformRoles) {
        fetchRolesAndPermissions();
      }
    }
    if (showPartners && canViewPartners) {
      fetchUsers();
    }
    if ((showPartners && canViewPartners) || (showCustomers && canViewCustomers)) {
      fetchOrgs();
    }
  }, [
    fetchOrgs,
    fetchRolesAndPermissions,
    fetchUsers,
    canViewCustomers,
    canViewPartners,
    canViewPlatformRoles,
    canViewPlatformUsers,
    showCustomers,
    showPartners,
    showPlatformUsers,
  ]);

  useEffect(() => {
    if (!selectedPartnerOrgId && partnerScope.length > 0) {
      setSelectedPartnerOrgId(partnerScope[0].id);
    }
  }, [partnerScope, selectedPartnerOrgId]);

  const handleCreateRole = async (event) => {
    event.preventDefault();
    if (!canManagePlatformRoles) return setError("You do not have permission to create roles.");
    if (!newRole.name.trim()) return setError("Role name is required.");
    if (newRole.permissions.length === 0) return setError("Select at least one permission.");
    try {
      setCreatingRole(true);
      setError("");
      await platformAPI.createPlatformRole({
        name: newRole.name.trim(),
        description: newRole.description.trim() || null,
        permissions: newRole.permissions,
      });
      setNewRole(EMPTY_ROLE_FORM);
      setSelectedRoleTemplateId("");
      setSuccess("Role created successfully.");
      await fetchRolesAndPermissions();
    } catch (createError) {
      setError(createError?.response?.data?.detail || "Failed to create role.");
    } finally {
      setCreatingRole(false);
    }
  };

  const handleApplyRoleTemplate = useCallback(
    (templateId) => {
      setSelectedRoleTemplateId(templateId);
      const template = roleTemplates.find((item) => String(item?.id) === String(templateId));
      if (!template) {
        return;
      }
      setNewRole({
        name: template.name || "",
        description: template.description || "",
        permissions: Array.isArray(template.permissions) ? template.permissions : [],
      });
      setSuccess(`Role template "${template.name}" applied. You can edit before creating.`);
    },
    [roleTemplates]
  );

  const handleCreatePlatformUser = async (event) => {
    event.preventDefault();
    if (!canManagePlatformUsers) return setError("You do not have permission to create platform users.");
    if (!newUser.first_name.trim() || !newUser.last_name.trim()) return setError("First name and last name are required.");
    if (!newUser.email.trim() || !newUser.username.trim()) return setError("Email and username are required.");
    if (!newUser.password || newUser.password.length < 8) return setError("Password must be at least 8 characters.");

    const allowed = normalizeAllowedApps(newUser.allowed_app_ids);
    const defaultApp = allowed.includes(newUser.default_app_id) ? newUser.default_app_id : allowed[0];

    try {
      setCreatingUser(true);
      setError("");
      await platformAPI.createPlatformUser({
        ...newUser,
        first_name: newUser.first_name.trim(),
        last_name: newUser.last_name.trim(),
        email: newUser.email.trim(),
        username: newUser.username.trim(),
        platform_role_id: newUser.platform_role_id || null,
        allowed_app_ids: allowed,
        default_app_id: defaultApp,
      });
      setCreatedPlatformCreds({
        full_name: `${newUser.first_name.trim()} ${newUser.last_name.trim()}`.trim(),
        email: newUser.email.trim(),
        username: newUser.username.trim(),
        temporary_password: newUser.password,
      });
      setNewUser({
        ...EMPTY_USER_FORM,
        password: generateTempPassword(),
      });
      setSuccess("Platform user created successfully.");
      await fetchUsers();
    } catch (createError) {
      setError(createError?.response?.data?.detail || "Failed to create platform user.");
    } finally {
      setCreatingUser(false);
    }
  };

  const handleCreatePartnerWithOwner = async (event) => {
    event.preventDefault();
    if (!canManagePartners) return setOrgError("You do not have permission to create partners.");
    if (!newPartner.name.trim()) return setOrgError("Partner name is required.");
    if (!newPartner.owner_first_name.trim() || !newPartner.owner_last_name.trim()) return setOrgError("Owner first and last name are required.");
    if (!newPartner.owner_email.trim() || !newPartner.owner_username.trim()) return setOrgError("Owner email and username are required.");
    if (!newPartner.owner_password || newPartner.owner_password.length < 8) return setOrgError("Temporary password must be at least 8 characters.");
    const seatLimit = Number.parseInt(String(newPartner.seat_limit || "").trim(), 10);
    if (!Number.isInteger(seatLimit) || seatLimit <= 0) return setOrgError("Seat limit must be a positive number.");

    const idempotencyKey =
      typeof window !== "undefined" && window.crypto?.randomUUID
        ? window.crypto.randomUUID()
        : `partner-${Date.now()}`;

    try {
      setCreatingPartner(true);
      setOrgError("");
      const response = await orgAPI.createPartnerWithOwner(
        {
          name: newPartner.name.trim(),
          status: "active",
          owner: {
            first_name: newPartner.owner_first_name.trim(),
            last_name: newPartner.owner_last_name.trim(),
            email: newPartner.owner_email.trim(),
            username: newPartner.owner_username.trim(),
            password: newPartner.owner_password,
            role: newPartner.owner_role,
            allowed_app_ids: ["appointment_setter", "users"],
            default_app_id: "appointment_setter",
          },
          seat_limit: seatLimit,
          approval_notes: newPartner.approval_notes.trim() || null,
          send_invite_email: Boolean(newPartner.send_invite_email),
          invite_base_url: typeof window !== "undefined" ? window.location.origin : null,
        },
        idempotencyKey
      );
      setCreatedOwnerCreds({
        partner_name: response?.data?.partner_org?.name || newPartner.name.trim(),
        owner_name: `${newPartner.owner_first_name.trim()} ${newPartner.owner_last_name.trim()}`.trim(),
        email: newPartner.owner_email.trim(),
        username: newPartner.owner_username.trim(),
        temporary_password: newPartner.owner_password,
      });
      setNewPartner({
        ...EMPTY_PARTNER_FORM,
        owner_password: generateTempPassword(),
      });
      setSuccess(
        response?.data?.invite_email_sent
          ? "Partner and owner created. Invite email sent."
          : "Partner and owner created."
      );
      await fetchOrgs();
      if (isAdmin) {
        await fetchUsers();
      }
    } catch (createError) {
      setOrgError(createError?.response?.data?.detail || "Failed to create partner with owner.");
    } finally {
      setCreatingPartner(false);
    }
  };

  const handleAssignRole = async (targetUserId, platformRoleId) => {
    if (!canManagePlatformUsers) return setError("You do not have permission to assign roles.");
    if (!platformRoleId) return;
    try {
      setAssigningRoleUserId(targetUserId);
      setError("");
      await platformAPI.assignPlatformRoleToUser(targetUserId, { platform_role_id: platformRoleId });
      setUsers((prev) => prev.map((item) => (item.id === targetUserId ? { ...item, platform_role_id: platformRoleId } : item)));
      if (String(currentUser?.id || "") === String(targetUserId)) await refetchBootstrap();
      setSuccess("Platform role assigned successfully.");
    } catch (updateError) {
      setError(updateError?.response?.data?.detail || "Failed to assign role.");
    } finally {
      setAssigningRoleUserId(null);
    }
  };

  const handleUpdateAppAccess = useCallback(
    async (targetUser, appId) => {
      if (!canManagePlatformUsers) return setError("You do not have permission to update app access.");
      const currentApps = normalizeAllowedApps(targetUser.allowed_app_ids);
      const hasApp = currentApps.includes(appId);
      const nextApps = hasApp ? currentApps.filter((id) => id !== appId) : [...currentApps, appId];
      if (nextApps.length === 0) return setError("At least one app is required.");
      const nextDefault = nextApps.includes(targetUser.default_app_id) ? targetUser.default_app_id : nextApps[0];

      try {
        setSavingUserId(targetUser.id);
        setError("");
        await platformAPI.updateUserAppAccess(targetUser.id, { allowed_app_ids: nextApps, default_app_id: nextDefault });
        setUsers((prev) =>
          prev.map((item) => (item.id === targetUser.id ? { ...item, allowed_app_ids: nextApps, default_app_id: nextDefault } : item))
        );
      } catch (updateError) {
        setError(updateError?.response?.data?.detail || "Failed to update app access.");
      } finally {
        setSavingUserId(null);
      }
    },
    [canManagePlatformUsers]
  );

  const handleSetDefaultApp = useCallback(async (targetUser, defaultAppId) => {
    if (!canManagePlatformUsers) return setError("You do not have permission to update app access.");
    const allowed = normalizeAllowedApps(targetUser.allowed_app_ids);
    const nextAllowed = allowed.includes(defaultAppId) ? allowed : [...allowed, defaultAppId];
    try {
      setSavingUserId(targetUser.id);
      setError("");
      await platformAPI.updateUserAppAccess(targetUser.id, {
        allowed_app_ids: nextAllowed,
        default_app_id: defaultAppId,
      });
      setUsers((prev) =>
        prev.map((item) =>
          item.id === targetUser.id
            ? { ...item, allowed_app_ids: nextAllowed, default_app_id: defaultAppId }
            : item
        )
      );
    } catch (updateError) {
      setError(updateError?.response?.data?.detail || "Failed to update default app.");
    } finally {
      setSavingUserId(null);
    }
  }, [canManagePlatformUsers]);

  const handleEntitlementToggle = async (partnerOrgId, currentValue) => {
    if (!canToggleEntitlements) return setOrgError("You do not have permission to update entitlements.");
    try {
      setSavingOrgId(partnerOrgId);
      setOrgError("");
      await orgAPI.updatePartnerEntitlements(partnerOrgId, {
        appointment_setter_enabled: !currentValue,
        approval_notes: !currentValue ? "Approved from partners section" : "Disabled from partners section",
      });
      await fetchOrgs();
      await refetchBootstrap();
    } catch (updateError) {
      setOrgError(updateError?.response?.data?.detail || "Failed to update entitlement.");
    } finally {
      setSavingOrgId(null);
    }
  };

  const handleUpdatePartnerSeatLimit = async (partnerOrg, seatLimitInput) => {
    if (!canToggleEntitlements) return setOrgError("You do not have permission to update seat limits.");
    const seatLimit = Number.parseInt(String(seatLimitInput || "").trim(), 10);
    if (!Number.isInteger(seatLimit) || seatLimit <= 0) {
      setOrgError("Seat limit must be a positive number.");
      return;
    }
    try {
      setSavingOrgId(partnerOrg.id);
      setOrgError("");
      await orgAPI.updatePartnerEntitlements(partnerOrg.id, {
        appointment_setter_enabled: Boolean(partnerOrg.appointment_setter_enabled),
        seat_limit: seatLimit,
        approval_notes: "Seat limit updated from partners section",
      });
      setSuccess(`Seat limit updated to ${seatLimit} for ${partnerOrg.name}.`);
      await fetchOrgs();
      await refetchBootstrap();
    } catch (updateError) {
      setOrgError(updateError?.response?.data?.detail || "Failed to update partner seat limit.");
    } finally {
      setSavingOrgId(null);
    }
  };

  const handleOrgLifecycleAction = async (orgId, action) => {
    const normalizedAction = String(action || "").toLowerCase();
    const isSuspend = normalizedAction === "suspend";
    const isReactivate = normalizedAction === "reactivate";
    if (!isSuspend && !isReactivate) return;
    try {
      setSavingOrgId(orgId);
      setOrgError("");
      if (isSuspend) {
        await orgAPI.suspendOrg(orgId);
      } else {
        await orgAPI.reactivateOrg(orgId);
      }
      setSuccess(isSuspend ? "Organization suspended." : "Organization reactivated.");
      await fetchOrgs();
      await refetchBootstrap();
    } catch (lifecycleError) {
      setOrgError(lifecycleError?.response?.data?.detail || "Failed to update organization lifecycle state.");
    } finally {
      setSavingOrgId(null);
    }
  };

  const handleCreateCustomer = async (event) => {
    event.preventDefault();
    if (!canManageCustomers) return setOrgError("You do not have permission to create customers.");
    if (!selectedPartnerOrgId || !newCustomerName.trim()) return setOrgError("Select partner and provide customer name.");
    try {
      setSavingOrgId(selectedPartnerOrgId);
      setOrgError("");
      await orgAPI.createOrg({
        org_type: "customer",
        name: newCustomerName.trim(),
        parent_org_id: selectedPartnerOrgId,
        status: "active",
      });
      setNewCustomerName("");
      await fetchOrgs();
    } catch (createError) {
      setOrgError(createError?.response?.data?.detail || "Failed to create customer.");
    } finally {
      setSavingOrgId(null);
    }
  };

  const handleResendSetupInvite = async (orgId, userId) => {
    if (!canManagePartnerMembers) return setOrgError("You do not have permission to resend invites.");
    const actionKey = `${orgId}:${userId}`;
    try {
      setResendingInviteKey(actionKey);
      setOrgError("");
      const response = await orgAPI.resendOrgMemberSetupInvite(orgId, userId, {
        invite_base_url: typeof window !== "undefined" ? window.location.origin : null,
      });
      setSuccess(response?.data?.message || "Invite email sent.");
    } catch (inviteError) {
      setOrgError(inviteError?.response?.data?.detail || "Failed to resend invite.");
    } finally {
      setResendingInviteKey(null);
    }
  };

  const toggleNewUserApp = (appId) => {
    setNewUser((prev) => {
      const hasApp = prev.allowed_app_ids.includes(appId);
      const nextAllowed = hasApp ? prev.allowed_app_ids.filter((id) => id !== appId) : [...prev.allowed_app_ids, appId];
      if (nextAllowed.length === 0) return prev;
      return {
        ...prev,
        allowed_app_ids: nextAllowed,
        default_app_id: nextAllowed.includes(prev.default_app_id) ? prev.default_app_id : nextAllowed[0],
      };
    });
  };

  const togglePermission = (permissionId) =>
    setNewRole((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter((item) => item !== permissionId)
        : [...prev.permissions, permissionId],
    }));

  const usersById = useMemo(() => {
    const mapped = {};
    users.forEach((userItem) => {
      if (userItem?.id) {
        mapped[String(userItem.id)] = userItem;
      }
    });
    return mapped;
  }, [users]);

  if (showPlatformUsers && (loadingUsers || (canViewPlatformRoles && loadingRoles))) return <Loader message="Loading users..." />;
  if (((showPartners && canViewPartners) || (showCustomers && canViewCustomers)) && loadingOrgs) return <Loader message="Loading organizations..." />;

  if (showPlatformUsers && !canViewPlatformUsers) return <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">You do not have permission to view platform users.</div>;
  if (showPartners && !canViewPartners) return <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">You do not have permission to view partners.</div>;
  if (showCustomers && !canViewCustomers) return <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">You do not have permission to view customers.</div>;

  const meta = SECTION_META[section] || SECTION_META["platform-users"];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{meta.eyebrow}</p>
          <h1 className="text-2xl font-semibold text-slate-900">{meta.title}</h1>
          <p className="text-sm text-slate-600">{meta.description}</p>
        </div>
        <button
          onClick={() => {
            setSuccess("");
            if (showPlatformUsers) {
              fetchUsers();
              if (canViewPlatformRoles) {
                fetchRolesAndPermissions();
              }
            } else {
              fetchOrgs();
            }
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div> : null}
      {orgError ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{orgError}</div> : null}
      {success ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{success}</div> : null}

      {showPlatformUsers ? (
        <PlatformUsersSection
          newRole={newRole}
          setNewRole={setNewRole}
          roleTemplates={roleTemplates}
          selectedRoleTemplateId={selectedRoleTemplateId}
          setSelectedRoleTemplateId={setSelectedRoleTemplateId}
          newUser={newUser}
          setNewUser={setNewUser}
          permissionCatalog={permissionCatalog}
          activeRoles={activeRoles}
          creatingRole={creatingRole}
          creatingUser={creatingUser}
          createdPlatformCreds={createdPlatformCreds}
          canViewPlatformRoles={canViewPlatformRoles}
          canManagePlatformUsers={canManagePlatformUsers}
          canManagePlatformRoles={canManagePlatformRoles}
          platformUsers={platformUsers}
          savingUserId={savingUserId}
          assigningRoleUserId={assigningRoleUserId}
          onCreateRole={handleCreateRole}
          onApplyRoleTemplate={handleApplyRoleTemplate}
          onTogglePermission={togglePermission}
          onCreatePlatformUser={handleCreatePlatformUser}
          onToggleNewUserApp={toggleNewUserApp}
          onAssignRole={handleAssignRole}
          onUpdateAppAccess={handleUpdateAppAccess}
          onSetDefaultApp={handleSetDefaultApp}
        />
      ) : null}

      {showPartners ? (
        <PartnersSection
          isAdmin={isAdmin}
          newPartner={newPartner}
          setNewPartner={setNewPartner}
          creatingPartner={creatingPartner}
          createdOwnerCreds={createdOwnerCreds}
          canManagePartners={canManagePartners}
          canToggleEntitlements={canToggleEntitlements}
          canManagePartnerMembers={canManagePartnerMembers}
          partnerOrgs={partnerOrgs}
          partnerScope={partnerScope}
          partnerMembersByOrg={partnerMembersByOrg}
          usersById={usersById}
          loadingMembersOrgId={loadingMembersOrgId}
          savingOrgId={savingOrgId}
          resendingInviteKey={resendingInviteKey}
          onCreatePartnerWithOwner={handleCreatePartnerWithOwner}
          onEntitlementToggle={handleEntitlementToggle}
          onUpdatePartnerSeatLimit={handleUpdatePartnerSeatLimit}
          onOrgLifecycleAction={handleOrgLifecycleAction}
          onFetchOrgMembers={fetchOrgMembers}
          onResendSetupInvite={handleResendSetupInvite}
        />
      ) : null}

      {showCustomers ? (
        <CustomersSection
          isAdmin={isAdmin}
          partnerOrgs={partnerOrgs}
          partnerScope={partnerScope}
          selectedPartnerOrgId={selectedPartnerOrgId}
          setSelectedPartnerOrgId={setSelectedPartnerOrgId}
          newCustomerName={newCustomerName}
          setNewCustomerName={setNewCustomerName}
          canManageCustomers={canManageCustomers}
          savingOrgId={savingOrgId}
          customerOrgs={customerOrgs}
          onCreateCustomer={handleCreateCustomer}
          onOrgLifecycleAction={handleOrgLifecycleAction}
        />
      ) : null}
    </div>
  );
};

export default UsersManagement;
