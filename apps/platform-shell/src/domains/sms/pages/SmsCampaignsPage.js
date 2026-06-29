import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { smsAPI } from '@mindrind/api-client';
import { PageHeader, SectionPanel, InlineAlert } from '@mindrind/shared-ui';

import { useSmsTenant } from '../useSmsTenant';

const SmsCampaignsPage = () => {
  const { tenantId } = useSmsTenant();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    from_phone_number: '',
    body: '',
    throttle_per_min: 60,
    to_numbers: '',
    include_leads: true,
  });
  const [feedback, setFeedback] = useState(null);

  const leadsQuery = useQuery({
    queryKey: ['sms', 'leads', tenantId],
    queryFn: async () => (await smsAPI.listLeads(tenantId, 1000, 0)).data,
    enabled: Boolean(tenantId),
  });

  const numbersQuery = useQuery({
    queryKey: ['sms', 'numbers', tenantId],
    queryFn: async () => (await smsAPI.listSmsNumbers(tenantId)).data,
    enabled: Boolean(tenantId),
  });

  const createCampaign = useMutation({
    mutationFn: async () => {
      const toNumbers = form.to_numbers
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const leadIds = form.include_leads ? (leadsQuery.data || []).map((l) => l.id) : [];
      const payload = {
        name: form.name,
        // from_phone_number is optional; backend validates it against SMS-capable
        // numbers and defaults to the first one when omitted.
        from_phone_number: form.from_phone_number || undefined,
        steps: [{ body: form.body, delay_minutes: 0 }],
        throttle_per_min: Number(form.throttle_per_min) || 60,
        timezone: 'UTC',
        respect_quiet_hours: true,
        lead_ids: leadIds,
        to_numbers: toNumbers,
      };
      const created = (await smsAPI.createCampaign(tenantId, payload)).data;
      const result = (await smsAPI.startCampaign(tenantId, created.id)).data;
      return { created, result };
    },
    onSuccess: ({ result }) => {
      setFeedback({
        variant: 'success',
        text: `Campaign started — enrolled ${result.enrolled}, scheduled ${result.scheduled}, suppressed ${result.suppressed}.`,
      });
      setForm({ name: '', from_phone_number: '', body: '', throttle_per_min: 60, to_numbers: '', include_leads: true });
      queryClient.invalidateQueries({ queryKey: ['sms'] });
    },
    onError: (err) => setFeedback({ variant: 'error', text: err?.response?.data?.detail || 'Failed to start campaign' }),
  });

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const numbers = numbersQuery.data || [];
  const leadCount = (leadsQuery.data || []).length;
  const canSubmit = form.name && form.body && (form.to_numbers.trim() || (form.include_leads && leadCount > 0));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="SMS Outreach"
        title="Campaigns"
        description="Create a drip campaign with a personalized template. The from-number comes from your Twilio account; recipients can be pasted directly and/or pulled from your leads."
      />
      {numbers.length === 0 ? (
        <InlineAlert variant="info">
          No SMS-capable numbers found. Attach Twilio credentials in Settings first.
        </InlineAlert>
      ) : null}
      <SectionPanel className="p-6">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) createCampaign.mutate();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700">Campaign name</span>
              <input className="rounded-xl border border-slate-200 px-4 py-2.5" value={form.name} onChange={update('name')} placeholder="June cold outreach" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700">From number (from Twilio)</span>
              <select className="rounded-xl border border-slate-200 px-4 py-2.5" value={form.from_phone_number} onChange={update('from_phone_number')}>
                <option value="">First SMS-capable number (default)</option>
                {numbers.map((n) => (
                  <option key={n.phone_number} value={n.phone_number}>
                    {n.phone_number}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Message template</span>
            <textarea
              className="min-h-[120px] rounded-xl border border-slate-200 px-4 py-2.5"
              value={form.body}
              onChange={update('body')}
              placeholder="Hi {{name}}, quick question about your business — got 2 minutes?"
            />
            <span className="text-xs text-slate-500">
              Tokens: <code>{'{{name}}'}</code>, <code>{'{{phone_number}}'}</code>, plus any custom merge fields.
            </span>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">To numbers (one per line)</span>
            <textarea
              className="min-h-[90px] rounded-xl border border-slate-200 px-4 py-2.5"
              value={form.to_numbers}
              onChange={update('to_numbers')}
              placeholder={'+14155550123\n+14155550124'}
            />
            <span className="text-xs text-slate-500">These are added as leads (deduped) and enrolled.</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.include_leads} onChange={(e) => setForm((f) => ({ ...f, include_leads: e.target.checked }))} />
            Also include my existing leads ({leadCount})
          </label>
          <label className="flex max-w-[220px] flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Throttle (msgs/min)</span>
            <input type="number" min="1" max="600" className="rounded-xl border border-slate-200 px-4 py-2.5" value={form.throttle_per_min} onChange={update('throttle_per_min')} />
          </label>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={createCampaign.isPending || !canSubmit}
              className="rounded-full bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {createCampaign.isPending ? 'Starting…' : 'Create & start'}
            </button>
            <span className="text-xs text-slate-500">Opted-out / suppressed numbers are skipped automatically.</span>
          </div>
        </form>
        {feedback ? <InlineAlert variant={feedback.variant} className="mt-4">{feedback.text}</InlineAlert> : null}
      </SectionPanel>
    </div>
  );
};

export default SmsCampaignsPage;
