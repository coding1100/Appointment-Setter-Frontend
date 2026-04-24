import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";

import { chatbotAgentAPI } from "../../domains/chatbot-agents/api";
import { formatApiError } from "../../shared/utils/errors";

const STEPS = [
  "Basics",
  "Domain",
  "Behavior",
  "Knowledge",
  "Launcher",
  "Install",
];

const DOMAIN_OPTIONS = [
  { value: "healthcare", label: "Healthcare" },
  { value: "real_estate", label: "Real Estate" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "customer_support", label: "Customer Support" },
  { value: "education", label: "Education" },
  { value: "home_services", label: "Home Services" },
  { value: "professional_services", label: "Professional Services" },
  { value: "custom", label: "Custom" },
];

const DEFAULT_THEME = {
  primary_color: "#0EA5E9",
  background_color: "#FFFFFF",
  text_color: "#111111",
};

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "ar", label: "Arabic" },
  { value: "hi", label: "Hindi" },
  { value: "ur", label: "Urdu" },
];

const TONE_OPTIONS = [
  { value: "friendly", label: "Friendly" },
  { value: "professional", label: "Professional" },
  { value: "empathetic", label: "Empathetic" },
  { value: "sales", label: "Sales-focused" },
  { value: "technical", label: "Technical" },
];

const RESPONSE_STYLE_OPTIONS = [
  { value: "concise", label: "Short answers" },
  { value: "balanced", label: "Balanced answers" },
  { value: "detailed", label: "Detailed answers" },
];

const BEHAVIOR_PRESETS = [
  {
    id: "support",
    label: "Customer Support",
    description: "Great for helping with common questions and issues.",
    values: {
      persona: "Friendly support assistant",
      goal: "Resolve customer questions quickly and clearly",
      tone: "friendly",
      response_style: "balanced",
      escalation_instructions:
        "Escalate billing disputes, refunds, and account issues to a human support manager.",
      custom_instructions:
        "Always ask for order number or account email before giving account-specific help.",
      allowed_topics_text: "Orders\nReturns\nShipping\nAccount help",
      blocked_topics_text: "Medical advice\nLegal advice",
    },
  },
  {
    id: "sales",
    label: "Sales Assistant",
    description: "Best for lead capture, qualification, and product guidance.",
    values: {
      persona: "Helpful sales guide",
      goal: "Understand visitor needs and guide them to the best product or service",
      tone: "sales",
      response_style: "balanced",
      escalation_instructions:
        "Escalate pricing exceptions, enterprise deals, and contract requests to a human sales rep.",
      custom_instructions:
        "Ask one qualifying question at a time and finish with a clear next step.",
      allowed_topics_text: "Products\nPricing\nPackages\nDemos",
      blocked_topics_text: "Medical advice\nLegal advice",
    },
  },
  {
    id: "booking",
    label: "Booking Assistant",
    description:
      "Useful for appointments, availability, and scheduling support.",
    values: {
      persona: "Scheduling assistant",
      goal: "Help users book appointments with minimum friction",
      tone: "professional",
      response_style: "concise",
      escalation_instructions:
        "Escalate urgent same-day requests and calendar conflicts to front desk staff.",
      custom_instructions:
        "Always confirm date, time, and contact details before final confirmation.",
      allowed_topics_text:
        "Availability\nAppointments\nRescheduling\nCancellations",
      blocked_topics_text: "Medical advice\nFinancial advice",
    },
  },
];

const getDefaultForm = () => ({
  name: "",
  status: "active",
  allowed_origins_text: "",
  welcome_message: "",
  theme: { ...DEFAULT_THEME },
  domain_key: "customer_support",
  custom_domain_name: "",
  behavior: {
    persona: "Helpful assistant",
    goal: "Help users quickly and clearly",
    tone: "friendly",
    response_style: "balanced",
    language: "en",
    allowed_topics_text: "",
    blocked_topics_text: "",
    escalation_instructions: "Escalate complex requests to a human agent.",
    custom_instructions: "",
  },
  knowledge: {
    business_facts: "",
    faq_text: "",
  },
  launcher: {
    position: "bottom-right",
    button_label: "Chat with us",
    button_icon: "message-circle",
    accent_color: "#0EA5E9",
  },
});

const parseList = (value) =>
  value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

