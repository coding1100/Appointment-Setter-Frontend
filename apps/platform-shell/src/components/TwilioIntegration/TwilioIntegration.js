import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api, { tenantAPI, agentAPI, phoneNumberAPI } from "../../services/api";
import {
  Phone,
  CheckCircle,
  XCircle,
  Settings,
  TestTube,
  User,
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
} from "lucide-react";
import { getAppName } from "../../utils/appName";

// Get API base URL for direct fetch calls (should NOT include /api/v1)
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8001";

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
          result.detail || result.message || "Failed to test credentials",
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
        // Show detailed error message
        const errorMsg =
          result.detail ||
          result.message ||
          `Server returned ${response.status}: ${response.statusText}`;
        setError(errorMsg);
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
      className={`mr-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        enabled
          ? "bg-emerald-400/14 text-emerald-100"
          : "bg-white/10 text-white/48"
      }`}
    >
      {label}
    </span>
  );

  const NumberRow = ({ n, right, showCountry = true }) => (
    <div className="flex items-center justify-between rounded-[22px] border border-white/8 bg-white/[0.03] p-4 transition hover:bg-white/[0.05]">
      <div className="flex-1">
        <div className="flex items-center space-x-2 mb-1">
          <p className="font-semibold text-white">{n.phone_number}</p>
          {showCountry && n.iso_country && (
            <span className="rounded px-2 py-0.5 text-[10px] uppercase tracking-wide bg-sky-300/12 text-sky-100">
              {n.iso_country}
            </span>
          )}
        </div>
        {n.friendly_name && (
          <p className="mb-2 text-xs text-white/50">{n.friendly_name}</p>
        )}
        <div className="flex items-center">
          {capabilityBadge("voice", Boolean(n.capabilities?.voice))}
          {capabilityBadge("sms", Boolean(n.capabilities?.sms))}
          {capabilityBadge("mms", Boolean(n.capabilities?.mms))}
        </div>
      </div>
      <div className="flex items-center space-x-2 ml-4">
        <button
          onClick={() => {
            navigator.clipboard.writeText(n.phone_number);
            setCopyToast(n.phone_number);
            setTimeout(() => setCopyToast(""), 1500);
          }}
          className="inline-flex items-center rounded-xl border border-white/10 px-2 py-1 text-xs text-white/68 hover:bg-white/8"
          title="Copy number"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        {right}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[0.78rem] uppercase tracking-[0.32em] text-white/68">
            Twilio Workspace
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-black">
            Shared Twilio Credentials
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-white/72">
            One credential set per tenant for voice workflows, with phone
            purchasing and assignments managed from the same workspace.
          </p>
        </div>
        <button
          onClick={fetchIntegration}
          disabled={!selectedTenant || loading}
          className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-black/5 px-4 py-3 text-sm font-medium text-black transition hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Refresh integration
        </button>
      </div>

      {error && (
        <div className="flex items-center rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-400">
          <XCircle className="mr-2 h-5 w-5 flex-shrink-0" />
          <span>
            {typeof error === "string" ? error : JSON.stringify(error)}
          </span>
        </div>
      )}

      {success && (
        <div className="flex items-center rounded-2xl border border-emerald-300/18 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          <CheckCircle className="mr-2 h-5 w-5 flex-shrink-0" />
          <span>
            {typeof success === "string" ? success : JSON.stringify(success)}
          </span>
        </div>
      )}

      <div className="rounded-[28px] border border-white/8 bg-white/[0.04] p-5">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="flex items-center text-lg font-semibold text-black">
              <Key className="mr-2 h-5 w-5 text-sky-400" />
              Step 1: Connect Twilio Account
            </h3>
            <p className="mt-1 text-sm text-white/56">
              Enter tenant-level Twilio credentials used by both services.
            </p>
          </div>
          {integration && (
            <div className="flex items-center text-emerald-400">
              <CheckCircle className="mr-2 h-5 w-5" />
              <span className="font-medium">Connected</span>
            </div>
          )}
        </div>

        {/* Tenant Selection */}
        <div className="mb-4">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Account SID */}
          <div>
            <label className="mb-2 block text-sm font-medium text-white/84">
              Account SID *
            </label>
            <input
              type="text"
              name="accountSid"
              value={formData.accountSid}
              onChange={handleInputChange}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="shell-input"
            />
          </div>

          {/* Auth Token */}
          <div>
            <label className="mb-2 block text-sm font-medium text-white/84">
              Auth Token *
            </label>
            <input
              type="password"
              name="authToken"
              value={formData.authToken}
              onChange={handleInputChange}
              placeholder="Enter your Twilio Auth Token"
              className="shell-input"
            />
          </div>
        </div>

        {/* Advanced Settings (Collapsible) */}
        <div className="mb-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center text-sm font-medium text-white/72 hover:text-black/50"
          >
            {showAdvanced ? (
              <ChevronUp className="h-4 w-4 mr-1" />
            ) : (
              <ChevronDown className="h-4 w-4 mr-1" />
            )}
            Advanced Settings (Optional)
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-4 rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
              <div className="mb-3 text-xs text-white/48">
                <Info className="h-4 w-4 inline mr-1" />
                Webhooks are auto-configured from TWILIO_WEBHOOK_BASE_URL. This
                page controls shared credentials only.
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-white/84">
                  {getAppName()} Webhook URL
                </label>
                <input
                  type="url"
                  name="webhookUrl"
                  value={formData.webhookUrl}
                  onChange={handleInputChange}
                  placeholder="https://your-domain.com/api/v1/voice-agent/twilio/webhook"
                  className="shell-input"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-white/84">
                  {getAppName()} Status Callback URL
                </label>
                <input
                  type="url"
                  name="statusCallbackUrl"
                  value={formData.statusCallbackUrl}
                  onChange={handleInputChange}
                  placeholder="https://your-domain.com/api/v1/voice-agent/twilio/status"
                  className="shell-input"
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={testCredentials}
            disabled={loading || !formData.accountSid || !formData.authToken}
            className="inline-flex items-center rounded-2xl border border-black/10 bg-black/5 px-4 py-2.5 text-sm font-medium text-black transition hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <TestTube className="h-4 w-4 mr-2" />
            {loading ? "Testing..." : "Test Credentials"}
          </button>

          <button
            onClick={saveIntegration}
            disabled={loading || !formData.accountSid || !formData.authToken}
            className="inline-flex items-center rounded-2xl bg-[#2f66ea] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#295ad0] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Settings className="h-4 w-4 mr-2" />
            {loading
              ? "Saving..."
              : integration
                ? "Update Integration"
                : "Save Integration"}
          </button>

          {integration && (
            <button
              onClick={deleteIntegration}
              disabled={loading}
              className="inline-flex items-center rounded-2xl bg-[#dc2626] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#c81e1e] disabled:opacity-50"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Delete
            </button>
          )}
        </div>

        {/* Test Results */}
        {testResult && (
          <div className="mt-4 rounded-[22px] border border-sky-300/18 bg-sky-300/10 p-4">
            <div className="mb-2 flex items-center text-sky-100">
              <CheckCircle className="h-5 w-5 mr-2" />
              <span className="font-medium">Credentials Verified</span>
            </div>
            <div className="text-sm text-sky-100/84">
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
        )}
      </div>

      {/* Step 2: Phone Number Management */}
      {selectedTenant && agents.length > 0 && (
        <div className="rounded-[28px] border border-white/8 bg-white/[0.04] p-5">
          <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="flex items-center text-lg font-semibold text-black">
                <Phone className="mr-2 h-5 w-5 text-sky-400" />
                Step 2: Manage Phone Numbers
              </h3>
              <p className="mt-1 text-sm text-white/56">
                {integration
                  ? "Reuse numbers from your account or search for fresh inventory."
                  : "Use the system account until a tenant-specific Twilio connection is added."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-white/84">
                Select Agent
              </label>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="shell-input"
              >
                <option value="">Choose an agent</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-white/84">
                Action
              </label>
              <select
                value={flowMode}
                onChange={(e) => {
                  setFlowMode(e.target.value);
                  setAvailableNumbers([]);
                  setUnassignedNumbers([]);
                }}
                className="shell-input"
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
              </select>
            </div>
            <div className="flex items-end">
              {(flowMode === "tenant" || flowMode === "system") && (
                <button
                  onClick={fetchUnassignedNumbers}
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-black/10 bg-black/5 px-4 py-3 text-sm font-medium text-black transition hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Load Numbers
                </button>
              )}
            </div>
          </div>

          {flowMode === "tenant" && (
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold uppercase tracking-[0.24em] text-white/58">
                  Your Unassigned Numbers
                </h4>
                {unassignedNumbers.length > 0 && (
                  <span className="text-sm text-white/48">
                    {unassignedNumbers.length} available
                  </span>
                )}
              </div>
              {!integration ? (
                <div className="rounded-[22px] border border-amber-300/18 bg-amber-300/10 p-4">
                  <div className="flex items-start">
                    <Info className="mr-2 mt-0.5 h-5 w-5 text-amber-100" />
                    <div>
                      <p className="text-sm font-medium text-amber-50">
                        Connect your Twilio account first
                      </p>
                      <p className="mt-1 text-xs text-amber-100/78">
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
                          className="inline-flex items-center rounded-2xl bg-[#2f66ea] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#295ad0] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Phone className="mr-1 h-4 w-4" />
                          Assign
                        </button>
                      }
                    />
                  ))}
                  {unassignedNumbers.length === 0 && (
                    <div className="rounded-[22px] border border-dashed border-white/14 bg-white/[0.02] px-6 py-10 text-center">
                      <Phone className="mx-auto mb-3 h-10 w-10 text-white/36" />
                      <p className="text-sm font-medium text-white/82">
                        No unassigned numbers found.
                      </p>
                      <p className="mt-1 text-xs text-white/48">
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
                <h4 className="text-sm font-semibold uppercase tracking-[0.24em] text-white/58">
                  {flowMode === "system"
                    ? "Buy From System Inventory"
                    : "Buy From Your Twilio Account"}
                </h4>
                {availableNumbers.length > 0 && (
                  <span className="text-sm text-white/48">
                    {availableNumbers.length} available
                  </span>
                )}
              </div>

              {flowMode === "tenant-purchase" && !integration && (
                <div className="mb-4 rounded-[22px] border border-amber-300/18 bg-amber-300/10 p-4 text-sm text-amber-50">
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
                  className="shell-input"
                />
                <select
                  value={searchParams.numberType}
                  onChange={(e) =>
                    setSearchParams((p) => ({
                      ...p,
                      numberType: e.target.value,
                    }))
                  }
                  className="shell-input"
                >
                  <option value="local">Local</option>
                  <option value="tollfree">Toll-Free</option>
                </select>
                <input
                  type="text"
                  placeholder="Area code (optional)"
                  value={searchParams.areaCode}
                  onChange={(e) =>
                    setSearchParams((p) => ({ ...p, areaCode: e.target.value }))
                  }
                  className="shell-input"
                />
                <button
                  onClick={searchAvailable}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-black/5 px-4 py-3 text-sm font-medium text-black transition hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Search className="mr-2 h-4 w-4" />
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
                        className="inline-flex items-center rounded-2xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ShoppingCart className="mr-1 h-4 w-4" />
                        Purchase
                      </button>
                    }
                  />
                ))}
                {availableNumbers.length === 0 && (
                  <div className="rounded-[22px] border border-dashed border-white/14 bg-white/[0.02] px-6 py-10 text-center">
                    <Search className="mx-auto mb-3 h-10 w-10 text-white/36" />
                    <p className="text-sm font-medium text-white/82">
                      No results yet.
                    </p>
                    <p className="mt-1 text-xs text-white/48">
                      Enter your search criteria and we&apos;ll bring back
                      available numbers here.
                    </p>
                  </div>
                )}
              </div>

              {copyToast && (
                <div className="mt-3 flex items-center text-xs text-emerald-400">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Copied {copyToast}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Current Assignments Overview */}
      {selectedTenant && agents.length > 0 && (
        <div className="rounded-[28px] border border-white/8 bg-white/[0.04] p-5">
          <div className="mb-5 flex items-center">
            <Users className="mr-2 h-5 w-5 text-sky-400" />
            <div>
              <h3 className="text-lg font-semibold text-black">
                Step 3: Phone Number Assignments
              </h3>
              <p className="mt-1 text-sm text-white/56">
                Review current assignments and unassign numbers when routing
                needs to change.
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
                  className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4 transition hover:bg-white/[0.05]"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-black/10">
                        <User className="h-5 w-5 text-sky-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h4 className="text-sm font-semibold text-black">
                            {agent.name}
                          </h4>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] ${
                              agent.status === "active"
                                ? "bg-emerald-400/15 text-emerald-400"
                                : "bg-black/10 text-black/55"
                            }`}
                          >
                            {agent.status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm capitalize text-white/56">
                          {agent.service_type}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.22em] text-white/38">
                          Language: {agent.language}
                        </p>

                        {allAssignments.length > 0 ? (
                          <div className="mt-4 space-y-2">
                            {allAssignments.map((assignment) => (
                              <div
                                key={assignment.id}
                                className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-black/5 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div className="flex items-center text-emerald-400">
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  <span className="text-sm font-medium">
                                    {assignment.phone_number}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleUnassignPhone(agent.id)}
                                  disabled={assignmentLoading}
                                  className="inline-flex items-center justify-center rounded-2xl border border-rose-400 bg-rose-400/70 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-400 disabled:opacity-50"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-4 rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-4 py-4 text-xs text-white/46">
                            No phone number assigned yet. Use Step 2 above to
                            assign a number.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="rounded-[28px] border border-white/8 bg-sky-300/8 p-5">
        <h3 className="mb-4 flex items-center text-lg font-semibold text-black">
          <Globe2 className="mr-2 h-5 w-5 text-sky-400" />
          Quick Start Guide
        </h3>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/48">
              1. Connect
            </p>
            <p className="mt-3 text-sm font-medium text-black">
              Add tenant credentials only when needed.
            </p>
            <p className="mt-2 text-xs leading-6 text-white/58">
              Account SID and Auth Token live in the{" "}
              <a
                href="https://console.twilio.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 underline underline-offset-4"
              >
                Twilio Console
              </a>
              . If you skip this step, you can still use system inventory.
            </p>
          </div>
          <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/48">
              2. Acquire
            </p>
            <p className="mt-3 text-sm font-medium text-black">
              Use existing numbers or purchase new ones.
            </p>
            <p className="mt-2 text-xs leading-6 text-white/58">
              Search by country, number type, and area code to keep provisioning
              fast for each tenant.
            </p>
          </div>
          <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/48">
              3. Assign
            </p>
            <p className="mt-3 text-sm font-medium text-black">
              Attach numbers to active voice agents.
            </p>
            <p className="mt-2 text-xs leading-6 text-white/58">
              Each number should route intentionally. Review assignments
              regularly as agents or campaigns change.
            </p>
          </div>
        </div>
      </div>

      {selectedTenant && agents.length === 0 && (
        <div className="rounded-[28px] border border-dashed border-white/12 bg-white/[0.03] px-6 py-10 text-center">
          <User className="mx-auto mb-4 h-12 w-12 text-white/34" />
          <h3 className="text-lg font-semibold text-black">
            Create voice agents before assigning numbers
          </h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-white/56">
            Twilio routing becomes available once this tenant has at least one
            active voice agent ready to receive calls.
          </p>
          <Link
            to="/app/appointment-setter/voice-agents"
            className="mt-5 inline-flex items-center rounded-2xl bg-[#2f66ea] px-4 py-3 text-sm font-semibold text-black no-underline transition hover:bg-[#295ad0]"
          >
            Open Voice Agents
          </Link>
        </div>
      )}
    </div>
  );
};

export default TwilioIntegration;
