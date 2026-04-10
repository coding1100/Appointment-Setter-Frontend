import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-900">Chatbot Agents</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/app/chatbot-agents/live"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 no-underline transition hover:bg-slate-50"
          >
            <Activity className="h-4 w-4" />
            Live Chats
          </Link>
        </div>
      </div>

      {isAdmin && (
        <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Global Runtime Kill Switch</p>
              <p className="mt-1 text-xs text-slate-500">
                {runtimeSwitch.enabled
                  ? 'Chatbot public runtime endpoints are enabled.'
                  : 'Chatbot public runtime endpoints are disabled globally.'}
              </p>
            </div>
            <button
              onClick={handleToggleKillSwitch}
              disabled={runtimeSwitch.loading || runtimeSwitch.saving}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50 ${
                runtimeSwitch.enabled ? 'bg-[#dc2626] hover:bg-[#c81e1e]' : 'bg-[#0f9f6e] hover:bg-[#0c8a5f]'
              }`}
            >
              {runtimeSwitch.enabled ? <ShieldAlert className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
              {runtimeSwitch.saving ? 'Saving...' : runtimeSwitch.enabled ? 'Disable Runtime' : 'Enable Runtime'}
            </button>
          </div>
          {runtimeSwitch.error && (
            <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {runtimeSwitch.error}
            </div>
          )}
        </div>
      )}

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {notice && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

      {installInfo && (
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Launcher Install Payload</p>
              <p className="mt-1 text-sm text-slate-600">
                {installInfo.chatbot_name} | Origin: <span className="font-mono text-slate-800">{installInfo.origin}</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Token version: {installInfo.token_version} | Expires at: {installInfo.expires_at}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => copyText(installInfo.loader_url, 'Loader URL copied to clipboard')}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
              >
                <Copy className="h-4 w-4" />
                Copy Loader URL
              </button>
              <button
                onClick={() => copyText(installInfo.launcher_script, 'Launcher snippet copied to clipboard')}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#2f66ea] px-3.5 py-2.5 text-sm font-medium text-white transition hover:bg-[#295ad0]"
              >
                <Copy className="h-4 w-4" />
                Copy Launcher Snippet
              </button>
            </div>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            <div>
              <div className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">Loader URL</div>
              <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-[18px] border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                {installInfo.loader_url}
              </pre>
            </div>
            <div>
              <div className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">Launcher Snippet</div>
              <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-[18px] border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                {installInfo.launcher_script}
              </pre>
            </div>
          </div>
        </div>
      )}

      {chatbots.length === 0 ? (
        <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[28px] border border-slate-200 bg-white px-6 text-center shadow-sm">
          <Bot className="h-16 w-16 text-slate-300" />
          <h3 className="mt-6 text-2xl font-semibold tracking-[-0.02em] text-slate-900">No chatbot agents yet</h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            Create your First Chatbot Agent
          </p>
          <button
            onClick={() => {
              setEditingChatbot(null);
              setShowForm(true);
            }}
            className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-[#2f66ea] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(19,57,150,0.28)] transition hover:bg-[#295ad0]"
          >
            <Plus className="h-5 w-5" />
            Create First Chatbot
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[minmax(0,1.2fr)_180px_160px_160px] gap-4 border-b border-slate-200 px-5 py-3 text-xs uppercase tracking-[0.28em] text-slate-500 lg:grid">
            <div>Agent</div>
            <div>Domain</div>
            <div>Status</div>
            <div>Token</div>
          </div>

          <div className="divide-y divide-slate-200">
            {chatbots.map((chatbot) => {
              const currentKey = (suffix) => `${suffix}:${chatbot.id}`;
              const isBusy = (suffix) => busyActionKey === currentKey(suffix);
              const chatbotDomain =
                chatbot.domain_key === 'custom' ? chatbot.custom_domain_name || 'custom' : chatbot.domain_key;

              return (
                <div key={chatbot.id} className="px-5 py-5">
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_180px_160px_160px] lg:items-start">
                    <div className="min-w-0">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
                          <Bot className="h-5 w-5 text-sky-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-lg font-semibold text-slate-900">{chatbot.name}</h3>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                                chatbot.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {chatbot.status}
                            </span>
                          </div>
                          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 line-clamp-2">
                            {chatbot.welcome_message || 'No welcome message configured yet.'}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                            <span>Allowed origins: {chatbot.allowed_origins?.length || 0}</span>
                            <span>Token version: {chatbot.embed_token_version}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-sm text-slate-700 lg:pt-2">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 lg:hidden">Domain</div>
                      <div className="mt-1 lg:mt-0">{chatbotDomain}</div>
                    </div>

                    <div className="text-sm text-slate-700 lg:pt-2">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 lg:hidden">Status</div>
                      <div className="mt-1 lg:mt-0">{chatbot.status === 'active' ? 'Public runtime live' : 'Paused'}</div>
                    </div>

                    <div className="text-sm text-slate-700 lg:pt-2">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 lg:hidden">Token</div>
                      <div className="mt-1 lg:mt-0">v{chatbot.embed_token_version}</div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setEditingChatbot(chatbot);
                        setShowForm(true);
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleChatbotStatus(chatbot)}
                      disabled={isBusy('status')}
                      className={`inline-flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition disabled:opacity-50 ${
                        chatbot.status === 'active'
                          ? 'border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                          : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {chatbot.status === 'active' ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                      {isBusy('status') ? 'Updating...' : chatbot.status === 'active' ? 'Pause' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleGenerateInstall(chatbot)}
                      disabled={isBusy('generate')}
                      className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                    >
                      <LinkIcon className="h-4 w-4" />
                      {isBusy('generate') ? 'Generating...' : 'Generate Launcher'}
                    </button>
                    <button
                      onClick={() => handleCopyLauncherSnippet(chatbot)}
                      disabled={isBusy('copy-snippet')}
                      className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-sm text-sky-700 transition hover:bg-sky-100 disabled:opacity-50"
                    >
                      <Copy className="h-4 w-4" />
                      {isBusy('copy-snippet') ? 'Copying...' : 'Copy Launcher'}
                    </button>
                    <button
                      onClick={() => handleRevokeTokens(chatbot)}
                      disabled={isBusy('revoke')}
                      className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-3.5 py-2.5 text-sm text-orange-700 transition hover:bg-orange-100 disabled:opacity-50"
                    >
                      <ShieldAlert className="h-4 w-4" />
                      {isBusy('revoke') ? 'Revoking...' : 'Revoke Tokens'}
                    </button>
                    <button
                      onClick={() => loadRuntimeLogs(chatbot, logsState.statusFilter)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      <Activity className="h-4 w-4" />
                      Runtime Logs
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(chatbot)}
                      disabled={isBusy('delete')}
                      className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#04070fcc] px-4 py-8 backdrop-blur-sm">
          <div className="mx-4 my-8 w-full max-w-4xl rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.16)]">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{logsTitle}</h3>
                <p className="text-sm text-slate-600">Latest runtime events for public embed requests.</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={logsState.statusFilter}
                  onChange={(event) => loadRuntimeLogs(logsState.chatbot, event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
                >
                  <option value="">All statuses</option>
                  <option value="success">success</option>
                  <option value="error">error</option>
                </select>
                <button
                  onClick={() => loadRuntimeLogs(logsState.chatbot, logsState.statusFilter)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
                <button
                  onClick={() => setLogsState({ ...INITIAL_LOGS_STATE })}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="max-h-[65vh] space-y-3 overflow-y-auto p-6">
              {logsState.loading && <Loader message="Loading runtime logs..." />}
              {!logsState.loading && logsState.error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {logsState.error}
                </div>
              )}
              {!logsState.loading && !logsState.error && logsState.logs.length === 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
                  No runtime logs found for this chatbot.
                </div>
              )}
              {!logsState.loading &&
                !logsState.error &&
                logsState.logs.map((log) => (
                  <div key={log.request_id} className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                      <p>
                        <span className="font-medium text-slate-900">Request:</span>{' '}
                        <span className="font-mono text-slate-700">{log.request_id}</span>
                      </p>
                      <p>
                        <span className="font-medium text-slate-900">Status:</span>{' '}
                        <span className={log.status === 'success' ? 'text-emerald-700' : 'text-rose-700'}>{log.status}</span>
                      </p>
                      <p>
                        <span className="font-medium text-slate-900">Latency:</span> {log.latency_ms} ms
                      </p>
                      <p>
                        <span className="font-medium text-slate-900">Timestamp:</span> {new Date(log.timestamp).toLocaleString()}
                      </p>
                      {log.error_code && (
                        <p>
                          <span className="font-medium text-slate-900">Error code:</span> {log.error_code}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#04070fcc] px-4 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.16)]">
            <h3 className="mb-2 text-lg font-semibold text-slate-900">Delete Chatbot Agent</h3>
            <p className="mb-6 text-sm leading-7 text-slate-600">
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={busyActionKey === `delete:${deleteConfirm.id}`}
                className="flex-1 rounded-2xl bg-[#dc2626] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#c81e1e] disabled:opacity-50"
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