const uniqueList = (items = []) => Array.from(new Set(items));

const normalizeOrigin = (value) => String(value || "").trim().replace(/\/+$/, "");

const isValidOrigin = (value) => {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return false;
    if (!url.host) return false;
    if (url.pathname && url.pathname !== "/") return false;
    if (url.search || url.hash) return false;
    return true;
  } catch (_error) {
    return false;
  }
};

const mergeLineItems = (existing, additions) => {
  const merged = new Set([...parseList(existing), ...parseList(additions)]);
  return Array.from(merged).join("\n");
};

const parseFaq = (value) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [question, ...answerParts] = line.split("|");
      return {
        question: (question || "").trim(),
        answer: answerParts.join("|").trim(),
      };
    })
    .filter((entry) => entry.question && entry.answer);

const findMalformedFaqLine = (value) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .find((line) => {
      if (!line) return false;
      if (!line.includes("|")) return true;
      const [question, ...answerParts] = line.split("|");
      return !question.trim() || !answerParts.join("|").trim();
    });

const faqToText = (faqItems = []) =>
  faqItems
    .map((item) => {
      const question = item?.question?.trim();
      const answer = item?.answer?.trim();
      if (!question || !answer) return null;
      return `${question} | ${answer}`;
    })
    .filter(Boolean)
    .join("\n");

