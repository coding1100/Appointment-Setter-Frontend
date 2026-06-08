import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  ChevronDown,
  Clock,
  FolderOpen,
  Loader2,
  Mic,
  Paperclip,
  Play,
  Plug,
  SlidersHorizontal,
  Terminal,
  Upload,
  UserCircle,
} from "lucide-react";

import AgentFormFields from "../Agents/AgentFormFields";
import { useAgentForm } from "../Agents/useAgentForm";
import { agentAPI } from "../../services/api";
import CallHistoryDrawer from "./CallHistoryDrawer";
import { NAVY, TEAL, TEAL_DEEP } from "../Platform/WorkspaceShellLayout";

const SYSTEM_PROMPT_MAX = 4000;

const PROMPT_TEMPLATES = [
  {
    id: "custom",
    label: "Custom prompt",
    text: "",
  },
  {
    id: "receptionist",
    label: "Receptionist",
    text: "You are a professional receptionist for a home services company. Greet callers warmly, collect their name and service need, and offer to schedule an appointment. Stay concise and helpful.",
  },
  {
    id: "support",
    label: "Customer support",
    text: "You are a customer support agent. Help callers with account questions, troubleshoot common issues, and escalate to a human when needed. Always confirm understanding before proceeding.",
  },
  {
    id: "scheduler",
    label: "Appointment scheduler",
    text: "You are an appointment scheduling assistant. Ask for preferred date and time, confirm service address, and summarize booking details before ending the call.",
  },
];

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#68fadd]/50 focus:outline-none focus:ring-2 focus:ring-[#68fadd]/20";

