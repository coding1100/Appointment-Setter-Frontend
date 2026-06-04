import React, { useState, useEffect, useRef, useCallback } from "react";
import { voiceAgentAPI } from "../../services/api";
import { Mic, Phone, PhoneOff, Loader2, XCircle } from "lucide-react";
import { TEAL, TEAL_DEEP } from "../Platform/WorkspaceShellLayout";

// Import LiveKit components
import "@livekit/components-styles";
import {
  RoomContext,
  useVoiceAssistant,
  BarVisualizer,
  RoomAudioRenderer,
  VoiceAssistantControlBar,
} from "@livekit/components-react";
import { Room, RoomEvent } from "livekit-client";

const formatVoiceState = (state) => {
  if (!state) return "Listening";
  return state.charAt(0).toUpperCase() + state.slice(1);
};

const LiveKitVoiceAgent = ({
  tenantId,
  serviceType,
  agentId,
  onCallEnd,
  onSessionStatusChange,
  onRegisterHangUp,
  autoStart = false,
  embedded = false,
}) => {
  const [room, setRoom] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(autoStart);
  const [callId, setCallId] = useState("");
  const [error, setError] = useState("");
  const [roomToken, setRoomToken] = useState("");
  const [roomName, setRoomName] = useState("");
  const [livekitUrl, setLivekitUrl] = useState("");
  const roomRef = useRef(null);
  const autoStartAttemptedRef = useRef(false);
  const isEndingRef = useRef(false);

  const notifyStatus = useCallback(
    (status) => {
      onSessionStatusChange?.(status);
    },
    [onSessionStatusChange],
  );

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
    };
  }, []);

  const startCall = useCallback(async () => {
    if (!tenantId || !serviceType) {
      setError("Tenant ID and Service Type are required");
      return;
    }

    setIsConnecting(true);
    setError("");
    notifyStatus("connecting");

    try {
      // Start voice session (test mode - browser testing)
      const response = await voiceAgentAPI.startSession(
        tenantId,
        serviceType,
        true, // test mode = browser testing
        null, // no phone number for test mode
        agentId ? { agent_id: agentId } : null, // pass agent_id in metadata
      );

      console.log("Starting session with agent_id:", agentId);

      const { session_id, token, room_name, livekit_url } = response.data;

      // Validate livekit_url
      if (
        !livekit_url ||
        typeof livekit_url !== "string" ||
        livekit_url.trim() === ""
      ) {
        throw new Error(
          "Invalid LiveKit URL received from server. Please check your LIVEKIT_URL configuration.",
        );
      }

      setCallId(session_id);
      setRoomToken(token);
      setRoomName(room_name);
      setLivekitUrl(livekit_url);

      console.log("Connecting to LiveKit with:", {
        livekit_url,
        room_name,
        hasToken: !!token,
      });
      console.log("LiveKit URL validation:", {
        url: livekit_url,
        type: typeof livekit_url,
        length: livekit_url?.length,
        token_length: token?.length,
      });

      // Create and connect to LiveKit room
      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      // Set up room event listeners
      newRoom.on(RoomEvent.Connected, () => {
        console.log("Connected to LiveKit room");
        setIsConnected(true);
        setIsConnecting(false);
        notifyStatus("connected");
      });

      newRoom.on(RoomEvent.Disconnected, (reason) => {
        console.log("Disconnected from LiveKit room:", reason);
        setIsConnected(false);
        setIsConnecting(false);
        notifyStatus("ended");
        if (!isEndingRef.current && onCallEnd) {
          onCallEnd();
        }
      });

      newRoom.on(
        RoomEvent.TrackSubscribed,
        (track, publication, participant) => {
          console.log("Track subscribed:", track.kind, participant.identity);
        },
      );

      newRoom.on(
        RoomEvent.TrackUnsubscribed,
        (track, publication, participant) => {
          console.log("Track unsubscribed:", track.kind, participant.identity);
        },
      );

      // Connect to the room - USE THE VARIABLE FROM API RESPONSE, NOT STATE
      try {
        console.log("Attempting to connect to room with URL:", livekit_url);
        console.log(
          "Token:",
          token ? `${token.substring(0, 20)}...` : "MISSING",
        );
        await newRoom.connect(livekit_url, token);
        setRoom(newRoom);
        roomRef.current = newRoom;
        console.log("Successfully connected to room");
      } catch (connectError) {
        console.error("LiveKit connection error:", connectError);
        throw new Error(
          `Failed to connect to LiveKit: ${connectError.message}. Make sure LIVEKIT_URL is properly configured on the server.`,
        );
      }
    } catch (error) {
      console.error("Error starting call:", error);
      setError(
        error.response?.data?.detail || error.message || "Failed to start call",
      );
      setIsConnecting(false);
      notifyStatus("error");
    }
  }, [tenantId, serviceType, agentId, notifyStatus]);

  useEffect(() => {
    if (!autoStart || room || autoStartAttemptedRef.current) return;
    autoStartAttemptedRef.current = true;
    startCall();
  }, [autoStart, room, startCall]);

  const endCall = useCallback(async () => {
    if (isEndingRef.current) return;
    isEndingRef.current = true;

    try {
      if (roomRef.current) {
        await roomRef.current.disconnect();
      }

      if (callId) {
        await voiceAgentAPI.endSession(callId);
      }

      setRoom(null);
      setIsConnected(false);
      setCallId("");
      setRoomToken("");
      setRoomName("");
      setLivekitUrl("");

      notifyStatus("ended");
    } catch (error) {
      console.error("Error ending call:", error);
      setError(
        error.response?.data?.detail || error.message || "Failed to end call",
      );
      notifyStatus("ended");
    } finally {
      isEndingRef.current = false;
      onCallEnd?.();
    }
  }, [callId, notifyStatus, onCallEnd]);

  useEffect(() => {
    onRegisterHangUp?.(endCall);
    return () => onRegisterHangUp?.(null);
  }, [endCall, onRegisterHangUp]);

  const shellClass = embedded
    ? "flex flex-col px-5 pb-5 pt-4"
    : "flex flex-col items-center justify-center rounded-lg bg-white p-8 shadow-lg";

  const preconnectShell = embedded ? (
    <div className="py-6 text-center">
      {error ? (
        <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
          <div className="flex items-center justify-center gap-2">
            <XCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        </div>
      ) : null}

      {isConnecting ? (
        <>
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#68fadd]" />
          <p className="mt-4 text-sm font-medium text-white">Connecting…</p>
        </>
      ) : autoStart ? (
        <>
          <p className="text-sm text-white/80">Could not start the test.</p>
          <button
            type="button"
            onClick={startCall}
            className="mt-4 inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: TEAL_DEEP }}
          >
            <Phone className="mr-2 h-4 w-4" />
            Retry
          </button>
        </>
      ) : (
        <>
          <Phone className="mx-auto mb-4 h-14 w-14" style={{ color: TEAL }} />
          <h3 className="mb-2 text-lg font-semibold text-white">Voice Agent Test</h3>
          <p className="mb-6 text-sm text-white/60">
            Test your voice agent with LiveKit integration
          </p>
          <button
            type="button"
            onClick={startCall}
            disabled={isConnecting}
            className="inline-flex items-center rounded-xl bg-gradient-to-r from-[#006b5c] to-[#68fadd] px-6 py-3 text-sm font-semibold text-[#0d1b2a] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Phone className="mr-2 h-4 w-4" />
            Start Voice Agent Test
          </button>
        </>
      )}
    </div>
  ) : (
    <div className="w-full text-center">
      {error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
          <div className="flex items-center justify-center">
            <XCircle className="mr-2 h-5 w-5 shrink-0" />
            {error}
          </div>
        </div>
      ) : null}
      {isConnecting ? (
        <>
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-emerald-500" />
          <h3 className="mb-2 text-xl font-semibold text-gray-900">
            Connecting to voice agent…
          </h3>
          <p className="text-gray-600">Starting LiveKit test session</p>
        </>
      ) : null}
    </div>
  );

  if (!room) {
    return <div className={shellClass}>{preconnectShell}</div>;
  }

  const activeShell = embedded ? (
    <div className="flex w-full flex-col items-stretch gap-5">
      <div className="flex w-full items-center gap-3 border-b border-white/10 pb-4">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${TEAL}33` }}
        >
          <Mic className="h-5 w-5" style={{ color: TEAL }} />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-sm font-semibold text-white">Agent active</p>
          {serviceType ? (
            <p className="truncate text-xs text-white/50">{serviceType}</p>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-[7.5rem] w-full items-center justify-center rounded-lg border border-white/10 bg-white/5 px-6 py-8">
        <VoiceSessionStatus />
      </div>

      <div className="voice-test-controls flex w-full items-center justify-center">
        <VoiceAssistantControlBar />
      </div>

      <button
        type="button"
        onClick={endCall}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-700"
      >
        <PhoneOff className="h-4 w-4" />
        End call
      </button>
    </div>
  ) : (
    <>
      <div className="mb-6 text-center">
        <Mic className="mx-auto mb-4 h-16 w-16 text-emerald-500" />
        <h3 className="mb-2 text-xl font-semibold text-gray-900">Voice Agent Active</h3>
        {serviceType ? (
          <p className="text-sm text-gray-500">{serviceType}</p>
        ) : null}
      </div>
      <div className="mb-6">
        <VoiceAssistantVisualizer />
      </div>
      <div className="mb-6">
        <VoiceAssistantControlBar />
      </div>
      <button
        type="button"
        onClick={endCall}
        className="inline-flex items-center rounded-md bg-red-600 px-6 py-3 text-base font-medium text-white hover:bg-red-700"
      >
        <PhoneOff className="mr-2 h-5 w-5" />
        End Call
      </button>
    </>
  );

  return (
    <RoomContext.Provider value={room}>
      <div className={shellClass}>
        {activeShell}
        <RoomAudioRenderer />
      </div>
    </RoomContext.Provider>
  );
};

// Voice session status (Listening / Speaking / …)
const VoiceSessionStatus = () => {
  const { state } = useVoiceAssistant();
  return (
    <p className="text-sm font-medium text-[#68fadd]">{formatVoiceState(state)}</p>
  );
};

// Voice Assistant Visualizer Component
const VoiceAssistantVisualizer = ({ embedded = false }) => {
  const { state, audioTrack } = useVoiceAssistant();
  const statusLabel = formatVoiceState(state);

  return (
    <div
      className={`flex w-full flex-col items-center ${
        embedded ? "voice-test-visualizer" : ""
      }`}
    >
      <BarVisualizer
        state={state}
        barCount={7}
        trackRef={audioTrack}
        options={
          embedded
            ? { minHeight: 20, maxHeight: 88 }
            : { minHeight: 12, maxHeight: 48 }
        }
        className={
          embedded
            ? "mx-auto min-h-[7rem] w-full max-w-[280px]"
            : "mx-auto h-20 w-full max-w-[240px]"
        }
      />
      <p
        className={`mt-4 text-sm font-medium ${
          embedded ? "text-[#68fadd]" : "text-slate-700"
        }`}
      >
        {statusLabel}
      </p>
    </div>
  );
};

export default LiveKitVoiceAgent;
