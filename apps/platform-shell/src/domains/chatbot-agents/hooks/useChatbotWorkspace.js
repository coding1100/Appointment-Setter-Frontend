import { useCallback, useEffect, useMemo, useState } from 'react';

import { chatbotAgentAPI } from '../api';
import { formatApiError } from '../../../shared/utils/errors';

const INITIAL_LOGS_STATE = {
  open: false,
  chatbot: null,
  logs: [],
  loading: false,
  error: '',
  statusFilter: '',
};

export const useChatbotWorkspace = ({ createRequested = 0, isAdmin = false } = {}) => {
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
      setError(formatApiError(err, 'Failed to fetch chatbot agents'));
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
        error: formatApiError(err, 'Failed to load runtime kill switch state'),
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

  const handleFormSuccess = useCallback(() => {
    setShowForm(false);
    setEditingChatbot(null);
    fetchChatbots();
  }, [fetchChatbots]);

  const handleDeleteConfirm = useCallback(async () => {
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
      setError(formatApiError(err, 'Failed to delete chatbot agent'));
    } finally {
      setBusyActionKey('');
    }
  }, [clearMessageAfterDelay, deleteConfirm, fetchChatbots, installInfo?.chatbot_id]);

  const resolveOrigin = useCallback((chatbot, requestedOrigin) => {
    const normalizedRequested = String(requestedOrigin || '').trim().replace(/\/+$/, '');
    if (normalizedRequested) {
      return normalizedRequested;
    }

    const firstOrigin = chatbot?.allowed_origins?.[0];
    if (!firstOrigin) {
      throw new Error('This chatbot has no allowed origin configured.');
    }
    return String(firstOrigin).trim().replace(/\/+$/, '');
  }, []);

  const generateInstallInfo = useCallback(
    async (chatbot, options = {}) => {
      const origin = resolveOrigin(chatbot, options.origin);
      const expiresInMinutes = Number(options.expires_in_minutes);
      const neverExpires = Boolean(options.never_expires);
      const requestPayload = {
        origin,
        ...(neverExpires
          ? { never_expires: true }
          : Number.isFinite(expiresInMinutes)
            ? { expires_in_minutes: expiresInMinutes }
            : {}),
      };
      const response = await chatbotAgentAPI.generateEmbedToken(chatbot.id, requestPayload);
      const responsePayload = response?.data || {};

      if (!responsePayload.loader_url || !responsePayload.launcher_script) {
        throw new Error('Backend did not return launcher install payload.');
      }

      const nextInstallInfo = {
        chatbot_id: chatbot.id,
        chatbot_name: chatbot.name,
        origin,
        loader_url: responsePayload.loader_url,
        launcher_script: responsePayload.launcher_script,
        expires_at: responsePayload.expires_at,
        token_version: responsePayload.token_version,
      };

      setInstallInfo(nextInstallInfo);
      return nextInstallInfo;
    },
    [resolveOrigin]
  );

  const handleGenerateInstall = useCallback(
    async (chatbot, options = {}) => {
      try {
        setBusyActionKey(`generate:${chatbot.id}`);
        await generateInstallInfo(chatbot, options);
        setNotice(`Launcher install payload generated for ${chatbot.name}`);
        clearMessageAfterDelay();
        setError('');
      } catch (err) {
        setError(formatApiError(err, err?.message || 'Failed to generate launcher payload'));
      } finally {
        setBusyActionKey('');
      }
    },
    [clearMessageAfterDelay, generateInstallInfo]
  );

  const handleCopyLauncherSnippet = useCallback(
    async (chatbot, options = {}) => {
      try {
        setBusyActionKey(`copy-snippet:${chatbot.id}`);
        const payload = await generateInstallInfo(chatbot, options);
        await copyText(payload.launcher_script, 'Launcher snippet copied to clipboard');
        setError('');
      } catch (err) {
        setError(formatApiError(err, err?.message || 'Failed to copy launcher snippet'));
      } finally {
        setBusyActionKey('');
      }
    },
    [copyText, generateInstallInfo]
  );

  const handleToggleChatbotStatus = useCallback(
    async (chatbot) => {
      const nextStatus = chatbot.status === 'active' ? 'inactive' : 'active';

      try {
        setBusyActionKey(`status:${chatbot.id}`);
        await chatbotAgentAPI.updateChatbotAgent(chatbot.id, { status: nextStatus });
        await fetchChatbots();
        setNotice(`Chatbot ${nextStatus === 'active' ? 'activated' : 'paused'}`);
        clearMessageAfterDelay();
        setError('');
      } catch (err) {
        setError(formatApiError(err, 'Failed to update chatbot status'));
      } finally {
        setBusyActionKey('');
      }
    },
    [clearMessageAfterDelay, fetchChatbots]
  );

  const handleRevokeTokens = useCallback(
    async (chatbot) => {
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
        setError(formatApiError(err, 'Failed to revoke embed tokens'));
      } finally {
        setBusyActionKey('');
      }
    },
    [clearMessageAfterDelay, fetchChatbots, installInfo?.chatbot_id]
  );

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
        error: formatApiError(err, 'Failed to load runtime logs'),
      }));
    }
  }, []);

  const handleToggleKillSwitch = useCallback(async () => {
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
        error: formatApiError(err, 'Failed to update runtime kill switch'),
      }));
    }
  }, [clearMessageAfterDelay, runtimeSwitch.enabled]);

  const closeLogs = useCallback(() => {
    setLogsState({ ...INITIAL_LOGS_STATE });
  }, []);

  const openCreateForm = useCallback(() => {
    setEditingChatbot(null);
    setShowForm(true);
  }, []);

  const openEditForm = useCallback((chatbot) => {
    setEditingChatbot(chatbot);
    setShowForm(true);
  }, []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditingChatbot(null);
  }, []);

  const logsTitle = useMemo(() => {
    if (!logsState.chatbot) return 'Runtime Logs';
    return `Runtime Logs - ${logsState.chatbot.name}`;
  }, [logsState.chatbot]);

  return {
    chatbots,
    loading,
    error,
    showForm,
    editingChatbot,
    deleteConfirm,
    busyActionKey,
    installInfo,
    notice,
    logsState,
    runtimeSwitch,
    logsTitle,
    setDeleteConfirm,
    setError,
    copyText,
    fetchChatbots,
    handleFormSuccess,
    handleDeleteConfirm,
    handleGenerateInstall,
    handleCopyLauncherSnippet,
    handleToggleChatbotStatus,
    handleRevokeTokens,
    loadRuntimeLogs,
    handleToggleKillSwitch,
    closeLogs,
    openCreateForm,
    openEditForm,
    closeForm,
  };
};

export { INITIAL_LOGS_STATE };
