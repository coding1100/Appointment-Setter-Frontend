import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Bot,
  CircleEllipsis,
  Globe,
  MessageSquare,
  PauseCircle,
  Send,
  ShieldAlert,
  User,
  XCircle,
} from 'lucide-react';

import { chatbotAgentAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import Loader from '../Loader';

const formatError = (err, fallback) => {
  const detail = err?.response?.data?.detail;
  if (Array.isArray(detail)) {
    return detail.map((entry) => `${entry.loc?.join('.')} - ${entry.msg}`).join(', ');
  }
  return typeof detail === 'string' ? detail : fallback;
};

const formatRelativeTime = (value) => {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
};

const formatAbsoluteTime = (value) => {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString();
};

const hostFromOrigin = (value) => {
  try {
    return new URL(value).host;
  } catch (_error) {
    return value || 'Unknown site';
  }
};

const ChatbotLivePage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [composer, setComposer] = useState('');
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const [liveSession, setLiveSession] = useState(null);
  const [liveMessages, setLiveMessages] = useState([]);
  const endOfMessagesRef = useRef(null);

  const liveChatsQuery = useQuery({
    queryKey: ['chatbot-live-chats'],
    queryFn: async () => {
      const response = await chatbotAgentAPI.listLiveChats(100);
      return Array.isArray(response.data) ? response.data : [];
    },
    refetchInterval: 5000,
  });

  const detailQuery = useQuery({
    queryKey: ['chatbot-live-chat', sessionId],
    queryFn: async () => {
      const response = await chatbotAgentAPI.getLiveChat(sessionId);
      return response.data;
    },
    enabled: Boolean(sessionId),
  });

  useEffect(() => {
    if (!sessionId && liveChatsQuery.data?.length) {
      navigate(`/app/chatbot-agents/live/${liveChatsQuery.data[0].session.id}`, { replace: true });
    }
  }, [liveChatsQuery.data, navigate, sessionId]);

  useEffect(() => {
    if (detailQuery.data?.session) {
      setLiveSession(detailQuery.data.session);
      setLiveMessages(Array.isArray(detailQuery.data.messages) ? detailQuery.data.messages : []);
      setActionError('');
    }
  }, [detailQuery.data]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveMessages]);

  useEffect(() => {
    if (!sessionId) return undefined;

    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) return undefined;

    const socket = new WebSocket(chatbotAgentAPI.getLiveChatStreamUrl(sessionId, accessToken));

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data || '{}');
        if (payload.type === 'message.created' && payload.message) {
          setLiveMessages((prev) => {
            if (prev.some((message) => message.id === payload.message.id)) {
              return prev;
            }
            return [...prev, payload.message];
          });
        }

        if (payload.session) {
          setLiveSession(payload.session);
        }

        queryClient.invalidateQueries({ queryKey: ['chatbot-live-chats'] });
        queryClient.invalidateQueries({ queryKey: ['chatbot-live-chat', sessionId] });
      } catch (_error) {
        // Ignore malformed events and keep the socket alive.
      }
    };

    socket.onerror = () => {
      setActionError('Live chat stream disconnected. Trying to keep your view updated with refreshes.');
    };

    return () => {
      socket.close();
    };
  }, [queryClient, sessionId]);

  const selectedChat = useMemo(
    () => liveChatsQuery.data?.find((entry) => entry.session.id === sessionId)?.session || liveSession,
    [liveChatsQuery.data, liveSession, sessionId]
  );

  const liveMetrics = useMemo(() => {
    const sessions = liveChatsQuery.data || [];
    const humanControlled = sessions.filter((entry) => entry.session.control_mode === 'human').length;
    const botControlled = sessions.filter((entry) => entry.session.control_mode !== 'human').length;
    const uniqueSites = new Set(
      sessions
        .map((entry) => hostFromOrigin(entry.session.origin))
        .filter(Boolean)
    ).size;

    return {
      openChats: sessions.length,
      humanControlled,
      botControlled,
      uniqueSites,
    };
  }, [liveChatsQuery.data]);

  const isAssignedToCurrentUser = String(liveSession?.assigned_operator_id || '') === String(user?.id || '');
  const isAdmin = String(user?.role || '').toLowerCase() === 'admin';
  const canSendHumanMessage =
    liveSession?.status === 'open' &&
    liveSession?.control_mode === 'human' &&
    (isAssignedToCurrentUser || isAdmin);

  const runAction = (successMessage) => ({
    onSuccess: (response) => {
      const payload = response.data || {};
      if (payload.session) {
        setLiveSession(payload.session);
      }
      if (payload.message) {
        setLiveMessages((prev) => {
          if (prev.some((message) => message.id === payload.message.id)) {
            return prev;
          }
          return [...prev, payload.message];
        });
      }
      setNotice(successMessage);
      setActionError('');
      queryClient.invalidateQueries({ queryKey: ['chatbot-live-chats'] });
      queryClient.invalidateQueries({ queryKey: ['chatbot-live-chat', sessionId] });
    },
    onError: (error) => {
      setActionError(formatError(error, 'Action failed'));
    },
  });

  const takeoverMutation = useMutation({
    mutationFn: () => chatbotAgentAPI.takeOverLiveChat(sessionId),
    ...runAction('Chat claimed successfully.'),
  });

  const releaseMutation = useMutation({
    mutationFn: () => chatbotAgentAPI.releaseLiveChat(sessionId),
    ...runAction('Chat released back to the bot.'),
  });

  const closeMutation = useMutation({
    mutationFn: () => chatbotAgentAPI.closeLiveChat(sessionId),
    ...runAction('Chat closed.'),
  });

  const sendMutation = useMutation({
    mutationFn: (payload) => chatbotAgentAPI.sendLiveChatMessage(sessionId, payload),
    onSuccess: (response) => {
      const payload = response.data || {};
      if (payload.message) {
        setLiveMessages((prev) => {
          if (prev.some((message) => message.id === payload.message.id)) {
            return prev;
          }
          return [...prev, payload.message];
        });
      }
      if (payload.session) {
        setLiveSession(payload.session);
      }
      setComposer('');
      setActionError('');
      queryClient.invalidateQueries({ queryKey: ['chatbot-live-chats'] });
    },
    onError: (error) => {
      setActionError(formatError(error, 'Failed to send message'));
    },
  });

  const handleSend = async () => {
    const content = composer.trim();
    if (!content || !canSendHumanMessage || sendMutation.isPending) {
      return;
    }
    sendMutation.mutate({ content });
  };

  if (liveChatsQuery.isLoading && !liveChatsQuery.data) {
    return <Loader message="Loading live chats..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[0.78rem] uppercase tracking-[0.28em] text-white/46">Live Monitoring</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-white">Live Chats</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-white/64">
            Watch active website chats, see which page the visitor is on, and take over the conversation when the bot
            needs a human hand.
          </p>
        </div>

        <Link
          to="/app/chatbot-agents"
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-medium text-white no-underline transition hover:bg-white/10"
        >
          <Bot className="h-4 w-4" />
          Back to Chatbots
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[22px] border border-white/8 bg-white/[0.05] px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/42">Open Chats</p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">{liveMetrics.openChats}</p>
          <p className="mt-1 text-sm text-white/56">Sessions currently visible in the operator queue.</p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-white/[0.05] px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/42">Human Controlled</p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">{liveMetrics.humanControlled}</p>
          <p className="mt-1 text-sm text-white/56">Chats already claimed away from the bot.</p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-white/[0.05] px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/42">Bot Controlled</p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">{liveMetrics.botControlled}</p>
          <p className="mt-1 text-sm text-white/56">Sessions still running on the chatbot runtime.</p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-white/[0.05] px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/42">Active Sites</p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">{liveMetrics.uniqueSites}</p>
          <p className="mt-1 text-sm text-white/56">Unique website origins with current conversation traffic.</p>
        </div>
      </div>

      {notice && (
        <div className="rounded-2xl border border-emerald-300/18 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          {notice}
        </div>
      )}

      {(actionError || liveChatsQuery.error || detailQuery.error) && (
        <div className="rounded-2xl border border-rose-300/18 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {actionError ||
            formatError(liveChatsQuery.error, 'Failed to load live chats') ||
            formatError(detailQuery.error, 'Failed to load selected chat')}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-[28px] border border-white/8 bg-white/[0.04]">
          <div className="border-b border-white/8 px-5 py-4">
            <p className="text-xs uppercase tracking-[0.22em] text-white/44">Open Sessions</p>
            <p className="mt-2 text-sm text-white/62">
              {liveChatsQuery.data?.length || 0} active {liveChatsQuery.data?.length === 1 ? 'chat' : 'chats'}
            </p>
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            {!liveChatsQuery.data?.length ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
                <CircleEllipsis className="h-14 w-14 text-white/28" />
                <h3 className="mt-5 text-xl font-semibold text-white">No live chats right now</h3>
                <p className="mt-3 text-sm leading-7 text-white/62">
                  Once website visitors start chatting with your embedded bot, the live session inbox will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/8">
                {liveChatsQuery.data.map((entry) => {
                  const session = entry.session;
                  const active = session.id === sessionId;
                  return (
                    <button
                      key={session.id}
                      onClick={() => navigate(`/app/chatbot-agents/live/${session.id}`)}
                      className={`w-full px-5 py-4 text-left transition ${
                        active ? 'bg-white/[0.08]' : 'hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{session.visitor_label}</p>
                          <p className="mt-1 truncate text-xs uppercase tracking-[0.16em] text-white/44">
                            {hostFromOrigin(session.origin)}
                          </p>
                          {session.page_title && (
                            <p className="mt-2 truncate text-sm text-white/58">{session.page_title}</p>
                          )}
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                            session.control_mode === 'human'
                              ? 'bg-amber-300/14 text-amber-100'
                              : 'bg-sky-300/14 text-sky-100'
                          }`}
                        >
                          {session.control_mode}
                        </span>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/68">
                        {session.last_message_preview || 'No messages yet'}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/44">
                        <span>{formatRelativeTime(session.last_activity_at)}</span>
                        {session.assigned_operator_name && <span>{session.assigned_operator_name}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-white/8 bg-white/[0.04]">
          {!selectedChat ? (
            <div className="flex min-h-[520px] flex-col items-center justify-center px-8 text-center">
                <MessageSquare className="h-16 w-16 text-white/28" />
              <h3 className="mt-6 text-2xl font-semibold text-white">Select a live chat</h3>
              <p className="mt-3 max-w-xl text-sm leading-7 text-white/62">
                Choose a session from the left to inspect the transcript, claim the conversation, or hand the chat back
                to the bot.
              </p>
            </div>
          ) : detailQuery.isLoading && !liveSession ? (
            <Loader message="Loading live chat..." />
          ) : (
            <>
              <div className="border-b border-white/8 px-5 py-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-2xl font-semibold tracking-[-0.02em] text-white">{selectedChat.visitor_label}</h3>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                          liveSession?.control_mode === 'human'
                            ? 'bg-amber-300/14 text-amber-100'
                            : 'bg-sky-300/14 text-sky-100'
                        }`}
                      >
                        {liveSession?.control_mode || 'bot'}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/62">
                      <span className="inline-flex items-center gap-2">
                        <Globe className="h-4 w-4 text-white/42" />
                        {hostFromOrigin(selectedChat.origin)}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <User className="h-4 w-4 text-white/42" />
                        {liveSession?.assigned_operator_name || 'Bot handling'}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <CircleEllipsis className="h-4 w-4 text-white/42" />
                        {formatRelativeTime(selectedChat.last_activity_at)}
                      </span>
                    </div>

                    {selectedChat.page_title && (
                      <p className="mt-3 text-base font-medium text-white/84">{selectedChat.page_title}</p>
                    )}
                    <p className="mt-2 text-sm leading-6 text-white/52">{selectedChat.page_url}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => takeoverMutation.mutate()}
                      disabled={takeoverMutation.isPending || liveSession?.status !== 'open' || (liveSession?.control_mode === 'human' && !isAssignedToCurrentUser && !isAdmin)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-amber-300/18 bg-amber-300/12 px-4 py-2.5 text-sm font-medium text-amber-100 transition hover:bg-amber-300/18 disabled:opacity-50"
                    >
                      <ShieldAlert className="h-4 w-4" />
                      {takeoverMutation.isPending ? 'Claiming...' : 'Take Over'}
                    </button>
                    <button
                      onClick={() => releaseMutation.mutate()}
                      disabled={releaseMutation.isPending || liveSession?.control_mode !== 'human' || liveSession?.status !== 'open'}
                      className="inline-flex items-center gap-2 rounded-2xl border border-sky-300/18 bg-sky-300/12 px-4 py-2.5 text-sm font-medium text-sky-100 transition hover:bg-sky-300/18 disabled:opacity-50"
                    >
                      <PauseCircle className="h-4 w-4" />
                      {releaseMutation.isPending ? 'Releasing...' : 'Release to Bot'}
                    </button>
                    <button
                      onClick={() => closeMutation.mutate()}
                      disabled={closeMutation.isPending || liveSession?.status !== 'open'}
                      className="inline-flex items-center gap-2 rounded-2xl border border-rose-300/18 bg-rose-400/10 px-4 py-2.5 text-sm font-medium text-rose-100 transition hover:bg-rose-400/16 disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      {closeMutation.isPending ? 'Closing...' : 'Close Chat'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="min-w-0 border-b border-white/8 lg:border-b-0 lg:border-r lg:border-white/8">
                  <div className="flex h-[54vh] flex-col">
                    <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
                      {liveMessages.map((message) => {
                        const isVisitor = message.sender_type === 'visitor';
                        const isSystem = message.sender_type === 'system';
                        const alignmentClass = isVisitor ? 'ml-auto bg-[#2f66ea] text-white' : 'mr-auto bg-white/8 text-white';

                        return (
                          <div
                            key={message.id}
                            className={`max-w-[86%] rounded-[20px] px-4 py-3 text-sm leading-6 ${
                              isSystem ? 'mx-auto bg-white/8 text-center text-white/74' : alignmentClass
                            }`}
                          >
                            {!isSystem && (
                              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/46">
                                {message.sender_type}
                              </div>
                            )}
                            <div>{message.content}</div>
                            <div className="mt-2 text-[11px] text-white/38">
                              {new Date(message.created_at).toLocaleTimeString()}
                            </div>
                          </div>
                        );
                      })}
                      <div ref={endOfMessagesRef} />
                    </div>

                    <div className="border-t border-white/8 px-5 py-4">
                      <div className="flex gap-3">
                        <textarea
                          value={composer}
                          onChange={(event) => setComposer(event.target.value)}
                          rows={2}
                          placeholder={
                            canSendHumanMessage
                              ? 'Reply as the human operator...'
                              : 'Take over this chat to send human messages.'
                          }
                          disabled={!canSendHumanMessage || sendMutation.isPending}
                          className="min-h-[52px] flex-1 rounded-[18px] border border-white/10 bg-white/6 px-4 py-3 text-sm text-black outline-none placeholder:text-white/34"
                        />
                        <button
                          onClick={handleSend}
                          disabled={!canSendHumanMessage || sendMutation.isPending || !composer.trim()}
                          className="inline-flex items-center gap-2 self-end rounded-2xl bg-[#2f66ea] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#295ad0] disabled:opacity-50"
                        >
                          <Send className="h-4 w-4" />
                          {sendMutation.isPending ? 'Sending...' : 'Send'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <aside className="space-y-4 px-5 py-5">
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.05] p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-white/42">Session Status</p>
                    <p className="mt-3 text-lg font-semibold text-white">{liveSession?.status || 'open'}</p>
                    <p className="mt-2 text-sm text-white/62">
                      {liveSession?.control_mode === 'human'
                        ? 'The bot is paused and a human operator owns the thread.'
                        : 'The bot is currently handling replies for this visitor.'}
                    </p>
                  </div>

                  <div className="rounded-[22px] border border-white/8 bg-white/[0.05] p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-white/42">Session Details</p>
                    <div className="mt-3 space-y-3 text-sm text-white/68">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.16em] text-white/42">Origin</div>
                        <div className="mt-1 break-all">{selectedChat.origin}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.16em] text-white/42">Page</div>
                        <div className="mt-1 break-all">{selectedChat.page_url}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.16em] text-white/42">Last Activity</div>
                        <div className="mt-1">{formatAbsoluteTime(selectedChat.last_activity_at)}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.16em] text-white/42">Started</div>
                        <div className="mt-1">{formatAbsoluteTime(selectedChat.started_at)}</div>
                      </div>
                      {selectedChat.page_title && (
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.16em] text-white/42">Page Title</div>
                          <div className="mt-1">{selectedChat.page_title}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </aside>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default ChatbotLivePage;
