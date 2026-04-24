import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Bell,
  Bot,
  CircleEllipsis,
  Globe,
  MessageSquare,
  Volume2,
  VolumeX,
  PauseCircle,
  Send,
  ShieldAlert,
  User,
  XCircle,
} from "lucide-react";

import { chatbotAgentAPI } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import {
  formatAbsoluteTime,
  formatRelativeTime,
} from "../../shared/utils/dates";
import { formatApiError } from "../../shared/utils/errors";
import { getAccessToken } from "../../shared/auth/session";
import { useLiveChatAudioAlerts } from "../../domains/chatbot-agents/hooks/useLiveChatAudioAlerts";
import Loader from "../Loader";

const hostFromOrigin = (value) => {
  try {
    return new URL(value).host;
  } catch (_error) {
    return value || "Unknown site";
  }
};

const normalizeSenderType = (value) =>
  String(value || "").trim().toLowerCase();

const messageDedupeKey = (message = {}) => {
  const id = String(message?.id || "").trim();
  if (id) return id;
  return [
    String(message?.session_id || "session"),
    String(message?.created_at || "time"),
    String(message?.content || "").slice(0, 48),
  ].join(":");
};

const SOUND_THEME_LABELS = {
  soft: "Soft (Calm)",
  neutral: "Neutral (Balanced)",
  crisp: "Crisp (Bright)",
};

