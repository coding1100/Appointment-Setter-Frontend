import { PLATFORM_APPS } from "../../platform/appCatalog";

export const SECTION_META = {
  "platform-users": {
    eyebrow: "Platform",
    title: "Platform Users",
    description: "Create platform users, create roles, and assign roles.",
  },
  partners: {
    eyebrow: "White-Label",
    title: "Partners",
    description: "Manage partner organizations and app entitlements.",
  },
  customers: {
    eyebrow: "White-Label",
    title: "Customers",
    description: "Create and manage customer organizations under partners.",
  },
};

export const EMPTY_ROLE_FORM = { name: "", description: "", permissions: [] };

export const EMPTY_USER_FORM = {
  first_name: "",
  last_name: "",
  email: "",
  username: "",
  password: "",
  membership_role: "platform_staff",
  platform_role_id: "",
  allowed_app_ids: ["users"],
  default_app_id: "users",
};

export const EMPTY_PARTNER_FORM = {
  name: "",
  owner_first_name: "",
  owner_last_name: "",
  owner_email: "",
  owner_username: "",
  owner_password: "",
  owner_role: "partner_owner",
  seat_limit: "25",
  approval_notes: "",
  send_invite_email: true,
};

export const isPlatformMember = (user) => {
  const memberships = Array.isArray(user?.org_memberships) ? user.org_memberships : [];
  return (
    String(user?.role || "").toLowerCase() === "admin" ||
    memberships.some((membership) => String(membership?.role || "").toLowerCase().startsWith("platform_"))
  );
};

export const isPlatformAdminUser = (user) => {
  const memberships = Array.isArray(user?.org_memberships) ? user.org_memberships : [];
  return (
    String(user?.role || "").toLowerCase() === "admin" ||
    memberships.some((membership) => String(membership?.role || "").toLowerCase() === "platform_owner")
  );
};

export const normalizeAllowedApps = (allowedAppIds) => {
  const appIds = Array.isArray(allowedAppIds) ? allowedAppIds : [];
  const valid = appIds.filter((id) => PLATFORM_APPS.some((app) => app.id === id));
  return valid.length > 0 ? valid : ["users"];
};
