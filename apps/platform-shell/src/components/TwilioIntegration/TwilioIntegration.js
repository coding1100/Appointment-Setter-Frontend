import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api, { tenantAPI, agentAPI, phoneNumberAPI } from "../../services/api";
import {
  Phone,
  CheckCircle,
  XCircle,
  Settings,
  TestTube,
  Users,
  ShoppingCart,
  Search,
  Copy,
  RefreshCw,
  Info,
  ChevronDown,
  ChevronUp,
  Globe2,
  Key,
  Mic2,
} from "lucide-react";
import { getAppName } from "../../utils/appName";
import { NAVY, TEAL, TEAL_DEEP } from "../Platform/WorkspaceShellLayout";
import StyledSelect from "../../shared/ui/StyledSelect";

// Get API base URL for direct fetch calls (should NOT include /api/v1)
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8001";

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#68fadd]/50 focus:outline-none focus:ring-2 focus:ring-[#68fadd]/20";

const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

const btnDanger =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50";

const sectionCardClass = "overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6";

const SectionIcon = ({ icon: Icon }) => (
  <div
    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-100"
    style={{ backgroundColor: NAVY }}
  >
    <Icon className="h-4 w-4" style={{ color: TEAL }} strokeWidth={1.75} />
  </div>
);

const formatTwilioCredentialError = (result, fallback) => {
  const base =
    (typeof result?.message === "string" && result.message) ||
    (typeof result?.detail === "string" && result.detail) ||
    fallback;

  if (typeof base !== "string") {
    return fallback;
  }

  const lower = base.toLowerCase();
  const hint = "Please verify your Twilio credentials again.";
  const isAuthError =
    lower.includes("authenticate") ||
    lower.includes("401") ||
    lower.includes("authentication failed") ||
    lower.includes("credential test failed");

  if (isAuthError && !lower.includes(hint.toLowerCase())) {
    return `${base.replace(/\.$/, "")}. ${hint}`;
  }

  return base;
};