const ChatbotForm = ({
  chatbot,
  existingChatbots = [],
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState(getDefaultForm());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [showAdvancedBehavior, setShowAdvancedBehavior] = useState(false);
  const [activeBehaviorPreset, setActiveBehaviorPreset] = useState("");

  useEffect(() => {
    if (!chatbot) {
      setStep(0);
      setFormData(getDefaultForm());
      setFieldErrors({});
      setShowAdvancedBehavior(false);
      setActiveBehaviorPreset("");
      return;
    }
    const defaults = getDefaultForm();

    setFormData({
      name: chatbot.name || "",
      status: chatbot.status || "active",
      allowed_origins_text: Array.isArray(chatbot.allowed_origins)
        ? chatbot.allowed_origins.join("\n")
        : "",
      welcome_message: chatbot.welcome_message || "",
      theme: {
        primary_color:
          chatbot.theme?.primary_color || DEFAULT_THEME.primary_color,
        background_color:
          chatbot.theme?.background_color || DEFAULT_THEME.background_color,
        text_color: chatbot.theme?.text_color || DEFAULT_THEME.text_color,
      },
      domain_key: chatbot.domain_key || "customer_support",
      custom_domain_name: chatbot.custom_domain_name || "",
      behavior: {
        persona: chatbot.behavior_config?.persona || defaults.behavior.persona,
        goal: chatbot.behavior_config?.goal || defaults.behavior.goal,
        tone: chatbot.behavior_config?.tone || "friendly",
        response_style: chatbot.behavior_config?.response_style || "balanced",
        language: chatbot.behavior_config?.language || "en",
        allowed_topics_text: Array.isArray(
          chatbot.behavior_config?.allowed_topics,
        )
          ? chatbot.behavior_config.allowed_topics.join("\n")
          : "",
        blocked_topics_text: Array.isArray(
          chatbot.behavior_config?.blocked_topics,
        )
          ? chatbot.behavior_config.blocked_topics.join("\n")
          : "",
        escalation_instructions:
          chatbot.behavior_config?.escalation_instructions ||
          defaults.behavior.escalation_instructions,
        custom_instructions: chatbot.behavior_config?.custom_instructions || "",
      },
      knowledge: {
        business_facts: chatbot.knowledge_config?.business_facts || "",
        faq_text: faqToText(chatbot.knowledge_config?.faq_items || []),
      },
      launcher: {
        position: chatbot.launcher_config?.position || "bottom-right",
        button_label: chatbot.launcher_config?.button_label || "Chat with us",
        button_icon: chatbot.launcher_config?.button_icon || "message-circle",
        accent_color:
          chatbot.launcher_config?.accent_color ||
          chatbot.theme?.primary_color ||
          "#0EA5E9",
      },
    });
    const hasAdvancedBehaviorFields =
      Boolean(chatbot.behavior_config?.custom_instructions) ||
      (chatbot.behavior_config?.allowed_topics || []).length > 0 ||
      (chatbot.behavior_config?.blocked_topics || []).length > 0;
    setShowAdvancedBehavior(hasAdvancedBehaviorFields);
    setActiveBehaviorPreset("");
    setFieldErrors({});
    setStep(0);
  }, [chatbot]);

  const parsedOrigins = useMemo(
    () => uniqueList(parseList(formData.allowed_origins_text).map(normalizeOrigin)),
    [formData.allowed_origins_text],
  );
  const parsedAllowedTopics = useMemo(
    () => uniqueList(parseList(formData.behavior.allowed_topics_text)),
    [formData.behavior.allowed_topics_text],
  );
  const parsedBlockedTopics = useMemo(
    () => uniqueList(parseList(formData.behavior.blocked_topics_text)),
    [formData.behavior.blocked_topics_text],
  );
  const parsedFaqItems = useMemo(
    () => parseFaq(formData.knowledge.faq_text),
    [formData.knowledge.faq_text],
  );
  const malformedFaqLine = useMemo(
    () => findMalformedFaqLine(formData.knowledge.faq_text),
    [formData.knowledge.faq_text],
  );

  const isDuplicateName = () =>
    existingChatbots.some((entry) => {
      if (chatbot && entry.id === chatbot.id) return false;
      return (
        entry.name?.trim().toLowerCase() === formData.name.trim().toLowerCase()
      );
    });

  const runValidation = (scope = "all") => {
    const nextFieldErrors = {};
    const addError = (key, message) => {
      if (!nextFieldErrors[key]) nextFieldErrors[key] = message;
    };

    if (scope === "all" || scope === "step0") {
      if (!formData.name.trim()) addError("name", "Name is required.");
      if (isDuplicateName())
        addError("name", "A chatbot with this name already exists.");
      if (parsedOrigins.length === 0)
        addError(
          "allowed_origins_text",
          "At least one allowed origin is required.",
        );
      if (parsedOrigins.length > 100)
        addError(
          "allowed_origins_text",
          "Allowed origins cannot exceed 100.",
        );
      const invalidOrigin = parsedOrigins.find((origin) => !isValidOrigin(origin));
      if (invalidOrigin) {
        addError(
          "allowed_origins_text",
          `Invalid origin format: ${invalidOrigin}. Use only scheme + host.`,
        );
      }
      if (!formData.welcome_message.trim()) {
        addError("welcome_message", "Welcome message is required.");
      }
    }

    if (scope === "all" || scope === "step1") {
      if (!formData.domain_key) addError("domain_key", "Domain is required.");
      if (
        formData.domain_key === "custom" &&
        !formData.custom_domain_name.trim()
      ) {
        addError(
          "custom_domain_name",
          "Custom domain name is required when domain is custom.",
        );
      }
      if (
        formData.domain_key === "custom" &&
        formData.custom_domain_name.trim().length > 80
      ) {
        addError(
          "custom_domain_name",
          "Custom domain name cannot exceed 80 characters.",
        );
      }
    }

    if (scope === "all" || scope === "step2") {
      if (!formData.behavior.persona.trim()) {
        addError("behavior.persona", "Behavior persona is required.");
      }
      if (!formData.behavior.goal.trim()) {
        addError("behavior.goal", "Behavior goal is required.");
      }
      if (!formData.behavior.escalation_instructions.trim()) {
        addError(
          "behavior.escalation_instructions",
          "Escalation instructions are required.",
        );
      }
      if (parsedAllowedTopics.length > 50) {
        addError(
          "behavior.allowed_topics_text",
          "Allowed topics cannot exceed 50.",
        );
      }
      if (parsedBlockedTopics.length > 50) {
        addError(
          "behavior.blocked_topics_text",
          "Blocked topics cannot exceed 50.",
        );
      }
    }

    if (scope === "all" || scope === "step3") {
      if (!formData.knowledge.business_facts.trim()) {
        addError("knowledge.business_facts", "Business facts are required.");
      }
      if (malformedFaqLine) {
        addError(
          "knowledge.faq_text",
          `FAQ line format is invalid: "${malformedFaqLine}". Use "Question | Answer".`,
        );
      }
      if (parsedFaqItems.length > 100) {
        addError("knowledge.faq_text", "FAQ items cannot exceed 100.");
      }
    }

    if (scope === "all" || scope === "step4") {
      if (!formData.launcher.button_label.trim()) {
        addError("launcher.button_label", "Launcher button label is required.");
      }
      if (!formData.launcher.button_icon.trim()) {
        addError("launcher.button_icon", "Launcher icon name is required.");
      }
    }

    const firstError = Object.values(nextFieldErrors)[0] || "";
    return { fieldErrors: nextFieldErrors, firstError };
  };

  const focusFirstInvalidField = (errors) => {
    const firstKey = Object.keys(errors || {})[0];
    if (!firstKey) return;

    window.requestAnimationFrame(() => {
      const target = document.querySelector(`[data-field="${firstKey}"]`);
      if (!target) return;
      if (typeof target.focus === "function") {
        target.focus();
      }
      if (typeof target.scrollIntoView === "function") {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  };

  const clearFieldError = (key) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleFieldChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    clearFieldError(name);
    if (error) setError("");
  };
  const handleThemeChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      theme: { ...prev.theme, [name]: value },
    }));
    if (error) setError("");
  };
  const handleBehaviorChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      behavior: { ...prev.behavior, [name]: value },
    }));
    clearFieldError(`behavior.${name}`);
    if (error) setError("");
  };
  const handleKnowledgeChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      knowledge: { ...prev.knowledge, [name]: value },
    }));
    clearFieldError(`knowledge.${name}`);
    if (error) setError("");
  };
  const handleLauncherChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      launcher: { ...prev.launcher, [name]: value },
    }));
    clearFieldError(`launcher.${name}`);
    if (error) setError("");
  };

  const applyBehaviorPreset = (presetId) => {
    const preset = BEHAVIOR_PRESETS.find((entry) => entry.id === presetId);
    if (!preset) return;
    setActiveBehaviorPreset(presetId);
    setShowAdvancedBehavior(true);
    setFormData((prev) => ({
      ...prev,
      behavior: {
        ...prev.behavior,
        ...preset.values,
      },
    }));
  };

  const buildPayload = () => ({
    name: formData.name.trim(),
    status: formData.status,
    allowed_origins: parsedOrigins,
    welcome_message: formData.welcome_message.trim(),
    theme: formData.theme,
    domain_key: formData.domain_key,
    custom_domain_name:
      formData.domain_key === "custom"
        ? formData.custom_domain_name.trim()
        : null,
    behavior_config: {
      persona: formData.behavior.persona.trim(),
      goal: formData.behavior.goal.trim(),
      tone: formData.behavior.tone,
      response_style: formData.behavior.response_style,
      language: formData.behavior.language.trim(),
      allowed_topics: parsedAllowedTopics,
      blocked_topics: parsedBlockedTopics,
      escalation_instructions: formData.behavior.escalation_instructions.trim(),
      custom_instructions: formData.behavior.custom_instructions.trim(),
    },
    knowledge_config: {
      business_facts: formData.knowledge.business_facts.trim(),
      faq_items: parsedFaqItems,
    },
    launcher_config: {
      mode: "launcher",
      position: formData.launcher.position,
      button_label: formData.launcher.button_label.trim(),
      button_icon: formData.launcher.button_icon.trim(),
      accent_color: formData.launcher.accent_color,
    },
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (step < STEPS.length - 1) {
      const { fieldErrors: nextFieldErrors, firstError } = runValidation(
        `step${step}`,
      );
      setFieldErrors(nextFieldErrors);
      if (firstError) {
        setError(firstError);
        focusFirstInvalidField(nextFieldErrors);
        return;
      }
      setError("");
      setStep((value) => Math.min(STEPS.length - 1, value + 1));
      return;
    }

    setError("");
    const { fieldErrors: nextFieldErrors, firstError } = runValidation("all");
    setFieldErrors(nextFieldErrors);
    if (firstError) {
      setError(firstError);
      focusFirstInvalidField(nextFieldErrors);
      return;
    }

    try {
      setLoading(true);
      const payload = buildPayload();
      if (chatbot) {
        await chatbotAgentAPI.updateChatbotAgent(chatbot.id, payload);
      } else {
        await chatbotAgentAPI.createChatbotAgent(payload);
      }
      onSuccess();
    } catch (err) {
      setError(formatApiError(err, "Failed to save chatbot agent"));
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    const { fieldErrors: nextFieldErrors, firstError } = runValidation(
      `step${step}`,
    );
    setFieldErrors(nextFieldErrors);
    if (firstError) {
      setError(firstError);
      focusFirstInvalidField(nextFieldErrors);
      return;
    }
    setError("");
    setStep((value) => Math.min(STEPS.length - 1, value + 1));
  };

  const canGoBack = step > 0;
  const canGoNext = step < STEPS.length - 1;
  const fieldLabelClass = "shell-field-label";
  const helperTextClass = "shell-field-help";
  const inputClass = "shell-input";
  const colorInputClass =
    "h-11 w-full rounded-2xl border border-slate-200 bg-white p-1";
  const inputWithError = (key) =>
    `${inputClass} ${fieldErrors[key] ? "border-rose-300 focus:border-rose-400" : ""}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#04070fcc] px-4 py-8 backdrop-blur-sm">
      <div className="shell-modal my-8 flex max-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[28px]">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-[0.78rem] uppercase tracking-[0.28em] text-slate-500">
              Chatbot Workspace
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-900">
              {chatbot ? "Edit Chatbot Agent" : "Create Chatbot Agent"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Step {step + 1} of {STEPS.length}: {STEPS[step]}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 transition hover:text-slate-800"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="border-b border-slate-200 px-6 pt-4">
          <div className="flex gap-2 overflow-x-auto pb-4">
            {STEPS.map((label, index) => (
              <div
                key={label}
                className={`rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                  index === step
                    ? "bg-[#2f66ea] text-white"
                    : "border border-slate-200 bg-white text-slate-600"
                }`}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            {step === 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={fieldLabelClass}>Name *</label>
                    <input
                      data-field="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        handleFieldChange("name", e.target.value)
                      }
                      className={inputWithError("name")}
                      placeholder="e.g., Customer Success Assistant"
                    />
                    {fieldErrors.name ? (
                      <p className="mt-1 text-xs text-rose-600">{fieldErrors.name}</p>
                    ) : null}
                  </div>
                  <div>
                    <label className={fieldLabelClass}>Status *</label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        handleFieldChange("status", e.target.value)
                      }
                      className={inputClass}
                    >
                      <option value="active">active</option>
                      <option value="inactive">inactive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={fieldLabelClass}>Allowed CORS Origins *</label>
                    <textarea
                      data-field="allowed_origins_text"
                      value={formData.allowed_origins_text}
                    onChange={(e) =>
                      handleFieldChange("allowed_origins_text", e.target.value)
                    }
                    rows={3}
                    className={`${inputWithError("allowed_origins_text")} resize-none`}
                    placeholder={
                      "https://www.yourwebsite.com\nhttps://staging.yourwebsite.com"
                    }
                  />
                  {fieldErrors.allowed_origins_text ? (
                    <p className="mt-1 text-xs text-rose-600">
                      {fieldErrors.allowed_origins_text}
                    </p>
                  ) : null}
                  <p className={helperTextClass}>
                    List each allowed CORS website origin on its own line.
                  </p>
                </div>

                <div>
                  <label className={fieldLabelClass}>Welcome Message *</label>
                  <textarea
                    data-field="welcome_message"
                    value={formData.welcome_message}
                    onChange={(e) =>
                      handleFieldChange("welcome_message", e.target.value)
                    }
                    rows={3}
                    className={`${inputWithError("welcome_message")} resize-none`}
                  />
                  {fieldErrors.welcome_message ? (
                    <p className="mt-1 text-xs text-rose-600">
                      {fieldErrors.welcome_message}
                    </p>
                  ) : null}
                </div>

                <div className="shell-info-panel">
                  <label className={fieldLabelClass}>Theme</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      type="color"
                      value={formData.theme.primary_color}
                      onChange={(e) =>
                        handleThemeChange("primary_color", e.target.value)
                      }
                      className={colorInputClass}
                    />
                    <input
                      type="color"
                      value={formData.theme.background_color}
                      onChange={(e) =>
                        handleThemeChange("background_color", e.target.value)
                      }
                      className={colorInputClass}
                    />
                    <input
                      type="color"
                      value={formData.theme.text_color}
                      onChange={(e) =>
                        handleThemeChange("text_color", e.target.value)
                      }
                      className={colorInputClass}
                    />
                  </div>
                  <p className={helperTextClass}>
                    These colors affect the embedded launcher and chat widget
                    appearance.
                  </p>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className={fieldLabelClass}>Domain *</label>
                  <select
                    data-field="domain_key"
                    value={formData.domain_key}
                    onChange={(e) =>
                      handleFieldChange("domain_key", e.target.value)
                    }
                    className={inputWithError("domain_key")}
                  >
                    {DOMAIN_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.domain_key ? (
                    <p className="mt-1 text-xs text-rose-600">
                      {fieldErrors.domain_key}
                    </p>
                  ) : null}
                </div>

                {formData.domain_key === "custom" && (
                  <div>
                    <label className={fieldLabelClass}>
                      Custom Domain Name *
                    </label>
                    <input
                      data-field="custom_domain_name"
                      type="text"
                      value={formData.custom_domain_name}
                      onChange={(e) =>
                        handleFieldChange("custom_domain_name", e.target.value)
                      }
                      className={inputWithError("custom_domain_name")}
                      placeholder="e.g., Legal Intake Assistant"
                    />
                    {fieldErrors.custom_domain_name ? (
                      <p className="mt-1 text-xs text-rose-600">
                        {fieldErrors.custom_domain_name}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="rounded-[22px] border border-sky-200 bg-sky-50 px-4 py-3">
                  <p className="text-sm font-semibold text-sky-800">
                    Set your chatbot personality in plain language
                  </p>
                  <p className="mt-1 text-sm text-sky-700">
                    Start with a preset, then adjust tone and response style.
                    Advanced controls are optional.
                  </p>
                </div>

                <div>
                  <p className={fieldLabelClass}>Quick Setup Presets</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {BEHAVIOR_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyBehaviorPreset(preset.id)}
                        className={`rounded-[22px] border p-4 text-left transition ${
                          activeBehaviorPreset === preset.id
                            ? "border-sky-200 bg-sky-50"
                            : "border-slate-200 bg-white hover:border-sky-200 hover:bg-slate-50"
                        }`}
                      >
                        <p className="text-sm font-semibold text-slate-900">
                          {preset.label}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {preset.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={fieldLabelClass}>
                      Who is this bot? *
                    </label>
                    <input
                      data-field="behavior.persona"
                      type="text"
                      value={formData.behavior.persona}
                      onChange={(e) =>
                        handleBehaviorChange("persona", e.target.value)
                      }
                      className={inputWithError("behavior.persona")}
                      placeholder="Example: Friendly support assistant"
                    />
                    {fieldErrors["behavior.persona"] ? (
                      <p className="mt-1 text-xs text-rose-600">
                        {fieldErrors["behavior.persona"]}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label className={fieldLabelClass}>
                      Main job of the bot *
                    </label>
                    <input
                      data-field="behavior.goal"
                      type="text"
                      value={formData.behavior.goal}
                      onChange={(e) =>
                        handleBehaviorChange("goal", e.target.value)
                      }
                      className={inputWithError("behavior.goal")}
                      placeholder="Example: Help customers with orders and returns"
                    />
                    {fieldErrors["behavior.goal"] ? (
                      <p className="mt-1 text-xs text-rose-600">
                        {fieldErrors["behavior.goal"]}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={fieldLabelClass}>Tone *</label>
                    <select
                      value={formData.behavior.tone}
                      onChange={(e) =>
                        handleBehaviorChange("tone", e.target.value)
                      }
                      className={inputClass}
                    >
                      {TONE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={fieldLabelClass}>Answer style *</label>
                    <select
                      value={formData.behavior.response_style}
                      onChange={(e) =>
                        handleBehaviorChange("response_style", e.target.value)
                      }
                      className={inputClass}
                    >
                      {RESPONSE_STYLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={fieldLabelClass}>Language *</label>
                    <select
                      value={formData.behavior.language}
                      onChange={(e) =>
                        handleBehaviorChange("language", e.target.value)
                      }
                      className={inputClass}
                    >
                      {LANGUAGE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label} ({option.value})
                        </option>
                      ))}
                      {!LANGUAGE_OPTIONS.some(
                        (option) => option.value === formData.behavior.language,
                      ) && (
                        <option value={formData.behavior.language}>
                          {formData.behavior.language}
                        </option>
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={fieldLabelClass}>
                    When should it hand over to a human? *
                  </label>
                  <textarea
                    data-field="behavior.escalation_instructions"
                    value={formData.behavior.escalation_instructions}
                    onChange={(e) =>
                      handleBehaviorChange(
                        "escalation_instructions",
                        e.target.value,
                      )
                    }
                    rows={3}
                    className={`${inputWithError("behavior.escalation_instructions")} resize-none`}
                    placeholder="Example: Escalate billing disputes and account closure requests to support manager."
                  />
                  {fieldErrors["behavior.escalation_instructions"] ? (
                    <p className="mt-1 text-xs text-rose-600">
                      {fieldErrors["behavior.escalation_instructions"]}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedBehavior((value) => !value)}
                    className="text-sm font-medium text-sky-700 hover:text-sky-800"
                  >
                    {showAdvancedBehavior
                      ? "Hide advanced behavior settings"
                      : "Show advanced behavior settings"}
                  </button>
                  <p className="mt-1 text-xs text-slate-500">
                    Advanced settings are optional. Use them only if you need
                    strict topic boundaries.
                  </p>
                </div>

                {showAdvancedBehavior && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={fieldLabelClass}>
                          Allowed topics (optional)
                        </label>
                        <textarea
                          data-field="behavior.allowed_topics_text"
                          value={formData.behavior.allowed_topics_text}
                          onChange={(e) =>
                            handleBehaviorChange(
                              "allowed_topics_text",
                              e.target.value,
                            )
                          }
                          rows={5}
                          className={`${inputWithError("behavior.allowed_topics_text")} resize-none`}
                          placeholder="One per line. Example: Orders, Pricing, Scheduling"
                        />
                        {fieldErrors["behavior.allowed_topics_text"] ? (
                          <p className="mt-1 text-xs text-rose-600">
                            {fieldErrors["behavior.allowed_topics_text"]}
                          </p>
                        ) : null}
                      </div>
                      <div>
                        <label className={fieldLabelClass}>
                          Blocked topics (optional)
                        </label>
                        <textarea
                          data-field="behavior.blocked_topics_text"
                          value={formData.behavior.blocked_topics_text}
                          onChange={(e) =>
                            handleBehaviorChange(
                              "blocked_topics_text",
                              e.target.value,
                            )
                          }
                          rows={5}
                          className={`${inputWithError("behavior.blocked_topics_text")} resize-none`}
                          placeholder="One per line. Example: Medical advice, Legal advice"
                        />
                        {fieldErrors["behavior.blocked_topics_text"] ? (
                          <p className="mt-1 text-xs text-rose-600">
                            {fieldErrors["behavior.blocked_topics_text"]}
                          </p>
                        ) : null}
                        <button
                          type="button"
                          onClick={() =>
                            handleBehaviorChange(
                              "blocked_topics_text",
                              mergeLineItems(
                                formData.behavior.blocked_topics_text,
                                "Medical advice\nLegal advice\nFinancial advice",
                              ),
                            )
                          }
                          className="mt-2 text-xs text-sky-700 hover:text-sky-800"
                        >
                          + Add common sensitive topics
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className={fieldLabelClass}>
                        Extra instructions for your team voice (optional)
                      </label>
                      <textarea
                        value={formData.behavior.custom_instructions}
                        onChange={(e) =>
                          handleBehaviorChange(
                            "custom_instructions",
                            e.target.value,
                          )
                        }
                        rows={4}
                        className={`${inputClass} resize-none`}
                        placeholder="Example: Greet with first name when available. Never promise refunds without approval."
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-sm font-semibold text-emerald-800">
                    Give your bot trusted business information
                  </p>
                  <p className="mt-1 text-sm text-emerald-700">
                    The bot will use this information as source-of-truth while
                    answering users.
                  </p>
                </div>
                <div>
                  <label className={fieldLabelClass}>Business facts *</label>
                  <textarea
                    data-field="knowledge.business_facts"
                    value={formData.knowledge.business_facts}
                    onChange={(e) =>
                      handleKnowledgeChange("business_facts", e.target.value)
                    }
                    rows={6}
                    className={`${inputWithError("knowledge.business_facts")} resize-none`}
                    placeholder="Include hours, location, return policy, contact details, service areas, and important rules."
                  />
                  {fieldErrors["knowledge.business_facts"] ? (
                    <p className="mt-1 text-xs text-rose-600">
                      {fieldErrors["knowledge.business_facts"]}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label className={fieldLabelClass}>
                    FAQ pairs (optional)
                  </label>
                  <textarea
                    data-field="knowledge.faq_text"
                    value={formData.knowledge.faq_text}
                    onChange={(e) =>
                      handleKnowledgeChange("faq_text", e.target.value)
                    }
                    rows={7}
                    className={`${inputWithError("knowledge.faq_text")} resize-none`}
                    placeholder={
                      "Format: Question | Answer\nExample: What are your hours? | Mon-Fri 9 AM to 6 PM"
                    }
                  />
                  {fieldErrors["knowledge.faq_text"] ? (
                    <p className="mt-1 text-xs text-rose-600">
                      {fieldErrors["knowledge.faq_text"]}
                    </p>
                  ) : null}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-sm font-semibold text-amber-800">
                    Choose how the launcher looks on your website
                  </p>
                  <p className="mt-1 text-sm text-amber-700">
                    These settings control the floating button visitors click to
                    open chat.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={fieldLabelClass}>Button position</label>
                    <select
                      value={formData.launcher.position}
                      onChange={(e) =>
                        handleLauncherChange("position", e.target.value)
                      }
                      className={inputClass}
                    >
                      <option value="bottom-right">Bottom right</option>
                      <option value="bottom-left">Bottom left</option>
                    </select>
                  </div>
                  <div>
                    <label className={fieldLabelClass}>Button label *</label>
                    <input
                      data-field="launcher.button_label"
                      type="text"
                      value={formData.launcher.button_label}
                      onChange={(e) =>
                        handleLauncherChange("button_label", e.target.value)
                      }
                      className={inputWithError("launcher.button_label")}
                      placeholder="Example: Chat with us"
                    />
                    {fieldErrors["launcher.button_label"] ? (
                      <p className="mt-1 text-xs text-rose-600">
                        {fieldErrors["launcher.button_label"]}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={fieldLabelClass}>Icon name</label>
                    <input
                      data-field="launcher.button_icon"
                      type="text"
                      value={formData.launcher.button_icon}
                      onChange={(e) =>
                        handleLauncherChange("button_icon", e.target.value)
                      }
                      className={inputWithError("launcher.button_icon")}
                      placeholder="Example: message-circle"
                    />
                    {fieldErrors["launcher.button_icon"] ? (
                      <p className="mt-1 text-xs text-rose-600">
                        {fieldErrors["launcher.button_icon"]}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label className={fieldLabelClass}>Accent color</label>
                    <input
                      type="color"
                      value={formData.launcher.accent_color}
                      onChange={(e) =>
                        handleLauncherChange("accent_color", e.target.value)
                      }
                      className={colorInputClass}
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="shell-info-panel space-y-3 text-sm text-slate-700">
                <div>
                  <span className="font-medium text-slate-900">Name:</span>{" "}
                  {formData.name || "-"}
                </div>
                <div>
                  <span className="font-medium text-slate-900">Domain:</span>{" "}
                  {formData.domain_key === "custom"
                    ? formData.custom_domain_name || "custom"
                    : formData.domain_key}
                </div>
                <div>
                  <span className="font-medium text-slate-900">
                    Allowed CORS Origins:
                  </span>{" "}
                  {parsedOrigins.length}
                </div>
                <div>
                  <span className="font-medium text-slate-900">Launcher:</span>{" "}
                  {formData.launcher.position} /{" "}
                  {formData.launcher.button_label}
                </div>
                <div className="text-xs text-slate-500">
                  Submitting saves production settings. Then use "Generate
                  Launcher" or "Copy Launcher Snippet" from the list.
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-slate-200 pt-5">
              <button
                type="button"
                onClick={() => setStep((value) => Math.max(0, value - 1))}
                disabled={!canGoBack}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <div className="flex gap-3">
                {canGoNext ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#2f66ea] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#295ad0]"
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading
                      ? "Saving..."
                      : chatbot
                        ? "Update Chatbot"
                        : "Create Chatbot"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatbotForm;
