import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { X } from "lucide-react";

import {
  voiceAgentAPI,
  tenantAPI,
  agentAPI,
  phoneNumberAPI,
} from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import LiveKitVoiceAgent from "./LiveKitVoiceAgent";
import VoiceAgentConfiguration from "./VoiceAgentConfiguration";
import Loader from "../Loader";

const VoiceAgentTest = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const configMode = searchParams.get("mode");
  const configTenantId = searchParams.get("tenantId") || "";
  const configAgentId = searchParams.get("agentId") || "";
  const effectiveConfigMode = configMode === "edit" ? "edit" : "create";

  const [tenants, setTenants] = useState([]);
  const [allAgents, setAllAgents] = useState([]);
  const [configAgent, setConfigAgent] = useState(null);
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
  const [loading, setLoading] = useState(false);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [error, setError] = useState("");
  const [twilioIntegration, setTwilioIntegration] = useState(null);
  const [showLiveKitAgent, setShowLiveKitAgent] = useState(false);
  const [pushToTalkLoading, setPushToTalkLoading] = useState(false);
  const [agentPhone, setAgentPhone] = useState(null);

  const fetchTenants = useCallback(async () => {
    setTenantsLoading(true);
    try {
      const role = String(user?.role || "").toLowerCase();
      let tenantsList = [];

      if (role === "admin") {
        const response = await tenantAPI.listTenants();
        tenantsList = Array.isArray(response.data) ? response.data : [];
      } else if (user?.tenant_id) {
        const response = await tenantAPI.getTenant(user.tenant_id);
        tenantsList = response.data ? [response.data] : [];
      }

      setTenants(tenantsList);

      if (tenantsList.length > 0 && !selectedTenant && !configTenantId) {
        setSelectedTenant(tenantsList[0].id);
      }
    } catch (fetchError) {
      console.error("Error fetching tenants:", fetchError);
      setError("Failed to load tenants");
      setTenants([]);
    } finally {
      setTenantsLoading(false);
    }
  }, [selectedTenant, configTenantId, user?.role, user?.tenant_id]);

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
    if (configTenantId) {
      setSelectedTenant(configTenantId);
    }
  }, [configTenantId]);

  useEffect(() => {
    if (effectiveConfigMode === "edit" && configAgentId) {
      setSelectedAgent(configAgentId);
    }
  }, [effectiveConfigMode, configAgentId]);

  useEffect(() => {
    if (selectedTenant) {
      fetchTwilioIntegration();
      fetchAgents();
    }
  }, [selectedTenant, fetchTwilioIntegration, fetchAgents]);

  const fetchAllAgentsForConfig = useCallback(async () => {
    const tenant = configTenantId || selectedTenant;
    if (!tenant) return;

    try {
      const response = await agentAPI.listAgents(tenant);
      const list = response.data || [];
      setAllAgents(list);
      if (effectiveConfigMode === "edit" && configAgentId) {
        setConfigAgent(list.find((row) => row.id === configAgentId) || null);
      } else {
        setConfigAgent(null);
      }
    } catch (fetchError) {
      console.error("Error loading agents for configuration:", fetchError);
      setAllAgents([]);
      setConfigAgent(null);
    }
  }, [
    configTenantId,
    selectedTenant,
    effectiveConfigMode,
    configAgentId,
  ]);

  useEffect(() => {
    fetchAllAgentsForConfig();
  }, [fetchAllAgentsForConfig]);

  useEffect(() => {
    const agentId = selectedAgent || configAgent?.id;
    const agent =
      agents.find((row) => row.id === agentId) ||
      allAgents.find((row) => row.id === agentId);

    if (agent) {
      setServiceType(agent.service_type);
      fetchAgentPhone(agent.id);
    }
  }, [selectedAgent, configAgent, agents, allAgents, fetchAgentPhone]);

  const resolveTestTenant = () => configTenantId || selectedTenant;

  const resolveTestAgent = () => {
    const agentId = selectedAgent || configAgent?.id || configAgentId;
    if (!agentId) return null;
    return (
      agents.find((row) => row.id === agentId) ||
      allAgents.find((row) => row.id === agentId) ||
      (configAgent?.id === agentId ? configAgent : null)
    );
  };

  const startCall = async () => {
    const tenant = resolveTestTenant();
    if (!tenant) {
      setError("Please select a tenant");
      return;
    }

    const agent = resolveTestAgent();
    if (!agent) {
      setError("Please select an agent to test");
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
        setPushToTalkLoading(true);
      } else {
        const response = await voiceAgentAPI.startSession(
          tenant,
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
      setPushToTalkLoading(false);
      setShowLiveKitAgent(false);
      setCallActive(false);
      setError(
        startError.response?.data?.detail ||
          startError.response?.data?.message ||
          "Failed to start call",
      );
    } finally {
      if (!testMode) {
        setLoading(false);
      }
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

  const handleLiveKitSessionStatus = useCallback((status) => {
    if (status === "connecting") {
      setPushToTalkLoading(true);
    }
    if (status === "connected" || status === "error" || status === "ended") {
      setPushToTalkLoading(false);
    }
  }, []);

  const resetVoiceTestSession = useCallback(() => {
    setShowLiveKitAgent(false);
    setPushToTalkLoading(false);
    setCallActive(false);
    setCallId("");
    setCallStatus("");
    setIsRecording(false);
    setIsMuted(false);
  }, []);

  const hangUpRef = useRef(null);

  const handleLiveKitCallEnd = useCallback(() => {
    resetVoiceTestSession();
  }, [resetVoiceTestSession]);

  const handleCloseVoiceTestModal = async () => {
    try {
      if (hangUpRef.current) {
        await hangUpRef.current();
        return;
      }
    } catch (closeError) {
      console.error("Error closing voice test session:", closeError);
    }
    resetVoiceTestSession();
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

  const configTenant = configTenantId || selectedTenant;

  useEffect(() => {
    if (configMode || !configTenant) return;
    navigate(
      `/app/appointment-setter/voice-testing?mode=create&tenantId=${encodeURIComponent(configTenant)}`,
      { replace: true },
    );
  }, [configMode, configTenant, navigate]);

  const handleConfigDiscard = () => {
    navigate("/app/appointment-setter/voice-agents");
  };

  const handleConfigSaved = (savedAgent) => {
    const tenant = configTenant;
    const agentId = savedAgent?.id || configAgentId;
    if (agentId && tenant) {
      navigate(
        `/app/appointment-setter/voice-testing?mode=edit&tenantId=${encodeURIComponent(tenant)}&agentId=${encodeURIComponent(agentId)}`,
        { replace: true },
      );
      setSelectedTenant(tenant);
      setSelectedAgent(agentId);
      setConfigAgent(savedAgent);
      fetchAgents();
      fetchAllAgentsForConfig();
    }
  };

  const handleAgentStatusChange = (updatedAgent) => {
    setConfigAgent(updatedAgent);
    fetchAgents();
    fetchAllAgentsForConfig();
  };

  const handlePushToTalk = async () => {
    if (showLiveKitAgent || pushToTalkLoading) {
      return;
    }

    const agent = resolveTestAgent();

    if (!agent) {
      setError("Save the agent before testing voice.");
      return;
    }

    if (agent.status !== "active") {
      setError("Activate the agent before using Push to Talk.");
      return;
    }

    if (!selectedAgent) {
      setSelectedAgent(agent.id);
    }

    if (!agent.service_type) {
      setError("Agent service type is required to start a test.");
      return;
    }

    setServiceType(agent.service_type);
    setError("");
    setPushToTalkLoading(true);
    await startCall();
  };

  if (tenantsLoading || (!configTenant && tenants.length === 0 && !error)) {
    return <Loader message="Loading voice agent configuration..." />;
  }

  if (!configTenant) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">No tenant available</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm text-slate-500">
          Create a tenant before configuring a voice agent.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <VoiceAgentConfiguration
        tenantId={configTenant}
        agent={effectiveConfigMode === "edit" ? configAgent : null}
        existingAgents={allAgents}
        agentPhone={agentPhone}
        twilioIntegration={twilioIntegration}
        onDiscard={handleConfigDiscard}
        onSaved={handleConfigSaved}
        onStatusChange={handleAgentStatusChange}
        onPushToTalk={handlePushToTalk}
        pushToTalkLoading={pushToTalkLoading}
      />
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {typeof error === "string" ? error : JSON.stringify(error)}
        </div>
      ) : null}
      {showLiveKitAgent ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="voice-test-modal-title"
        >
          <div
            className="absolute inset-0 bg-[#1a1a2e]/75 backdrop-blur-sm"
            aria-hidden="true"
          />
          <div
            className="relative w-full max-w-md overflow-hidden rounded-xl border border-white/10 bg-[#1a1a2e] shadow-xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <p
                id="voice-test-modal-title"
                className="text-sm font-semibold text-white"
              >
                Voice test
              </p>
              <button
                type="button"
                onClick={handleCloseVoiceTestModal}
                className="rounded-md p-1 text-white/50 hover:bg-white/10 hover:text-white"
                aria-label="Close voice test"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <LiveKitVoiceAgent
              tenantId={resolveTestTenant()}
              serviceType={serviceType}
              agentId={selectedAgent || configAgent?.id || configAgentId}
              onCallEnd={handleLiveKitCallEnd}
              onSessionStatusChange={handleLiveKitSessionStatus}
              onRegisterHangUp={(hangUp) => {
                hangUpRef.current = hangUp;
              }}
              autoStart
              embedded
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default VoiceAgentTest;
