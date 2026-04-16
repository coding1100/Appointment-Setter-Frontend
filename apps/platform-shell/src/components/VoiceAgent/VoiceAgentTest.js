import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  User,
  Volume2,
  VolumeX,
  XCircle,
} from "lucide-react";

import {
  voiceAgentAPI,
  tenantAPI,
  agentAPI,
  phoneNumberAPI,
} from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import LiveKitVoiceAgent from "./LiveKitVoiceAgent";
import Loader from "../Loader";

const VoiceAgentTest = () => {
  const { user } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState("");
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [serviceType, setServiceType] = useState("Home Services");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [testMode, setTestMode] = useState(true);
  const [callActive, setCallActive] = useState(false);
  const [callId, setCallId] = useState("");
  const [callStatus, setCallStatus] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callHistory, setCallHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [twilioIntegration, setTwilioIntegration] = useState(null);
  const [showLiveKitAgent, setShowLiveKitAgent] = useState(false);
  const [agentPhone, setAgentPhone] = useState(null);

  const fetchTenants = useCallback(async () => {
    try {
      const response = await tenantAPI.listTenants();
      const tenantsList = Array.isArray(response.data) ? response.data : [];

      setTenants(tenantsList);

      if (tenantsList.length > 0 && !selectedTenant) {
        setSelectedTenant(tenantsList[0].id);
      }
    } catch (fetchError) {
      console.error("Error fetching tenants:", fetchError);
      setError("Failed to load tenants");
      setTenants([]);
    }
  }, [selectedTenant]);

  const fetchAgents = useCallback(async () => {
    if (!selectedTenant) return;

    try {
      const response = await agentAPI.listAgents(selectedTenant);
      const agentsList = response.data || [];
      const activeAgents = agentsList.filter(
        (agent) => agent.status === "active",
      );
      setAgents(activeAgents);

      if (activeAgents.length > 0) {
        setSelectedAgent(activeAgents[0].id);
      } else {
        setSelectedAgent("");
      }
    } catch (fetchError) {
      console.error("Error fetching agents:", fetchError);
      setAgents([]);
      setError("Failed to load agents");
    }
  }, [selectedTenant]);

  const fetchAgentPhone = useCallback(async (agentId) => {
    if (!agentId) return;

    try {
      const response = await phoneNumberAPI.getPhoneByAgent(agentId);
      setAgentPhone(response.data);
    } catch (fetchError) {
      setAgentPhone(null);
    }
  }, []);

  const fetchTwilioIntegration = useCallback(async () => {
    if (!selectedTenant) return;

    try {
      const response = await fetch(
        `/api/v1/twilio-integration/tenant/${selectedTenant}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setTwilioIntegration(data);
      } else {
        setTwilioIntegration(null);
      }
    } catch (fetchError) {
      console.error("Error fetching Twilio integration:", fetchError);
      setTwilioIntegration(null);
    }
  }, [selectedTenant]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  useEffect(() => {
    if (selectedTenant) {
      fetchTwilioIntegration();
      fetchAgents();
    }
  }, [selectedTenant, fetchTwilioIntegration, fetchAgents]);

  useEffect(() => {
    if (selectedAgent && agents.length > 0) {
      const agent = agents.find((row) => row.id === selectedAgent);
      if (agent) {
        setServiceType(agent.service_type);
        fetchAgentPhone(agent.id);
      }
    }
  }, [selectedAgent, agents, fetchAgentPhone]);

  const startCall = async () => {
    if (!selectedTenant) {
      setError("Please select a tenant");
      return;
    }

    if (!selectedAgent) {
      setError("Please select an agent to test");
      return;
    }

    const agent = agents.find((row) => row.id === selectedAgent);
    if (!agent) {
      setError("Selected agent not found");
      return;
    }

    if (!testMode && !twilioIntegration) {
      setError(
        "Twilio integration is required for live calls. Please configure it first.",
      );
      return;
    }

    if (!testMode && !agentPhone) {
      setError(
        "This agent does not have a phone number assigned. Please assign one in Twilio Integration page.",
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (testMode) {
        setShowLiveKitAgent(true);
        setCallActive(true);
      } else {
        const response = await voiceAgentAPI.startSession(
          selectedTenant,
          agent.service_type,
          false,
          phoneNumber,
          {
            agent_id: agent.id,
            agent_name: agent.name,
            agent_phone: agentPhone?.phone_number,
          },
        );

        setCallActive(true);
        setCallId(response.data.session_id);
        setCallStatus(response.data.status || "calling");
        pollCallStatus(response.data.session_id);
      }
    } catch (startError) {
      setError(
        startError.response?.data?.detail ||
          startError.response?.data?.message ||
          "Failed to start call",
      );
    } finally {
      setLoading(false);
    }
  };

  const endCall = async () => {
    if (!callId) return;

    setLoading(true);

    try {
      await voiceAgentAPI.endSession(callId);
      setCallActive(false);
      setCallId("");
      setCallStatus("");
      setIsRecording(false);
      setIsMuted(false);
    } catch (endError) {
      setError(
        endError.response?.data?.detail ||
          endError.response?.data?.message ||
          "Failed to end call",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLiveKitCallEnd = () => {
    setShowLiveKitAgent(false);
    setCallActive(false);
    setCallId("");
    setCallStatus("");
    setIsRecording(false);
    setIsMuted(false);
  };

  const pollCallStatus = async (currentSessionId) => {
    const interval = setInterval(async () => {
      try {
        const response = await voiceAgentAPI.getSessionStatus(currentSessionId);
        if (response.data) {
          setCallStatus(response.data.status);
          if (response.data.status === "ended") {
            setCallActive(false);
            setCallId("");
            clearInterval(interval);
          }
        }
      } catch (pollError) {
        console.error("Error polling session status:", pollError);
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const fetchCallHistory = useCallback(async () => {
    if (!selectedTenant) return;

    try {
      const response = await voiceAgentAPI.getCallHistory(selectedTenant);
      setCallHistory(response.data.sessions || []);
    } catch (fetchError) {
      console.error("Error fetching call history:", fetchError);
      setCallHistory([]);
    }
  }, [selectedTenant]);

  useEffect(() => {
    if (selectedTenant) {
      fetchCallHistory();
    }
  }, [selectedTenant, fetchCallHistory]);

  const selectedTenantData = tenants.find(
    (tenant) => tenant.id === selectedTenant,
  );
  const selectedAgentData = useMemo(
    () => agents.find((agent) => agent.id === selectedAgent) || null,
    [agents, selectedAgent],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[0.78rem] uppercase tracking-[0.32em] text-white/68">
            Voice Testing
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-black">
            Voice Agent Testing
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-white/72">
            Test active voice agents for{" "}
            {selectedTenantData?.name || "your selected tenant"} with
            browser-based simulation or live Twilio-powered calls.
          </p>
        </div>
        <button
          onClick={fetchCallHistory}
          className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-black/5 px-4 py-3 text-sm font-medium text-black transition hover:bg-black/10"
        >
          Refresh history
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-400">
          {typeof error === "string" ? error : JSON.stringify(error)}
        </div>
      )}

      {showLiveKitAgent ? (
        <div className="rounded-[28px] border border-white/8 bg-white/[0.04] p-5">
          <LiveKitVoiceAgent
            tenantId={selectedTenant}
            serviceType={serviceType}
            agentId={selectedAgent}
            onCallEnd={handleLiveKitCallEnd}
          />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_420px]">
          <div className="space-y-6">
            <section className="rounded-[28px] border border-white/8 bg-white/[0.04] p-5">
              <div className="mb-5">
                <h2 className="text-xl font-semibold text-black">
                  Voice Agent Controls
                </h2>
                <p className="mt-2 text-sm leading-7 text-white/62">
                  Select a tenant, choose an active agent, and decide whether to
                  test in-browser or place a live call.
                </p>
              </div>

              <div className="grid gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/84">
                    Tenant
                  </label>
                  <select
                    value={selectedTenant}
                    onChange={(e) => setSelectedTenant(e.target.value)}
                    className="shell-input"
                  >
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white/84">
                    Select Agent to Test
                  </label>
                  {agents.length > 0 ? (
                    <select
                      value={selectedAgent}
                      onChange={(e) => setSelectedAgent(e.target.value)}
                      className="shell-input"
                    >
                      {agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name} - {agent.service_type}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-4 text-sm text-white/60">
                      No active agents found.{" "}
                      <Link
                        to="/app/appointment-setter/voice-agents"
                        className="text-sky-100 no-underline hover:text-white"
                      >
                        Create or activate an agent first.
                      </Link>
                    </div>
                  )}
                </div>

                {selectedAgentData && (
                  <div className="rounded-[22px] border border-sky-300/18 bg-sky-300/10 p-4">
                    <div className="flex items-start gap-3">
                      <User className="mt-0.5 h-5 w-5 text-sky-400" />
                      <div className="text-sm">
                        <p className="font-semibold text-sky-400">
                          {selectedAgentData.name}
                        </p>
                        <p className="mt-1 text-sky-100/82">
                          <span className="font-medium">Service:</span>{" "}
                          {selectedAgentData.service_type}
                        </p>
                        <p className="text-sky-100/82">
                          <span className="font-medium">Language:</span>{" "}
                          {selectedAgentData.language}
                        </p>
                        {agentPhone ? (
                          <p className="mt-1 flex items-center text-emerald-400">
                            <CheckCircle className="mr-1 h-4 w-4" />
                            <span className="font-medium">Phone:</span>&nbsp;
                            {agentPhone.phone_number}
                          </p>
                        ) : (
                          <p className="mt-1 flex items-center text-amber-100">
                            <XCircle className="mr-1 h-4 w-4" />
                            No phone assigned yet
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={testMode}
                      onChange={(e) => setTestMode(e.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-transparent text-[#2f66ea] focus:ring-[#2f66ea]"
                    />
                    <span className="ml-3 text-sm text-white/82">
                      Test Mode (LiveKit in browser)
                    </span>
                  </label>
                </div>

                {!testMode && (
                  <>
                    <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {twilioIntegration ? (
                            <>
                              <CheckCircle className="h-5 w-5 text-emerald-400" />
                              <span className="text-sm font-medium text-emerald-100">
                                Twilio Integration Active
                              </span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-5 w-5 text-rose-400" />
                              <span className="text-sm font-medium text-rose-400">
                                Twilio Integration Required
                              </span>
                            </>
                          )}
                        </div>
                        {twilioIntegration && (
                          <span className="text-xs text-white/52">
                            {twilioIntegration.phone_number}
                          </span>
                        )}
                      </div>
                      {!twilioIntegration && (
                        <p className="mt-3 text-xs leading-6 text-white/58">
                          Please configure Twilio integration before placing
                          live calls.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-white/84">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+1234567890"
                        className="shell-input"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {!callActive ? (
                  <button
                    onClick={startCall}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#0f9f6e] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#0c8a5f] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Phone className="h-4 w-4" />
                    {loading ? "Starting..." : "Start Call"}
                  </button>
                ) : (
                  <button
                    onClick={endCall}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#dc2626] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#c81e1e] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <PhoneOff className="h-4 w-4" />
                    {loading ? "Ending..." : "End Call"}
                  </button>
                )}

                {callActive && (
                  <>
                    <button
                      onClick={toggleRecording}
                      className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                        isRecording
                          ? "border-rose-300/18 bg-rose-400/10 text-rose-100"
                          : "border-white/10 bg-white/6 text-white hover:bg-white/10"
                      }`}
                    >
                      {isRecording ? (
                        <MicOff className="h-4 w-4" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                      {isRecording ? "Stop Recording" : "Start Recording"}
                    </button>

                    <button
                      onClick={toggleMute}
                      className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                        isMuted
                          ? "border-amber-300/18 bg-amber-300/10 text-amber-100"
                          : "border-white/10 bg-white/6 text-white hover:bg-white/10"
                      }`}
                    >
                      {isMuted ? (
                        <VolumeX className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                      {isMuted ? "Unmute" : "Mute"}
                    </button>
                  </>
                )}
              </div>

              {callActive && (
                <div className="mt-6 rounded-[22px] border border-emerald-300/18 bg-emerald-300/10 p-4">
                  <h3 className="text-sm font-semibold text-emerald-100">
                    Call Active
                  </h3>
                  <div className="mt-3 grid gap-2 text-sm text-emerald-100/88">
                    <p>Call ID: {callId || "Browser session"}</p>
                    <p>Status: {callStatus || "connected"}</p>
                    <p>
                      Mode:{" "}
                      {testMode ? "Test Mode (LiveKit)" : "Live Call (Twilio)"}
                    </p>
                    {selectedAgentData && (
                      <p>Agent: {selectedAgentData.name}</p>
                    )}
                    <p>Service: {serviceType}</p>
                  </div>
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[28px] border border-white/8 bg-white/[0.04] p-5">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-black">
                    Call History
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-white/62">
                    Recent sessions for the selected tenant.
                  </p>
                </div>
                <button
                  onClick={fetchCallHistory}
                  className="inline-flex items-center rounded-2xl border border-black/10 bg-black/5 px-3 py-2 text-sm text-black transition hover:bg-black/10"
                >
                  Refresh
                </button>
              </div>

              <div className="space-y-3">
                {callHistory && callHistory.length > 0 ? (
                  callHistory.map((call) => (
                    <div
                      key={call.session_id || call.call_id || Math.random()}
                      className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-black">
                            {call.service_type || "Unknown Service"}
                          </p>
                          <p className="mt-1 text-xs text-white/54">
                            {call.started_at
                              ? new Date(call.started_at).toLocaleString()
                              : "Unknown time"}
                          </p>
                          <p className="mt-1 text-xs text-white/54">
                            Mode: {call.test_mode ? "Test" : "Live"}
                          </p>
                        </div>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                            call.status === "active"
                              ? "bg-emerald-400/14 text-emerald-400"
                              : call.status === "ended"
                                ? "bg-white/10 text-white/60"
                                : "bg-amber-300/15 text-amber-300"
                          }`}
                        >
                          {call.status || "unknown"}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-8 text-center text-sm text-white/58">
                    No call history found.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-[28px] border border-sky-300/16 bg-sky-300/10 p-5">
              <h2 className="text-lg font-semibold text-sky-400">
                Integration Information
              </h2>
              <div className="mt-3 space-y-3 text-sm leading-7 text-sky-100/88">
                <p>
                  <strong>Test Mode (LiveKit):</strong> Use this mode to test
                  your voice agent directly in the browser without making actual
                  phone calls.
                </p>
                <p>
                  <strong>Live Mode (Twilio):</strong> Use this mode to place
                  real calls through your Twilio setup.
                </p>
                <p>
                  <strong>Features:</strong> Speech-to-text, text-to-speech, AI
                  conversation flow, appointment booking, and escalation
                  handling.
                </p>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceAgentTest;
