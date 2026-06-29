import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { smsAPI } from '@mindrind/api-client';
import { PageHeader, SectionPanel, InlineAlert, EmptyState } from '@mindrind/shared-ui';
import { ShieldOff } from 'lucide-react';

import { useSmsTenant } from '../useSmsTenant';

const SmsSuppressionsPage = () => {
  const { tenantId } = useSmsTenant();
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const query = useQuery({
    queryKey: ['sms', 'suppressions', tenantId],
    queryFn: async () => (await smsAPI.listSuppressions(tenantId, 500, 0)).data,
    enabled: Boolean(tenantId),
  });

  const add = useMutation({
    mutationFn: () => smsAPI.addSuppression(tenantId, { phone_number: phone, reason: 'manual' }),
    onSuccess: () => {
      setPhone('');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['sms', 'suppressions', tenantId] });
    },
    onError: (err) => setError(err?.response?.data?.detail || 'Failed to add suppression'),
  });

  const rows = query.data || [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="SMS Outreach"
        title="Suppressions"
        description="Numbers here are never messaged. Inbound STOP / UNSUBSCRIBE replies are added automatically; add do-not-contact numbers manually below."
      />
      <SectionPanel className="p-6">
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (phone.trim()) add.mutate();
          }}
        >
          <input className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm" placeholder="+14155550123" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <button type="submit" disabled={add.isPending || !phone.trim()} className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {add.isPending ? 'Adding…' : 'Suppress number'}
          </button>
        </form>
        {error ? <InlineAlert variant="error" className="mt-3">{error}</InlineAlert> : null}
      </SectionPanel>
      <SectionPanel>
        {rows.length === 0 ? (
          <EmptyState icon={ShieldOff} title="No suppressions" description="Opted-out numbers will appear here automatically." />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-6 py-3">Phone</th>
                <th className="px-6 py-3">Reason</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="px-6 py-3 font-medium text-slate-900">{row.phone_number}</td>
                  <td className="px-6 py-3 text-slate-600">{row.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionPanel>
    </div>
  );
};

export default SmsSuppressionsPage;
