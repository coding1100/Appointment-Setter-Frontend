import React, { useCallback, useEffect, useState } from "react";
import { Clock, Loader2, RefreshCw, X } from "lucide-react";

import { voiceAgentAPI } from "../../services/api";
import { NAVY, TEAL, TEAL_DEEP } from "../Platform/WorkspaceShellLayout";

const statusStyles = {
  active: "bg-emerald-50 text-emerald-700",
  ended: "bg-slate-100 text-slate-600",
  calling: "bg-amber-50 text-amber-700",
  connecting: "bg-sky-50 text-sky-700",
};

const formatSessionTime = (value) => {
  if (!value) return "Unknown time";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown time" : date.toLocaleString();
};

const getSessionAgentId = (session) =>
  session?.metadata?.agent_id ||
  session?.metadata?.agentId ||
  session?.agent_id ||
  session?.agentId ||
  null;

const DRAWER_TRANSITION_MS = 320;

const CallHistoryDrawer = ({ open, onClose, tenantId, agentId, agentName }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  const fetchCallHistory = useCallback(async () => {
    if (!tenantId) return;

    setLoading(true);
    setError("");

    try {
      const response = await voiceAgentAPI.getCallHistory(tenantId);
      const allSessions = response.data?.sessions || [];
      const filtered = agentId
        ? allSessions.filter((session) => getSessionAgentId(session) === agentId)
        : allSessions;
      setSessions(filtered);
    } catch (fetchError) {
      console.error("Error fetching call history:", fetchError);
      setSessions([]);
      setError(
        fetchError.response?.data?.detail ||
          fetchError.response?.data?.message ||
          "Failed to load call history",
      );
    } finally {
      setLoading(false);
    }
  }, [tenantId, agentId]);

  useEffect(() => {
    if (open) {
      fetchCallHistory();
    }
  }, [open, fetchCallHistory]);

  useEffect(() => {
    let frameId = 0;
    let unmountTimer;

    if (open) {
      setMounted(true);
      frameId = requestAnimationFrame(() => {
        frameId = requestAnimationFrame(() => setVisible(true));
      });
    } else {
      setVisible(false);
      unmountTimer = setTimeout(() => setMounted(false), DRAWER_TRANSITION_MS);
    }

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(unmountTimer);
    };
  }, [open]);

  useEffect(() => {
    if (!mounted) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mounted, onClose]);

  if (!mounted) return null;

  const subtitle = agentName
    ? `Sessions for ${agentName}`
    : "Recent voice agent sessions for this tenant";

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <button
        type="button"
        className={`absolute inset-0 bg-[#1a1a2e]/50 backdrop-blur-[2px] transition-opacity duration-300 ease-out ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        aria-label="Close call history"
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="call-history-drawer-title"
        className={`relative flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5">
          <div className="flex items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: NAVY }}
            >
              <Clock className="h-5 w-5 text-white" strokeWidth={1.75} />
            </div>
            <div>
              <h2
                id="call-history-drawer-title"
                className="text-lg font-semibold"
                style={{ color: NAVY }}
              >
                Call History
              </h2>
              <p className="mt-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                {subtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchCallHistory}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Refresh
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
              aria-label="Close drawer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && sessions.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: TEAL_DEEP }} />
              Loading call history...
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          ) : null}

          {!loading && !error && sessions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center">
              <p className="text-sm font-medium text-slate-700">No call history found</p>
              <p className="mt-1 text-xs text-slate-500">
                {agentId
                  ? "Test calls for this agent will appear here."
                  : "Voice agent sessions will appear here after testing."}
              </p>
            </div>
          ) : null}

          <ul className="space-y-3">
            {sessions.map((session) => {
              const sessionId = session.session_id || session.call_id || session.id;
              const status = String(session.status || "unknown").toLowerCase();
              const statusClass = statusStyles[status] || "bg-slate-100 text-slate-600";

              return (
                <li
                  key={sessionId || `${session.started_at}-${session.service_type}`}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {session.service_type || "Voice session"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatSessionTime(session.started_at || session.created_at)}
                      </p>
                      <p className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Mode: {session.test_mode ? "Test" : "Live"}
                      </p>
                      {session.metadata?.agent_name ? (
                        <p className="mt-1 text-xs text-slate-500">
                          Agent: {session.metadata.agent_name}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusClass}`}
                    >
                      {session.status || "unknown"}
                    </span>
                  </div>
                  {sessionId ? (
                    <p className="mt-3 truncate font-mono text-[10px] text-slate-400">
                      Session {String(sessionId).slice(0, 12)}…
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>

        <div
          className="border-t border-slate-200 px-5 py-3"
          style={{ backgroundColor: `${TEAL}14` }}
        >
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {sessions.length} session{sessions.length === 1 ? "" : "s"}
            {agentId ? " for this agent" : ""}
          </p>
        </div>
      </aside>
    </div>
  );
};

export default CallHistoryDrawer;
