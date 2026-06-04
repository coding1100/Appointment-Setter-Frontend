import React from "react";
import { X } from "lucide-react";

import AgentFormFields from "./AgentFormFields";
import { useAgentForm } from "./useAgentForm";

const AgentForm = ({
  tenantId,
  agent,
  existingAgents = [],
  onClose,
  onSuccess,
}) => {
<<<<<<< Updated upstream
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
=======
  const form = useAgentForm({ tenantId, agent, existingAgents, onSuccess });
>>>>>>> Stashed changes

  const handleSubmit = async (e) => {
    const ok = await form.handleSubmit(e);
    if (ok) onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#04070fcc] px-4 py-8 backdrop-blur-sm">
      <div className="mx-4 my-8 w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_90px_rgba(2,6,18,0.18)]">
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-900">
              {form.isEditing ? "Edit Agent" : "Create New Agent"}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Set voice, language, greeting, and service behavior for this tenant.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 transition hover:text-slate-800"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {form.error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {form.error}
            </div>
          ) : null}

          <AgentFormFields {...form} />

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
              disabled={form.loading}
              className="flex-1 rounded-2xl bg-[#2f66ea] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#295ad0] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {form.loading ? "Saving..." : form.isEditing ? "Update Agent" : "Create Agent"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AgentForm;
