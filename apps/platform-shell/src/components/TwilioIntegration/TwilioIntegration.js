import React, { useState, useEffect, useMemo } from "react";
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
  Key,
  Mic2,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Link2,
} from "lucide-react";
import { NAVY, TEAL, TEAL_DEEP } from "../Platform/WorkspaceShellLayout";
import StyledSelect, { selectClass } from "../../shared/ui/StyledSelect";

// Get API base URL for direct fetch calls (should NOT include /api/v1)
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8001";

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#68fadd]/50 focus:outline-none focus:ring-2 focus:ring-[#68fadd]/20";

const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

const btnDanger =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50";

const sectionCardClass =
  "overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]";

const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500";

const toolbarControlClass =
  "h-10 rounded-lg border border-slate-200 text-sm";

const toolbarBtnClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

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

const TELEPHONY_STEPS = [
  { id: 1, label: "Connect", description: "Link your Twilio account", icon: Key },
  { id: 2, label: "Acquire", description: "Add phone numbers", icon: Phone },
  { id: 3, label: "Assign", description: "Route to voice agents", icon: Users },
];

const TelephonyProgressRail = ({ steps, activeStep, onStepClick, embedded = false }) => (
  <nav
    aria-label="Telephony setup progress"
    className={
      embedded
        ? "px-0 py-0"
        : "overflow-x-auto rounded-xl border border-slate-200/80 bg-white px-3 py-2 shadow-sm sm:px-5"
    }
  >
    <ol className="flex items-center">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isComplete = step.status === "complete";
        const isActive = activeStep === step.id;
        const isLast = index === steps.length - 1;

        return (
          <React.Fragment key={step.id}>
            <li className="min-w-0 shrink-0">
              <button
                type="button"
                onClick={() => onStepClick(step.id)}
                aria-current={isActive ? "step" : undefined}
                className={`flex items-center gap-2 rounded-lg px-2 py-1 transition-colors sm:gap-2.5 sm:px-3 sm:py-1.5 ${
                  isActive ? "bg-[#68fadd]/12" : "hover:bg-slate-50"
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition sm:h-8 sm:w-8 ${
                    isComplete
                      ? "border-[#68fadd] bg-[#68fadd] text-[#1a1a2e]"
                      : isActive
                        ? "border-[#1a1a2e] bg-[#1a1a2e] text-[#68fadd]"
                        : "border-slate-200 bg-white text-slate-400"
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
                  ) : (
                    <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                  )}
                </span>
                <span
                  className={`truncate text-xs font-semibold sm:text-sm ${
                    isActive ? "text-[#1a1a2e]" : "text-slate-700"
                  }`}
                >
                  {step.label}
                </span>
              </button>
            </li>

            {!isLast ? (
              <li aria-hidden className="mx-1 min-w-4 flex-1 sm:mx-2">
                <span
                  className={`block h-px w-full ${
                    isComplete ? "bg-[#68fadd]" : "bg-slate-200"
                  }`}
                />
              </li>
            ) : null}
          </React.Fragment>
        );
      })}
    </ol>
  </nav>
);

const StepPanelHeader = ({ stepId, integrationStatus }) => {
  const meta = TELEPHONY_STEPS.find((step) => step.id === stepId);
  if (!meta) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 sm:px-6">
      <div>
        <h2 className="text-base font-semibold tracking-tight" style={{ color: NAVY }}>
          {meta.label}
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">{meta.description}</p>
      </div>
      {stepId === 1 ? (
        <span
          className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${integrationStatus.className}`}
        >
          {integrationStatus.label}
        </span>
      ) : null}
    </div>
  );
};

const StepNavigation = ({ activeStep, onBack, onNext }) => (
  <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-2.5 sm:px-5">
    <button
      type="button"
      onClick={onBack}
      disabled={activeStep <= 1}
      className={btnSecondary}
    >
      <ChevronLeft className="h-4 w-4" />
      Back
    </button>
    <p className="hidden text-xs text-slate-400 sm:block">
      Step {activeStep} of {TELEPHONY_STEPS.length}
    </p>
    <button
      type="button"
      onClick={onNext}
      disabled={activeStep >= TELEPHONY_STEPS.length}
      className={btnPrimary}
      style={{ backgroundColor: NAVY }}
    >
      Continue
      <ChevronRight className="h-4 w-4" />
    </button>
  </div>
);

