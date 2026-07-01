import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { smsAPI } from '@mindrind/api-client';
import { getAccessToken } from '@mindrind/auth/session';
import { PageHeader, SectionPanel, EmptyState, InlineAlert } from '@mindrind/shared-ui';
import { Inbox } from 'lucide-react';

import { useSmsTenant } from '../useSmsTenant';

const ConversationRow = ({ convo, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full flex-col items-start gap-1 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 ${
      active ? 'bg-slate-50' : ''
    }`}
  >
    <span className="flex w-full items-center justify-between">
      <span className="font-medium text-slate-900">{convo.lead_phone_number}</span>
      {convo.unread_count > 0 ? (
        <span className="rounded-full bg-[#0f766e] px-2 py-0.5 text-xs font-semibold text-white">{convo.unread_count}</span>
      ) : null}
    </span>
    <span className="text-xs text-slate-500">
      {convo.control_mode === 'human' ? 'You have control' : 'Automated'} · {convo.tenant_phone_number}
    </span>
  </button>
);

const SmsInboxPage = () => {
  const { tenantId } = useSmsTenant();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState(null);
  const [draft, setDraft] = useState('');
  const wsRef = useRef(null);

  const conversationsQuery = useQuery({
    queryKey: ['sms', 'conversations', tenantId],
    queryFn: async () => (await smsAPI.listConversations(tenantId, 100, 0)).data,
    enabled: Boolean(tenantId),
    refetchInterval: 15000,
  });

  const detailQuery = useQuery({
    queryKey: ['sms', 'conversation', tenantId, activeId],
    queryFn: async () => (await smsAPI.getConversation(tenantId, activeId)).data,
    enabled: Boolean(tenantId && activeId),
  });

  const reply = useMutation({
    mutationFn: () => smsAPI.replyToConversation(tenantId, activeId, draft),
    onSuccess: () => {
      setDraft('');
      queryClient.invalidateQueries({ queryKey: ['sms', 'conversation', tenantId, activeId] });
      queryClient.invalidateQueries({ queryKey: ['sms', 'conversations', tenantId] });
    },
  });

  // Live updates: subscribe to the tenant inbox WebSocket; refetch on reply events.
  useEffect(() => {
    if (!tenantId) return undefined;
    const url = smsAPI.getInboxStreamUrl(tenantId, getAccessToken());
    let socket;
    try {
      socket = new WebSocket(url);
      wsRef.current = socket;
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'sms.reply') {
            queryClient.invalidateQueries({ queryKey: ['sms', 'conversations', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['sms', 'conversation', tenantId] });
          }
        } catch {
          /* ignore malformed frames */
        }
      };
    } catch {
      /* WS unavailable — polling fallback still runs */
    }
    return () => {
      try {
        socket?.close();
      } catch {
        /* noop */
      }
    };
  }, [tenantId, queryClient]);

  const conversations = conversationsQuery.data || [];
  const detail = detailQuery.data;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="SMS Outreach"
        title="Inbox"
        description="When a lead replies, their sequence pauses and the thread appears here for you to take over manually."
      />
      <SectionPanel>
        <div className="grid min-h-[480px] grid-cols-1 md:grid-cols-[320px_1fr]">
          <div className="border-r border-slate-200">
            {conversations.length === 0 ? (
              <EmptyState icon={Inbox} title="No conversations" description="Replies from your leads will show up here." />
            ) : (
              conversations.map((convo) => (
                <ConversationRow
                  key={convo.id}
                  convo={convo}
                  active={convo.id === activeId}
                  onClick={() => setActiveId(convo.id)}
                />
              ))
            )}
          </div>
          <div className="flex flex-col">
            {!activeId ? (
              <EmptyState icon={Inbox} title="Select a conversation" description="Pick a thread on the left to read and reply." />
            ) : (
              <>
                <div className="flex-1 space-y-3 overflow-y-auto p-6">
                  {(detail?.messages || []).map((msg) => (
                    <div
                      key={msg.id}
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                        msg.direction === 'inbound'
                          ? 'bg-slate-100 text-slate-800'
                          : 'ml-auto bg-[#0f766e] text-white'
                      }`}
                    >
                      {msg.body || '—'}
                    </div>
                  ))}
                  {detail && (detail.messages || []).length === 0 ? (
                    <p className="text-sm text-slate-500">No messages in this thread yet.</p>
                  ) : null}
                </div>
                <div className="border-t border-slate-200 p-4">
                  {detail?.control_mode !== 'human' ? (
                    <InlineAlert variant="info" className="mb-3">
                      Replying will take over this conversation (pauses any automation).
                    </InlineAlert>
                  ) : null}
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (draft.trim()) reply.mutate();
                    }}
                  >
                    <input
                      className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                      placeholder="Type your reply…"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={reply.isPending || !draft.trim()}
                      className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {reply.isPending ? 'Sending…' : 'Send'}
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </SectionPanel>
    </div>
  );
};

export default SmsInboxPage;
