import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { voiceAgentAPI } from '../../services/api';
import { 
  Phone, 
  PhoneOff, 
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react';

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

const LiveKitVoiceAgent = ({ tenantId, serviceType, agentId, onCallEnd }) => {
  const { user } = useAuth();
  const [room, setRoom] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [callId, setCallId] = useState('');
  const [error, setError] = useState('');
  const [roomToken, setRoomToken] = useState('');
  const [roomName, setRoomName] = useState('');
  const [livekitUrl, setLivekitUrl] = useState('');
  const roomRef = useRef(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
    };
  }, []);

  const startCall = async () => {
    if (!tenantId || !serviceType) {
      setError('Tenant ID and Service Type are required');
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      // Start voice session (test mode - browser testing)
      const response = await voiceAgentAPI.startSession(
        tenantId,
        serviceType,
        true, // test mode = browser testing
        null, // no phone number for test mode
        agentId ? { agent_id: agentId } : null  // pass agent_id in metadata
      );
      
      console.log('Starting session with agent_id:', agentId);

      const { session_id, token, room_name, livekit_url } = response.data;
      
      // Validate livekit_url
      if (!livekit_url || typeof livekit_url !== 'string' || livekit_url.trim() === '') {
        throw new Error('Invalid LiveKit URL received from server. Please check your LIVEKIT_URL configuration.');
      }
      
      setCallId(session_id);
      setRoomToken(token);
      setRoomName(room_name);
      setLivekitUrl(livekit_url);

      console.log('Connecting to LiveKit with:', { livekit_url, room_name, hasToken: !!token });
      console.log('LiveKit URL validation:', {
        url: livekit_url,
        type: typeof livekit_url,
        length: livekit_url?.length,
        token_length: token?.length
      });

      // Create and connect to LiveKit room
      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      // Set up room event listeners
      newRoom.on(RoomEvent.Connected, () => {
        console.log('Connected to LiveKit room');
        setIsConnected(true);
        setIsConnecting(false);
      });

      newRoom.on(RoomEvent.Disconnected, (reason) => {
        console.log('Disconnected from LiveKit room:', reason);
        setIsConnected(false);
        setIsConnecting(false);
        if (onCallEnd) {
          onCallEnd();
        }
      });

      newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log('Track subscribed:', track.kind, participant.identity);
      });

      newRoom.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        console.log('Track unsubscribed:', track.kind, participant.identity);
      });

      // Connect to the room - USE THE VARIABLE FROM API RESPONSE, NOT STATE
      try {
        console.log('Attempting to connect to room with URL:', livekit_url);
        console.log('Token:', token ? `${token.substring(0, 20)}...` : 'MISSING');
        await newRoom.connect(livekit_url, token);
        setRoom(newRoom);
        roomRef.current = newRoom;
        console.log('Successfully connected to room');
      } catch (connectError) {
        console.error('LiveKit connection error:', connectError);
        throw new Error(`Failed to connect to LiveKit: ${connectError.message}. Make sure LIVEKIT_URL is properly configured on the server.`);
      }

    } catch (error) {
      console.error('Error starting call:', error);
      setError(error.response?.data?.detail || error.message || 'Failed to start call');
      setIsConnecting(false);
    }
  };

  const endCall = async () => {
    try {
      if (roomRef.current) {
        await roomRef.current.disconnect();
      }

      if (callId) {
        await voiceAgentAPI.endSession(callId);
      }

      setRoom(null);
      setIsConnected(false);
      setCallId('');
      setRoomToken('');
      setRoomName('');
      setLivekitUrl('');

      if (onCallEnd) {
        onCallEnd();
      }

    } catch (error) {
      console.error('Error ending call:', error);
      setError(error.response?.data?.detail || error.message || 'Failed to end call');
    }
  };

  if (!room) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <div className="mb-4">
            <Phone className="h-16 w-16 text-blue-500 mx-auto" />
          </div>
          
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Voice Agent Test
          </h3>
          
          <p className="text-gray-600 mb-6">
            Test your voice agent with LiveKit integration
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
              <div className="flex items-center">
                <XCircle className="h-5 w-5 mr-2" />
                {error}
              </div>
            </div>
          )}

          <button
            onClick={startCall}
            disabled={isConnecting}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Phone className="h-5 w-5 mr-2" />
                Start Voice Agent Test
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <RoomContext.Provider value={room}>
      <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center mb-6">
          <div className="mb-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          </div>
          
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Voice Agent Active
          </h3>
          
          <p className="text-gray-600 mb-2">
            Connected to LiveKit room: {roomName}
          </p>
          
          <p className="text-sm text-gray-500">
            Service Type: {serviceType}
          </p>
        </div>

        {/* Voice Assistant Visualization */}
        <div className="mb-6">
          <VoiceAssistantVisualizer />
        </div>

        {/* Control Bar */}
        <div className="mb-6">
          <VoiceAssistantControlBar />
        </div>

        {/* End Call Button */}
        <button
          onClick={endCall}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <PhoneOff className="h-5 w-5 mr-2" />
          End Call
        </button>

        {/* Audio Renderer */}
        <RoomAudioRenderer />
      </div>
    </RoomContext.Provider>
  );
};

// Voice Assistant Visualizer Component
const VoiceAssistantVisualizer = () => {
  const { state, audioTrack } = useVoiceAssistant();

  return (
    <div className="w-full max-w-md">
      <div className="mb-4">
        <BarVisualizer 
          state={state} 
          barCount={8} 
          trackRef={audioTrack} 
          className="h-32"
        />
      </div>
      
      <div className="text-center">
        <p className="text-sm font-medium text-gray-700">
          Status: <span className="capitalize">{state}</span>
        </p>
      </div>
    </div>
  );
};

export default LiveKitVoiceAgent;
