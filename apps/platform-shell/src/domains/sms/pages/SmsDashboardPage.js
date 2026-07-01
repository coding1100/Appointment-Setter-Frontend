import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { smsAPI } from '@mindrind/api-client';
import { PageHeader, SectionPanel, InlineAlert } from '@mindrind/shared-ui';
import { Inbox, Send, ShieldOff, Users } from 'lucide-react';

import { useSmsTenant } from '../useSmsTenant';

const StatCard = ({ icon: Icon, label, value, to }) => (
  <Link
    to={to}
    className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 no-underline shadow-sm transition hover:border-slate-300"
  >
    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#68fadd]/15 text-[#0f766e]">
      <Icon className="h-6 w-6" />
    </span>
    <span>
      <span className="block text-2xl font-semibold text-slate-900">{value}</span>
      <span className="block text-sm text-slate-500">{label}</span>
    </span>
  </Link>
);

const SmsDashboardPage = () => {
  const { tenantId } = useSmsTenant();

  const leads = useQuery({
    queryKey: ['sms', 'leads', tenantId],
    queryFn: async () => (await smsAPI.listLeads(tenantId, 200, 0)).data,
    enabled: Boolean(tenantId),
  });
  const conversations = useQuery({
    queryKey: ['sms', 'conversations', tenantId],
    queryFn: async () => (await smsAPI.listConversations(tenantId, 100, 0)).data,
    enabled: Boolean(tenantId),
  });
  const suppressions = useQuery({
    queryKey: ['sms', 'suppressions', tenantId],
    queryFn: async () => (await smsAPI.listSuppressions(tenantId, 500, 0)).data,
    enabled: Boolean(tenantId),
  });

  const unread = (conversations.data || []).filter((c) => (c.unread_count || 0) > 0).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="SMS Outreach"
        title="Overview"
        description="Run personalized cold-SMS campaigns. When a lead replies, the sequence pauses and the conversation lands in your inbox to take over."
      />
      {!tenantId ? (
        <InlineAlert variant="error">No active tenant. Select an organization to use SMS Outreach.</InlineAlert>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Users} label="Leads" value={(leads.data || []).length} to="/app/sms/leads" />
          <StatCard icon={Inbox} label="Unread replies" value={unread} to="/app/sms/inbox" />
          <StatCard icon={Send} label="Campaigns" value="Manage" to="/app/sms/campaigns" />
          <StatCard icon={ShieldOff} label="Suppressed" value={(suppressions.data || []).length} to="/app/sms/suppressions" />
        </div>
      )}
      <SectionPanel className="p-6">
        <h2 className="text-lg font-semibold text-slate-900">Getting started</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-7 text-slate-600">
          <li>Attach your Twilio credentials in <Link to="/app/sms/settings" className="text-[#0f766e]">Settings</Link> (separate from Appointment Setter).</li>
          <li>Send a <Link to="/app/sms/test" className="text-[#0f766e]">Test</Link> message to one number to verify the setup.</li>
          <li>Create a drip <Link to="/app/sms/campaigns" className="text-[#0f766e]">Campaign</Link>: pick a Twilio from-number, paste recipients (or use <Link to="/app/sms/leads" className="text-[#0f766e]">Leads</Link>), then start it.</li>
          <li>Watch the <Link to="/app/sms/inbox" className="text-[#0f766e]">Inbox</Link> — replies pause the sequence so you can take over.</li>
        </ol>
      </SectionPanel>
    </div>
  );
};

export default SmsDashboardPage;