const TwilioIntegration = () => {
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState("");
  const [integration, setIntegration] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [testResult, setTestResult] = useState(null);
  const [agents, setAgents] = useState([]);
  const [phoneAssignments, setPhoneAssignments] = useState([]);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [flowMode, setFlowMode] = useState("tenant"); // tenant | system | tenant-purchase
  const [unassignedNumbers, setUnassignedNumbers] = useState([]);
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [searchParams, setSearchParams] = useState({
    country: "US",
    numberType: "local",
    areaCode: "",
  });
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [copyToast, setCopyToast] = useState("");

  // Simplified form state - just credentials for initial setup
  const [formData, setFormData] = useState({
    accountSid: "",
    authToken: "",
    webhookUrl: "",
    statusCallbackUrl: "",
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    if (selectedTenant) {
      fetchIntegration();
      fetchAgents();
      fetchPhoneAssignments();
    }
  }, [selectedTenant]);

  const fetchTenants = async () => {
    try {
      const response = await tenantAPI.listTenants();
      const tenantsList = Array.isArray(response.data) ? response.data : [];

      setTenants(tenantsList);

      if (tenantsList.length > 0 && !selectedTenant) {
        setSelectedTenant(tenantsList[0].id);
      }
    } catch (error) {
      console.error("Error fetching tenants:", error);
      setTenants([]);
    }
  };

  const fetchIntegration = async () => {
    if (!selectedTenant) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/twilio-integration/tenant/${selectedTenant}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setIntegration(data);
        setFormData({
          accountSid: data.account_sid || "",
          authToken: "", // Never populate for security
          webhookUrl: data.webhook_url || "",
          statusCallbackUrl: data.status_callback_url || "",
        });
      } else {
        setIntegration(null);
        setFormData({
          accountSid: "",
          authToken: "",
          webhookUrl: "",
          statusCallbackUrl: "",
        });
      }
    } catch (error) {
      console.error("Error fetching integration:", error);
    }
  };

  const fetchUnassignedNumbers = async () => {
    if (!selectedTenant) return;
    if (flowMode === "tenant" && !integration) {
      setError("Please configure Twilio integration first");
      return;
    }
    setLoading(true);
    setError("");
    try {
      let url;
      if (flowMode === "system") {
        url = `${API_BASE_URL}/api/v1/twilio-integration/system/unassigned?tenant_id=${selectedTenant}`;
      } else {
        url = `${API_BASE_URL}/api/v1/twilio-integration/tenant/${selectedTenant}/unassigned`;
      }
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data) {
        setUnassignedNumbers(data.phone_numbers || []);
        setSuccess(
          `Found ${data.phone_numbers?.length || 0} unassigned numbers`,
        );
      }
    } catch (e) {
      console.error("Error fetching unassigned numbers", e);
      let errorMsg = "Failed to fetch unassigned numbers";
      if (e.message) {
        errorMsg = e.message;
      } else if (typeof e === "string") {
        errorMsg = e;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const testCredentials = async () => {
    if (!formData.accountSid || !formData.authToken) {
      setError("Please fill in Account SID and Auth Token");
      return;
    }

    setLoading(true);
    setError("");
    setTestResult(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/twilio-integration/test-credentials`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
          body: JSON.stringify({
            account_sid: formData.accountSid,
            auth_token: formData.authToken,
            // phone_number is now optional
          }),
        },
      );

      const result = await response.json();

      if (response.ok) {
        setTestResult(result);
        setSuccess("Credentials tested successfully!");
      } else {
        setError(
          formatTwilioCredentialError(result, "Failed to test credentials"),
        );
      }
    } catch (error) {
      setError("Failed to test credentials");
    } finally {
      setLoading(false);
    }
  };

  const searchAvailable = async () => {
    if (!selectedTenant) return;
    if (flowMode === "tenant-purchase" && !integration) {
      setError("Please configure Twilio integration first");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload = {
        mode: flowMode === "system" ? "system" : "tenant",
        tenant_id: selectedTenant,
        country: searchParams.country || "US",
        number_type: searchParams.numberType || "local",
        area_code: searchParams.areaCode || undefined,
      };
      const res = await api.post(
        "/api/v1/twilio-integration/search-available",
        payload,
      );
      setAvailableNumbers(res.data.available_numbers || []);
      setSuccess(
        `Found ${res.data.available_numbers?.length || 0} available numbers`,
      );
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to search numbers");
    } finally {
      setLoading(false);
    }
  };

  const purchaseNumber = async (phoneNumber) => {
    if (!selectedTenant || !phoneNumber) return;
    if (flowMode === "tenant-purchase" && !integration) {
      setError("Please configure Twilio integration first");
      return;
    }
    setPurchaseLoading(true);
    setError("");
    setSuccess("");
    try {
      if (flowMode === "system") {
        await api.post("/api/v1/twilio-integration/system/purchase", {
          tenant_id: selectedTenant,
          phone_number: phoneNumber,
        });
        setSuccess("Phone number purchased via system account!");
      } else {
        await api.post(
          `/api/v1/twilio-integration/tenant/${selectedTenant}/purchase`,
          {
            phone_number: phoneNumber,
          },
        );
        setSuccess("Phone number purchased via your account!");
      }
      // Refresh lists
      if (flowMode === "tenant") {
        fetchUnassignedNumbers();
      }
      fetchPhoneAssignments();
      // Pre-select for assignment if agent selected
      if (selectedAgentId) {
        await handleAssignPhone(selectedAgentId, phoneNumber);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to purchase number");
    } finally {
      setPurchaseLoading(false);
    }
  };

  const saveIntegration = async () => {
    if (!selectedTenant) {
      setError("Please select a tenant");
      return;
    }

    if (!formData.accountSid || !formData.authToken) {
      setError("Please fill in Account SID and Auth Token");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const url = integration
        ? `${API_BASE_URL}/api/v1/twilio-integration/tenant/${selectedTenant}/update`
        : `${API_BASE_URL}/api/v1/twilio-integration/tenant/${selectedTenant}/create`;

      const response = await fetch(url, {
        method: integration ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({
          account_sid: formData.accountSid,
          auth_token: formData.authToken,
          phone_number: "", // Not required for initial setup
          webhook_url: formData.webhookUrl || null,
          status_callback_url: formData.statusCallbackUrl || null,
        }),
      });

      // Clone response to read it multiple times if needed
      const responseClone = response.clone();
      let result;

      try {
        result = await response.json();
      } catch (jsonError) {
        // If response is not JSON, get text instead
        try {
          const text = await responseClone.text();
          setError(
            `Server error (${response.status}): ${text || "Unknown error"}`,
          );
        } catch (textError) {
          setError(
            `Server error (${response.status}): Unable to read response`,
          );
        }
        setLoading(false);
        return;
      }

      if (response.ok) {
        setSuccess(
          integration
            ? "Integration updated successfully!"
            : "Integration created! Now you can manage phone numbers below.",
        );
        fetchIntegration();
      } else {
        setError(
          formatTwilioCredentialError(
            result,
            `Server returned ${response.status}: ${response.statusText}`,
          ),
        );
      }
    } catch (error) {
      console.error("Error saving integration:", error);
      setError(
        `Network error: ${error.message || "Failed to save integration. Please check your connection and try again."}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const deleteIntegration = async () => {
    if (!selectedTenant || !integration) return;

    if (
      !window.confirm(
        "Are you sure you want to delete this integration? This will also remove all phone number assignments.",
      )
    ) {
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/twilio-integration/tenant/${selectedTenant}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        },
      );

      if (response.ok) {
        setSuccess("Integration deleted successfully");
        setIntegration(null);
        setFormData({
          accountSid: "",
          authToken: "",
          webhookUrl: "",
          statusCallbackUrl: "",
        });
        fetchPhoneAssignments();
      } else {
        const result = await response.json();
        setError(
          result.detail || result.message || "Failed to delete integration",
        );
      }
    } catch (error) {
      setError("Failed to delete integration");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const fetchAgents = async () => {
    if (!selectedTenant) return;

    try {
      const response = await agentAPI.listAgents(selectedTenant);
      const agentsList = response.data || [];
      // Filter to only show active agents
      const activeAgents = agentsList.filter(
        (agent) => agent.status === "active",
      );
      setAgents(activeAgents);
    } catch (error) {
      console.error("Error fetching agents:", error);
    }
  };

  const fetchPhoneAssignments = async () => {
    if (!selectedTenant) return;

    try {
      const response = await phoneNumberAPI.listPhoneNumbers(selectedTenant);
      setPhoneAssignments(response.data || []);
    } catch (error) {
      console.error("Error fetching phone assignments:", error);
    }
  };

  const handleAssignPhone = async (agentId, phoneNumber) => {
    if (!phoneNumber || !phoneNumber.trim()) {
      setError("Please enter a phone number");
      return;
    }

    setAssignmentLoading(true);
    setError("");
    setSuccess("");

    try {
      await phoneNumberAPI.assignPhoneToAgent(
        selectedTenant,
        agentId,
        phoneNumber,
      );
      setSuccess("Phone number assigned successfully!");
      fetchPhoneAssignments();
      fetchUnassignedNumbers();
    } catch (err) {
      const backendMessage =
        err.response?.data?.message || err.response?.data?.detail;
      if (typeof backendMessage === "string") {
        const lower = backendMessage.toLowerCase();
        if (lower.includes("already assigned") && lower.includes("tenant")) {
          setError(
            "This phone number is already assigned to another tenant. Please choose a different number or unassign it from that tenant first.",
          );
        } else {
          setError(backendMessage);
        }
      } else {
        setError("Failed to assign phone number");
      }
    } finally {
      setAssignmentLoading(false);
    }
  };

  const handleUnassignPhone = async (agentId) => {
    if (
      !window.confirm("Are you sure you want to unassign this phone number?")
    ) {
      return;
    }

    setAssignmentLoading(true);
    setError("");
    setSuccess("");

    try {
      await phoneNumberAPI.unassignPhoneFromAgent(agentId);
      setSuccess("Phone number unassigned successfully!");
      fetchPhoneAssignments();
      fetchUnassignedNumbers();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to unassign phone number");
    } finally {
      setAssignmentLoading(false);
    }
  };

  const capabilityBadge = (label, enabled) => (
    <span
      className={`mr-1 inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide ${
        enabled ? "bg-[#68fadd]/25 text-[#006b5c]" : "bg-slate-100 text-slate-500"
      }`}
    >
      {label}
    </span>
  );

  const NumberRow = ({ n, right, showCountry = true }) => (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/80 p-4 transition hover:border-[#68fadd]/30 hover:bg-slate-50">
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <p className="font-semibold" style={{ color: NAVY }}>
            {n.phone_number}
          </p>
          {showCountry && n.iso_country ? (
            <span
              className="rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide"
              style={{ backgroundColor: `${TEAL}22`, color: TEAL_DEEP }}
            >
              {n.iso_country}
            </span>
          ) : null}
        </div>
        {n.friendly_name ? (
          <p className="mb-2 text-xs text-slate-500">{n.friendly_name}</p>
        ) : null}
        <div className="flex items-center">
          {capabilityBadge("voice", Boolean(n.capabilities?.voice))}
          {capabilityBadge("sms", Boolean(n.capabilities?.sms))}
          {capabilityBadge("mms", Boolean(n.capabilities?.mms))}
        </div>
      </div>
      <div className="ml-4 flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(n.phone_number);
            setCopyToast(n.phone_number);
            setTimeout(() => setCopyToast(""), 1500);
          }}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
          title="Copy number"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        {right}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          
          <h1 className="mt-1 text-2xl font-semibold tracking-tight" style={{ color: NAVY }}>
            Telephony 
          </h1>
          <p className="mt-0.5 max-w-2xl text-sm text-slate-500">
            Connect credentials, manage phone numbers, and assign routing per voice agent.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchIntegration}
          disabled={!selectedTenant || loading}
          className={btnSecondary}
        >
          <RefreshCw className="h-4 w-4" strokeWidth={2} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <XCircle className="h-5 w-5 shrink-0" />
          <span>{typeof error === "string" ? error : JSON.stringify(error)}</span>
        </div>
      ) : null}

      {success ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span>{typeof success === "string" ? success : JSON.stringify(success)}</span>
        </div>
      ) : null}

      <div className={sectionCardClass}>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <SectionIcon icon={Key} />
            <div>
              <h3 className="text-base font-semibold tracking-tight" style={{ color: NAVY }}>
                Step 1 — Connect Twilio
              </h3>
              <p className="mt-0.5 text-sm text-slate-500">
                Tenant-level credentials for voice workflows.
              </p>
            </div>
          </div>
          {integration ? (
            <span className="inline-flex rounded-full bg-[#68fadd]/25 px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide text-[#006b5c]">
              Connected
            </span>
          ) : null}
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-slate-800">
            Active tenant
          </label>
          <StyledSelect
            value={selectedTenant}
            onChange={(e) => setSelectedTenant(e.target.value)}
          >
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </StyledSelect>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Account SID */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-800">
              Account SID *
            </label>
            <input
              type="text"
              name="accountSid"
              value={formData.accountSid}
              onChange={handleInputChange}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className={fieldClass}
            />
          </div>

          {/* Auth Token */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-800">
              Auth Token *
            </label>
            <input
              type="password"
              name="authToken"
              value={formData.authToken}
              onChange={handleInputChange}
              placeholder="Enter your Twilio Auth Token"
              className={fieldClass}
            />
          </div>
        </div>

        {/* Advanced Settings (Collapsible) */}
        <div className="mb-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-600 transition hover:text-slate-900"
          >
            {showAdvanced ? (
              <ChevronUp className="h-4 w-4 mr-1" />
            ) : (
              <ChevronDown className="h-4 w-4 mr-1" />
            )}
            Advanced Settings (Optional)
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-4 rounded-lg border border-slate-200 bg-slate-50/80 p-4">
              <div className="mb-3 text-xs text-slate-500">
                <Info className="h-4 w-4 inline mr-1" />
                Webhooks are auto-configured from TWILIO_WEBHOOK_BASE_URL. This
                page controls shared credentials only.
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-800">
                  {getAppName()} Webhook URL
                </label>
                <input
                  type="url"
                  name="webhookUrl"
                  value={formData.webhookUrl}
                  onChange={handleInputChange}
                  placeholder="https://your-domain.com/api/v1/voice-agent/twilio/webhook"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-800">
                  {getAppName()} Status Callback URL
                </label>
                <input
                  type="url"
                  name="statusCallbackUrl"
                  value={formData.statusCallbackUrl}
                  onChange={handleInputChange}
                  placeholder="https://your-domain.com/api/v1/voice-agent/twilio/status"
                  className={fieldClass}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={testCredentials}
            disabled={loading || !formData.accountSid || !formData.authToken}
            className={btnSecondary}
          >
            <TestTube className="h-4 w-4" strokeWidth={2} />
            {loading ? "Testing..." : "Test credentials"}
          </button>

          <button
            type="button"
            onClick={saveIntegration}
            disabled={loading || !formData.accountSid || !formData.authToken}
            className={btnPrimary}
            style={{ backgroundColor: NAVY }}
          >
            <Settings className="h-4 w-4" strokeWidth={2} />
            {loading
              ? "Saving..."
              : integration
                ? "Update integration"
                : "Save integration"}
          </button>

          {integration ? (
            <button
              type="button"
              onClick={deleteIntegration}
              disabled={loading}
              className={btnDanger}
            >
              <XCircle className="h-4 w-4" strokeWidth={2} />
              Delete
            </button>
          ) : null}
        </div>

        {testResult ? (
          <div className="mt-4 rounded-lg border border-[#68fadd]/40 bg-[#68fadd]/10 p-4">
            <div className="mb-2 flex items-center gap-2" style={{ color: TEAL_DEEP }}>
              <CheckCircle className="h-5 w-5" />
              <span className="font-semibold">Credentials verified</span>
            </div>
            <div className="text-sm" style={{ color: TEAL_DEEP }}>
              <p>
                <strong>Account:</strong>{" "}
                {testResult.account_info?.friendly_name || "Verified"}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                {testResult.account_info?.status || "Active"}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {selectedTenant && agents.length > 0 ? (
        <div className={sectionCardClass}>
          <div className="mb-5 flex items-start gap-3">
            <SectionIcon icon={Phone} />
            <div>
              <h3 className="text-base font-semibold tracking-tight" style={{ color: NAVY }}>
                Step 2 — Phone numbers
              </h3>
              <p className="mt-0.5 text-sm text-slate-500">
                {integration
                  ? "Reuse numbers from your account or search for new inventory."
                  : "Use the system account until tenant Twilio credentials are connected."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-800">
                Select Agent
              </label>
              <StyledSelect
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
              >
                <option value="">Choose an agent</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </StyledSelect>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-800">
                Action
              </label>
              <StyledSelect
                value={flowMode}
                onChange={(e) => {
                  setFlowMode(e.target.value);
                  setAvailableNumbers([]);
                  setUnassignedNumbers([]);
                }}
              >
                {integration ? (
                  <>
                    <option value="tenant">Use my existing numbers</option>
                    <option value="tenant-purchase">
                      Buy from my Twilio account
                    </option>
                  </>
                ) : (
                  <option value="system">Buy from system account</option>
                )}
              </StyledSelect>
            </div>
            <div className="flex items-end">
              {(flowMode === "tenant" || flowMode === "system") && (
                <button
                  onClick={fetchUnassignedNumbers}
                  disabled={loading}
                  className={`${btnSecondary} w-full`}
                >
                  <RefreshCw className="h-4 w-4" strokeWidth={2} />
                  Load numbers
                </button>
              )}
            </div>
          </div>

          {flowMode === "tenant" && (
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Your unassigned numbers
                </h4>
                {unassignedNumbers.length > 0 && (
                  <span className="text-sm text-slate-500">
                    {unassignedNumbers.length} available
                  </span>
                )}
              </div>
              {!integration ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-start gap-2">
                    <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                    <div>
                      <p className="text-sm font-medium text-amber-900">
                        Connect your Twilio account first
                      </p>
                      <p className="mt-1 text-xs text-amber-800">
                        Save tenant credentials in Step 1 if you want to reuse
                        numbers that already exist in your own Twilio project.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {unassignedNumbers.map((n, idx) => (
                    <NumberRow
                      key={idx}
                      n={n}
                      right={
                        <button
                          disabled={!selectedAgentId || assignmentLoading}
                          onClick={() =>
                            handleAssignPhone(selectedAgentId, n.phone_number)
                          }
                          className={`${btnPrimary} px-3 py-2 text-[10px]`}
                          style={{ backgroundColor: NAVY }}
                        >
                          <Phone className="h-3.5 w-3.5" strokeWidth={2} />
                          Assign
                        </button>
                      }
                    />
                  ))}
                  {unassignedNumbers.length === 0 && (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center">
                      <Phone className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                      <p className="text-sm font-medium text-slate-700">
                        No unassigned numbers found.
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Load the latest inventory or search for new numbers
                        below.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {(flowMode === "tenant-purchase" || flowMode === "system") && (
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  {flowMode === "system"
                    ? "Buy from system inventory"
                    : "Buy from your Twilio account"}
                </h4>
                {availableNumbers.length > 0 && (
                  <span className="text-sm text-slate-500">
                    {availableNumbers.length} available
                  </span>
                )}
              </div>

              {flowMode === "tenant-purchase" && !integration && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  Please connect your Twilio account in Step 1 before purchasing
                  numbers through your own account.
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <input
                  type="text"
                  placeholder="Country (e.g. US)"
                  value={searchParams.country}
                  onChange={(e) =>
                    setSearchParams((p) => ({ ...p, country: e.target.value }))
                  }
                  className={fieldClass}
                />
                <StyledSelect
                  value={searchParams.numberType}
                  onChange={(e) =>
                    setSearchParams((p) => ({
                      ...p,
                      numberType: e.target.value,
                    }))
                  }
                >
                  <option value="local">Local</option>
                  <option value="tollfree">Toll-Free</option>
                </StyledSelect>
                <input
                  type="text"
                  placeholder="Area code (optional)"
                  value={searchParams.areaCode}
                  onChange={(e) =>
                    setSearchParams((p) => ({ ...p, areaCode: e.target.value }))
                  }
                  className={fieldClass}
                />
                <button
                  onClick={searchAvailable}
                  disabled={loading}
                  className={btnSecondary}
                >
                  <Search className="h-4 w-4" strokeWidth={2} />
                  Search
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {availableNumbers.map((n, idx) => (
                  <NumberRow
                    key={idx}
                    n={n}
                    right={
                      <button
                        onClick={() => purchaseNumber(n.phone_number)}
                        disabled={purchaseLoading || !selectedAgentId}
                        className={`${btnPrimary} px-3 py-2 text-[10px]`}
                        style={{ backgroundColor: TEAL_DEEP }}
                      >
                        <ShoppingCart className="h-3.5 w-3.5" strokeWidth={2} />
                        Purchase
                      </button>
                    }
                  />
                ))}
                {availableNumbers.length === 0 && (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center">
                    <Search className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                    <p className="text-sm font-medium text-slate-700">
                      No results yet.
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Enter your search criteria and we&apos;ll bring back
                      available numbers here.
                    </p>
                  </div>
                )}
              </div>

              {copyToast && (
                <div className="mt-3 flex items-center text-xs text-emerald-600">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Copied {copyToast}
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}

      {selectedTenant && agents.length > 0 ? (
        <div className={sectionCardClass}>
          <div className="mb-5 flex items-start gap-3">
            <SectionIcon icon={Users} />
            <div>
              <h3 className="text-base font-semibold tracking-tight" style={{ color: NAVY }}>
                Step 3 — Assignments
              </h3>
              <p className="mt-0.5 text-sm text-slate-500">
                Review phone routing per agent and remove assignments when needed.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {agents.map((agent) => {
              const allAssignments = phoneAssignments.filter(
                (p) => p.agent_id === agent.id,
              );

              return (
                <div
                  key={agent.id}
                  className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 transition hover:border-[#68fadd]/30"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-100"
                      style={{ backgroundColor: NAVY }}
                    >
                      <Mic2 className="h-4 w-4" style={{ color: TEAL }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-semibold" style={{ color: NAVY }}>
                          {agent.name}
                        </h4>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide ${
                            agent.status === "active"
                              ? "bg-[#68fadd]/25 text-[#006b5c]"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {agent.status === "active" ? "Deployed" : agent.status}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs capitalize text-slate-500">
                        {agent.service_type}
                      </p>
                      <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wide text-slate-400">
                        {agent.language}
                      </p>

                      {allAssignments.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {allAssignments.map((assignment) => (
                            <div
                              key={assignment.id}
                              className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="flex items-center gap-2" style={{ color: TEAL_DEEP }}>
                                <CheckCircle className="h-4 w-4" />
                                <span className="text-sm font-medium">
                                  {assignment.phone_number}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleUnassignPhone(agent.id)}
                                disabled={assignmentLoading}
                                className={`${btnDanger} px-3 py-1.5 text-[10px]`}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-white px-3 py-3 text-xs text-slate-500">
                          No phone number assigned. Use Step 2 to assign a number.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className={sectionCardClass}>
        <div className="mb-4 flex items-start gap-3">
          <SectionIcon icon={Globe2} />
          <h3 className="text-base font-semibold tracking-tight" style={{ color: NAVY }}>
            Quick start
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {[
            {
              step: "1. Connect",
              title: "Add tenant credentials when needed.",
              body: (
                <>
                  Account SID and Auth Token are in the{" "}
                  <a
                    href="https://console.twilio.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium underline underline-offset-2"
                    style={{ color: TEAL_DEEP }}
                  >
                    Twilio Console
                  </a>
                  . System inventory works without tenant credentials.
                </>
              ),
            },
            {
              step: "2. Acquire",
              title: "Use existing numbers or purchase new ones.",
              body: "Search by country, number type, and area code to provision quickly per tenant.",
            },
            {
              step: "3. Assign",
              title: "Attach numbers to voice agents.",
              body: "Route each number intentionally and review assignments as agents change.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-lg border border-slate-200 bg-slate-50/80 p-4"
            >
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                {item.step}
              </p>
              <p className="mt-2 text-sm font-medium text-slate-800">{item.title}</p>
              <p className="mt-2 text-xs leading-6 text-slate-500">{item.body}</p>
            </div>
          ))}
        </div>
      </div>

      {selectedTenant && agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center">
          <Mic2 className="mb-4 h-12 w-12 text-slate-300" />
          <h3 className="text-lg font-semibold" style={{ color: NAVY }}>
            Create voice agents first
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Phone number assignment is available once this tenant has at least one voice agent.
          </p>
          <Link
            to="/app/appointment-setter/voice-agents"
            className={`${btnPrimary} mt-5 no-underline`}
            style={{ backgroundColor: NAVY }}
          >
            Open voice agents
          </Link>
        </div>
      ) : null}
    </div>
  );
};

export default TwilioIntegration;