const ChatbotLivePage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [composer, setComposer] = useState("");
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [liveSession, setLiveSession] = useState(null);
  const [liveMessages, setLiveMessages] = useState([]);
  const endOfMessagesRef = useRef(null);
  const knownSessionIdsRef = useRef(new Set());
  const knownSelectedMessageIdsRef = useRef(new Set());
  const detailBootstrappedRef = useRef(false);
  const backgroundSocketsRef = useRef(new Map());
  const selectedSocketRef = useRef(null);
  const selectedReconnectTimerRef = useRef(null);
  const activeBackgroundSessionIdsRef = useRef(new Set());

  const {
    notifyNewSession,
    notifyIncomingVisitorMessage,
    settings: alertSettings,
    setMuted,
    setVolume,
    setSoundTheme,
    playTestSound,
    unlockAudio,
    isBlocked,
    hint: audioHint,
    soundThemes,
  } = useLiveChatAudioAlerts();

  const liveChatsQuery = useQuery({
    queryKey: ["chatbot-live-chats"],
    queryFn: async () => {
      const response = await chatbotAgentAPI.listLiveChats(100);
      return Array.isArray(response.data) ? response.data : [];
    },
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });

  const detailQuery = useQuery({
    queryKey: ["chatbot-live-chat", sessionId],
    queryFn: async () => {
      const response = await chatbotAgentAPI.getLiveChat(sessionId);
      return response.data;
    },
    enabled: Boolean(sessionId),
    refetchInterval: sessionId ? 3000 : false,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (!sessionId && liveChatsQuery.data?.length) {
      navigate(
        `/app/chatbot-agents/live/${liveChatsQuery.data[0].session.id}`,
        { replace: true },
      );
    }
  }, [liveChatsQuery.data, navigate, sessionId]);

  useEffect(() => {
    detailBootstrappedRef.current = false;
    knownSelectedMessageIdsRef.current = new Set();
  }, [sessionId]);

  useEffect(() => {
    if (detailQuery.data?.session) {
      const incomingMessages = Array.isArray(detailQuery.data.messages)
        ? detailQuery.data.messages
        : [];

      if (!detailBootstrappedRef.current) {
        incomingMessages.forEach((message) => {
          knownSelectedMessageIdsRef.current.add(messageDedupeKey(message));
        });
        detailBootstrappedRef.current = true;
      } else {
        incomingMessages.forEach((message) => {
          const dedupeKey = messageDedupeKey(message);
          const senderType = normalizeSenderType(message?.sender_type);
          if (knownSelectedMessageIdsRef.current.has(dedupeKey)) return;

          knownSelectedMessageIdsRef.current.add(dedupeKey);
          if (senderType === "visitor") {
            notifyIncomingVisitorMessage({
              sessionId: message.session_id || sessionId,
              messageId: message.id,
              createdAt: message.created_at,
              content: message.content,
            }).catch(() => {});
          }
        });
      }

      setLiveSession(detailQuery.data.session);
      setLiveMessages(incomingMessages);
      setActionError("");
    }
  }, [detailQuery.data, notifyIncomingVisitorMessage, sessionId]);

  useEffect(() => {
    if (!liveMessages.length) return;
    const ids = knownSelectedMessageIdsRef.current;
    liveMessages.forEach((message) => {
      ids.add(messageDedupeKey(message));
    });
  }, [liveMessages]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [liveMessages]);

  useEffect(() => {
    if (!sessionId) return undefined;
    let disposed = false;

    const connect = () => {
      const accessToken = getAccessToken();
      if (!accessToken || disposed) return;

      const socket = new WebSocket(
        chatbotAgentAPI.getLiveChatStreamUrl(sessionId, accessToken),
      );
      selectedSocketRef.current = socket;

      socket.onopen = () => {
        setActionError("");
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data || "{}");
          if (payload.type === "message.created" && payload.message) {
            const message = payload.message;
            const senderType = normalizeSenderType(message?.sender_type);
            const dedupeKey = messageDedupeKey(message);
            const isNewMessage =
              !knownSelectedMessageIdsRef.current.has(dedupeKey);

            if (isNewMessage) {
              knownSelectedMessageIdsRef.current.add(dedupeKey);
            }

            if (
              isNewMessage &&
              senderType === "visitor"
            ) {
              notifyIncomingVisitorMessage({
                sessionId: message.session_id || sessionId,
                messageId: message.id,
                createdAt: message.created_at,
                content: message.content,
              }).catch(() => {});
            }

            setLiveMessages((prev) => {
              if (prev.some((existing) => existing.id === message.id)) {
                return prev;
              }
              return [...prev, message];
            });
          }

          if (payload.session) {
            setLiveSession(payload.session);
          }

          queryClient.invalidateQueries({ queryKey: ["chatbot-live-chats"] });
          queryClient.invalidateQueries({
            queryKey: ["chatbot-live-chat", sessionId],
          });
        } catch (_error) {
          // Ignore malformed events and keep the socket alive.
        }
      };

      socket.onerror = () => {
        setActionError("Live chat stream unstable. Reconnecting...");
      };

      socket.onclose = () => {
        if (disposed) return;
        selectedReconnectTimerRef.current = window.setTimeout(connect, 1500);
      };
    };

    connect();

    return () => {
      disposed = true;
      if (selectedReconnectTimerRef.current) {
        window.clearTimeout(selectedReconnectTimerRef.current);
        selectedReconnectTimerRef.current = null;
      }
      if (selectedSocketRef.current) {
        selectedSocketRef.current.close();
        selectedSocketRef.current = null;
      }
    };
  }, [notifyIncomingVisitorMessage, queryClient, sessionId]);

  useEffect(() => {
    const rows = Array.isArray(liveChatsQuery.data) ? liveChatsQuery.data : [];
    const currentIds = new Set(rows.map((entry) => entry?.session?.id).filter(Boolean));
    const knownIds = knownSessionIdsRef.current;

    if (knownIds.size === 0) {
      currentIds.forEach((id) => knownIds.add(id));
      return;
    }

    rows.forEach((entry) => {
      const id = entry?.session?.id;
      if (!id || knownIds.has(id)) return;
      knownIds.add(id);
      notifyNewSession({
        sessionId: id,
        visitorLabel: entry?.session?.visitor_label,
      }).catch(() => {});
    });

    Array.from(knownIds).forEach((id) => {
      if (!currentIds.has(id)) {
        knownIds.delete(id);
      }
    });
  }, [liveChatsQuery.data, notifyNewSession]);

  useEffect(() => {
    const rows = Array.isArray(liveChatsQuery.data) ? liveChatsQuery.data : [];
    const targetSessionIds = rows
      .map((entry) => entry?.session?.id)
      .filter((id) => id && String(id) !== String(sessionId || ""));
    const socketMap = backgroundSocketsRef.current;
    activeBackgroundSessionIdsRef.current = new Set(targetSessionIds);

    const connectBackgroundSocket = (id) => {
      const accessToken = getAccessToken();
      if (!accessToken) return;
      if (!activeBackgroundSessionIdsRef.current.has(id)) return;

      const existing = socketMap.get(id);
      if (
        existing?.socket &&
        (existing.socket.readyState === WebSocket.OPEN ||
          existing.socket.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }

      const socket = new WebSocket(
        chatbotAgentAPI.getLiveChatStreamUrl(id, accessToken),
      );
      socketMap.set(id, { socket, retryTimer: null });

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data || "{}");
          if (payload.type !== "message.created" || !payload.message) return;
          const message = payload.message;
          const senderType = normalizeSenderType(message?.sender_type);
          if (senderType !== "visitor") return;

          notifyIncomingVisitorMessage({
            sessionId: message.session_id || id,
            messageId: message.id,
            createdAt: message.created_at,
            content: message.content,
          }).catch(() => {});
          queryClient.invalidateQueries({ queryKey: ["chatbot-live-chats"] });
        } catch (_error) {
          // Keep socket alive even if a malformed payload appears.
        }
      };

      socket.onclose = () => {
        const entry = socketMap.get(id);
        if (!entry) return;
        if (!activeBackgroundSessionIdsRef.current.has(id)) {
          socketMap.delete(id);
          return;
        }
        entry.retryTimer = window.setTimeout(
          () => connectBackgroundSocket(id),
          1500,
        );
      };
    };

    targetSessionIds.forEach((id) => {
      connectBackgroundSocket(id);
    });

    Array.from(socketMap.keys()).forEach((id) => {
      if (!targetSessionIds.includes(id)) {
        const entry = socketMap.get(id);
        if (entry?.retryTimer) window.clearTimeout(entry.retryTimer);
        if (entry?.socket) entry.socket.close();
        socketMap.delete(id);
      }
    });

    return () => {
      Array.from(socketMap.keys()).forEach((id) => {
        const entry = socketMap.get(id);
        if (entry?.retryTimer) window.clearTimeout(entry.retryTimer);
        if (entry?.socket) entry.socket.close();
        socketMap.delete(id);
      });
    };
  }, [liveChatsQuery.data, notifyIncomingVisitorMessage, queryClient, sessionId]);

  const selectedChat = useMemo(
    () =>
      liveChatsQuery.data?.find((entry) => entry.session.id === sessionId)
        ?.session || liveSession,
    [liveChatsQuery.data, liveSession, sessionId],
  );

  const liveMetrics = useMemo(() => {
    const sessions = liveChatsQuery.data || [];
    const humanControlled = sessions.filter(
      (entry) => entry.session.control_mode === "human",
    ).length;
    const botControlled = sessions.filter(
      (entry) => entry.session.control_mode !== "human",
    ).length;
    const uniqueSites = new Set(
      sessions
        .map((entry) => hostFromOrigin(entry.session.origin))
        .filter(Boolean),
    ).size;

    return {
      openChats: sessions.length,
      humanControlled,
      botControlled,
      uniqueSites,
    };
  }, [liveChatsQuery.data]);

  const isAssignedToCurrentUser =
    String(liveSession?.assigned_operator_id || "") === String(user?.id || "");
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";
  const canSendHumanMessage =
    liveSession?.status === "open" &&
    liveSession?.control_mode === "human" &&
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
      setActionError("");
      queryClient.invalidateQueries({ queryKey: ["chatbot-live-chats"] });
      queryClient.invalidateQueries({
        queryKey: ["chatbot-live-chat", sessionId],
      });
    },
    onError: (error) => {
      setActionError(formatApiError(error, "Action failed"));
    },
  });

  const takeoverMutation = useMutation({
    mutationFn: () => chatbotAgentAPI.takeOverLiveChat(sessionId),
    ...runAction("Chat claimed successfully."),
  });

  const releaseMutation = useMutation({
    mutationFn: () => chatbotAgentAPI.releaseLiveChat(sessionId),
    ...runAction("Chat released back to the bot."),
  });

  const closeMutation = useMutation({
    mutationFn: () => chatbotAgentAPI.closeLiveChat(sessionId),
    ...runAction("Chat closed."),
  });

  const sendMutation = useMutation({
    mutationFn: (payload) =>
      chatbotAgentAPI.sendLiveChatMessage(sessionId, payload),
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
      setComposer("");
      setActionError("");
      queryClient.invalidateQueries({ queryKey: ["chatbot-live-chats"] });
    },
    onError: (error) => {
      setActionError(formatApiError(error, "Failed to send message"));
    },
  });

  const handleSend = async () => {
    const content = composer.trim();
    if (!content || !canSendHumanMessage || sendMutation.isPending) {
      return;
    }
    sendMutation.mutate({ content });
  };

  const runAudioAction = async (action) => {
    try {
      await action();
      setActionError("");
    } catch (_error) {
      setActionError("Could not play notification audio in this browser yet.");
    }
  };

  if (liveChatsQuery.isLoading && !liveChatsQuery.data) {
    return <Loader message="Loading live chats..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[0.78rem] uppercase tracking-[0.28em] text-white/46">
            Live Monitoring
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-black">
            Live Chats
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-white/64">
            Watch active website chats, see which page the visitor is on, and
            take over the conversation when the bot needs a human hand.
          </p>
        </div>

        <Link
          to="/app/chatbot-agents"
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-black/10 bg-black/5 px-4 py-3 text-sm font-medium text-black no-underline transition hover:bg-black/10"
        >
          <Bot className="h-4 w-4" />
          Back to Chatbots
        </Link>
      </div>

      <div className="rounded-[20px] border border-black/10 bg-black/[0.03] px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-black/70" />
            <p className="text-sm font-medium text-black">
              Alerts
            </p>
            <span className="rounded-full bg-black/10 px-2.5 py-0.5 text-[11px] uppercase tracking-[0.16em] text-black/70">
              {alertSettings.muted ? "Muted" : "Active"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() =>
                runAudioAction(async () => {
                  setMuted(!alertSettings.muted);
                })
              }
              className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black transition hover:bg-black/5"
            >
              {alertSettings.muted ? (
                <>
                  <Volume2 className="h-4 w-4" />
                  Unmute
                </>
              ) : (
                <>
                  <VolumeX className="h-4 w-4" />
                  Mute
                </>
              )}
            </button>

            <div className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2">
              <span className="text-xs uppercase tracking-[0.14em] text-black/55">
                Theme
              </span>
              <select
                value={alertSettings.soundTheme}
                onChange={(event) => setSoundTheme(event.target.value)}
                className="rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs uppercase tracking-[0.1em] text-black"
              >
                {soundThemes.map((theme) => (
                  <option key={theme} value={theme}>
                    {SOUND_THEME_LABELS[theme] || theme}
                  </option>
                ))}
              </select>
            </div>

            <div className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2">
              <span className="text-xs uppercase tracking-[0.14em] text-black/55">
                Volume
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={alertSettings.volume}
                onChange={(event) => setVolume(event.target.value)}
                className="h-1.5 w-28 accent-[#2f66ea]"
              />
              <span className="w-8 text-right text-xs text-black/55">
                {alertSettings.volume}
              </span>
            </div>

            <button
              onClick={() => runAudioAction(playTestSound)}
              disabled={alertSettings.muted}
              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black transition hover:bg-black/5 disabled:opacity-50"
            >
              Test
            </button>

            {isBlocked && (
              <button
                onClick={() => runAudioAction(unlockAudio)}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-100 px-3 py-2 text-sm text-amber-700 transition hover:bg-amber-200"
              >
                <Bell className="h-4 w-4" />
                Enable Sounds
              </button>
            )}
          </div>
        </div>
        {audioHint && (
          <p className="mt-2 text-xs text-amber-600">{audioHint}</p>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[22px] border border-white/8 bg-white/[0.05] px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-black">
            Open Chats
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-black">
            {liveMetrics.openChats}
          </p>
          <p className="mt-1 text-sm text-white/56">
            Sessions currently visible in the operator queue.
          </p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-white/[0.05] px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-black">
            Human Controlled
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-black">
            {liveMetrics.humanControlled}
          </p>
          <p className="mt-1 text-sm text-white/56">
            Chats already claimed away from the bot.
          </p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-white/[0.05] px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-black">
            Bot Controlled
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-black">
            {liveMetrics.botControlled}
          </p>
          <p className="mt-1 text-sm text-white/56">
            Sessions still running on the chatbot runtime.
          </p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-white/[0.05] px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-black">
            Active Sites
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-black">
            {liveMetrics.uniqueSites}
          </p>
          <p className="mt-1 text-sm text-white/56">
            Unique website origins with current conversation traffic.
          </p>
        </div>
      </div>

      {notice && (
        <div className="rounded-2xl border border-emerald-300/18 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          {notice}
        </div>
      )}

      {(actionError || liveChatsQuery.error || detailQuery.error) && (
        <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-400">
          {actionError ||
            formatApiError(liveChatsQuery.error, "Failed to load live chats") ||
            formatApiError(detailQuery.error, "Failed to load selected chat")}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <section className="flex min-h-[70vh] flex-col overflow-hidden rounded-[28px] border border-white/8 bg-white/[0.04]">
          <div className="border-b border-white/8 px-5 py-4">
            <p className="text-xs uppercase tracking-[0.22em] text-white/44">
              Open Sessions
            </p>
            <p className="mt-2 text-sm text-white/62">
              {liveChatsQuery.data?.length || 0} active{" "}
              {liveChatsQuery.data?.length === 1 ? "chat" : "chats"}
            </p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {!liveChatsQuery.data?.length ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
                <CircleEllipsis className="h-14 w-14 text-white/28" />
                <h3 className="mt-5 text-xl font-semibold text-black">
                  No live chats right now
                </h3>
                <p className="mt-3 text-sm leading-7 text-white/62">
                  Once website visitors start chatting with your embedded bot,
                  the live session inbox will appear here.
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
                      onClick={() =>
                        navigate(`/app/chatbot-agents/live/${session.id}`)
                      }
                      className={`w-full px-5 py-4 text-left transition ${
                        active ? "bg-white/[0.08]" : "hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-black">
                            {session.visitor_label}
                          </p>
                          <p className="mt-1 truncate text-xs uppercase tracking-[0.16em] text-white/44">
                            {hostFromOrigin(session.origin)}
                          </p>
                          {session.page_title && (
                            <p className="mt-2 truncate text-sm text-white/58">
                              {session.page_title}
                            </p>
                          )}
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                            session.control_mode === "human"
                              ? "bg-amber-100 text-amber-500"
                              : "bg-sky-100 text-sky-500"
                          }`}
                        >
                          {session.control_mode}
                        </span>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/68">
                        {session.last_message_preview || "No messages yet"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/44">
                        <span>
                          {formatRelativeTime(session.last_activity_at)}
                        </span>
                        {session.assigned_operator_name && (
                          <span>{session.assigned_operator_name}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="flex min-h-[70vh] flex-col overflow-hidden rounded-[28px] border border-white/8 bg-white/[0.04]">
          {!selectedChat ? (
            <div className="flex min-h-[520px] flex-col items-center justify-center px-8 text-center">
              <MessageSquare className="h-16 w-16 text-white/28" />
              <h3 className="mt-6 text-2xl font-semibold text-white">
                Select a live chat
              </h3>
              <p className="mt-3 max-w-xl text-sm leading-7 text-white/62">
                Choose a session from the left to inspect the transcript, claim
                the conversation, or hand the chat back to the bot.
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
                      <h3 className="text-2xl font-semibold tracking-[-0.02em] text-black">
                        {selectedChat.visitor_label}
                      </h3>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                          liveSession?.control_mode === "human"
                            ? "bg-amber-100 text-amber-500"
                            : "bg-sky-100 text-sky-500"
                        }`}
                      >
                        {liveSession?.control_mode || "bot"}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/62">
                      <span className="inline-flex items-center gap-2">
                        <Globe className="h-4 w-4 text-black" />
                        {hostFromOrigin(selectedChat.origin)}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <User className="h-4 w-4 text-black" />
                        {liveSession?.assigned_operator_name || "Bot handling"}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <CircleEllipsis className="h-4 w-4 text-black" />
                        {formatRelativeTime(selectedChat.last_activity_at)}
                      </span>
                    </div>

                    {selectedChat.page_title && (
                      <p className="mt-3 text-base font-medium text-white/84">
                        {selectedChat.page_title}
                      </p>
                    )}
                    <p className="mt-2 text-sm leading-6 text-white/52">
                      {selectedChat.page_url}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => takeoverMutation.mutate()}
                      disabled={
                        takeoverMutation.isPending ||
                        liveSession?.status !== "open" ||
                        (liveSession?.control_mode === "human" &&
                          !isAssignedToCurrentUser &&
                          !isAdmin)
                      }
                      className="inline-flex items-center gap-2 rounded-2xl border border-amber-400 bg-amber-400 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-amber-500 disabled:opacity-50"
                    >
                      <ShieldAlert className="h-4 w-4" />
                      {takeoverMutation.isPending ? "Claiming..." : "Take Over"}
                    </button>
                    <button
                      onClick={() => releaseMutation.mutate()}
                      disabled={
                        releaseMutation.isPending ||
                        liveSession?.control_mode !== "human" ||
                        liveSession?.status !== "open"
                      }
                      className="inline-flex items-center gap-2 rounded-2xl border border-sky-400 bg-sky-400 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-sky-500 disabled:opacity-50"
                    >
                      <PauseCircle className="h-4 w-4" />
                      {releaseMutation.isPending
                        ? "Releasing..."
                        : "Release to Bot"}
                    </button>
                    <button
                      onClick={() => closeMutation.mutate()}
                      disabled={
                        closeMutation.isPending ||
                        liveSession?.status !== "open"
                      }
                      className="inline-flex items-center gap-2 rounded-2xl border border-red-500 bg-red-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      {closeMutation.isPending ? "Closing..." : "Close Chat"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid flex-1 min-h-0 gap-0 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="min-w-0 border-b border-white/8 lg:border-b-0 lg:border-r lg:border-white/8">
                  <div className="flex h-full min-h-0 flex-col">
                    <div className="flex-1 min-h-0 space-y-3 overflow-y-auto px-5 py-5">
                      {liveMessages.map((message) => {
                        const isVisitor = message.sender_type === "visitor";
                        const isSystem = message.sender_type === "system";
                        const alignmentClass = isVisitor
                          ? "ml-auto bg-[#2f66ea] text-white"
                          : "mr-auto bg-black/10 text-black";

                        return (
                          <div
                            key={message.id}
                            className={`max-w-[86%] w-fit rounded-[20px] px-4 py-3 text-sm leading-6 ${
                              isSystem
                                ? "mx-auto bg-white/8 text-center text-white/74"
                                : alignmentClass
                            }`}
                          >
                            {!isSystem && (
                              <div
                                className={`mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${isVisitor ? "text-white/55" : "text-black/55"}`}
                              >
                                {message.sender_type}
                              </div>
                            )}
                            <div>{message.content}</div>
                            <div
                              className={`text-[11px] text-black/25 text-end ${isVisitor ? "text-white/55" : "text-black/55"}`}
                            >
                              {new Date(
                                message.created_at,
                              ).toLocaleTimeString()}
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
                          rows={3}
                          minRows={1}
                          maxRows={5}
                          placeholder={
                            canSendHumanMessage
                              ? "Reply as the human operator..."
                              : "Take over this chat to send human messages."
                          }
                          disabled={
                            !canSendHumanMessage || sendMutation.isPending
                          }
                          className="min-h-[52px] flex-1 rounded-[18px] border border-white/10 bg-white/6 px-4 py-3 text-sm text-black outline-none"
                        />

                        <button
                          onClick={handleSend}
                          disabled={
                            !canSendHumanMessage ||
                            sendMutation.isPending ||
                            !composer.trim()
                          }
                          className="inline-flex items-center gap-2 self-end rounded-2xl bg-[#2f66ea] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#295ad0] disabled:opacity-50"
                        >
                          <Send className="h-4 w-4" />
                          {sendMutation.isPending ? "Sending..." : "Send"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <aside className="space-y-4 px-5 py-5">
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.05] p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-black">
                      Session Status
                    </p>
                    <p className="mt-3 text-lg font-semibold text-black">
                      {liveSession?.status || "open"}
                    </p>
                    <p className="mt-2 text-sm text-white/62">
                      {liveSession?.control_mode === "human"
                        ? "The bot is paused and a human operator owns the thread."
                        : "The bot is currently handling replies for this visitor."}
                    </p>
                  </div>

                  <div className="rounded-[22px] border border-white/8 bg-white/[0.05] p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-black">
                      Session Details
                    </p>
                    <div className="mt-3 space-y-3 text-sm text-white/68">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.16em] text-black">
                          Origin
                        </div>
                        <div className="mt-1 break-all">
                          {selectedChat.origin}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.16em] text-black">
                          Page
                        </div>
                        <div className="mt-1 break-all">
                          {selectedChat.page_url}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.16em] text-black">
                          Last Activity
                        </div>
                        <div className="mt-1">
                          {formatAbsoluteTime(selectedChat.last_activity_at)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.16em] text-black">
                          Started
                        </div>
                        <div className="mt-1">
                          {formatAbsoluteTime(selectedChat.started_at)}
                        </div>
                      </div>
                      {selectedChat.page_title && (
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.16em] text-black">
                            Page Title
                          </div>
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
