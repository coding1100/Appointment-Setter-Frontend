import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  Bot,
  Copy,
  Edit,
  Link as LinkIcon,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";
import { useChatbotWorkspace } from "../../domains/chatbot-agents/hooks/useChatbotWorkspace";
import Loader from "../Loader";
import { NAVY, TEAL, TEAL_DEEP } from "../Platform/WorkspaceShellLayout";
import ChatbotForm from "./ChatbotForm";

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#68fadd]/50 focus:ring-2 focus:ring-[#68fadd]/20";

const btnSecondary =
  "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-700 transition hover:bg-slate-50 disabled:opacity-50";

const btnPrimary =
  "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-white transition hover:opacity-90 disabled:opacity-50";

const btnDanger =
  "inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-rose-700 transition hover:bg-rose-100 disabled:opacity-50";

const getStatusBadgeClass = (status) =>
  status === "active"
    ? "bg-[#68fadd]/15 text-[#006b5c]"
    : "bg-slate-100 text-slate-500";

const ChatbotList = ({ createRequested = 0 }) => {
  const DEFAULT_TOKEN_TTL_MINUTES = 1440;
  const { user } = useAuth();
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";
  const {
    chatbots,
    loading,
    error,
    showForm,
    editingChatbot,
    deleteConfirm,
    busyActionKey,
    installInfo,
    notice,
    logsState,
    runtimeSwitch,
    logsTitle,
    setDeleteConfirm,
    copyText,
    fetchChatbots,
    handleFormSuccess,
    handleDeleteConfirm,
    handleGenerateInstall,
    handleCopyLauncherSnippet,
    handleToggleChatbotStatus,
    handleRevokeTokens,
    loadRuntimeLogs,
    handleToggleKillSwitch,
    closeLogs,
    openCreateForm,
    openEditForm,
    closeForm,
  } = useChatbotWorkspace({ createRequested, isAdmin });
  const [launcherConfigurator, setLauncherConfigurator] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);

  const launcherActionBusy = useMemo(() => {
    if (!launcherConfigurator?.chatbot?.id) return false;
    const chatbotId = launcherConfigurator.chatbot.id;
    const actionKey =
      launcherConfigurator.action === "copy"
        ? `copy-snippet:${chatbotId}`
        : `generate:${chatbotId}`;
    return busyActionKey === actionKey;
  }, [busyActionKey, launcherConfigurator]);

  const openLauncherConfigurator = (chatbot, action) => {
    const firstOrigin = String(chatbot?.allowed_origins?.[0] || "").trim();
    setLauncherConfigurator({
      action,
      chatbot,
      origin: firstOrigin,
      expires_in_minutes: String(DEFAULT_TOKEN_TTL_MINUTES),
      never_expires: false,
      formError: "",
    });
  };

  const closeLauncherConfigurator = () => {
    setLauncherConfigurator(null);
  };

  const updateLauncherConfigurator = (field, value) => {
    setLauncherConfigurator((prev) =>
      prev
        ? {
            ...prev,
            [field]: value,
            formError: "",
          }
        : prev,
    );
  };

  const submitLauncherConfigurator = async () => {
    if (!launcherConfigurator?.chatbot) return;
    const origin = String(launcherConfigurator.origin || "").trim().replace(/\/+$/, "");
    const ttlValue = Number(launcherConfigurator.expires_in_minutes);
    const neverExpires = Boolean(launcherConfigurator.never_expires);

    if (!origin.startsWith("http://") && !origin.startsWith("https://")) {
      setLauncherConfigurator((prev) =>
        prev ? { ...prev, formError: "Origin must start with http:// or https://" } : prev,
      );
      return;
    }

    if (!neverExpires && (!Number.isFinite(ttlValue) || ttlValue < 5 || ttlValue > 10080)) {
      setLauncherConfigurator((prev) =>
        prev
          ? {
              ...prev,
              formError: "Expiry must be between 5 and 10080 minutes.",
            }
          : prev,
      );
      return;
    }

    const payload = {
      origin,
      ...(neverExpires
        ? { never_expires: true }
        : { expires_in_minutes: Math.round(ttlValue) }),
    };

    if (launcherConfigurator.action === "copy") {
      await handleCopyLauncherSnippet(launcherConfigurator.chatbot, payload);
    } else {
      await handleGenerateInstall(launcherConfigurator.chatbot, payload);
    }
    setLauncherConfigurator(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center">
        <Loader message="Loading chatbot agents..." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: NAVY }}>
            Chatbot Agents
          </h1>
          <p className="mt-0.5 max-w-2xl text-sm text-slate-500">
            Manage chatbot launchers, runtime controls, embed tokens, and live chat monitoring
            from one focused workspace.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 sm:justify-end">
          <button
            type="button"
            onClick={fetchChatbots}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={2} />
            Refresh
          </button>
          <Link
            to="/app/chatbot-agents/live"
            className={`${btnSecondary} shrink-0 px-4 py-2.5 no-underline`}
          >
            <Activity className="h-4 w-4" />
            Live Chats
          </Link>
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-white transition hover:opacity-90"
            style={{ backgroundColor: NAVY }}
          >
            <Plus className="h-4 w-4" />
            Create Chatbot
          </button>
        </div>
      </div>

      {isAdmin && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: NAVY }}
              >
                {runtimeSwitch.enabled ? (
                  <ShieldCheck className="h-5 w-5" style={{ color: TEAL }} />
                ) : (
                  <ShieldAlert className="h-5 w-5" style={{ color: TEAL }} />
                )}
              </div>
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Global Runtime Kill Switch
                </p>
                <p className="mt-1 text-sm font-semibold" style={{ color: NAVY }}>
                  {runtimeSwitch.enabled
                    ? "Public runtime endpoints are enabled"
                    : "Public runtime endpoints are disabled"}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {runtimeSwitch.enabled
                    ? "Chatbot embed and launcher endpoints are live globally."
                    : "All chatbot public runtime endpoints are blocked globally."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleKillSwitch}
              disabled={runtimeSwitch.loading || runtimeSwitch.saving}
              className={`${btnPrimary} shrink-0 px-4 py-2.5 ${
                runtimeSwitch.enabled
                  ? "border border-rose-200 bg-rose-600 hover:opacity-100 hover:bg-rose-700"
                  : ""
              }`}
              style={runtimeSwitch.enabled ? undefined : { backgroundColor: TEAL_DEEP }}
            >
              {runtimeSwitch.enabled ? (
                <ShieldAlert className="h-4 w-4" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              {runtimeSwitch.saving
                ? "Saving..."
                : runtimeSwitch.enabled
                  ? "Disable Runtime"
                  : "Enable Runtime"}
            </button>
          </div>
          {runtimeSwitch.error ? (
            <div className="border-t border-rose-100 bg-rose-50 px-5 py-3 text-sm text-rose-600">
              {runtimeSwitch.error}
            </div>
          ) : null}
        </div>
      )}

      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchChatbots}
            className="font-mono text-[10px] font-semibold uppercase tracking-wider text-rose-700 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      ) : null}

      {installInfo && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Launcher Install Payload
              </p>
              <p className="mt-1 text-sm font-semibold" style={{ color: NAVY }}>
                {installInfo.chatbot_name}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Origin:{" "}
                <span className="font-mono text-slate-800">{installInfo.origin}</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Token version: {installInfo.token_version} · Expires:{" "}
                {installInfo.expires_at || "Never"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  copyText(installInfo.loader_url, "Loader URL copied to clipboard")
                }
                className={btnSecondary}
              >
                <Copy className="h-4 w-4" />
                Copy Loader URL
              </button>
              <button
                type="button"
                onClick={() =>
                  copyText(installInfo.launcher_script, "Launcher snippet copied to clipboard")
                }
                className={btnPrimary}
                style={{ backgroundColor: NAVY }}
              >
                <Copy className="h-4 w-4" />
                Copy Snippet
              </button>
            </div>
          </div>
          <div className="grid gap-4 border-t border-slate-100 px-5 py-4 xl:grid-cols-2">
            <div>
              <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Loader URL
              </p>
              <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-700">
                {installInfo.loader_url}
              </pre>
            </div>
            <div>
              <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Launcher Snippet
              </p>
              <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-700">
                {installInfo.launcher_script}
              </pre>
            </div>
          </div>
        </div>
      )}

      {chatbots.length === 0 ? (
        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center">
          <Bot className="h-12 w-12 text-slate-300" strokeWidth={1.25} />
          <h3 className="mt-5 text-xl font-semibold" style={{ color: NAVY }}>
            No chatbot agents yet
          </h3>
          <p className="mt-2 max-w-md text-sm text-slate-500">
            Create your first chatbot agent to generate launcher scripts, control runtime access,
            and open live chat monitoring.
          </p>
          <button
            type="button"
            onClick={openCreateForm}
            className="mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-white transition hover:opacity-90"
            style={{ backgroundColor: NAVY }}
          >
            <Plus className="h-4 w-4" />
            Create Chatbot
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden border-b border-slate-200 bg-slate-50/90 px-4 py-2 lg:grid lg:grid-cols-[minmax(0,1.4fr)_140px_140px_100px] lg:items-center lg:gap-4">
            {["Agent", "Domain", "Status", "Token"].map((col) => (
              <span
                key={col}
                className={`font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 ${
                  col === "Agent" ? "text-left" : "text-center"
                }`}
              >
                {col}
              </span>
            ))}
          </div>

          <div className="divide-y divide-slate-100">
            {chatbots.map((chatbot) => {
              const currentKey = (suffix) => `${suffix}:${chatbot.id}`;
              const isBusy = (suffix) => busyActionKey === currentKey(suffix);
              const chatbotDomain =
                chatbot.domain_key === "custom"
                  ? chatbot.custom_domain_name || "custom"
                  : chatbot.domain_key;
              const isHighlighted = hoveredId === chatbot.id;

              return (
                <div
                  key={chatbot.id}
                  className={`px-4 py-4 transition ${
                    isHighlighted
                      ? "bg-[#68fadd]/[0.04] shadow-[inset_3px_0_0_0_#68fadd]"
                      : "hover:bg-slate-50/80"
                  }`}
                  onMouseEnter={() => setHoveredId(chatbot.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_140px_140px_100px] lg:items-center lg:gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-100"
                        style={{ backgroundColor: NAVY }}
                      >
                        <Bot className="h-5 w-5" style={{ color: TEAL }} strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditForm(chatbot)}
                            className="truncate text-left font-semibold transition hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68fadd]/60"
                            style={{ color: NAVY }}
                          >
                            {chatbot.name}
                          </button>
                          <span
                            className={`rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide ${getStatusBadgeClass(chatbot.status)}`}
                          >
                            {chatbot.status}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                          {chatbot.welcome_message || "No welcome message configured yet."}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                          <span>Origins: {chatbot.allowed_origins?.length || 0}</span>
                          <span>Token v{chatbot.embed_token_version}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-center text-sm text-slate-600">
                      <p className="font-mono text-[9px] uppercase tracking-wide text-slate-400 lg:hidden">
                        Domain
                      </p>
                      <p className="capitalize lg:mt-0">{chatbotDomain.replace(/_/g, " ")}</p>
                    </div>

                    <div className="text-center text-sm text-slate-600">
                      <p className="font-mono text-[9px] uppercase tracking-wide text-slate-400 lg:hidden">
                        Status
                      </p>
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide ${getStatusBadgeClass(chatbot.status)}`}
                      >
                        {chatbot.status === "active" ? "Live" : "Paused"}
                      </span>
                    </div>

                    <div className="text-center text-sm font-mono text-slate-600">
                      <p className="text-[9px] uppercase tracking-wide text-slate-400 lg:hidden">
                        Token
                      </p>
                      <p className="lg:mt-0">v{chatbot.embed_token_version}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={() => openEditForm(chatbot)}
                      className={btnSecondary}
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleChatbotStatus(chatbot)}
                      disabled={isBusy("status")}
                      className={`${btnSecondary} ${
                        chatbot.status === "active"
                          ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      }`}
                    >
                      {chatbot.status === "active" ? (
                        <PauseCircle className="h-3.5 w-3.5" />
                      ) : (
                        <PlayCircle className="h-3.5 w-3.5" />
                      )}
                      {isBusy("status")
                        ? "Updating..."
                        : chatbot.status === "active"
                          ? "Pause"
                          : "Activate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openLauncherConfigurator(chatbot, "generate")}
                      disabled={isBusy("generate")}
                      className={`${btnSecondary} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}
                    >
                      <LinkIcon className="h-3.5 w-3.5" />
                      {isBusy("generate") ? "Generating..." : "Generate Launcher"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openLauncherConfigurator(chatbot, "copy")}
                      disabled={isBusy("copy-snippet")}
                      className={btnSecondary}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {isBusy("copy-snippet") ? "Copying..." : "Copy Launcher"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRevokeTokens(chatbot)}
                      disabled={isBusy("revoke")}
                      className={`${btnSecondary} border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100`}
                    >
                      <ShieldAlert className="h-3.5 w-3.5" />
                      {isBusy("revoke") ? "Revoking..." : "Revoke Tokens"}
                    </button>
                    <button
                      type="button"
                      onClick={() => loadRuntimeLogs(chatbot, logsState.statusFilter)}
                      className={btnSecondary}
                    >
                      <Activity className="h-3.5 w-3.5" />
                      Runtime Logs
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(chatbot)}
                      disabled={isBusy("delete")}
                      className={btnDanger}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {isBusy("delete") ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Total chatbots
            </p>
            <p className="text-sm font-semibold" style={{ color: NAVY }}>
              {chatbots.length}
            </p>
          </div>
        </div>
      )}

      {showForm && (
        <ChatbotForm
          chatbot={editingChatbot}
          existingChatbots={chatbots}
          onClose={closeForm}
          onSuccess={handleFormSuccess}
        />
      )}

      {logsState.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#1a1a2e]/70 px-4 py-8 backdrop-blur-sm">
          <div className="mx-4 my-8 w-full max-w-4xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-semibold" style={{ color: NAVY }}>
                  {logsTitle}
                </h3>
                <p className="mt-0.5 text-sm text-slate-500">
                  Latest runtime events for public embed requests.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={logsState.statusFilter}
                  onChange={(event) =>
                    loadRuntimeLogs(logsState.chatbot, event.target.value)
                  }
                  className={fieldClass}
                >
                  <option value="">All statuses</option>
                  <option value="success">success</option>
                  <option value="error">error</option>
                </select>
                <button
                  type="button"
                  onClick={() =>
                    loadRuntimeLogs(logsState.chatbot, logsState.statusFilter)
                  }
                  className={btnSecondary}
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
                <button type="button" onClick={closeLogs} className={btnSecondary}>
                  <X className="h-4 w-4" />
                  Close
                </button>
              </div>
            </div>

            <div className="max-h-[65vh] space-y-3 overflow-y-auto p-6">
              {logsState.loading && <Loader message="Loading runtime logs..." />}
              {!logsState.loading && logsState.error && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {logsState.error}
                </div>
              )}
              {!logsState.loading && !logsState.error && logsState.logs.length === 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  No runtime logs found for this chatbot.
                </div>
              )}
              {!logsState.loading &&
                !logsState.error &&
                logsState.logs.map((log) => (
                  <div
                    key={log.request_id}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                      <p>
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Request
                        </span>{" "}
                        <span className="font-mono text-slate-700">{log.request_id}</span>
                      </p>
                      <p>
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Status
                        </span>{" "}
                        <span
                          className={
                            log.status === "success" ? "text-[#006b5c]" : "text-rose-700"
                          }
                        >
                          {log.status}
                        </span>
                      </p>
                      <p>
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Latency
                        </span>{" "}
                        {log.latency_ms} ms
                      </p>
                      <p>
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Timestamp
                        </span>{" "}
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                      {log.error_code && (
                        <p>
                          <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Error
                          </span>{" "}
                          {log.error_code}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {launcherConfigurator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1a2e]/70 px-4 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <h3 className="text-lg font-semibold" style={{ color: NAVY }}>
                Launcher Settings
              </h3>
              <p className="mt-0.5 text-sm text-slate-500">
                {launcherConfigurator.action === "copy"
                  ? "Set origin and expiry before copying the launcher snippet."
                  : "Set origin and expiry before generating launcher payload."}
              </p>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Allowed CORS Origin
                </label>
                <input
                  value={launcherConfigurator.origin}
                  onChange={(event) =>
                    updateLauncherConfigurator("origin", event.target.value)
                  }
                  placeholder="https://example.com"
                  className={fieldClass}
                />
                {Array.isArray(launcherConfigurator.chatbot?.allowed_origins) &&
                  launcherConfigurator.chatbot.allowed_origins.length > 0 && (
                    <p className="mt-1.5 text-xs text-slate-500">
                      Configured origins:{" "}
                      {launcherConfigurator.chatbot.allowed_origins.join(", ")}
                    </p>
                  )}
              </div>

              <div>
                <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Script Expiry (minutes)
                </label>
                <label className="mb-2 inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={launcherConfigurator.never_expires}
                    onChange={(event) =>
                      updateLauncherConfigurator("never_expires", event.target.checked)
                    }
                    className="rounded border-slate-300 text-[#006b5c] focus:ring-[#68fadd]/30"
                  />
                  Never expires
                </label>
                <input
                  type="number"
                  min={5}
                  max={10080}
                  value={launcherConfigurator.expires_in_minutes}
                  onChange={(event) =>
                    updateLauncherConfigurator("expires_in_minutes", event.target.value)
                  }
                  disabled={launcherConfigurator.never_expires}
                  className={fieldClass}
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  {launcherConfigurator.never_expires
                    ? "Token will not expire automatically."
                    : "Min 5 minutes, max 7 days (10080 minutes)."}
                </p>
              </div>

              {launcherConfigurator.formError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {launcherConfigurator.formError}
                </div>
              ) : null}
            </div>

            <div className="flex gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={closeLauncherConfigurator}
                className={`${btnSecondary} flex-1 justify-center px-4 py-2.5`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitLauncherConfigurator}
                disabled={launcherActionBusy}
                className={`${btnPrimary} flex-1 justify-center px-4 py-2.5`}
                style={{ backgroundColor: NAVY }}
              >
                {launcherActionBusy
                  ? "Please wait..."
                  : launcherConfigurator.action === "copy"
                    ? "Copy Launcher"
                    : "Generate Launcher"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1a2e]/70 px-4 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="px-6 py-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50">
                <XCircle className="h-5 w-5 text-rose-600" />
              </div>
              <h3 className="mt-4 text-lg font-semibold" style={{ color: NAVY }}>
                Delete Chatbot Agent
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This
                action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className={`${btnSecondary} flex-1 justify-center px-4 py-2.5`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={busyActionKey === `delete:${deleteConfirm.id}`}
                className={`${btnDanger} flex-1 justify-center px-4 py-2.5`}
              >
                {busyActionKey === `delete:${deleteConfirm.id}` ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatbotList;
