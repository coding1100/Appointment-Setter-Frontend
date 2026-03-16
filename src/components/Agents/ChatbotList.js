import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Bot,
  Copy,
  Edit,
  Link as LinkIcon,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { chatbotAgentAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import Loader from '../Loader';
import ChatbotForm from './ChatbotForm';

const INITIAL_LOGS_STATE = {
  open: false,
  chatbot: null,
  logs: [],
  loading: false,
  error: '',
  statusFilter: '',
};

const ChatbotList = ({ createRequested = 0 }) => {
  const { user } = useAuth();
  const isAdmin = String(user?.role || '').toLowerCase() === 'admin';

  const [chatbots, setChatbots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingChatbot, setEditingChatbot] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [busyActionKey, setBusyActionKey] = useState('');
  const [installInfo, setInstallInfo] = useState(null);
  const [notice, setNotice] = useState('');
  const [logsState, setLogsState] = useState(INITIAL_LOGS_STATE);
  const [runtimeSwitch, setRuntimeSwitch] = useState({
    loading: false,
    saving: false,
    enabled: true,
    error: '',
  });

  const formatError = (err, defaultMsg) => {
    const detail = err?.response?.data?.detail;
    if (Array.isArray(detail)) {
      return detail.map((entry) => `${entry.loc?.join('.')} - ${entry.msg}`).join(', ');
    }
    return typeof detail === 'string' ? detail : defaultMsg;
  };

  const clearMessageAfterDelay = useCallback(() => {
    window.setTimeout(() => {
      setNotice('');
    }, 3500);
  }, []);

  const copyText = useCallback(
    async (value, successMessage) => {
      if (!value || !navigator.clipboard?.writeText) {
        return;
      }
      await navigator.clipboard.writeText(value);
      setNotice(successMessage);
      clearMessageAfterDelay();
    },
    [clearMessageAfterDelay]
  );

  const fetchChatbots = useCallback(async () => {
    try {
      setLoading(true);
      const response = await chatbotAgentAPI.listChatbotAgents();
      setChatbots(Array.isArray(response.data) ? response.data : []);
      setError('');
    } catch (err) {
      setError(formatError(err, 'Failed to fetch chatbot agents'));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRuntimeSwitch = useCallback(async () => {
    if (!isAdmin) return;

    try {
      setRuntimeSwitch((prev) => ({ ...prev, loading: true, error: '' }));
      const response = await chatbotAgentAPI.getRuntimeKillSwitch();
      setRuntimeSwitch((prev) => ({
        ...prev,
        loading: false,
        enabled: Boolean(response.data?.enabled),
      }));
    } catch (err) {
      setRuntimeSwitch((prev) => ({
        ...prev,
        loading: false,
        error: formatError(err, 'Failed to load runtime kill switch state'),
      }));
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchChatbots();
  }, [fetchChatbots]);

  useEffect(() => {
    fetchRuntimeSwitch();
  }, [fetchRuntimeSwitch]);

  useEffect(() => {
    if (createRequested > 0) {
      setEditingChatbot(null);
      setShowForm(true);
    }
  }, [createRequested]);

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingChatbot(null);
    fetchChatbots();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try {
      setBusyActionKey(`delete:${deleteConfirm.id}`);
      await chatbotAgentAPI.deleteChatbotAgent(deleteConfirm.id);
      setDeleteConfirm(null);
      if (installInfo?.chatbot_id === deleteConfirm.id) {
        setInstallInfo(null);
      }
      await fetchChatbots();
      setNotice('Chatbot deleted');
      clearMessageAfterDelay();
    } catch (err) {
      setError(formatError(err, 'Failed to delete chatbot agent'));
    } finally {
      setBusyActionKey('');
    }
  };

  const resolveOrigin = (chatbot) => {
    const firstOrigin = chatbot?.allowed_origins?.[0];
    if (!firstOrigin) {
      throw new Error('This chatbot has no allowed origin configured.');
    }
    return firstOrigin;
  };

  const generateInstallInfo = async (chatbot) => {
    const origin = resolveOrigin(chatbot);
    const response = await chatbotAgentAPI.generateEmbedToken(chatbot.id, origin);
    const payload = response?.data || {};
    if (!payload.loader_url || !payload.launcher_script) {
      throw new Error('Backend did not return launcher install payload.');
    }
    const nextInstallInfo = {
      chatbot_id: chatbot.id,
      chatbot_name: chatbot.name,
      origin,
      loader_url: payload.loader_url,
      launcher_script: payload.launcher_script,
      expires_at: payload.expires_at,
      token_version: payload.token_version,
    };
    setInstallInfo(nextInstallInfo);
    return nextInstallInfo;
  };

  const handleGenerateInstall = async (chatbot) => {
    try {
      setBusyActionKey(`generate:${chatbot.id}`);
      await generateInstallInfo(chatbot);
      setNotice(`Launcher install payload generated for ${chatbot.name}`);
      clearMessageAfterDelay();
      setError('');
    } catch (err) {
      setError(formatError(err, err?.message || 'Failed to generate launcher payload'));
    } finally {
      setBusyActionKey('');
    }
  };

  const handleCopyLauncherSnippet = async (chatbot) => {
    try {
      setBusyActionKey(`copy-snippet:${chatbot.id}`);
      const payload = await generateInstallInfo(chatbot);
      await copyText(payload.launcher_script, 'Launcher snippet copied to clipboard');
      setError('');
    } catch (err) {
      setError(formatError(err, err?.message || 'Failed to copy launcher snippet'));
    } finally {
      setBusyActionKey('');
    }
  };

  const handleToggleChatbotStatus = async (chatbot) => {
    const nextStatus = chatbot.status === 'active' ? 'inactive' : 'active';
    try {
      setBusyActionKey(`status:${chatbot.id}`);
      await chatbotAgentAPI.updateChatbotAgent(chatbot.id, { status: nextStatus });
      await fetchChatbots();
      setNotice(`Chatbot ${nextStatus === 'active' ? 'activated' : 'paused'}`);
      clearMessageAfterDelay();
      setError('');
    } catch (err) {
      setError(formatError(err, 'Failed to update chatbot status'));
    } finally {
      setBusyActionKey('');
    }
  };

  const handleRevokeTokens = async (chatbot) => {
    try {
      setBusyActionKey(`revoke:${chatbot.id}`);
      const response = await chatbotAgentAPI.revokeEmbedTokens(chatbot.id);
      const nextVersion = response?.data?.embed_token_version;
      if (installInfo?.chatbot_id === chatbot.id) {
        setInstallInfo(null);
      }
      await fetchChatbots();
      setNotice(
        nextVersion
          ? `Embed tokens revoked. Current token version: ${nextVersion}`
          : 'Embed tokens revoked successfully'
      );
      clearMessageAfterDelay();
      setError('');
    } catch (err) {
      setError(formatError(err, 'Failed to revoke embed tokens'));
    } finally {
      setBusyActionKey('');
    }
  };

  const loadRuntimeLogs = useCallback(async (chatbot, statusFilter = '') => {
    if (!chatbot) return;

    try {
      setLogsState((prev) => ({
        ...prev,
        open: true,
        chatbot,
        statusFilter,
        loading: true,
        error: '',
      }));
      const response = await chatbotAgentAPI.listRuntimeLogs(chatbot.id, 100, statusFilter);
      setLogsState((prev) => ({
        ...prev,
        open: true,
        chatbot,
        statusFilter,
        logs: Array.isArray(response.data) ? response.data : [],
        loading: false,
      }));
    } catch (err) {
      setLogsState((prev) => ({
        ...prev,
        open: true,
        chatbot,
        statusFilter,
        loading: false,
        error: formatError(err, 'Failed to load runtime logs'),
      }));
    }
  }, []);

  const handleToggleKillSwitch = async () => {
    try {
      setRuntimeSwitch((prev) => ({ ...prev, saving: true, error: '' }));
      const response = await chatbotAgentAPI.setRuntimeKillSwitch(!runtimeSwitch.enabled);
      setRuntimeSwitch((prev) => ({
        ...prev,
        saving: false,
        enabled: Boolean(response.data?.enabled),
      }));
      setNotice(`Global runtime ${response.data?.enabled ? 'enabled' : 'disabled'}`);
      clearMessageAfterDelay();
    } catch (err) {
      setRuntimeSwitch((prev) => ({
        ...prev,
        saving: false,
        error: formatError(err, 'Failed to update runtime kill switch'),
      }));
    }
  };

  const logsTitle = useMemo(() => {
    if (!logsState.chatbot) return 'Runtime Logs';
    return `Runtime Logs - ${logsState.chatbot.name}`;
  }, [logsState.chatbot]);

  if (loading) {
    return <Loader message="Loading chatbot agents..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Chatbot Agents</h2>
          <p className="text-gray-600 mt-1">Manage non-tenant chatbot launchers and runtime controls.</p>
        </div>
        <button
          onClick={() => {
            setEditingChatbot(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="h-5 w-5" />
          Create Chatbot
        </button>
      </div>

      {isAdmin && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-900">Global Runtime Kill Switch</p>
              <p className="text-sm text-gray-600">
                {runtimeSwitch.enabled
                  ? 'Chatbot public runtime endpoints are enabled.'
                  : 'Chatbot public runtime endpoints are disabled globally.'}
              </p>
            </div>
            <button
              onClick={handleToggleKillSwitch}
              disabled={runtimeSwitch.loading || runtimeSwitch.saving}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white transition ${
                runtimeSwitch.enabled ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
              } disabled:opacity-50`}
            >
              {runtimeSwitch.enabled ? <ShieldAlert className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
              {runtimeSwitch.saving ? 'Saving...' : runtimeSwitch.enabled ? 'Disable Runtime' : 'Enable Runtime'}
            </button>
          </div>
          {runtimeSwitch.error && (
            <div className="mt-3 text-sm bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded">
              {runtimeSwitch.error}
            </div>
          )}
        </div>
      )}

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      {notice && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">{notice}</div>}

      {installInfo && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <p className="font-semibold text-gray-900">Launcher Install Payload</p>
              <p className="text-sm text-gray-600">
                {installInfo.chatbot_name} | Origin: <span className="font-mono">{installInfo.origin}</span>
              </p>
              <p className="text-xs text-gray-500">
                Token version: {installInfo.token_version} | Expires at: {installInfo.expires_at}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => copyText(installInfo.loader_url, 'Loader URL copied to clipboard')}
                className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
              >
                <Copy className="h-4 w-4" />
                Copy Loader URL
              </button>
              <button
                onClick={() => copyText(installInfo.launcher_script, 'Launcher snippet copied to clipboard')}
                className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
              >
                <Copy className="h-4 w-4" />
                Copy Launcher Snippet
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs text-gray-500">Loader URL</div>
            <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
              {installInfo.loader_url}
            </pre>
            <div className="text-xs text-gray-500">Launcher Snippet</div>
            <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
              {installInfo.launcher_script}
            </pre>
          </div>
        </div>
      )}

      {chatbots.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Bot className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No chatbot agents yet</h3>
          <p className="text-gray-600 mb-6">Create your first chatbot agent and install it with launcher script.</p>
          <button
            onClick={() => {
              setEditingChatbot(null);
              setShowForm(true);
            }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="h-5 w-5" />
            Create First Chatbot
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {chatbots.map((chatbot) => {
            const currentKey = (suffix) => `${suffix}:${chatbot.id}`;
            const isBusy = (suffix) => busyActionKey === currentKey(suffix);
            return (
              <div key={chatbot.id} className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 border border-gray-200">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <Bot className="h-10 w-10 text-indigo-600 bg-indigo-50 p-2 rounded-full" />
                    <div>
                      <h3 className="font-semibold text-gray-900">{chatbot.name}</h3>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          chatbot.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {chatbot.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1 mb-4 text-sm text-gray-600">
                  <p>
                    <span className="font-medium">Domain:</span>{' '}
                    {chatbot.domain_key === 'custom' ? chatbot.custom_domain_name || 'custom' : chatbot.domain_key}
                  </p>
                  <p>
                    <span className="font-medium">Allowed Origins:</span> {chatbot.allowed_origins?.length || 0}
                  </p>
                  <p>
                    <span className="font-medium">Token Version:</span> {chatbot.embed_token_version}
                  </p>
                </div>

                <div className="bg-gray-50 rounded p-3 mb-4">
                  <p className="text-xs text-gray-500 mb-1">Welcome message:</p>
                  <p className="text-sm text-gray-700 line-clamp-2">{chatbot.welcome_message}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setEditingChatbot(chatbot);
                      setShowForm(true);
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition text-sm"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleChatbotStatus(chatbot)}
                    disabled={isBusy('status')}
                    className={`flex items-center gap-2 px-3 py-2 rounded transition text-sm ${
                      chatbot.status === 'active'
                        ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                        : 'bg-green-50 text-green-700 hover:bg-green-100'
                    } disabled:opacity-50`}
                  >
                    {chatbot.status === 'active' ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                    {isBusy('status') ? 'Updating...' : chatbot.status === 'active' ? 'Pause' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleGenerateInstall(chatbot)}
                    disabled={isBusy('generate')}
                    className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded hover:bg-green-100 transition text-sm disabled:opacity-50"
                  >
                    <LinkIcon className="h-4 w-4" />
                    {isBusy('generate') ? 'Generating...' : 'Generate Launcher'}
                  </button>
                  <button
                    onClick={() => handleCopyLauncherSnippet(chatbot)}
                    disabled={isBusy('copy-snippet')}
                    className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 transition text-sm disabled:opacity-50"
                  >
                    <Copy className="h-4 w-4" />
                    {isBusy('copy-snippet') ? 'Copying...' : 'Copy Launcher Snippet'}
                  </button>
                  <button
                    onClick={() => handleRevokeTokens(chatbot)}
                    disabled={isBusy('revoke')}
                    className="flex items-center gap-2 px-3 py-2 bg-orange-50 text-orange-700 rounded hover:bg-orange-100 transition text-sm disabled:opacity-50"
                  >
                    <ShieldAlert className="h-4 w-4" />
                    {isBusy('revoke') ? 'Revoking...' : 'Revoke Tokens'}
                  </button>
                  <button
                    onClick={() => loadRuntimeLogs(chatbot, logsState.statusFilter)}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition text-sm"
                  >
                    <Activity className="h-4 w-4" />
                    Runtime Logs
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(chatbot)}
                    disabled={isBusy('delete')}
                    className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition text-sm disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <ChatbotForm
          chatbot={editingChatbot}
          existingChatbots={chatbots}
          onClose={() => {
            setShowForm(false);
            setEditingChatbot(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {logsState.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 my-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{logsTitle}</h3>
                <p className="text-sm text-gray-600">Latest runtime events for public embed requests.</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={logsState.statusFilter}
                  onChange={(event) => loadRuntimeLogs(logsState.chatbot, event.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded text-sm"
                >
                  <option value="">All statuses</option>
                  <option value="success">success</option>
                  <option value="error">error</option>
                </select>
                <button
                  onClick={() => loadRuntimeLogs(logsState.chatbot, logsState.statusFilter)}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
                <button
                  onClick={() => setLogsState({ ...INITIAL_LOGS_STATE })}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="p-6 space-y-3 max-h-[65vh] overflow-y-auto">
              {logsState.loading && <Loader message="Loading runtime logs..." />}
              {!logsState.loading && logsState.error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{logsState.error}</div>
              )}
              {!logsState.loading && !logsState.error && logsState.logs.length === 0 && (
                <div className="text-sm text-gray-600">No runtime logs found for this chatbot.</div>
              )}
              {!logsState.loading &&
                !logsState.error &&
                logsState.logs.map((log) => (
                  <div key={log.request_id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                      <p>
                        <span className="font-medium">Request:</span> <span className="font-mono">{log.request_id}</span>
                      </p>
                      <p>
                        <span className="font-medium">Status:</span>{' '}
                        <span className={log.status === 'success' ? 'text-green-700' : 'text-red-700'}>{log.status}</span>
                      </p>
                      <p>
                        <span className="font-medium">Latency:</span> {log.latency_ms} ms
                      </p>
                      <p>
                        <span className="font-medium">Timestamp:</span> {new Date(log.timestamp).toLocaleString()}
                      </p>
                      {log.error_code && (
                        <p>
                          <span className="font-medium">Error code:</span> {log.error_code}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Chatbot Agent</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone.
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
                disabled={busyActionKey === `delete:${deleteConfirm.id}`}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {busyActionKey === `delete:${deleteConfirm.id}` ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatbotList;
