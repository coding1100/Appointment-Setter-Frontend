import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Edit,
  LayoutGrid,
  List,
  Mic2,
  Plus,
  Power,
  PowerOff,
  Trash2,
  User,
  Volume2,
} from "lucide-react";

import { agentAPI } from "../../services/api";
import AgentForm from "./AgentForm";
import Loader from "../Loader";
import { NAVY, TEAL, TEAL_DEEP } from "../Platform/WorkspaceShellLayout";

const PAGE_SIZE = 8;

const formatError = (err, defaultMsg) => {
  const errorDetail = err.response?.data?.detail;
  if (Array.isArray(errorDetail)) {
    return errorDetail
      .map((entry) => `${entry.loc?.join(".")} - ${entry.msg}`)
      .join(", ");
  }
  return typeof errorDetail === "string" ? errorDetail : defaultMsg;
};

const getAgentDisplayStatus = (status) => {
  if (status === "active") return "DEPLOYED";
  return "OFFLINE";
};

const getStatusBadgeClass = (displayStatus) => {
  if (displayStatus === "DEPLOYED") {
    return "bg-[#68fadd]/25 text-[#006b5c]";
  }
  if (displayStatus === "TRAINING") {
    return "bg-slate-100 text-slate-600";
  }
  return "bg-rose-50 text-rose-700";
};

const getPerformanceMetrics = (agent, index) => {
  const seeds = [
    { perfLabel: "LATENCY", perfValue: "180ms", effLabel: "SUCCESS RATE", effValue: "98.2%", effTone: "positive" },
    { perfLabel: "VELOCITY", perfValue: "4.2GB/hr", effLabel: "ACCURACY", effValue: "Positive (0.88)", effTone: "positive" },
    { perfLabel: "THROUGHPUT", perfValue: "1.2k/hr", effLabel: "SUCCESS RATE", effValue: "94.1%", effTone: "positive" },
    { perfLabel: "LATENCY", perfValue: "240ms", effLabel: "ACCURACY", effValue: "Needs tuning", effTone: "muted" },
  ];
  const seed = seeds[index % seeds.length];
  if (agent.status !== "active") {
    return {
      perfLabel: "LATENCY",
      perfValue: "—",
      effLabel: "SUCCESS RATE",
      effValue: "Offline",
      effTone: "muted",
    };
  }
  return seed;
};

const agentIconBtnBase =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1";

