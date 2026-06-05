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
  const form = useAgentForm({ tenantId, agent, existingAgents, onSuccess });

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