const CardBadge = ({ children, tone = "active" }) => {
  const toneClass =
    tone === "inactive"
      ? "bg-slate-100 text-slate-600"
      : tone === "draft"
        ? "bg-amber-50 text-amber-700 text-xs"
        : "bg-[#68fadd]/20 text-[#006b5c]";

  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${toneClass}`}
    >
      {children}
    </span>
  );
};

const AgentStatusToggle = ({ status, loading = false, disabled = false, pendingStatus, onChange }) => {
  const isActive = status === "active";

  const segmentClass = (segment) => {
    const selected = segment === "active" ? isActive : !isActive;
    const showSpinner = loading && pendingStatus === segment;

    return {
      className: `inline-flex min-w-[72px] items-center justify-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-50 ${
        selected
          ? segment === "active"
            ? "bg-[#68fadd]/25 text-[#006b5c] shadow-sm"
            : "bg-white text-slate-700 shadow-sm"
          : "text-slate-500 hover:text-slate-700"
      }`,
      showSpinner,
    };
  };

  const offline = segmentClass("inactive");
  const active = segmentClass("active");

  return (
    <div
      className="inline-flex rounded-full border border-slate-200 bg-slate-100 p-0.5"
      role="group"
      aria-label="Agent deployment status"
    >
      <button
        type="button"
        disabled={disabled || loading}
        aria-pressed={!isActive}
        onClick={() => onChange("inactive")}
        className={offline.className}
      >
        {offline.showSpinner ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
        Offline
      </button>
      <button
        type="button"
        disabled={disabled || loading}
        aria-pressed={isActive}
        onClick={() => onChange("active")}
        className={active.className}
      >
        {active.showSpinner ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
        Active
      </button>
    </div>
  );
};

const ConfigCard = ({
  icon: Icon,
  iconBg,
  title,
  subtitle,
  badge,
  badgeTone = "active",
  topSlot,
  headerAction,
  children,
  className = "",
}) => {
  const card = (
    <section className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: iconBg || NAVY }}
          >
            <Icon className="h-5 w-5 text-white" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            {subtitle ? (
              <p className="mt-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        {headerAction || badge ? (
          <div className="flex shrink-0 items-center gap-2">
            {headerAction}
            {badge ? <CardBadge tone={badgeTone}>{badge}</CardBadge> : null}
          </div>
        ) : null}
      </div>
      {children}
    </section>
  );

  if (!topSlot) {
    return card;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end h-[42px] items-center">{topSlot}</div>
      {card}
    </div>
  );
};

const RangeField = ({ label, value, onChange }) => (
  <div>
    <div className="mb-2 flex items-center justify-between">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}%</span>
    </div>
    <input
      type="range"
      min="0"
      max="100"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-[#006b5c]"
    />
  </div>
);

const ModelSlider = ({ label, value, onChange, min = 0, max = 1, step = 0.1, hint }) => (
  <div>
    <div className="mb-2 flex items-center justify-between gap-3">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </span>
      <span className="text-sm font-semibold" style={{ color: TEAL_DEEP }}>
        {value.toFixed(1)}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-[#006b5c]"
    />
    {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
  </div>
);

const formatCharCount = (count, max) =>
  `${count.toLocaleString()} / ${max.toLocaleString()} chars`;

const isGreetingValid = (message) =>
  Boolean(message?.trim()) && message.trim().length >= 10;

const isAgentConfigurationComplete = (formData, systemPrompt) =>
  Boolean(formData.name?.trim()) &&
  Boolean(formData.voice_id) &&
  Boolean(formData.language) &&
  isGreetingValid(formData.greeting_message) &&
  Boolean(systemPrompt.trim());

const VoiceAgentConfiguration = ({
  tenantId,
  agent,
  existingAgents = [],
  agentPhone,
  twilioIntegration,
  onDiscard,
  onSaved,
  onStatusChange,
  onPushToTalk,
  pushToTalkLoading = false,
}) => {
  // const [stability, setStability] = useState(75);
  // const [clarity, setClarity] = useState(45);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [promptTemplate, setPromptTemplate] = useState("");
  // const [temperature, setTemperature] = useState(0.7);
  // const [topP, setTopP] = useState(0.9);
  const [knowledgeFiles, setKnowledgeFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [agentStatus, setAgentStatus] = useState(agent?.status || "inactive");
  const [statusToggling, setStatusToggling] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [statusError, setStatusError] = useState("");
  const [systemPromptError, setSystemPromptError] = useState("");
  const fileInputRef = useRef(null);

  const form = useAgentForm({
    tenantId,
    agent,
    existingAgents,
    onSuccess: onSaved,
  });

  const isCreating = !agent;
  const agentLabel = agent?.name || form.formData.name || "New Agent";
  const agentRef = agent?.id ? `#${String(agent.id).slice(0, 8)}` : "Draft";

  const isConfigurationComplete = useMemo(
    () => isAgentConfigurationComplete(form.formData, systemPrompt),
    [form.formData, systemPrompt],
  );

  const canPushToTalk =
    isConfigurationComplete &&
    !isCreating &&
    agentStatus === "active" &&
    !pushToTalkLoading;

  useEffect(() => {
    setAgentStatus(agent?.status || "inactive");
    setStatusError("");
  }, [agent?.id, agent?.status]);

  const handleStatusToggle = async (nextStatus) => {
    if (!agent?.id || isCreating || statusToggling) return;
    if (nextStatus === agentStatus) return;

    setStatusToggling(true);
    setStatusError("");
    setPendingStatus(nextStatus);

    try {
      if (nextStatus === "active") {
        await agentAPI.activateAgent(agent.id);
      } else {
        await agentAPI.deactivateAgent(agent.id);
      }

      const response = await agentAPI.getAgent(agent.id);
      const updatedAgent = response.data || { ...agent, status: nextStatus };
      setAgentStatus(updatedAgent.status || nextStatus);
      onStatusChange?.(updatedAgent);
    } catch (toggleError) {
      setStatusError(
        toggleError.response?.data?.detail ||
          toggleError.response?.data?.message ||
          "Failed to update agent status",
      );
    } finally {
      setStatusToggling(false);
      setPendingStatus(null);
    }
  };

  const handleSave = async (e) => {
    if (!systemPrompt.trim()) {
      setSystemPromptError("System prompt is required");
      return;
    }

    setSystemPromptError("");
    await form.handleSubmit(e);
  };

  const handlePromptTemplateChange = (e) => {
    const templateId = e.target.value;
    setPromptTemplate(templateId);
    if (!templateId) return;
    const template = PROMPT_TEMPLATES.find((item) => item.id === templateId);
    if (template?.text) {
      setSystemPrompt(template.text.slice(0, SYSTEM_PROMPT_MAX));
    }
  };

  const handleSystemPromptChange = (e) => {
    setSystemPrompt(e.target.value.slice(0, SYSTEM_PROMPT_MAX));
    setPromptTemplate("");
    if (systemPromptError) {
      setSystemPromptError("");
    }
  };

  const addKnowledgeFiles = (fileList) => {
    const allowed = ["application/pdf", "text/plain", "text/csv"];
    const next = Array.from(fileList || [])
      .filter((file) => allowed.includes(file.type) || /\.(pdf|txt|csv)$/i.test(file.name))
      .map((file) => ({
        id: `${file.name}-${file.size}-${Date.now()}`,
        name: file.name,
        status: "Ready",
      }));
    if (next.length) {
      setKnowledgeFiles((prev) => [...prev, ...next]);
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addKnowledgeFiles(e.dataTransfer.files);
  };

  const greetingPreview =
    form.formData.greeting_message?.trim() ||
    "Sure, I can help you with your account inquiry. Could you please provide your account number?";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onDiscard}
            className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
            aria-label="Back to voice agents"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-[1.65rem] font-semibold tracking-tight" style={{ color: NAVY }}>
              Agent Configuration
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Customize synthesis parameters for Agent 
              {agentLabel !== "New Agent" ? ` - ${agentLabel}` : ""}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-3">
          {!isCreating ? (
            <button
              type="button"
              onClick={onDiscard}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
            >
              Discard
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleSave}
            disabled={form.loading || !isConfigurationComplete}
            className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: TEAL_DEEP }}
          >
            {form.loading ? "Saving..." : isCreating ? "Save" : "Save Changes"}
          </button>
        </div>
      </div>

      {form.error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {form.error}
        </div>
      ) : null}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,6fr)_minmax(0,4fr)] xl:items-start">
          <div className="space-y-6">
            <div>
              {/* <label htmlFor="agent-name" className="mb-1.5 block text-sm font-medium text-slate-800">
                Agent Name *
              </label> */}
              <input
                id="agent-name"
                type="text"
                name="name"
                value={form.formData.name}
                onChange={form.handleChange}
                placeholder=" Agent Name *"
                required
                className={fieldClass}
              />
              {/* <p className="mt-1 text-xs text-slate-500">Give your agent a friendly name</p> */}
            </div>


            <ConfigCard
              icon={Terminal}
              iconBg={TEAL_DEEP}
              title="Core Configuration"
              subtitle="System prompt *"
              headerAction={
                <label className="relative inline-flex items-center">
                  <select
                    value={promptTemplate}
                    onChange={handlePromptTemplateChange}
                    className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm font-medium text-slate-700 focus:border-[#68fadd]/50 focus:outline-none focus:ring-2 focus:ring-[#68fadd]/20"
                  >
                    <option value="">Prompt Templates</option>
                    {PROMPT_TEMPLATES.filter((t) => t.id !== "custom").map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 h-4 w-4 text-slate-400" />
                </label>
              }
            >
              <div className="relative">
                <textarea
                  id="system-prompt"
                  value={systemPrompt}
                  onChange={handleSystemPromptChange}
                  placeholder="Enter the foundational instructions for the agent..."
                  rows={7}
                  required
                  aria-label="System prompt"
                  aria-invalid={Boolean(systemPromptError)}
                  className={`${fieldClass} min-h-[191px] resize-y pb-8 ${
                    systemPromptError ? "border-rose-300 ring-rose-100" : ""
                  }`}
                />
                <span className="pointer-events-none absolute bottom-3 right-3 font-mono text-[10px] text-slate-400">
                  {formatCharCount(systemPrompt.length, SYSTEM_PROMPT_MAX)}
                </span>
              </div>
              {systemPromptError ? (
                <p className="mt-2 text-xs text-rose-600">{systemPromptError}</p>
              ) : null}
            </ConfigCard>

            {/* <div className="grid gap-6 md:grid-cols-2">
              <ConfigCard icon={Plug} iconBg="#64748b" title="API Integrations">
                <ul className="space-y-3">
                  {["Twilio"].map((name) => (
                    <li
                      key={name}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="text-sm font-medium text-slate-800">{name}</span>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                        Connected
                      </span>
                    </li>
                  ))}
                </ul>
              </ConfigCard>

              <ConfigCard icon={SlidersHorizontal} iconBg={TEAL_DEEP} title="Model Settings">
                <div className="grid gap-6">
                  <ModelSlider
                    label="Temperature"
                    value={temperature}
                    onChange={setTemperature}
                    hint="Controls randomness: lower is more deterministic."
                  />
                  <ModelSlider
                    label="Top P"
                    value={topP}
                    onChange={setTopP}
                    hint="Nucleus sampling: 0.9 means top 90% probability mass."
                  />
                </div>
              </ConfigCard>
            </div> */}
          </div>

          <ConfigCard
            icon={UserCircle}
            iconBg={TEAL_DEEP}
            title="Voice Synthesis"
            subtitle="Powered by ElevenLabs"
            topSlot={
              isCreating ? (
                <CardBadge tone="draft">Draft</CardBadge>
              ) : (
                <AgentStatusToggle
                  status={agentStatus}
                  loading={statusToggling}
                  pendingStatus={pendingStatus}
                  onChange={handleStatusToggle}
                />
              )
            }
          >
            <div className="space-y-5">
              <AgentFormFields {...form} compact hideAgentName />
              {/* <div className="space-y-5">
                <RangeField label="Stability" value={stability} onChange={setStability} />
                <RangeField
                  label="Clarity & Artifact Amplification"
                  value={clarity}
                  onChange={setClarity}
                />
              </div> */}
              {/* <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-3 text-sm font-medium transition hover:bg-slate-50"
                style={{ color: TEAL_DEEP }}
              >
                <Play className="h-4 w-4" />
                Test Voice
              </button> */}
            </div>
          </ConfigCard>
          {statusError ? (
            <p className="text-right text-xs text-rose-600">{statusError}</p>
          ) : null}
        </div>

          {/* <ConfigCard icon={Network} iconBg="#3b82f6" title="Real-time Transport">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                LiveKit Region
              </label>
              <select className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800">
                <option>US East (N. Virginia)</option>
                <option>US West (Oregon)</option>
                <option>EU West (Ireland)</option>
              </select>
            </div>
            <div
              className="mt-4 rounded-lg px-4 py-3"
              style={{ backgroundColor: NAVY }}
            >
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#68fadd]">
                Websocket URL
              </p>
              <p className="mt-2 break-all font-mono text-xs text-sky-200/90">
                {agent?.id
                  ? `wss://agent-${String(agent.id).slice(0, 8)}-livekit.agentic-cloud.io`
                  : "wss://agent-draft-livekit.agentic-cloud.io"}
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Latency Optimization</span>
              <button
                type="button"
                role="switch"
                aria-checked={latencyOpt}
                onClick={() => setLatencyOpt((v) => !v)}
                className={`relative h-6 w-11 rounded-full transition ${
                  latencyOpt ? "bg-[#006b5c]" : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                    latencyOpt ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          </ConfigCard> */}

        {/* <ConfigCard icon={FolderOpen} iconBg={TEAL_DEEP} title="Knowledge Base">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.csv,.txt,application/pdf,text/plain,text/csv"
              multiple
              className="hidden"
              onChange={(e) => {
                addKnowledgeFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              className={`flex w-full flex-col items-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
                dragOver
                  ? "border-[#68fadd] bg-[#68fadd]/5"
                  : "border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <Upload className="h-5 w-5 text-slate-400" />
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-800">Upload custom documents</p>
              <p className="mt-1 text-xs text-slate-500">PDF, CSV, or TXT files. Max 50MB per file.</p>
            </button>

            {knowledgeFiles.length > 0 ? (
              <ul className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
                {knowledgeFiles.map((file) => (
                  <li
                    key={file.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Paperclip className="h-4 w-4 shrink-0 text-slate-400" />
                      <span
                        className={`truncate text-sm font-medium ${
                          file.status === "Processed" ? "text-[#006b5c]" : "text-slate-600"
                        }`}
                      >
                        {file.name}
                      </span>
                    </div>
                    <span
                      className={`shrink-0 font-mono text-[10px] font-bold uppercase tracking-wide ${
                        file.status === "Processed" ? "text-[#006b5c]" : "text-slate-400"
                      }`}
                    >
                      {file.status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
        </ConfigCard> */}
      </form>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-stretch w-full bg-white sticky bottom-0">
        <div
          className="flex min-w-0 flex-1 items-center gap-4 rounded-xl px-5 py-4 hidden"
          style={{ backgroundColor: NAVY }}
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${TEAL}33` }}
          >
            <Mic className="h-5 w-5" style={{ color: TEAL }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#68fadd]">
              Active Call Context
            </p>
            <p className="mt-1 line-clamp-2 text-sm text-white/90">&ldquo;{greetingPreview}&rdquo;</p>
            <p className="mt-1 font-mono text-[10px] text-[#68fadd]/80">Latency: 142ms</p>
          </div>
          <div className="hidden shrink-0 items-center gap-3 sm:flex">
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-wide text-white">Status Ready</p>
            </div>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: TEAL }}
            >
              <Mic className="h-5 w-5" style={{ color: NAVY }} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 xl:w-auto">
          <button
            type="button"
            onClick={onPushToTalk}
            disabled={!canPushToTalk}
            title={
              !isConfigurationComplete
                ? "Complete all required fields before testing"
                : isCreating
                  ? "Save the agent before testing"
                  : agentStatus !== "active"
                    ? "Activate the agent before testing"
                    : "Start a voice test"
            }
            className="inline-flex min-w-[160px] flex-1 items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 xl:flex-none"
            style={{ backgroundColor: TEAL_DEEP }}
          >
            {pushToTalkLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting…
              </>
            ) : (
              "Push to Talk"
            )}
          </button>
          <button
            type="button"
            onClick={() => setLogsOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Clock className="h-4 w-4" />
            Logs
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <BarChart3 className="h-4 w-4" />
            Metrics
          </button>
        </div>
      </div>

      <CallHistoryDrawer
        open={logsOpen}
        onClose={() => setLogsOpen(false)}
        tenantId={tenantId}
        agentId={agent?.id}
        agentName={agentLabel !== "New Agent" ? agentLabel : undefined}
      />
    </div>
  );
};

export default VoiceAgentConfiguration;
