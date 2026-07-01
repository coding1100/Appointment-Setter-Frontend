import { useState, useEffect, useCallback } from "react";
import { agentAPI } from "../../services/api";

export const AGENT_SERVICE_TYPES = [
  "Home Services",
  "Plumbing",
  "Electrician",
  "Painter",
  "Carpenter",
  "Maids",
  "Healthcare",
];

export const AGENT_LANGUAGES = [
  { code: "en-US", name: "English (US)" },
  { code: "en-GB", name: "English (UK)" },
  { code: "es-ES", name: "Spanish (Spain)" },
  { code: "es-MX", name: "Spanish (Mexico)" },
  { code: "fr-FR", name: "French" },
  { code: "de-DE", name: "German" },
  { code: "it-IT", name: "Italian" },
  { code: "pt-BR", name: "Portuguese (Brazil)" },
];

const defaultFormData = {
  name: "",
  voice_id: "",
  language: "en-US",
  greeting_message: "",
  service_type: "Home Services",
  system_prompt: "",
};

export const useAgentForm = ({
  tenantId,
  agent,
  existingAgents = [],
  onSuccess,
}) => {
  const [formData, setFormData] = useState(defaultFormData);
  const [voices, setVoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [voicesLoading, setVoicesLoading] = useState(true);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const fetchVoices = useCallback(async () => {
    try {
      setVoicesLoading(true);
      const response = await agentAPI.getAvailableVoices();
      setVoices(response.data.voices || []);
    } catch (err) {
      console.error("Failed to fetch voices:", err);
      setVoices([]);
    } finally {
      setVoicesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVoices();
  }, [fetchVoices]);

  useEffect(() => {
    if (agent) {
      setFormData({
        name: agent.name || "",
        voice_id: agent.voice_id || "",
        language: agent.language || "en-US",
        greeting_message: agent.greeting_message || "",
        service_type: agent.service_type || "Home Services",
        system_prompt: agent.system_prompt || "",
      });
    } else {
      setFormData(defaultFormData);
    }
    setError("");
    setFieldErrors({});
  }, [agent]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
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

  const checkForDuplicate = (data) => {
    return existingAgents.find((existingAgent) => {
      if (agent && existingAgent.id === agent.id) return false;
      return (
        existingAgent.name.trim().toLowerCase() === data.name.trim().toLowerCase()
      );
    });
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    if (name === "greeting_message") {
      const greetingError = validateGreetingMessage(value);
      setFieldErrors((prev) => ({ ...prev, [name]: greetingError }));
    }
  };

  const getVoiceById = (voiceId) => voices.find((v) => v.voice_id === voiceId);

  const handleSubmit = async (e, overrides = {}) => {
    if (e?.preventDefault) e.preventDefault();
    setLoading(true);
    setError("");
    setFieldErrors({});

    const payload = { ...formData, ...overrides };
    const trimmedSystemPrompt = payload.system_prompt?.trim() || "";
    if (trimmedSystemPrompt) {
      payload.system_prompt = trimmedSystemPrompt;
    } else {
      delete payload.system_prompt;
    }

    const greetingError = validateGreetingMessage(payload.greeting_message);
    if (greetingError) {
      setFieldErrors({ greeting_message: greetingError });
      setLoading(false);
      return false;
    }

    // Ensure the selected voice is a current (Gemini Live) voice, not a legacy one.
    const voiceExists = voices.some((voice) => voice.voice_id === payload.voice_id);
    if (!voicesLoading && payload.voice_id && !voiceExists) {
      setFieldErrors({ voice_id: "Please choose a current Gemini Live voice." });
      setLoading(false);
      return false;
    }

    if (!agent) {
      const duplicate = checkForDuplicate(payload);
      if (duplicate) {
        setError(
          "An agent with this name already exists. Please choose a different name.",
        );
        setLoading(false);
        return false;
      }
    }

    try {
      if (agent) {
        const response = await agentAPI.updateAgent(agent.id, payload);
        onSuccess?.(response.data || { ...agent, ...payload });
      } else {
        const response = await agentAPI.createAgent(tenantId, payload);
        onSuccess?.(response.data);
      }
      return true;
    } catch (err) {
      const errorDetail = err.response?.data?.detail;
      if (Array.isArray(errorDetail)) {
        setError(
          errorDetail.map((item) => `${item.loc?.join(".")} - ${item.msg}`).join(", "),
        );
      } else if (typeof errorDetail === "string") {
        setError(errorDetail);
      } else {
        setError("Failed to save agent");
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    formData,
    voices,
    loading,
    voicesLoading,
    error,
    fieldErrors,
    handleChange,
    handleBlur,
    handleSubmit,
    getVoiceById,
    isEditing: Boolean(agent),
  };
};
