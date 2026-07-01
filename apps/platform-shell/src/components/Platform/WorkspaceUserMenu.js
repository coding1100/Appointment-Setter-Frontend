import React from "react";
import { useNavigate } from "react-router-dom";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, LogOut } from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";
import { usePlatform } from "../../contexts/PlatformContext";

const initialsFromUser = (user) => {
  const first = user?.first_name?.[0] || "";
  const last = user?.last_name?.[0] || "";
  return `${first}${last}`.toUpperCase() || "AI";
};

const roleLabelFromUser = (user) => {
  const platformRoleName = String(user?.platform_role_name || "").trim();
  if (platformRoleName) return platformRoleName.toUpperCase();
  return String(user?.role || "")
    .replace("_", " ")
    .toUpperCase();
};

const WorkspaceUserMenu = ({ displayName }) => {
  const { user, logout } = useAuth();
  const { actor } = usePlatform();
  const navigate = useNavigate();
  const displayActor = actor || user;

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-3 rounded-lg border-0 bg-transparent px-1 py-1 text-left transition hover:bg-slate-50"
        >
          <span className="hidden text-sm text-slate-600 sm:inline">
            Hi, <span className="font-medium text-[#1a1a2e]">{displayName}</span>
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#68fadd] text-xs font-bold text-[#1a1a2e]">
            {initialsFromUser(displayActor)}
          </div>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={8}
          align="end"
          className="z-50 min-w-[220px] rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
        >
          <div className="border-b border-slate-100 px-3 py-2.5">
            <p className="text-sm font-medium text-[#1a1a2e]">
              {displayActor?.first_name} {displayActor?.last_name}
            </p>
            <p className="text-[10px] tracking-[0.12em] text-[#006b5c]">
              {roleLabelFromUser(displayActor)}
            </p>
          </div>
          <DropdownMenu.Item
            onSelect={handleLogout}
            className="mt-1 flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none hover:bg-[#eef0f4]"
          >
            <LogOut className="h-4 w-4 text-rose-500" />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default WorkspaceUserMenu;
