import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Bell,
  Bot,
  CheckCircle,
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
import { NAVY, TEAL, TEAL_DEEP } from "../Platform/WorkspaceShellLayout";
import StyledSelect from "../../shared/ui/StyledSelect";

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#68fadd]/50 focus:outline-none focus:ring-2 focus:ring-[#68fadd]/20";

const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

const btnDanger =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50";

const sectionCardClass =
  "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm";

const controlBadgeClass = (mode) =>
  mode === "human"
    ? "bg-amber-50 text-amber-700"
    : "bg-[#68fadd]/20 text-[#006b5c]";

const StatCard = ({ label, value, description, icon: Icon }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1e293b]">
          {label}
        </p>
        <p className="mt-2 text-2xl font-semibold tracking-tight" style={{ color: NAVY }}>
          {value}
        </p>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {Icon ? (
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-100"
          style={{ backgroundColor: NAVY }}
        >
          <Icon className="h-5 w-5" style={{ color: TEAL }} strokeWidth={1.75} />
        </div>
      ) : null}
    </div>
  </div>
);

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

const parseEpochMs = (value) => {
  const ms = Date.parse(String(value || ""));
  return Number.isFinite(ms) ? ms : 0;
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
  const knownSessionMetaRef = useRef(new Map());
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
    const knownMeta = knownSessionMetaRef.current;
    const RESTORE_ANNOUNCE_MIN_GAP_MS = 5 * 60 * 1000;

    if (knownIds.size === 0) {
      rows.forEach((entry) => {
        const id = entry?.session?.id;
        if (!id) return;
        knownIds.add(id);
        knownMeta.set(id, {
          lastActivityMs: parseEpochMs(entry?.session?.last_activity_at),
          lastRestoredMs: parseEpochMs(entry?.session?.last_restored_at),
        });
      });
      return;
    }

    rows.forEach((entry) => {
      const id = entry?.session?.id;
      if (!id) return;

      const currentLastActivityMs = parseEpochMs(entry?.session?.last_activity_at);
      const currentLastRestoredMs = parseEpochMs(entry?.session?.last_restored_at);

      if (!knownIds.has(id)) {
        knownIds.add(id);
        knownMeta.set(id, {
          lastActivityMs: currentLastActivityMs,
          lastRestoredMs: currentLastRestoredMs,
        });
        notifyNewSession({
          sessionId: id,
          visitorLabel: entry?.session?.visitor_label,
          isReturningVisitor: Boolean(entry?.session?.is_returning_visitor),
        }).catch(() => {});
        return;
      }

      const previous = knownMeta.get(id) || { lastActivityMs: 0, lastRestoredMs: 0 };
      const restoredAdvanced =
        currentLastRestoredMs > 0 && currentLastRestoredMs > (previous.lastRestoredMs || 0);
      const inactiveLongEnough =
        previous.lastActivityMs > 0 &&
        currentLastActivityMs - previous.lastActivityMs >= RESTORE_ANNOUNCE_MIN_GAP_MS;

      if (restoredAdvanced && inactiveLongEnough) {
        notifyNewSession({
          sessionId: id,
          alertKey: `${id}:restore:${currentLastRestoredMs}`,
          visitorLabel: entry?.session?.visitor_label,
          isReturningVisitor: true,
        }).catch(() => {});
      }

      knownMeta.set(id, {
        lastActivityMs: currentLastActivityMs,
        lastRestoredMs: currentLastRestoredMs,
      });
    });

    Array.from(knownIds).forEach((id) => {
      if (!currentIds.has(id)) {
        knownIds.delete(id);
        knownMeta.delete(id);
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
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: NAVY }}>
            Live Chats
          </h1>
          <p className="mt-0.5 max-w-2xl text-sm text-slate-500">
            Watch active website chats, see which page the visitor is on, and take over the
            conversation when the bot needs a human hand.
          </p>
        </div>

        <Link
          to="/app/chatbot-agents"
          className={`${btnSecondary} shrink-0 no-underline`}
        >
          <Bot className="h-4 w-4" strokeWidth={2} />
          Back to Chatbots
        </Link>
      </div>

      <div className={`${sectionCardClass} px-4 py-4 sm:px-5`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-100"
              style={{ backgroundColor: NAVY }}
            >
              <Bell className="h-4 w-4" style={{ color: TEAL }} strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: NAVY }}>
                Alerts
              </p>
              <span
                className={`mt-0.5 inline-flex rounded-full px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide ${
                  alertSettings.muted ? "bg-slate-100 text-slate-600" : "bg-[#68fadd]/25 text-[#006b5c]"
                }`}
              >
                {alertSettings.muted ? "Muted" : "Active"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                runAudioAction(async () => {
                  setMuted(!alertSettings.muted);
                })
              }
              className={btnSecondary}
            >
              {alertSettings.muted ? (
                <>
                  <Volume2 className="h-4 w-4" strokeWidth={2} />
                  Unmute
                </>
              ) : (
                <>
                  <VolumeX className="h-4 w-4" strokeWidth={2} />
                  Mute
                </>
              )}
            </button>

            <div className="inline-flex min-w-[200px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5">
              <span className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Theme
              </span>
              <StyledSelect
                value={alertSettings.soundTheme}
                onChange={(event) => setSoundTheme(event.target.value)}
                className="min-w-[130px] appearance-none rounded-lg border-0 bg-transparent py-1.5 pl-0 pr-10 text-xs font-medium text-slate-700 focus:outline-none focus:ring-0"
              >
                {soundThemes.map((theme) => (
                  <option key={theme} value={theme}>
                    {SOUND_THEME_LABELS[theme] || theme}
                  </option>
                ))}
              </StyledSelect>
            </div>

            <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Volume
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={alertSettings.volume}
                onChange={(event) => setVolume(event.target.value)}
                className="h-1.5 w-28 cursor-pointer appearance-none rounded-full bg-slate-200 accent-[#006b5c]"
              />
              <span className="w-8 text-right font-mono text-[10px] font-semibold text-slate-500">
                {alertSettings.volume}
              </span>
            </div>

            <button
              type="button"
              onClick={() => runAudioAction(playTestSound)}
              disabled={alertSettings.muted}
              className={btnSecondary}
            >
              Test
            </button>

            {isBlocked && (
              <button
                type="button"
                onClick={() => runAudioAction(unlockAudio)}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-amber-700 transition hover:bg-amber-100"
              >
                <Bell className="h-4 w-4" strokeWidth={2} />
                Enable Sounds
              </button>
            )}
          </div>
        </div>
        {audioHint ? (
          <p className="mt-3 text-xs text-amber-700">{audioHint}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open chats"
          value={liveMetrics.openChats}
          description="Sessions currently visible in the operator queue."
          icon={CircleEllipsis}
        />
        <StatCard
          label="Human controlled"
          value={liveMetrics.humanControlled}
          description="Chats already claimed away from the bot."
          icon={User}
        />
        <StatCard
          label="Bot controlled"
          value={liveMetrics.botControlled}
          description="Sessions still running on the chatbot runtime."
          icon={Bot}
        />
        <StatCard
          label="Active sites"
          value={liveMetrics.uniqueSites}
          description="Unique website origins with current conversation traffic."
          icon={Globe}
        />
      </div>

      {notice ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span>{notice}</span>
        </div>
      ) : null}

      {(actionError || liveChatsQuery.error || detailQuery.error) && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <XCircle className="h-5 w-5 shrink-0" />
          <span>
            {actionError ||
              formatApiError(liveChatsQuery.error, "Failed to load live chats") ||
              formatApiError(detailQuery.error, "Failed to load selected chat")}
          </span>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <section className={`${sectionCardClass} flex min-h-[70vh] flex-col`}>
          <div className="border-b border-slate-200 px-5 py-4">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1e293b]">
              Open sessions
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {liveChatsQuery.data?.length || 0} active{" "}
              {liveChatsQuery.data?.length === 1 ? "chat" : "chats"}
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {!liveChatsQuery.data?.length ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
                <CircleEllipsis className="h-12 w-12 text-slate-300" strokeWidth={1.25} />
                <h3 className="mt-4 text-lg font-semibold" style={{ color: NAVY }}>
                  No live chats right now
                </h3>
                <p className="mt-2 max-w-xs text-sm text-slate-500">
                  Once website visitors start chatting with your embedded bot, the live session
                  inbox will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {liveChatsQuery.data.map((entry) => {
                  const session = entry.session;
                  const active = session.id === sessionId;
                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() =>
                        navigate(`/app/chatbot-agents/live/${session.id}`)
                      }
                      className={`w-full px-5 py-4 text-left transition ${
                        active
                          ? "bg-[#68fadd]/10 ring-1 ring-inset ring-[#68fadd]/30"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold" style={{ color: NAVY }}>
                            {session.visitor_label}
                          </p>
                          <p className="mt-1 truncate font-mono text-[9px] uppercase tracking-wide text-slate-400">
                            {hostFromOrigin(session.origin)}
                          </p>
                          {session.page_title ? (
                            <p className="mt-2 truncate text-sm text-slate-500">
                              {session.page_title}
                            </p>
                          ) : null}
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide ${controlBadgeClass(session.control_mode)}`}
                        >
                          {session.control_mode}
                        </span>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
                        {session.last_message_preview || "No messages yet"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span>{formatRelativeTime(session.last_activity_at)}</span>
                        {session.assigned_operator_name ? (
                          <span>{session.assigned_operator_name}</span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className={`${sectionCardClass} flex min-h-[70vh] flex-col`}>
          {!selectedChat ? (
            <div className="flex min-h-[520px] flex-col items-center justify-center px-8 text-center">
              <MessageSquare className="h-12 w-12 text-slate-300" strokeWidth={1.25} />
              <h3 className="mt-4 text-lg font-semibold" style={{ color: NAVY }}>
                Select a live chat
              </h3>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                Choose a session from the left to inspect the transcript, claim the conversation,
                or hand the chat back to the bot.
              </p>
            </div>
          ) : detailQuery.isLoading && !liveSession ? (
            <Loader message="Loading live chat..." />
          ) : (
            <>
              <div className="border-b border-slate-200 px-5 py-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-semibold tracking-tight" style={{ color: NAVY }}>
                        {selectedChat.visitor_label}
                      </h3>
                      <span
                        className={`rounded-full px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide ${controlBadgeClass(liveSession?.control_mode)}`}
                      >
                        {liveSession?.control_mode || "bot"}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                      <span className="inline-flex items-center gap-2">
                        <Globe className="h-4 w-4 text-slate-400" />
                        {hostFromOrigin(selectedChat.origin)}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <User className="h-4 w-4 text-slate-400" />
                        {liveSession?.assigned_operator_name || "Bot handling"}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <CircleEllipsis className="h-4 w-4 text-slate-400" />
                        {formatRelativeTime(selectedChat.last_activity_at)}
                      </span>
                    </div>

                    {selectedChat.page_title ? (
                      <p className="mt-3 text-base font-medium text-slate-800">
                        {selectedChat.page_title}
                      </p>
                    ) : null}
                    <p className="mt-1 break-all text-sm text-slate-500">{selectedChat.page_url}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => takeoverMutation.mutate()}
                      disabled={
                        takeoverMutation.isPending ||
                        liveSession?.status !== "open" ||
                        (liveSession?.control_mode === "human" &&
                          !isAssignedToCurrentUser &&
                          !isAdmin)
                      }
                      className={`${btnPrimary} border border-amber-200 bg-amber-500 hover:opacity-100 hover:bg-amber-600`}
                    >
                      <ShieldAlert className="h-4 w-4" strokeWidth={2} />
                      {takeoverMutation.isPending ? "Claiming..." : "Take Over"}
                    </button>
                    <button
                      type="button"
                      onClick={() => releaseMutation.mutate()}
                      disabled={
                        releaseMutation.isPending ||
                        liveSession?.control_mode !== "human" ||
                        liveSession?.status !== "open"
                      }
                      className={btnSecondary}
                    >
                      <PauseCircle className="h-4 w-4" strokeWidth={2} />
                      {releaseMutation.isPending ? "Releasing..." : "Release to Bot"}
                    </button>
                    <button
                      type="button"
                      onClick={() => closeMutation.mutate()}
                      disabled={closeMutation.isPending || liveSession?.status !== "open"}
                      className={btnDanger}
                    >
                      <XCircle className="h-4 w-4" strokeWidth={2} />
                      {closeMutation.isPending ? "Closing..." : "Close Chat"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="min-w-0 border-b border-slate-200 lg:border-b-0 lg:border-r lg:border-slate-200">
                  <div className="flex h-full min-h-0 flex-col">
                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50/50 px-5 py-5">
                      {liveMessages.map((message) => {
                        const isVisitor = message.sender_type === "visitor";
                        const isSystem = message.sender_type === "system";
                        const alignmentClass = isVisitor
                          ? "ml-auto text-white"
                          : "mr-auto border border-slate-200 bg-white text-slate-800";

                        return (
                          <div
                            key={message.id}
                            className={`max-w-[86%] w-fit rounded-xl px-4 py-3 text-sm leading-6 shadow-sm ${
                              isSystem
                                ? "mx-auto border border-slate-200 bg-white text-center text-slate-500"
                                : alignmentClass
                            }`}
                            style={
                              isVisitor && !isSystem
                                ? { backgroundColor: NAVY }
                                : undefined
                            }
                          >
                            {!isSystem ? (
                              <div
                                className={`mb-1 font-mono text-[9px] font-bold uppercase tracking-wide ${
                                  isVisitor ? "text-white/60" : "text-slate-400"
                                }`}
                              >
                                {message.sender_type}
                              </div>
                            ) : null}
                            <div>{message.content}</div>
                            <div
                              className={`mt-1 text-end font-mono text-[9px] ${
                                isVisitor ? "text-white/50" : "text-slate-400"
                              }`}
                            >
                              {new Date(message.created_at).toLocaleTimeString()}
                            </div>
                          </div>
                        );
                      })}
                      <div ref={endOfMessagesRef} />
                    </div>

                    <div className="border-t border-slate-200 px-5 py-4">
                      <div className="flex gap-3">
                        <textarea
                          value={composer}
                          onChange={(event) => setComposer(event.target.value)}
                          rows={3}
                          placeholder={
                            canSendHumanMessage
                              ? "Reply as the human operator..."
                              : "Take over this chat to send human messages."
                          }
                          disabled={!canSendHumanMessage || sendMutation.isPending}
                          className={`${fieldClass} min-h-[52px] flex-1 resize-none disabled:cursor-not-allowed disabled:bg-slate-50`}
                        />

                        <button
                          type="button"
                          onClick={handleSend}
                          disabled={
                            !canSendHumanMessage ||
                            sendMutation.isPending ||
                            !composer.trim()
                          }
                          className={btnPrimary}
                          style={{ backgroundColor: TEAL_DEEP }}
                        >
                          <Send className="h-4 w-4" strokeWidth={2} />
                          {sendMutation.isPending ? "Sending..." : "Send"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <aside className="space-y-4 px-5 py-5">
                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Session status
                    </p>
                    <p className="mt-2 text-lg font-semibold capitalize" style={{ color: NAVY }}>
                      {liveSession?.status || "open"}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      {liveSession?.control_mode === "human"
                        ? "The bot is paused and a human operator owns the thread."
                        : "The bot is currently handling replies for this visitor."}
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Session details
                    </p>
                    <div className="mt-3 space-y-3 text-sm text-slate-600">
                      <div>
                        <div className="font-mono text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                          Origin
                        </div>
                        <div className="mt-1 break-all">{selectedChat.origin}</div>
                      </div>
                      <div>
                        <div className="font-mono text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                          Page
                        </div>
                        <div className="mt-1 break-all">{selectedChat.page_url}</div>
                      </div>
                      <div>
                        <div className="font-mono text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                          Last activity
                        </div>
                        <div className="mt-1">
                          {formatAbsoluteTime(selectedChat.last_activity_at)}
                        </div>
                      </div>
                      <div>
                        <div className="font-mono text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                          Started
                        </div>
                        <div className="mt-1">{formatAbsoluteTime(selectedChat.started_at)}</div>
                      </div>
                      {selectedChat.page_title ? (
                        <div>
                          <div className="font-mono text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                            Page title
                          </div>
                          <div className="mt-1">{selectedChat.page_title}</div>
                        </div>
                      ) : null}
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
