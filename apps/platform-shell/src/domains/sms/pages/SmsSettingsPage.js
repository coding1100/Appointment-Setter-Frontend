import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { smsAPI } from '@mindrind/api-client';
import { PageHeader, SectionPanel, InlineAlert, EmptyState } from '@mindrind/shared-ui';
import { MessageSquare } from 'lucide-react';

import { useSmsTenant } from '../useSmsTenant';
import { SMS_INPUT, SMS_BTN_PRIMARY, SMS_BTN_SECONDARY } from '../theme';

const SmsSettingsPage = () => {
  const { tenantId } = useSmsTenant();
  const queryClient = useQueryClient();
  const [accountSid, setAccountSid] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [feedback, setFeedback] = useState(null);

  const integration = useQuery({
    queryKey: ['sms', 'integration', tenantId],
    queryFn: async () => {
      try {
        return (await smsAPI.getIntegration(tenantId)).data;
      } catch (err) {
        if (err?.response?.status === 404) return null;
        throw err;
      }
    },
    enabled: Boolean(tenantId),
  });

  const numbers = useQuery({
    queryKey: ['sms', 'numbers', tenantId],
    queryFn: async () => (await smsAPI.listSmsNumbers(tenantId)).data,
    enabled: Boolean(tenantId && integration.data),
  });

  const test = useMutation({
    mutationFn: () => smsAPI.testCredentials(tenantId, { account_sid: accountSid, auth_token: authToken }),
    onSuccess: (res) => setFeedback({ variant: 'success', text: res.data?.message || 'Credentials are valid.' }),
    onError: (err) => setFeedback({ variant: 'error', text: err?.response?.data?.detail || 'Credential test failed.' }),
  });

  const attach = useMutation({
    mutationFn: () => smsAPI.attachIntegration(tenantId, { account_sid: accountSid, auth_token: authToken }),
    onSuccess: () => {
      setFeedback({ variant: 'success', text: 'Twilio credentials saved for SMS.' });
      setAuthToken('');
      queryClient.invalidateQueries({ queryKey: ['sms', 'integration', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['sms', 'numbers', tenantId] });
    },
    onError: (err) => setFeedback({ variant: 'error', text: err?.response?.data?.detail || 'Failed to save credentials.' }),
  });

  const remove = useMutation({
    mutationFn: () => smsAPI.deleteIntegration(tenantId),
    onSuccess: () => {
      setFeedback({ variant: 'info', text: 'Twilio credentials removed.' });
      queryClient.invalidateQueries({ queryKey: ['sms', 'integration', tenantId] });
    },
  });

  const connected = integration.data;
  const smsNumbers = numbers.data || [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="SMS Outreach"
        title="Settings"
        description="Attach the Twilio credentials this app uses to send SMS. These are stored separately from the Appointment Setter integration."
      />

      <SectionPanel className="p-6">
        <h2 className="text-lg font-semibold text-slate-900">Twilio credentials</h2>
        {connected ? (
          <div className="mt-3">
            <InlineAlert variant="success">
              Connected — Account SID <strong>{connected.account_sid}</strong>
              {connected.is_test_account ? ' (test account)' : ''}.
            </InlineAlert>
            <button
              type="button"
              onClick={() => remove.mutate()}
              className="mt-4 rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No credentials attached yet.</p>
        )}

        <form
          className="mt-5 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (accountSid && authToken) attach.mutate();
          }}
        >
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Account SID</span>
            <input className={SMS_INPUT} value={accountSid} onChange={(e) => setAccountSid(e.target.value)} placeholder="ACxxxxxxxx..." />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Auth Token</span>
            <input type="password" className={SMS_INPUT} value={authToken} onChange={(e) => setAuthToken(e.target.value)} placeholder="••••••••" />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => accountSid && authToken && test.mutate()}
              disabled={test.isPending || !accountSid || !authToken}
              className={SMS_BTN_SECONDARY}
            >
              {test.isPending ? 'Testing…' : 'Test'}
            </button>
            <button
              type="submit"
              disabled={attach.isPending || !accountSid || !authToken}
              className={SMS_BTN_PRIMARY}
            >
              {attach.isPending ? 'Saving…' : connected ? 'Replace credentials' : 'Save credentials'}
            </button>
          </div>
        </form>
        {feedback ? <InlineAlert variant={feedback.variant} className="mt-4">{feedback.text}</InlineAlert> : null}
      </SectionPanel>

      <SectionPanel className="p-6">
        <h2 className="text-lg font-semibold text-slate-900">SMS-capable numbers</h2>
        <p className="mt-1 text-sm text-slate-500">Fetched live from Twilio. These are the numbers campaigns and tests can send from.</p>
        {!connected ? (
          <p className="mt-3 text-sm text-slate-500">Attach credentials to see your numbers.</p>
        ) : smsNumbers.length === 0 ? (
          <EmptyState icon={MessageSquare} title="No SMS-capable numbers" description="None of the numbers on this Twilio account have SMS enabled." />
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {smsNumbers.map((n) => (
              <li key={n.phone_number} className="flex items-center justify-between py-2.5 text-sm">
                <span className="font-medium text-slate-900">{n.phone_number}</span>
                <span className="text-slate-500">{n.friendly_name || ''}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionPanel>
    </div>
  );
};

export default SmsSettingsPage;
