import React, { useEffect, useState } from 'react';
import { Bot, Building, MessageCircle, Mic, Plus } from 'lucide-react';
import { tenantAPI } from '../../services/api';
import AgentList from './AgentList';
import ChatbotList from './ChatbotList';
import Loader from '../Loader';
import { getAppName } from '../../utils/appName';

const AgentManagement = () => {
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [activeTab, setActiveTab] = useState('voice');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [voiceCreateRequest, setVoiceCreateRequest] = useState(0);
  const [chatbotCreateRequest, setChatbotCreateRequest] = useState(0);

  useEffect(() => {
    fetchTenants();
  }, []);

  const formatError = (err, defaultMsg) => {
    const errorDetail = err.response?.data?.detail;
    if (Array.isArray(errorDetail)) {
      return errorDetail.map((e) => `${e.loc?.join('.')} - ${e.msg}`).join(', ');
    }
    return typeof errorDetail === 'string' ? errorDetail : defaultMsg;
  };

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const response = await tenantAPI.listTenants();
      const tenantsList = Array.isArray(response.data) ? response.data : [];

      setTenants(tenantsList);
      if (tenantsList.length > 0) {
        setSelectedTenant(tenantsList[0].id);
      }
      setError('');
    } catch (err) {
      setError(formatError(err, 'Failed to fetch tenants'));
      setTenants([]);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setShowTypePicker(true);
  };

  const handleCreateVoice = () => {
    setActiveTab('voice');
    setShowTypePicker(false);
    setVoiceCreateRequest((value) => value + 1);
  };

  const handleCreateChatbot = () => {
    setActiveTab('chatbot');
    setShowTypePicker(false);
    setChatbotCreateRequest((value) => value + 1);
  };

  if (loading) {
    return <Loader message="Loading agents..." fullScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Agent Management</h1>
            <p className="text-gray-600 mt-1">Create and manage voice agents and launcher-based chatbot agents.</p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="h-5 w-5" />
            Create Agent
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-2 inline-flex gap-2">
          <button
            onClick={() => setActiveTab('voice')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === 'voice' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <Mic className="h-4 w-4" />
              Voice Agents
            </span>
          </button>
          <button
            onClick={() => setActiveTab('chatbot')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === 'chatbot' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Chatbot Agents
            </span>
          </button>
        </div>

        {activeTab === 'voice' ? (
          <>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
            {tenants.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No tenants found</h3>
                <p className="text-gray-600 mb-6">Create a tenant before adding voice agents.</p>
                <a
                  href="/tenants/create"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Create First Tenant
                </a>
              </div>
            ) : (
              <>
                {tenants.length > 1 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Tenant</label>
                    <select
                      value={selectedTenant || ''}
                      onChange={(event) => setSelectedTenant(event.target.value)}
                      className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {tenants.map((tenant) => (
                        <option key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {selectedTenant && <AgentList tenantId={selectedTenant} createRequested={voiceCreateRequest} />}
              </>
            )}
          </>
        ) : (
          <ChatbotList createRequested={chatbotCreateRequest} />
        )}
      </div>

      {showTypePicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Choose Agent Type</h3>
            <p className="text-gray-600 mb-6">Do you want to create a voice agent or chatbot agent?</p>

            <div className="space-y-3">
              <button
                onClick={handleCreateVoice}
                className="w-full text-left p-4 rounded-lg border border-blue-200 hover:bg-blue-50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Mic className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Voice Agent</p>
                    <p className="text-sm text-gray-600">Tenant-based {getAppName()} voice flow</p>
                  </div>
                </div>
              </button>

              <button
                onClick={handleCreateChatbot}
                className="w-full text-left p-4 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Chatbot Agent</p>
                    <p className="text-sm text-gray-600">Non-tenant launcher chatbot configuration</p>
                  </div>
                </div>
              </button>
            </div>

            <div className="mt-6">
              <button
                onClick={() => setShowTypePicker(false)}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentManagement;
