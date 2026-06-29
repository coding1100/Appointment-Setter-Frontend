import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { smsAPI } from '@mindrind/api-client';
import { PageHeader, SectionPanel, InlineAlert, EmptyState } from '@mindrind/shared-ui';
import { Users } from 'lucide-react';

import { useSmsTenant } from '../useSmsTenant';

const STATUS_STYLES = {
  new: 'bg-slate-100 text-slate-700',
  active: 'bg-sky-100 text-sky-700',
  replied: 'bg-amber-100 text-amber-700',
  opted_out: 'bg-rose-100 text-rose-700',
  completed: 'bg-emerald-100 text-emerald-700',
};

const SmsLeadsPage = () => {
  const { tenantId } = useSmsTenant();
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const leadsQuery = useQuery({
    queryKey: ['sms', 'leads', tenantId],
    queryFn: async () => (await smsAPI.listLeads(tenantId, 200, 0)).data,
    enabled: Boolean(tenantId),
  });

  const addLead = useMutation({
    mutationFn: () => smsAPI.createLead(tenantId, { phone_number: phone, name: name || undefined }),
    onSuccess: () => {
      setPhone('');
      setName('');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['sms', 'leads', tenantId] });
    },
    onError: (err) => setError(err?.response?.data?.detail || 'Failed to add lead'),
  });

  const leads = leadsQuery.data || [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="SMS Outreach" title="Leads" description="Import the cold leads you want to reach. Duplicates (same phone) are merged automatically." />

      <SectionPanel className="p-6">
        <h2 className="text-lg font-semibold text-slate-900">Add a lead</h2>
        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (phone.trim()) addLead.mutate();
          }}
        >
          <input
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
            placeholder="+14155550123"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <input
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
            placeholder="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            type="submit"
            disabled={addLead.isPending || !phone.trim()}
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {addLead.isPending ? 'Adding…' : 'Add lead'}
          </button>
        </form>
        {error ? <InlineAlert variant="error" className="mt-3">{error}</InlineAlert> : null}
      </SectionPanel>

      <SectionPanel>
        {leads.length === 0 ? (
          <EmptyState icon={Users} title="No leads yet" description="Add your first lead above to start an SMS campaign." />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-6 py-3">Phone</th>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-slate-100">
                  <td className="px-6 py-3 font-medium text-slate-900">{lead.phone_number}</td>
                  <td className="px-6 py-3 text-slate-600">{lead.name || '—'}</td>
                  <td className="px-6 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[lead.status] || STATUS_STYLES.new}`}>
                      {lead.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionPanel>
    </div>
  );
};

export default SmsLeadsPage;
