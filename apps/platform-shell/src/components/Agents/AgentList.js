import React, { useState, useEffect, useCallback } from "react";
import {
  Edit,
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

const AgentList = ({ tenantId, createRequested = 0 }) => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const formatError = (err, defaultMsg) => {
    const errorDetail = err.response?.data?.detail;
    if (Array.isArray(errorDetail)) {
      return errorDetail
        .map((entry) => `${entry.loc?.join(".")} - ${entry.msg}`)
        .join(", ");
    }
    return typeof errorDetail === "string" ? errorDetail : defaultMsg;
  };

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
    setEditingAgent(null);
    setShowForm(true);
  };

  const handleEditAgent = (agent) => {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[0.78rem] uppercase tracking-[0.32em] text-white/68">
            Voice Agent Directory
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-black">
            Agent Management
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-white/72">
            Configure tenant-specific AI voice agents, greeting behavior,
            language, and activation state from a single operational workspace.
          </p>
        </div>
        <button
          onClick={handleCreateAgent}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2f66ea] px-5 py-3 text-sm font-semibold text-black shadow-[0_14px_28px_rgba(19,57,150,0.28)] transition hover:bg-[#295ad0]"
        >
          <Plus className="h-4 w-4" />
          Create Agent
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-400">
          {error}
        </div>
      )}

      {agents.length === 0 ? (
        <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[28px] border border-white/8 bg-white/[0.04] px-6 text-center">
          <User className="h-16 w-16 text-white/34" />
          <h3 className="mt-6 text-2xl font-semibold tracking-[-0.02em] text-black">
            No agents yet
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">
            Create your first AI voice agent to start handling tenant-specific
            calls, greetings, and service workflows.
          </p>
          <button
            onClick={handleCreateAgent}
            className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-[#2f66ea] px-6 py-3 text-sm font-semibold text-black shadow-[0_14px_28px_rgba(19,57,150,0.28)] transition hover:bg-[#295ad0]"
          >
            <Plus className="h-5 w-5" />
            Create First Agent
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-white/8 bg-white/[0.04]">
          <div className="hidden grid-cols-[minmax(0,1.2fr)_180px_160px_220px] gap-4 border-b border-white/8 px-5 py-3 text-xs uppercase tracking-[0.28em] text-white/44 lg:grid">
            <div>Agent</div>
            <div>Service</div>
            <div>Status</div>
            <div>Actions</div>
          </div>

          <div className="divide-y divide-white/8">
            {agents.map((agent) => (
              <div key={agent.id} className="px-5 py-5">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_180px_160px_220px] lg:items-start">
                  <div className="min-w-0">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-white/8">
                        <User className="h-5 w-5 text-sky-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-lg font-semibold text-black">
                            {agent.name}
                          </h3>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                              agent.status === "active"
                                ? "bg-emerald-400/14 text-emerald-400"
                                : "bg-white/10 text-white/60"
                            }`}
                          >
                            {agent.status}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/50">
                          <span className="flex items-center gap-2 text-black/35">
                            <Volume2 className="h-3.5 w-3.5 text-black/35" />
                            {agent.language}
                          </span>
                        </div>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-black/35 line-clamp-2">
                          {agent.greeting_message}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-white/72 lg:pt-2">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-black lg:hidden">
                      Service
                    </div>
                    <div className="mt-1 capitalize lg:mt-0">
                      {agent.service_type}
                    </div>
                  </div>

                  <div className="text-sm text-white/72 lg:pt-2">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-black lg:hidden">
                      Status
                    </div>
                    <div className="mt-1 lg:mt-0">
                      {agent.status === "active"
                        ? "Live and answering"
                        : "Inactive"}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleEditAgent(agent)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white/6 px-3.5 py-2.5 text-sm text-black transition hover:bg-black/10"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleStatus(agent)}
                      className={`inline-flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition ${
                        agent.status === "active"
                          ? "bg-amber-300/10 text-amber-400 hover:bg-amber-300/20"
                          : "bg-emerald-300/12 text-emerald-100 hover:bg-emerald-300/18"
                      }`}
                    >
                      {agent.status === "active" ? (
                        <>
                          <PowerOff className="h-4 w-4" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <Power className="h-4 w-4" />
                          Activate
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteClick(agent)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-3.5 py-2.5 text-sm text-rose-300 transition hover:bg-rose-400/15"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <AgentForm
          tenantId={tenantId}
          agent={editingAgent}
          existingAgents={agents}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#04070fcc] px-4 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-[28px] border border-white/10 bg-[#11192b]/94 p-6 shadow-[0_30px_90px_rgba(2,6,18,0.55)]">
            <h3 className="mb-2 text-lg font-semibold text-black">
              Delete Agent
            </h3>
            <p className="mb-6 text-sm leading-7 text-white/70">
              Are you sure you want to delete{" "}
              <strong>{deleteConfirm.name}</strong>? This action cannot be
              undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 rounded-2xl bg-[#dc2626] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#c81e1e]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentList;
