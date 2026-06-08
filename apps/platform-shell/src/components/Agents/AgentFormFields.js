import React from "react";
import { Loader } from "lucide-react";

import { AGENT_LANGUAGES, AGENT_SERVICE_TYPES } from "./useAgentForm";

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#68fadd]/50 focus:outline-none focus:ring-2 focus:ring-[#68fadd]/20";

const AgentFormFields = ({
  formData,
  voices,
  voicesLoading,
  fieldErrors,
  handleChange,
  handleBlur,
  getVoiceById,
  compact = false,
  hideAgentName = false,
}) => (
  <div className={compact ? "space-y-4" : "space-y-6"}>
    {!hideAgentName ? (
      <div>
        {/* <label className="mb-1.5 block text-sm font-medium text-slate-800">Agent Name *</label> */}
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Agent Name *"
          required
          className={fieldClass}
        />
        {/* <p className="mt-1 text-xs text-slate-500">Give your agent a friendly name</p> */}
      </div>
    ) : null}

    {compact ? (
      <div className="grid gap-4 grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-800">Language *</label>
          <select
            name="language"
            value={formData.language}
            onChange={handleChange}
            required
            className={fieldClass}
          >
            {AGENT_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-800">Voice *</label>
          {voicesLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader className="h-4 w-4 animate-spin" />
              Loading voices...
            </div>
          ) : (
            <select
              name="voice_id"
              value={formData.voice_id}
              onChange={handleChange}
              required
              className={fieldClass}
            >
              <option value="">Select a voice</option>
              {voices.map((voice) => (
                <option key={voice.voice_id} value={voice.voice_id}>
                  {voice.name} - {voice.description} ({voice.category})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    ) : (
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-800">Voice *</label>
        {voicesLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader className="h-4 w-4 animate-spin" />
            Loading voices...
          </div>
        ) : (
          <select
            name="voice_id"
            value={formData.voice_id}
            onChange={handleChange}
            required
            className={fieldClass}
          >
            <option value="">Select a voice</option>
            {voices.map((voice) => (
              <option key={voice.voice_id} value={voice.voice_id}>
                {voice.name} - {voice.description} ({voice.category})
              </option>
            ))}
          </select>
        )}
      </div>
    )}

    {/* {formData.voice_id && getVoiceById(formData.voice_id) ? (
      <p className="text-xs text-[#006b5c]">
        {getVoiceById(formData.voice_id).name} · Best for:{" "}
        {getVoiceById(formData.voice_id).use_case?.replace(/_/g, " ")}
      </p>
    ) : null} */}

    {!compact ? (
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-800">Language *</label>
          <select
            name="language"
            value={formData.language}
            onChange={handleChange}
            required
            className={fieldClass}
          >
            {AGENT_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-800">Service Type *</label>
          <select
            name="service_type"
            value={formData.service_type}
            onChange={handleChange}
            required
            className={fieldClass}
          >
            {AGENT_SERVICE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>
    ) : (
      <>
        {/* <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-800">Service Type *</label>
          <select
            name="service_type"
            value={formData.service_type}
            onChange={handleChange}
            required
            className={fieldClass}
          >
            {AGENT_SERVICE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div> */}
      </>
    )}

    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-800">Greeting Message *</label>
      <textarea
        name="greeting_message"
        value={formData.greeting_message}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="Hello! Thank you for calling. How can I help you today?"
        required
        rows={compact ? 2 : 4}
        className={`${fieldClass} resize-none ${
          fieldErrors.greeting_message ? "border-rose-300 ring-rose-100" : ""
        }`}
      />
      {fieldErrors.greeting_message ? (
        <p className="mt-1 text-xs text-rose-600">{fieldErrors.greeting_message}</p>
      ) : (
        <p className="mt-1 text-xs text-slate-500">
          This message will be spoken when a call is received (minimum 10 characters)
        </p>
      )}
    </div>
  </div>
);

export default AgentFormFields;
