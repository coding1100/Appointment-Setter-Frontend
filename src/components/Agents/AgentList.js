import React, { useState, useEffect, useCallback } from 'react';
import { agentAPI } from '../../services/api';
import { Plus, Edit, Trash2, Power, PowerOff, User, Volume2 } from 'lucide-react';
import AgentForm from './AgentForm';
import Loader from '../Loader';

const AgentList = ({ tenantId }) => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const formatError = (err, defaultMsg) => {
    const errorDetail = err.response?.data?.detail;
    if (Array.isArray(errorDetail)) {
      return errorDetail.map(e => `${e.loc?.join('.')} - ${e.msg}`).join(', ');
    }
    return typeof errorDetail === 'string' ? errorDetail : defaultMsg;
  };

  // Memoized fetch function to prevent infinite loops
  const fetchAgents = useCallback(async () => {
    if (!tenantId) return;
    
    try {
      setLoading(true);
      const response = await agentAPI.listAgents(tenantId);
      setAgents(response.data);
      setError('');
    } catch (err) {
      setError(formatError(err, 'Failed to fetch agents'));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (tenantId) {
      fetchAgents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]); // Intentionally excluding fetchAgents to prevent circular deps

  const handleCreateAgent = () => {
    setEditingAgent(null);
    setShowForm(true);
  };

  const handleEditAgent = (agent) => {
    setEditingAgent(agent);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingAgent(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingAgent(null);
    fetchAgents();
  };

  const handleDeleteClick = (agent) => {
    setDeleteConfirm(agent);
  };

  const handleDeleteConfirm = async () => {
    try {
      await agentAPI.deleteAgent(deleteConfirm.id);
      setDeleteConfirm(null);
      fetchAgents();
    } catch (err) {
      setError(formatError(err, 'Failed to delete agent'));
    }
  };

  const handleToggleStatus = async (agent) => {
    try {
      if (agent.status === 'active') {
        await agentAPI.deactivateAgent(agent.id);
      } else {
        await agentAPI.activateAgent(agent.id);
      }
      fetchAgents();
    } catch (err) {
      setError(formatError(err, 'Failed to toggle agent status'));
    }
  };

  if (loading) {
    return <Loader message="Loading agents..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Agent Management</h2>
          <p className="text-gray-600 mt-1">Configure and manage your AI voice agents</p>
        </div>
        <button
          onClick={handleCreateAgent}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="h-5 w-5" />
          Create Agent
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Agents List */}
      {agents.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No agents yet</h3>
          <p className="text-gray-600 mb-6">Create your first AI voice agent to get started</p>
          <button
            onClick={handleCreateAgent}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="h-5 w-5" />
            Create First Agent
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 border border-gray-200"
            >
              {/* Agent Status Badge */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <User className="h-10 w-10 text-blue-600 bg-blue-50 p-2 rounded-full" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        agent.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {agent.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Agent Details */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Volume2 className="h-4 w-4" />
                  <span className="capitalize">{agent.service_type}</span>
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Language:</span> {agent.language}
                </div>
              </div>

              {/* Greeting Message Preview */}
              <div className="bg-gray-50 rounded p-3 mb-4">
                <p className="text-xs text-gray-500 mb-1">Greeting:</p>
                <p className="text-sm text-gray-700 line-clamp-2">{agent.greeting_message}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditAgent(agent)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition text-sm"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleToggleStatus(agent)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded transition text-sm ${
                    agent.status === 'active'
                      ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                      : 'bg-green-50 text-green-600 hover:bg-green-100'
                  }`}
                >
                  {agent.status === 'active' ? (
                    <>
                      <PowerOff className="h-4 w-4" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <Power className="h-4 w-4" />
                      Activate
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDeleteClick(agent)}
                  className="px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Agent Form Modal */}
      {showForm && (
        <AgentForm
          tenantId={tenantId}
          agent={editingAgent}
          existingAgents={agents}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Agent</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action
              cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentList;