const FlowModeTabs = ({ value, onChange, integration }) => {
  const options = integration
    ? [
        { id: "tenant", label: "My numbers", hint: "Reuse existing inventory" },
        {
          id: "tenant-purchase",
          label: "Buy number",
          hint: "Purchase from your account",
        },
      ]
    : [{ id: "system", label: "System inventory", hint: "Buy without credentials" }];

  return (
    <div
      className={`inline-flex w-full items-stretch ${toolbarControlClass} bg-slate-50/60 p-0.5 sm:w-auto`}
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          title={option.hint}
          className={`flex flex-1 items-center justify-center rounded-md px-3 text-sm font-semibold transition sm:flex-none sm:px-4 ${
            value === option.id
              ? "bg-white text-[#1a1a2e] shadow-sm ring-1 ring-slate-200/80"
              : "text-slate-600 hover:text-slate-800"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

const CompactEmptyState = ({ icon: Icon, title, hint }) => (
  <div className="flex items-center gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3">
    <Icon className="h-5 w-5 shrink-0 text-slate-300" strokeWidth={1.75} />
    <div className="min-w-0">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      <p className="text-xs text-slate-500">{hint}</p>
    </div>
  </div>
);

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
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [copyToast, setCopyToast] = useState("");
  const [activeTelephonyStep, setActiveTelephonyStep] = useState(1);

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

  useEffect(() => {
    if (integration && flowMode === "system") {
      setFlowMode("tenant");
    }
  }, [integration, flowMode]);

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
  <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition hover:border-[#68fadd]/30 hover:shadow-sm">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold" style={{ color: NAVY }}>
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
          {n.friendly_name ? (
            <span className="truncate text-xs text-slate-500">{n.friendly_name}</span>
          ) : null}
        </div>
        <div className="mt-1 flex items-center">
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

  const { telephonySteps, currentTelephonyStep } = useMemo(() => {
    const hasIntegration = Boolean(integration);
    const hasPhones = phoneAssignments.length > 0;
    const hasAssignments = phoneAssignments.some((phone) => Boolean(phone.agent_id));

    const stepComplete = {
      1: hasIntegration || hasPhones,
      2: hasPhones,
      3: hasAssignments,
    };

    let currentStep = 1;
    if (stepComplete[1] && !stepComplete[2]) {
      currentStep = 2;
    } else if (stepComplete[2] && !stepComplete[3]) {
      currentStep = 3;
    } else if (stepComplete[3]) {
      currentStep = 3;
    }

    return {
      currentTelephonyStep: currentStep,
      telephonySteps: TELEPHONY_STEPS.map((step) => ({
        ...step,
        status: stepComplete[step.id]
          ? "complete"
          : step.id === currentStep
            ? "current"
            : "upcoming",
      })),
    };
  }, [integration, phoneAssignments]);

  useEffect(() => {
    setActiveTelephonyStep(currentTelephonyStep);
  }, [currentTelephonyStep, selectedTenant]);

  const goToTelephonyStep = (stepId) => {
    setActiveTelephonyStep(stepId);
  };

  const integrationStatus = useMemo(() => {
    if (!integration) {
      return {
        label: "Not connected",
        className: "bg-slate-100 text-slate-600",
      };
    }

    const status = String(integration.status || "active").toLowerCase();
    if (status === "active") {
      return {
        label: "Connected",
        className: "bg-[#68fadd]/25 text-[#006b5c]",
      };
    }

    return {
      label: status.charAt(0).toUpperCase() + status.slice(1),
      className: "bg-amber-50 text-amber-700",
    };
  }, [integration]);

  const selectedTenantName =
    tenants.find((tenant) => tenant.id === selectedTenant)?.name || "Select tenant";

  const goToPrevStep = () => {
    setActiveTelephonyStep((step) => Math.max(1, step - 1));
  };

  const goToNextStep = () => {
    setActiveTelephonyStep((step) => Math.min(TELEPHONY_STEPS.length, step + 1));
  };

  const handleFlowModeChange = (mode) => {
    setFlowMode(mode);
    setAvailableNumbers([]);
    setUnassignedNumbers([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: NAVY }}>
            Telephony
          </h1>
          {activeTelephonyStep === 1 ? (
            <p className="mt-0.5 text-sm text-slate-500">
              Connect credentials, manage phone numbers, and assign routing per voice agent.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => {
            fetchIntegration();
            fetchPhoneAssignments();
            fetchAgents();
          }}
          disabled={!selectedTenant || loading}
          className={btnSecondary}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} strokeWidth={2} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{typeof error === "string" ? error : JSON.stringify(error)}</span>
        </div>
      ) : null}

      {success ? (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{typeof success === "string" ? success : JSON.stringify(success)}</span>
        </div>
      ) : null}

      {selectedTenant ? (
        <div className={sectionCardClass}>
          <div className="border-b border-slate-100 px-4 py-2.5 sm:px-5">
            <TelephonyProgressRail
              embedded
              steps={telephonySteps}
              activeStep={activeTelephonyStep}
              onStepClick={goToTelephonyStep}
            />
          </div>

          {activeTelephonyStep === 1 ? (
            <StepPanelHeader
              stepId={activeTelephonyStep}
              integrationStatus={integrationStatus}
            />
          ) : null}

          <div className="px-4 py-4 sm:px-5">
            {activeTelephonyStep === 1 ? (
              <div id="telephony-step-1" className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-[7fr_3fr] sm:items-end">
                  <div>
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
                  <div className="flex sm:justify-end sm:pb-2.5">
                    <a
                      href="https://console.twilio.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium no-underline transition hover:underline"
                      style={{ color: TEAL_DEEP }}
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      Open Twilio Console
                    </a>
                  </div>
                </div>

                {/* <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
                  <p>
                    Configure Twilio for <span className="font-semibold text-slate-800">{selectedTenantName}</span>.
                    Credentials are stored per tenant and used for voice call routing.
                  </p>
                </div> */}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>Account SID *</label>
                    <input
                      type="text"
                      name="accountSid"
                      value={formData.accountSid}
                      onChange={handleInputChange}
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className={fieldClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Auth Token *</label>
                    <div className="relative">
                      <input
                        type={showAuthToken ? "text" : "password"}
                        name="authToken"
                        value={formData.authToken}
                        onChange={handleInputChange}
                        placeholder="Enter your Twilio Auth Token"
                        className={`${fieldClass} pr-10`}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                        onClick={() => setShowAuthToken((value) => !value)}
                        aria-label={showAuthToken ? "Hide auth token" : "Show auth token"}
                      >
                        {showAuthToken ? (
                          <EyeOff className="h-[18px] w-[18px]" />
                        ) : (
                          <Eye className="h-[18px] w-[18px]" />
                        )}
                      </button>
                    </div>
                  </div>
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
                      Disconnect
                    </button>
                  ) : null}
                </div>

                {testResult ? (
                  <div className="rounded-xl border border-[#68fadd]/40 bg-[#68fadd]/10 p-4">
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
            ) : null}

            {activeTelephonyStep === 2 ? (
              <div id="telephony-step-2" className="space-y-3">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
                  <div>
                    <label className={labelClass}>Assign to agent (optional)</label>
                    <StyledSelect
                      value={selectedAgentId}
                      onChange={(e) => setSelectedAgentId(e.target.value)}
                      className={`${selectClass} h-10 py-0`}
                    >
                      <option value="">Choose an agent later</option>
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </StyledSelect>
                  </div>

                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <label className={labelClass}>Source</label>
                      <FlowModeTabs
                        value={flowMode}
                        onChange={handleFlowModeChange}
                        integration={integration}
                      />
                    </div>

                    {(flowMode === "tenant" || flowMode === "system") && (
                      <button
                        type="button"
                        onClick={fetchUnassignedNumbers}
                        disabled={loading}
                        className={toolbarBtnClass}
                      >
                        <RefreshCw className="h-4 w-4" strokeWidth={2} />
                        Load inventory
                      </button>
                    )}
                  </div>
                </div>

                {agents.length === 0 ? (
                  <p className="rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    You can acquire numbers now. Assign them to voice agents in Step 3.
                  </p>
                ) : null}

                {flowMode === "tenant" && (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-800">Unassigned numbers</h4>
                      {unassignedNumbers.length > 0 ? (
                        <span className="text-xs text-slate-500">
                          {unassignedNumbers.length} available
                        </span>
                      ) : null}
                    </div>
                    {!integration ? (
                      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                        <p className="text-xs text-amber-900">
                          Connect Twilio in Step 1 to reuse numbers from your account.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {unassignedNumbers.map((n, idx) => (
                          <NumberRow
                            key={idx}
                            n={n}
                            right={
                              <button
                                type="button"
                                disabled={!selectedAgentId || assignmentLoading}
                                onClick={() =>
                                  handleAssignPhone(selectedAgentId, n.phone_number)
                                }
                                className={`${btnPrimary} px-3 py-1.5 text-xs`}
                                style={{ backgroundColor: NAVY }}
                              >
                                <Phone className="h-3.5 w-3.5" strokeWidth={2} />
                                Assign
                              </button>
                            }
                          />
                        ))}
                        {unassignedNumbers.length === 0 ? (
                          <CompactEmptyState
                            icon={Phone}
                            title="No unassigned numbers yet"
                            hint="Load inventory or switch to buy a new number."
                          />
                        ) : null}
                      </div>
                    )}
                  </div>
                )}

                {(flowMode === "tenant-purchase" || flowMode === "system") && (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-800">
                        {flowMode === "system"
                          ? "Search system inventory"
                          : "Search your Twilio account"}
                      </h4>
                      {availableNumbers.length > 0 ? (
                        <span className="text-xs text-slate-500">
                          {availableNumbers.length} results
                        </span>
                      ) : null}
                    </div>

                    {flowMode === "tenant-purchase" && !integration ? (
                      <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        Connect Twilio in Step 1 before purchasing through your own account.
                      </p>
                    ) : null}

                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
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
                        type="button"
                        onClick={searchAvailable}
                        disabled={loading}
                        className={btnSecondary}
                      >
                        <Search className="h-4 w-4" strokeWidth={2} />
                        Search
                      </button>
                    </div>

                    <div className="mt-3 space-y-2">
                      {availableNumbers.map((n, idx) => (
                        <NumberRow
                          key={idx}
                          n={n}
                          right={
                            <button
                              type="button"
                              onClick={() => purchaseNumber(n.phone_number)}
                              disabled={purchaseLoading}
                              className={`${btnPrimary} px-3 py-1.5 text-xs`}
                              style={{ backgroundColor: TEAL_DEEP }}
                            >
                              <ShoppingCart className="h-3.5 w-3.5" strokeWidth={2} />
                              Purchase
                            </button>
                          }
                        />
                      ))}
                      {availableNumbers.length === 0 ? (
                        <CompactEmptyState
                          icon={Search}
                          title="No results yet"
                          hint="Run a search to see available numbers here."
                        />
                      ) : null}
                    </div>

                    {copyToast ? (
                      <div className="mt-2 flex items-center text-xs text-emerald-600">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Copied {copyToast}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}

            {activeTelephonyStep === 3 ? (
              <div id="telephony-step-3">
                {agents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-14 text-center">
                    <Mic2 className="mb-4 h-12 w-12 text-slate-300" />
                    <h3 className="text-lg font-semibold" style={{ color: NAVY }}>
                      Create voice agents first
                    </h3>
                    <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                      Assignment needs at least one active voice agent for this tenant.
                    </p>
                    <Link
                      to="/app/appointment-setter/voice-agents"
                      className={`${btnPrimary} mt-5 no-underline`}
                      style={{ backgroundColor: NAVY }}
                    >
                      Open voice agents
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {agents.map((agent) => {
                      const allAssignments = phoneAssignments.filter(
                        (p) => p.agent_id === agent.id,
                      );

                      return (
                        <div
                          key={agent.id}
                          className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition hover:border-[#68fadd]/25 hover:bg-white"
                        >
                          <div className="flex min-w-0 flex-1 items-start gap-3">
                            <div
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                              style={{ backgroundColor: NAVY }}
                            >
                              <Mic2 className="h-5 w-5" style={{ color: TEAL }} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-sm font-semibold" style={{ color: NAVY }}>
                                  {agent.name}
                                </h4>
                                <span className="inline-flex rounded-full bg-[#68fadd]/25 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#006b5c]">
                                  Deployed
                                </span>
                              </div>
                              <p className="mt-0.5 text-xs capitalize text-slate-500">
                                {agent.service_type} Â· {agent.language}
                              </p>

                              {allAssignments.length > 0 ? (
                                <div className="mt-3 space-y-2">
                                  {allAssignments.map((assignment) => (
                                    <div
                                      key={assignment.id}
                                      className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                      <div
                                        className="flex items-center gap-2"
                                        style={{ color: TEAL_DEEP }}
                                      >
                                        <CheckCircle className="h-4 w-4" />
                                        <span className="text-sm font-medium">
                                          {assignment.phone_number}
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleUnassignPhone(agent.id)}
                                        disabled={assignmentLoading}
                                        className={`${btnDanger} px-3 py-1.5 text-xs`}
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-white px-3 py-3 text-xs text-slate-500">
                                  No number assigned yet. Add one in the Acquire step.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <StepNavigation
            activeStep={activeTelephonyStep}
            onBack={goToPrevStep}
            onNext={goToNextStep}
          />
        </div>
      ) : null}
    </div>
  );
};

export default TwilioIntegration;
