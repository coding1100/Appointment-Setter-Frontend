import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { voiceAgentAPI, tenantAPI, agentAPI, phoneNumberAPI } from '../../services/api';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, User, CheckCircle, XCircle } from 'lucide-react';
import LiveKitVoiceAgent from './LiveKitVoiceAgent';

const VoiceAgentTest = () => {
  const { user } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [serviceType, setServiceType] = useState('Home Services');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [testMode, setTestMode] = useState(true);
  const [callActive, setCallActive] = useState(false);
  const [callId, setCallId] = useState('');
  const [callStatus, setCallStatus] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callHistory, setCallHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [twilioIntegration, setTwilioIntegration] = useState(null);
  const [showLiveKitAgent, setShowLiveKitAgent] = useState(false);
  const [agentPhone, setAgentPhone] = useState(null);

  const serviceTypes = [
    'Home Services',
    'Plumbing',
    'Electrician',
    'Painter',
    'Carpenter',
    'Maids'
  ];

  // Fetch tenants - memoized to prevent recreating on every render
  const fetchTenants = useCallback(async () => {
    try {
      const response = await tenantAPI.listTenants();
      const tenantsList = Array.isArray(response.data) ? response.data : [];
      
      // Ensure we always have a valid array
      setTenants(tenantsList);
      
      if (tenantsList.length > 0 && !selectedTenant) {
        setSelectedTenant(tenantsList[0].id);
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
      setError('Failed to load tenants');
      setTenants([]); // Ensure we always have an array
    }
  }, [selectedTenant]);

  // Fetch agents for selected tenant - memoized with selectedTenant dependency only
  const fetchAgents = useCallback(async () => {
    if (!selectedTenant) return;

    try {
      const response = await agentAPI.listAgents(selectedTenant);
      const agentsList = response.data || [];
      // Filter to only show active agents
      const activeAgents = agentsList.filter(agent => agent.status === 'active');
      setAgents(activeAgents);
      
      // Auto-select first agent if none selected
      if (activeAgents.length > 0) {
        setSelectedAgent(activeAgents[0].id);
      } else {
        setSelectedAgent('');
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
      setAgents([]);
      setError('Failed to load agents');
    }
  }, [selectedTenant]); // Remove selectedAgent from deps to prevent circular dependency

  // Fetch agent phone - memoized
  const fetchAgentPhone = useCallback(async (agentId) => {
    if (!agentId) return;

    try {
      const response = await phoneNumberAPI.getPhoneByAgent(agentId);
      setAgentPhone(response.data);
    } catch (error) {
      // No phone assigned yet - not an error
      setAgentPhone(null);
    }
  }, []);

  // Fetch Twilio integration - memoized with selectedTenant dependency
  const fetchTwilioIntegration = useCallback(async () => {
    if (!selectedTenant) return;

    try {
      const response = await fetch(`/api/v1/twilio-integration/tenant/${selectedTenant}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTwilioIntegration(data);
      } else {
        setTwilioIntegration(null);
      }
    } catch (error) {
      console.error('Error fetching Twilio integration:', error);
      setTwilioIntegration(null);
    }
  }, [selectedTenant]);

  // Initial load - fetch tenants once
  useEffect(() => {
    fetchTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // When tenant changes - fetch agents and Twilio integration
  useEffect(() => {
    if (selectedTenant) {
      fetchTwilioIntegration();
      fetchAgents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenant]); // Only depend on selectedTenant, not the functions

  // When agent changes - update service type and fetch phone
  useEffect(() => {
    if (selectedAgent && agents.length > 0) {
      const agent = agents.find(a => a.id === selectedAgent);
      if (agent) {
        setServiceType(agent.service_type);
        fetchAgentPhone(agent.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAgent, agents]); // Intentionally excluding fetchAgentPhone

      const startCall = async () => {
        if (!selectedTenant) {
          setError('Please select a tenant');
          return;
        }

        if (!selectedAgent) {
          setError('Please select an agent to test');
          return;
        }

        const agent = agents.find(a => a.id === selectedAgent);
        if (!agent) {
          setError('Selected agent not found');
          return;
        }

        // Check if Twilio integration is required for live calls
        if (!testMode && !twilioIntegration) {
          setError('Twilio integration is required for live calls. Please configure it first.');
          return;
        }

        // Check if agent has phone number for live calls
        if (!testMode && !agentPhone) {
          setError('This agent does not have a phone number assigned. Please assign one in Twilio Integration page.');
          return;
        }

        setLoading(true);
        setError('');

        try {
          console.log('Starting call with agent:', { 
            agentId: agent.id,
            agentName: agent.name, 
            serviceType: agent.service_type, 
            testMode, 
            phoneNumber: agentPhone?.phone_number 
          });

          if (testMode) {
            // Use LiveKit agent for test mode (browser testing)
            setShowLiveKitAgent(true);
            setCallActive(true);
          } else {
            // Use Twilio for live calls (phone calls)
            const response = await voiceAgentAPI.startSession(
              selectedTenant,
              agent.service_type,
              false, // test_mode = false for phone calls
              phoneNumber, // Destination phone number
              { 
                agent_id: agent.id,
                agent_name: agent.name,
                agent_phone: agentPhone?.phone_number
              }
            );

            setCallActive(true);
            setCallId(response.data.session_id);
            setCallStatus(response.data.status || 'calling');

            // Start polling for session status
            pollCallStatus(response.data.session_id);
          }

        } catch (error) {
          setError(error.response?.data?.detail || error.response?.data?.message || 'Failed to start call');
        } finally {
          setLoading(false);
        }
      };

  const endCall = async () => {
    if (!callId) return;

    setLoading(true);

    try {
      await voiceAgentAPI.endSession(callId);
      setCallActive(false);
      setCallId('');
      setCallStatus('');
      setIsRecording(false);
      setIsMuted(false);
    } catch (error) {
      setError(error.response?.data?.detail || error.response?.data?.message || 'Failed to end call');
    } finally {
      setLoading(false);
    }
  };

  const handleLiveKitCallEnd = () => {
    setShowLiveKitAgent(false);
    setCallActive(false);
    setCallId('');
    setCallStatus('');
    setIsRecording(false);
    setIsMuted(false);
  };

  const pollCallStatus = async (currentSessionId) => {
    const interval = setInterval(async () => {
      try {
        const response = await voiceAgentAPI.getSessionStatus(currentSessionId);
        if (response.data) {
          setCallStatus(response.data.status);
          if (response.data.status === 'ended') {
            setCallActive(false);
            setCallId('');
            clearInterval(interval);
          }
        }
      } catch (error) {
        console.error('Error polling session status:', error);
        clearInterval(interval);
      }
    }, 2000);

    // Clean up interval when component unmounts or call ends
    return () => clearInterval(interval);
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // Here you would implement actual audio recording logic
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // Here you would implement actual mute functionality
  };

  // Fetch call history - memoized with selectedTenant dependency
  const fetchCallHistory = useCallback(async () => {
    if (!selectedTenant) return;

    try {
      const response = await voiceAgentAPI.getCallHistory(selectedTenant);
      // API returns {sessions: [], count: 0} structure
      setCallHistory(response.data.sessions || []);
    } catch (error) {
      console.error('Error fetching call history:', error);
      setCallHistory([]); // Set empty array on error to prevent undefined
    }
  }, [selectedTenant]);

  // Fetch call history when tenant changes
  useEffect(() => {
    if (selectedTenant) {
      fetchCallHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenant]); // Intentionally excluding fetchCallHistory to prevent circular deps

  const selectedTenantData = tenants.find(t => t.id === selectedTenant);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Voice Agent Testing</h1>
          <p className="mt-2 text-gray-600">
            Test your AI voice agent with LiveKit or make real phone calls with Twilio.
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {typeof error === 'string' ? error : JSON.stringify(error)}
          </div>
        )}

        {showLiveKitAgent ? (
          <div className="max-w-4xl mx-auto">
            <LiveKitVoiceAgent
              tenantId={selectedTenant}
              serviceType={serviceType}
              agentId={selectedAgent}
              onCallEnd={handleLiveKitCallEnd}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Voice Agent Controls */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Voice Agent Controls
              </h3>

              {/* Configuration */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tenant
                  </label>
                  <select
                    value={selectedTenant}
                    onChange={(e) => setSelectedTenant(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Agent to Test
                  </label>
                  {agents.length > 0 ? (
                    <select
                      value={selectedAgent}
                      onChange={(e) => setSelectedAgent(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      {agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name} - {agent.service_type}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-sm text-gray-500 p-3 border border-gray-300 rounded-md bg-gray-50">
                      No agents found. <a href="/agents" className="text-blue-600 hover:underline">Create an agent first</a>.
                    </div>
                  )}
                </div>

                {selectedAgent && agents.find(a => a.id === selectedAgent) && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-start">
                      <User className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
                      <div className="text-sm">
                        <p className="font-medium text-blue-900">
                          {agents.find(a => a.id === selectedAgent).name}
                        </p>
                        <p className="text-blue-700 mt-1">
                          <span className="font-medium">Service:</span> {agents.find(a => a.id === selectedAgent).service_type}
                        </p>
                        <p className="text-blue-700">
                          <span className="font-medium">Language:</span> {agents.find(a => a.id === selectedAgent).language}
                        </p>
                        {agentPhone ? (
                          <p className="text-green-700 flex items-center mt-1">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            <span className="font-medium">Phone:</span> {agentPhone.phone_number}
                          </p>
                        ) : (
                          <p className="text-yellow-700 flex items-center mt-1">
                            <XCircle className="h-4 w-4 mr-1" />
                            No phone assigned (Test mode only)
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={testMode}
                      onChange={(e) => setTestMode(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Test Mode (LiveKit)</span>
                  </label>
                </div>

                {/* Twilio Integration Status */}
                {!testMode && (
                  <div className="mt-4 p-3 rounded-md border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {twilioIntegration ? (
                          <>
                            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                            <span className="text-sm font-medium text-green-700">
                              Twilio Integration Active
                            </span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-5 w-5 text-red-500 mr-2" />
                            <span className="text-sm font-medium text-red-700">
                              Twilio Integration Required
                            </span>
                          </>
                        )}
                      </div>
                      {twilioIntegration && (
                        <span className="text-xs text-gray-500">
                          {twilioIntegration.phone_number}
                        </span>
                      )}
                    </div>
                    {!twilioIntegration && (
                      <p className="mt-2 text-xs text-gray-600">
                        Please configure Twilio integration to make live calls.
                      </p>
                    )}
                  </div>
                )}

                {!testMode && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1234567890"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Call Controls */}
              <div className="flex items-center space-x-4 mb-6">
                {!callActive ? (
                  <button
                    onClick={startCall}
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    {loading ? 'Starting...' : 'Start Call'}
                  </button>
                ) : (
                  <button
                    onClick={endCall}
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PhoneOff className="h-4 w-4 mr-2" />
                    {loading ? 'Ending...' : 'End Call'}
                  </button>
                )}

                {callActive && (
                  <>
                    <button
                      onClick={toggleRecording}
                      className={`inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                        isRecording ? 'bg-red-100 text-red-700' : 'bg-white text-gray-700 hover:bg-gray-50'
                      } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                    >
                      {isRecording ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
                      {isRecording ? 'Stop Recording' : 'Start Recording'}
                    </button>

                    <button
                      onClick={toggleMute}
                      className={`inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                        isMuted ? 'bg-yellow-100 text-yellow-700' : 'bg-white text-gray-700 hover:bg-gray-50'
                      } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                    >
                      {isMuted ? <VolumeX className="h-4 w-4 mr-2" /> : <Volume2 className="h-4 w-4 mr-2" />}
                      {isMuted ? 'Unmute' : 'Mute'}
                    </button>
                  </>
                )}
              </div>

              {/* Call Status */}
              {callActive && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Phone className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">
                        Call Active
                      </h3>
                      <div className="mt-2 text-sm text-green-700">
                        <p>Call ID: {callId}</p>
                        <p>Status: {callStatus}</p>
                        <p>Mode: {testMode ? 'Test Mode (LiveKit)' : 'Live Call (Twilio)'}</p>
                        {selectedAgent && (
                          <p>Agent: {agents.find(a => a.id === selectedAgent)?.name || 'Unknown'}</p>
                        )}
                        <p>Service: {serviceType}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Call History */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Call History
                </h3>
                <button
                  onClick={fetchCallHistory}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Refresh
                </button>
              </div>

              <div className="space-y-3">
                {callHistory && callHistory.length > 0 ? (
                  callHistory.map((call) => (
                    <div key={call.session_id || call.call_id || Math.random()} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {call.service_type || 'Unknown Service'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {call.started_at ? new Date(call.started_at).toLocaleString() : 'Unknown time'}
                          </p>
                          <p className="text-xs text-gray-500">
                            Mode: {call.test_mode ? 'Test' : 'Live'}
                          </p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          call.status === 'active' ? 'bg-green-100 text-green-800' :
                          call.status === 'ended' ? 'bg-gray-100 text-gray-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {call.status || 'unknown'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No call history found
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Integration Information */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-2">
            Integration Information
          </h3>
          <div className="text-sm text-blue-800">
            <p className="mb-2">
              <strong>Test Mode (LiveKit):</strong> Use this mode to test your voice agent directly in the browser without making actual phone calls.
            </p>
            <p className="mb-2">
              <strong>Live Mode (Twilio):</strong> Use this mode to make actual phone calls to real phone numbers using Twilio integration.
            </p>
            <p>
              <strong>Features:</strong> Speech-to-text, text-to-speech, AI conversation flow, appointment booking, and escalation handling.
            </p>
          </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default VoiceAgentTest;
