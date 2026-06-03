import React, { useState, useEffect } from "react";
import { agentAPI } from "../../services/api";
import { X, Loader } from "lucide-react";

const AgentForm = ({
  tenantId,
  agent,
  existingAgents = [],
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    voice_id: "",
    language: "en-US",
    greeting_message: "",
    service_type: "Home Services",
  });
  const [voices, setVoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [voicesLoading, setVoicesLoading] = useState(true);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const serviceTypes = [
    "Home Services",
    "Plumbing",
    "Electrician",
    "Painter",
    "Carpenter",
    "Maids",
    "Healthcare",
    "Scholarly Help",
  ];

  const languages = [
    { code: "en-US", name: "English (US)" },
    { code: "en-GB", name: "English (UK)" },
    { code: "es-ES", name: "Spanish (Spain)" },
    { code: "es-MX", name: "Spanish (Mexico)" },
    { code: "fr-FR", name: "French" },
    { code: "de-DE", name: "German" },
    { code: "it-IT", name: "Italian" },
    { code: "pt-BR", name: "Portuguese (Brazil)" },
  ];

  useEffect(() => {
    fetchVoices();
    if (agent) {
      setFormData({
        name: agent.name,
        voice_id: agent.voice_id,
        language: agent.language,
        greeting_message: agent.greeting_message,
        service_type: agent.service_type,
      });
    }
  }, [agent]);

  const fetchVoices = async () => {
    try {
      setVoicesLoading(true);
      const response = await agentAPI.getAvailableVoices();
      setVoices(response.data.voices);
    } catch (err) {
      console.error("Failed to fetch voices:", err);
    } finally {
      setVoicesLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateGreetingMessage = (message) => {
    if (!message || message.trim().length === 0) {
      return "Greeting message is required";
    }
    if (message.trim().length < 10) {
      return "Greeting message must be at least 10 characters long";
    }
    return "";
  };

  const checkForDuplicate = (formData) => {
    // Check if an agent with the same name exists (case-insensitive)
    const duplicate = existingAgents.find((existingAgent) => {
      // Skip the current agent if we're editing
      if (agent && existingAgent.id === agent.id) {
        return false;
      }

      // Check if name matches (case-insensitive, trimmed)
      return (
        existingAgent.name.trim().toLowerCase() ===
        formData.name.trim().toLowerCase()
      );
    });

    return duplicate;
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    if (name === "greeting_message") {
      const error = validateGreetingMessage(value);
      setFieldErrors((prev) => ({
        ...prev,
        [name]: error,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setFieldErrors({});

    // Validate greeting message
    const greetingError = validateGreetingMessage(formData.greeting_message);
    if (greetingError) {
      setFieldErrors({ greeting_message: greetingError });
      setLoading(false);
      return;
    }

    // Check for duplicate agent name (only when creating, not when editing)
    if (!agent) {
      const duplicate = checkForDuplicate(formData);
      if (duplicate) {
        setError(
          "An agent with this name already exists. Please choose a different name.",
        );
        setLoading(false);
        return;
      }
    }

    try {
      if (agent) {
        // Update existing agent
        await agentAPI.updateAgent(agent.id, formData);
      } else {
        // Create new agent
        await agentAPI.createAgent(tenantId, formData);
      }
      onSuccess();
    } catch (err) {
      const errorDetail = err.response?.data?.detail;
      if (Array.isArray(errorDetail)) {
        // Handle Pydantic validation errors
        const errorMessages = errorDetail
          .map((e) => `${e.loc?.join(".")} - ${e.msg}`)
          .join(", ");
        setError(errorMessages);
      } else if (typeof errorDetail === "string") {
        setError(errorDetail);
      } else {
        setError("Failed to save agent");
      }
    } finally {
      setLoading(false);
    }
  };

  const getVoiceById = (voiceId) => {
    return voices.find((v) => v.voice_id === voiceId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#04070fcc] px-4 py-8 backdrop-blur-sm">
      <div className="mx-4 my-8 w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_90px_rgba(2,6,18,0.18)]">
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-900">
              {agent ? "Edit Agent" : "Create New Agent"}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Set voice, language, greeting, and service behavior for this
              tenant.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 transition hover:text-slate-800"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          )}

          {/* Agent Name */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-800">
              Agent Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Receptionist Sarah"
              required
              className="shell-input"
            />
            <p className="mt-1 text-xs text-slate-600">
              Give your agent a friendly name
            </p>
          </div>

          {/* Voice Selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-800">
              Voice *
            </label>
            {voicesLoading ? (
              <div className="flex items-center gap-2 text-slate-600">
                <Loader className="h-4 w-4 animate-spin" />
                Loading voices...
              </div>
            ) : (
              <div className="space-y-2">
                <select
                  name="voice_id"
                  value={formData.voice_id}
                  onChange={handleChange}
                  required
                  className="shell-input"
                >
                  <option value="">Select a voice</option>
                  {voices.map((voice) => (
                    <option key={voice.voice_id} value={voice.voice_id}>
                      {voice.name} - {voice.description} ({voice.category})
                    </option>
                  ))}
                </select>

                {/* Selected Voice Info */}
                {formData.voice_id && getVoiceById(formData.voice_id) && (
                  <div className="rounded-2xl border border-sky-200 bg-sky-50 p-3">
                    <p className="text-sm font-medium text-sky-700">
                      {getVoiceById(formData.voice_id).name}
                    </p>
                    <p className="mt-1 text-xs text-sky-700">
                      {getVoiceById(formData.voice_id).description}
                    </p>
                    <p className="mt-1 text-xs text-sky-700">
                      Best for:{" "}
                      {getVoiceById(formData.voice_id).use_case.replace(
                        /_/g,
                        " ",
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Language */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-800">
              Language *
            </label>
            <select
              name="language"
              value={formData.language}
              onChange={handleChange}
              required
              className="shell-input"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* Service Type */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-800">
              Service Type *
            </label>
            <select
              name="service_type"
              value={formData.service_type}
              onChange={handleChange}
              required
              className="shell-input"
            >
              {serviceTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Greeting Message */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-800">
              Greeting Message *
            </label>
            <textarea
              name="greeting_message"
              value={formData.greeting_message}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Hello! Thank you for calling. How can I help you today?"
              required
              rows={4}
              className={`shell-input resize-none ${
                fieldErrors.greeting_message
                  ? "border-rose-200 text-rose-700"
                  : ""
              }`}
            />
            {fieldErrors.greeting_message ? (
              <p className="mt-1 text-xs text-rose-700">
                {fieldErrors.greeting_message}
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-600">
                This message will be spoken when a call is received (minimum 10
                characters)
              </p>
            )}
          </div>

          <div className="flex gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-2xl bg-[#2f66ea] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#295ad0] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Saving..." : agent ? "Update Agent" : "Create Agent"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AgentForm;