const AgentRowActions = ({ agent, onEdit, onToggleStatus, onDelete, embedded = "table" }) => {
  const isActive = agent.status === "active";
  const statusLabel = isActive ? "Deactivate agent" : "Activate agent";

  return (
    <div
      className={
        embedded === "card"
          ? "inline-flex flex-nowrap items-center rounded-md border border-slate-200 bg-white p-0.5 shadow-sm"
          : "inline-flex flex-nowrap items-center justify-center rounded-md border border-slate-200 bg-white p-0.5 shadow-sm"
      }
      role="group"
      aria-label={`Actions for ${agent.name}`}
    >
      <button
        type="button"
        onClick={() => onEdit(agent)}
        title="Edit"
        aria-label="Edit agent"
        className={`${agentIconBtnBase} rounded-l-[5px] text-slate-600 hover:bg-slate-100 focus-visible:outline-slate-400`}
      >
        <Edit className="h-4 w-4" strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={() => onToggleStatus(agent)}
        title={statusLabel}
        aria-label={statusLabel}
        className={`${agentIconBtnBase} border-x border-slate-200 focus-visible:outline-amber-500/40 ${
          isActive
            ? "text-amber-700 hover:bg-amber-50"
            : "text-emerald-700 hover:bg-emerald-50 focus-visible:outline-emerald-500/40"
        }`}
      >
        {isActive ? (
          <PowerOff className="h-4 w-4" strokeWidth={2} />
        ) : (
          <Power className="h-4 w-4" strokeWidth={2} />
        )}
      </button>
      <button
        type="button"
        onClick={() => onDelete(agent)}
        title="Delete"
        aria-label="Delete agent"
        className={`${agentIconBtnBase} rounded-r-[5px] text-rose-600 hover:bg-rose-50 focus-visible:outline-rose-500/40`}
      >
        <Trash2 className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
};

const AgenticAgentList = ({
  agents,
  error,
  onCreate,
  onEdit,
  onToggleStatus,
  onDelete,
  tenants = [],
  selectedTenant = "",
  onTenantChange,
}) => {
  const [activeTab, setActiveTab] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("list");
  const [page, setPage] = useState(1);
  const [hoveredId, setHoveredId] = useState(null);

  const serviceTypes = useMemo(() => {
    const types = [...new Set(agents.map((a) => a.service_type).filter(Boolean))];
    return types.sort();
  }, [agents]);

  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      if (activeTab === "favorites") return false;
      if (typeFilter !== "all" && agent.service_type !== typeFilter) return false;
      const displayStatus = getAgentDisplayStatus(agent.status);
      if (statusFilter === "deployed" && displayStatus !== "DEPLOYED") return false;
      if (statusFilter === "offline" && displayStatus !== "OFFLINE") return false;
      return true;
    });
  }, [agents, activeTab, typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAgents.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedAgents = filteredAgents.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [activeTab, typeFilter, statusFilter]);

  if (agents.length === 0) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center">
        <Mic2 className="h-12 w-12 text-slate-300" />
        <h3 className="mt-5 text-xl font-semibold" style={{ color: NAVY }}>
          No agents yet
        </h3>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          Create your first voice agent to start managing your autonomous workforce.
        </p>
        <button
          type="button"
          onClick={onCreate}
          className="mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-white transition hover:opacity-90"
          style={{ backgroundColor: NAVY }}
        >
          <Plus className="h-4 w-4" />
          Create new agent
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: NAVY }}>
            Agents
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Manage and monitor your autonomous workforce.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2.5 sm:justify-end">
          {tenants.length > 1 && onTenantChange ? (
            <label className="flex min-w-[140px] flex-col gap-1">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Active tenant
              </span>
              <select
                value={selectedTenant}
                onChange={(e) => onTenantChange(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#68fadd]/50 focus:outline-none focus:ring-2 focus:ring-[#68fadd]/20"
              >
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex shrink-0 items-center gap-2 self-end rounded-lg px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-white transition hover:opacity-90 sm:self-auto"
            style={{ backgroundColor: NAVY }}
          >
            <Plus className="h-4 w-4" />
            Create new agent
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100/80 p-0.5">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`rounded-md px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] transition ${
              activeTab === "all"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            All agents
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("favorites")}
            className={`rounded-md px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] transition ${
              activeTab === "favorites"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Favorites
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
              Type:
            </span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border-0 bg-transparent text-sm font-medium text-slate-800 focus:outline-none focus:ring-0"
            >
              <option value="all">All Types</option>
              {serviceTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
              Status:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border-0 bg-transparent text-sm font-medium text-slate-800 focus:outline-none focus:ring-0"
            >
              <option value="all">All Status</option>
              <option value="deployed">Deployed</option>
              <option value="offline">Offline</option>
            </select>
          </label>

          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`rounded p-2 ${viewMode === "grid" ? "bg-slate-100 text-slate-900" : "text-slate-400"}`}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`rounded p-2 ${viewMode === "list" ? "bg-slate-100 text-slate-900" : "text-slate-400"}`}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {activeTab === "favorites" && filteredAgents.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
          No favorite agents yet. Star agents from the list when favorites are enabled.
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pagedAgents.map((agent, index) => {
            const displayStatus = getAgentDisplayStatus(agent.status);
            const metrics = getPerformanceMetrics(agent, index);
            return (
              <div
                key={agent.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: NAVY }}
                  >
                    <Mic2 className="h-5 w-5" style={{ color: TEAL }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => onEdit(agent)}
                      className="truncate text-left font-semibold transition hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68fadd]/60"
                      style={{ color: NAVY }}
                    >
                      {agent.name}
                    </button>
                    <p className="text-xs text-slate-500">{agent.language || "Voice"}</p>
                  </div>
                </div>
                <span
                  className={`mt-3 inline-block rounded-full px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide ${getStatusBadgeClass(displayStatus)}`}
                >
                  {displayStatus}
                </span>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-wide text-slate-400">
                      {metrics.perfLabel}
                    </p>
                    <p className="font-semibold text-slate-800">{metrics.perfValue}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-wide text-slate-400">
                      {metrics.effLabel}
                    </p>
                    <p
                      className={`font-semibold ${metrics.effTone === "positive" ? "text-emerald-600" : "text-slate-500"}`}
                    >
                      {metrics.effValue}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <AgentRowActions
                    agent={agent}
                    onEdit={onEdit}
                    onToggleStatus={onToggleStatus}
                    onDelete={onDelete}
                    embedded="card"
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="hidden border-b border-slate-200 bg-slate-50/90 px-4 py-2 md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(120px,140px)_minmax(0,1fr)_minmax(0,1fr)_minmax(112px,120px)] md:items-center md:justify-items-center md:gap-4">
            {["Agent name / type", "Status", "Key performance", "Efficiency", "Actions"].map(
              (col) => (
                <span
                  key={col}
                  className={`w-full font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 ${
                    col === "Agent name / type"
                      ? "justify-self-start text-left"
                      : "text-center"
                  }`}
                >
                  {col}
                </span>
              ),
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {pagedAgents.map((agent, index) => {
              const displayStatus = getAgentDisplayStatus(agent.status);
              const metrics = getPerformanceMetrics(agent, index);
              const isHighlighted = hoveredId === agent.id;

              return (
                <div
                  key={agent.id}
                  className={`relative px-4 py-2.5 transition ${
                    isHighlighted
                      ? "bg-[#68fadd]/[0.04] shadow-[inset_3px_0_0_0_#68fadd]"
                      : "hover:bg-slate-50/80"
                  }`}
                  onMouseEnter={() => setHoveredId(agent.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(120px,140px)_minmax(0,1fr)_minmax(0,1fr)_minmax(112px,120px)] md:items-center md:justify-items-center md:gap-4">
                    <div className="flex w-full min-w-0 items-center justify-start gap-3 text-left md:justify-self-start">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-100"
                        style={{ backgroundColor: NAVY }}
                      >
                        <Mic2 className="h-5 w-5" style={{ color: TEAL }} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center justify-start gap-2">
                          <button
                            type="button"
                            onClick={() => onEdit(agent)}
                            className="truncate text-left font-semibold transition hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68fadd]/60"
                            style={{ color: NAVY }}
                          >
                            {agent.name}
                          </button>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                              agent.status === "active"
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {agent.status}
                          </span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center justify-start gap-1.5 text-xs text-slate-500">
                          <Volume2 className="h-3.5 w-3.5 shrink-0" />
                          {agent.language || "en-US"}
                          <span className="text-slate-300">·</span>
                          <span className="capitalize">{agent.service_type}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex w-full flex-col items-center text-center">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide ${getStatusBadgeClass(displayStatus)}`}
                      >
                        {displayStatus}
                      </span>
                    </div>

                    <div className="w-full text-center">
                      <p className="font-mono text-[9px] uppercase tracking-wide text-slate-400">
                        {metrics.perfLabel}
                      </p>
                      <p className="text-base font-semibold text-slate-900">{metrics.perfValue}</p>
                    </div>

                    <div className="w-full text-center">
                      <p className="font-mono text-[9px] uppercase tracking-wide text-slate-400">
                        {metrics.effLabel}
                      </p>
                      <p
                        className={`text-base font-semibold ${metrics.effTone === "positive" ? "text-emerald-600" : "text-slate-500"}`}
                      >
                        {metrics.effValue}
                      </p>
                    </div>

                    <div className="flex w-full justify-center">
                      <AgentRowActions
                        agent={agent}
                        onEdit={onEdit}
                        onToggleStatus={onToggleStatus}
                        onDelete={onDelete}
                        embedded="table"
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={onCreate}
              className="flex w-full items-center gap-3 border-t border-dashed border-slate-200 px-4 py-3 text-left transition hover:bg-slate-50/50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-400">
                <Plus className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-700">New Template</p>
                <p className="text-sm text-slate-400">
                  Start from a pre-built agent architecture
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Total active capacity
            </p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              {agents.filter((a) => a.status === "active").length > 0
                ? `${Math.min(99, 70 + agents.filter((a) => a.status === "active").length * 5)}.${agents.length % 10}%`
                : "—"}
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Compute efficiency
            </p>
            <p className="mt-1 text-xl font-semibold text-slate-900">0.92 CPI</p>
          </div>
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Global latency
            </p>
            <p className="mt-1 text-xl font-semibold text-emerald-600">Optimal</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const ClassicAgentList = ({
  agents,
  error,
  onCreate,
  onEdit,
  onToggleStatus,
  onDelete,
}) => (
  <div className="space-y-6">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-[0.78rem] uppercase tracking-[0.32em] text-slate-700">
          Voice Agent Directory
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-black">
          Agent Management
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-700">
          Configure tenant-specific AI voice agents, greeting behavior, language, and activation
          state from a single operational workspace.
        </p>
      </div>
      <button
        type="button"
        onClick={onCreate}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2f66ea] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(19,57,150,0.28)] transition hover:bg-[#295ad0]"
      >
        <Plus className="h-4 w-4" />
        Create Agent
      </button>
    </div>

    {error ? (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
        {error}
      </div>
    ) : null}

    {agents.length === 0 ? (
      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[28px] border border-slate-200 bg-slate-50 px-6 text-center">
        <User className="h-16 w-16 text-slate-400" />
        <h3 className="mt-6 text-2xl font-semibold tracking-[-0.02em] text-black">No agents yet</h3>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-700">
          Create your first AI voice agent to start handling tenant-specific calls, greetings, and
          service workflows.
        </p>
        <button
          type="button"
          onClick={onCreate}
          className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-[#2f66ea] px-6 py-3 text-sm font-semibold text-black shadow-[0_14px_28px_rgba(19,57,150,0.28)] transition hover:bg-[#295ad0]"
        >
          <Plus className="h-5 w-5" />
          Create First Agent
        </button>
      </div>
    ) : (
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50">
        <div className="hidden grid-cols-[minmax(0,1.2fr)_180px_160px_220px] gap-4 border-b border-slate-200 px-5 py-3 text-xs uppercase tracking-[0.28em] text-slate-500 lg:grid">
          <div>Agent</div>
          <div>Service</div>
          <div>Status</div>
          <div>Actions</div>
        </div>
        <div className="divide-y divide-slate-200">
          {agents.map((agent) => (
            <div key={agent.id} className="px-5 py-5">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_180px_160px_220px] lg:items-start">
                <div className="min-w-0">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-slate-50">
                      <User className="h-5 w-5 text-sky-400" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-semibold text-black">{agent.name}</h3>
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-black/35 line-clamp-2">
                        {agent.greeting_message}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-sm capitalize text-slate-700">{agent.service_type}</div>
                <div className="text-sm text-slate-700">{agent.status}</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(agent)}
                    className="rounded-2xl border border-black/10 bg-slate-50 px-3.5 py-2.5 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleStatus(agent)}
                    className="rounded-2xl bg-emerald-400 px-3.5 py-2.5 text-sm text-white"
                  >
                    Toggle
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(agent)}
                    className="rounded-2xl bg-red-500 px-3.5 py-2.5 text-sm text-white"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

const VOICE_TESTING_PATH = "/app/appointment-setter/voice-testing";

const AgentList = ({
  tenantId,
  createRequested = 0,
  variant = "classic",
  tenants = [],
  selectedTenant = "",
  onTenantChange,
}) => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchAgents = useCallback(async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      const response = await agentAPI.listAgents(tenantId);
      setAgents(response.data);
      setError("");
    } catch (err) {
      setError(formatError(err, "Failed to fetch agents"));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (tenantId) {
      fetchAgents();
    }
  }, [tenantId, fetchAgents]);

  useEffect(() => {
    if (createRequested > 0) {
      handleCreateAgent();
    }
  }, [createRequested]);

  const handleCreateAgent = () => {
    if (variant === "agentic" && tenantId) {
      navigate(`${VOICE_TESTING_PATH}?mode=create&tenantId=${encodeURIComponent(tenantId)}`);
      return;
    }
    setEditingAgent(null);
    setShowForm(true);
  };

  const handleEditAgent = (agent) => {
    if (variant === "agentic" && tenantId) {
      navigate(
        `${VOICE_TESTING_PATH}?mode=edit&tenantId=${encodeURIComponent(tenantId)}&agentId=${encodeURIComponent(agent.id)}`,
      );
      return;
    }
    setEditingAgent(agent);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingAgent(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingAgent(null);
    fetchAgents();
  };

  const handleDeleteClick = (agent) => {
    setDeleteConfirm(agent);
  };

  const handleDeleteConfirm = async () => {
    try {
      await agentAPI.deleteAgent(deleteConfirm.id);
      setDeleteConfirm(null);
      fetchAgents();
    } catch (err) {
      setError(formatError(err, "Failed to delete agent"));
    }
  };

  const handleToggleStatus = async (agent) => {
    try {
      if (agent.status === "active") {
        await agentAPI.deactivateAgent(agent.id);
      } else {
        await agentAPI.activateAgent(agent.id);
      }
      fetchAgents();
    } catch (err) {
      setError(formatError(err, "Failed to toggle agent status"));
    }
  };

  if (loading) {
    return <Loader message="Loading agents..." />;
  }

  const listProps = {
    agents,
    error,
    onCreate: handleCreateAgent,
    onEdit: handleEditAgent,
    onToggleStatus: handleToggleStatus,
    onDelete: handleDeleteClick,
    tenants,
    selectedTenant: selectedTenant || tenantId,
    onTenantChange,
  };

  return (
    <>
      {variant === "agentic" ? (
        <AgenticAgentList {...listProps} />
      ) : (
        <ClassicAgentList {...listProps} />
      )}

      {variant !== "agentic" && showForm ? (
        <AgentForm
          tenantId={tenantId}
          agent={editingAgent}
          existingAgents={agents}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      ) : null}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#04070fcc] px-4 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_30px_90px_rgba(2,6,18,0.18)]">
            <h3 className="mb-2 text-lg font-semibold text-slate-900">Delete Agent</h3>
            <p className="mb-6 text-sm leading-7 text-slate-700">
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action
              cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="flex-1 rounded-2xl bg-[#dc2626] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#c81e1e]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AgentList;
