import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  Clock,
  Loader2,
  Mic,
  Network,
  Phone,
  Play,
  Plug,
  UserCircle,
} from "lucide-react";

import AgentFormFields from "../Agents/AgentFormFields";
import { useAgentForm } from "../Agents/useAgentForm";
import { NAVY, TEAL, TEAL_DEEP } from "../Platform/WorkspaceShellLayout";

const ConfigCard = ({ icon: Icon, iconBg, title, subtitle, badge, children }) => (
  <section className="rounded-xl border border-slate-200 bg-[#f9fafb] p-5">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: iconBg }}
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
      {badge ? (
        <span className="rounded-full bg-[#68fadd]/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#006b5c]">
          {badge}
        </span>
      ) : null}
    </div>
    {children}
  </section>
);

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

const VoiceAgentConfiguration = ({
  tenantId,
  agent,
  existingAgents = [],
  agentPhone,
  twilioIntegration,
  onDiscard,
  onSaved,
  onPushToTalk,
  pushToTalkLoading = false,
}) => {
  const [stability, setStability] = useState(75);
  const [clarity, setClarity] = useState(45);
  const [latencyOpt, setLatencyOpt] = useState(true);
  const [telephony, setTelephony] = useState({
    inbound: true,
    outbound: true,
    recording: false,
    hipaa: true,
  });

  const form = useAgentForm({
    tenantId,
    agent,
    existingAgents,
    onSuccess: onSaved,
  });

  const isCreating = !agent;
  const agentLabel = agent?.name || form.formData.name || "New Agent";
  const agentRef = agent?.id ? `#${String(agent.id).slice(0, 8)}` : "Draft";

  const handleSave = async (e) => {
    await form.handleSubmit(e);
  };

  const greetingPreview =
    form.formData.greeting_message?.trim() ||
    "Sure, I can help you with your account inquiry. Could you please provide your account number?";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-[1.65rem] font-semibold tracking-tight" style={{ color: NAVY }}>
            Voice Agent Configuration
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Customize synthesis parameters and telephony endpoints for Agent {agentRef}
            {agentLabel !== "New Agent" ? ` · ${agentLabel}` : ""}
          </p>
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
            disabled={form.loading}
            className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
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

      <form onSubmit={handleSave} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <ConfigCard
            icon={UserCircle}
            iconBg="#10b981"
            title="Voice Synthesis"
            subtitle="Powered by ElevenLabs"
            badge="Active"
          >
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_200px]">
              <div>
                <AgentFormFields {...form} compact />
                <button
                  type="button"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-3 text-sm font-medium transition hover:bg-slate-50"
                  style={{ color: TEAL_DEEP }}
                >
                  <Play className="h-4 w-4" />
                  Test Voice
                </button>
              </div>
              <div className="space-y-5">
                <RangeField label="Stability" value={stability} onChange={setStability} />
                <RangeField
                  label="Clarity & Artifact Amplification"
                  value={clarity}
                  onChange={setClarity}
                />
              </div>
            </div>
          </ConfigCard>

          {/* <ConfigCard icon={Phone} iconBg="#8b5cf6" title="Telephony" subtitle="Powered by Twilio">
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="truncate text-sm font-medium text-slate-800">
                    {agentPhone?.phone_number ||
                      twilioIntegration?.phone_number ||
                      "+1 (555) 012-3456"}
                  </span>
                </div>
                <Link
                  to="/app/appointment-setter/twilio"
                  className="shrink-0 text-sm font-medium no-underline hover:underline"
                  style={{ color: TEAL_DEEP }}
                >
                  Change
                </Link>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { key: "inbound", label: "Inbound Calls" },
                { key: "outbound", label: "Outbound Calls" },
                { key: "recording", label: "Call Recording" },
                { key: "hipaa", label: "HIPAA Compliance" },
              ].map(({ key, label }) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={telephony[key]}
                    onChange={(e) =>
                      setTelephony((prev) => ({ ...prev, [key]: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-[#006b5c] focus:ring-[#68fadd]/30"
                  />
                  {label}
                </label>
              ))}
            </div>
          </ConfigCard> */}
        </div>

        <div className="space-y-6">
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
        </div>
      </form>

      <div className="flex flex-col gap-4 border-t border-slate-200 pt-6 xl:flex-row xl:items-stretch">
        <div
          className="flex min-w-0 flex-1 items-center gap-4 rounded-xl px-5 py-4"
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
            className="inline-flex min-w-[160px] flex-1 items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 xl:flex-none"
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
    </div>
  );
};

export default VoiceAgentConfiguration;
