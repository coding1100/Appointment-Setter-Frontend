import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { smsAPI } from '@mindrind/api-client';
import { PageHeader, SectionPanel, InlineAlert } from '@mindrind/shared-ui';

import { useSmsTenant } from '../useSmsTenant';

const SmsTestPage = () => {
  const { tenantId } = useSmsTenant();
  const [to, setTo] = useState('');
  const [fromNumber, setFromNumber] = useState('');
  const [body, setBody] = useState('This is a test message from SMS Outreach.');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const numbers = useQuery({
    queryKey: ['sms', 'numbers', tenantId],
    queryFn: async () => (await smsAPI.listSmsNumbers(tenantId)).data,
    enabled: Boolean(tenantId),
  });

  const send = useMutation({
    mutationFn: () =>
      smsAPI.sendTest(tenantId, {
        to,
        body,
        from_phone_number: fromNumber || undefined,
      }),
    onSuccess: (res) => {
      setError('');
      setResult(res.data);
    },
    onError: (err) => {
      setResult(null);
      setError(err?.response?.data?.detail || 'Test send failed.');
    },
  });

  const smsNumbers = numbers.data || [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="SMS Outreach"
        title="Test"
        description="Send a single SMS to one number to verify your Twilio setup end-to-end."
      />
      <SectionPanel className="p-6">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (to.trim() && body.trim()) send.mutate();
          }}
        >
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">To number (E.164)</span>
            <input className="rounded-xl border border-slate-200 px-4 py-2.5" value={to} onChange={(e) => setTo(e.target.value)} placeholder="+14155550123" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">From number</span>
            <select className="rounded-xl border border-slate-200 px-4 py-2.5" value={fromNumber} onChange={(e) => setFromNumber(e.target.value)}>
              <option value="">First SMS-capable number (default)</option>
              {smsNumbers.map((n) => (
                <option key={n.phone_number} value={n.phone_number}>
                  {n.phone_number}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Message</span>
            <textarea className="min-h-[100px] rounded-xl border border-slate-200 px-4 py-2.5" value={body} onChange={(e) => setBody(e.target.value)} />
          </label>
          <button
            type="submit"
            disabled={send.isPending || !to.trim() || !body.trim()}
            className="w-fit rounded-full bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {send.isPending ? 'Sending…' : 'Send test'}
          </button>
        </form>

        {error ? <InlineAlert variant="error" className="mt-4">{error}</InlineAlert> : null}
        {result ? (
          <InlineAlert variant={result.error_code ? 'error' : 'success'} className="mt-4">
            Sent from {result.from} to {result.to} — status <strong>{result.status}</strong>
            {result.twilio_sid ? `, SID ${result.twilio_sid}` : ''}
            {result.error_code ? ` (error ${result.error_code})` : ''}.
          </InlineAlert>
        ) : null}
      </SectionPanel>
    </div>
  );
};

export default SmsTestPage;
