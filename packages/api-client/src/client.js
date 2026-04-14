import axios from 'axios';
import { clearSessionTokens, getAccessToken, getRefreshToken } from '@samai/auth/session';
import { API_BASE_URL, COLD_CALLER_BASE_URL, WS_BASE_URL } from '@samai/config/env';

if (process.env.NODE_ENV === 'development') {
  console.log('API Base URL:', API_BASE_URL);
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

const normalizeUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  return url === '/' ? url : url.replace(/\/+$/, '');
};

const coldCallerClient = axios.create({
  baseURL: COLD_CALLER_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

coldCallerClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.baseURL) {
      config.baseURL = normalizeUrl(String(config.baseURL));
    }
    if (config.url) {
      config.url = normalizeUrl(String(config.url));
    }
    return config;
  },
  (error) => Promise.reject(error)
);

coldCallerClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = getRefreshToken();
        if (refreshToken) {
          const response = await api.post('/api/v1/auth/refresh', {
            refresh_token: refreshToken,
          });

          const { access_token } = response.data;
          localStorage.setItem('access_token', access_token);

          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return coldCallerClient(originalRequest);
        }
      } catch (refreshError) {
        clearSessionTokens();
        window.location.href = '/login';
      }
    }

    if (error.response?.data) {
      error.response.data = {
        detail: error.response.data.detail || error.response.data.message || 'An error occurred',
        ...error.response.data,
      };
    }

    return Promise.reject(error);
  }
);

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.baseURL) {
      config.baseURL = normalizeUrl(String(config.baseURL));
    }

    if (config.url) {
      config.url = normalizeUrl(String(config.url));
    }

    if (config.url && config.baseURL) {
      const fullUrl = config.baseURL + config.url;
      if (fullUrl.endsWith('/') && config.url !== '/') {
        config.url = normalizeUrl(config.url);
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = getRefreshToken();
        if (refreshToken) {
          const response = await api.post('/api/v1/auth/refresh', {
            refresh_token: refreshToken,
          });

          const { access_token } = response.data;
          localStorage.setItem('access_token', access_token);

          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        clearSessionTokens();
        window.location.href = '/login';
      }
    }

    if (error.response?.data) {
      error.response.data = {
        detail: error.response.data.detail || error.response.data.message || 'An error occurred',
        ...error.response.data,
      };
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (userData) => api.post('/api/v1/auth/register', userData),
  login: (credentials) => api.post('/api/v1/auth/login', credentials),
  logout: (refreshToken) => api.post('/api/v1/auth/logout', { refresh_token: refreshToken }),
  getCurrentUser: () => api.get('/api/v1/auth/me'),
  refreshToken: (refreshToken) => api.post('/api/v1/auth/refresh', { refresh_token: refreshToken }),
  listUsers: (limit = 100, offset = 0) => api.get(`/api/v1/auth/users?limit=${limit}&offset=${offset}`),
  getUser: (userId) => api.get(`/api/v1/auth/users/${userId}`),
  updateUser: (userId, userData) => api.put(`/api/v1/auth/users/${userId}`, userData),
};

export const platformAPI = {
  getBootstrap: () => api.get('/api/v1/platform/bootstrap'),
  updateUserAppAccess: (userId, payload) => api.put(`/api/v1/platform/users/${userId}/app-access`, payload),
};

export const tenantAPI = {
  createTenant: (tenantData) => api.post('/api/v1/tenants', tenantData),
  listTenants: (limit = 100, offset = 0) => api.get(`/api/v1/tenants?limit=${limit}&offset=${offset}`),
  getTenant: (tenantId) => api.get(`/api/v1/tenants/${tenantId}`),
  updateTenant: (tenantId, tenantData) => api.put(`/api/v1/tenants/${tenantId}`, tenantData),
  activateTenant: (tenantId) => api.post(`/api/v1/tenants/${tenantId}/activate`),
  deactivateTenant: (tenantId) => api.post(`/api/v1/tenants/${tenantId}/deactivate`),
  createBusinessInfo: (tenantId, businessData) => api.post(`/api/v1/tenants/${tenantId}/business-info`, businessData),
  getBusinessInfo: (tenantId) => api.get(`/api/v1/tenants/${tenantId}/business-info`),
  updateBusinessInfo: (tenantId, businessData) => api.put(`/api/v1/tenants/${tenantId}/business-info`, businessData),
  createAgentSettings: (tenantId, agentData) => api.post(`/api/v1/tenants/${tenantId}/agent-settings`, agentData),
  getAgentSettings: (tenantId) => api.get(`/api/v1/tenants/${tenantId}/agent-settings`),
  updateAgentSettings: (tenantId, agentData) => api.put(`/api/v1/tenants/${tenantId}/agent-settings`, agentData),
  createTwilioIntegration: (tenantId, twilioData) => api.post(`/api/v1/twilio-integration/tenant/${tenantId}/create`, twilioData),
  getTwilioIntegration: (tenantId) => api.get(`/api/v1/twilio-integration/tenant/${tenantId}`),
  updateTwilioIntegration: (tenantId, twilioData) => api.put(`/api/v1/twilio-integration/tenant/${tenantId}/update`, twilioData),
  deleteTwilioIntegration: (tenantId) => api.delete(`/api/v1/twilio-integration/tenant/${tenantId}`),
};

export const appointmentAPI = {
  createAppointment: (appointmentData) => api.post('/api/v1/appointments', appointmentData),
  getAppointment: (appointmentId) => api.get(`/api/v1/appointments/${appointmentId}`),
  listAppointments: (tenantId, params = {}) => api.get(`/api/v1/appointments/tenant/${tenantId}`, { params }),
  updateAppointmentStatus: (appointmentId, status, notes) => api.put(`/api/v1/appointments/${appointmentId}/status`, { status, notes }),
  cancelAppointment: (appointmentId, reason) => api.put(`/api/v1/appointments/${appointmentId}/cancel`, { reason }),
  rescheduleAppointment: (appointmentId, newDatetime, reason) => api.put(`/api/v1/appointments/${appointmentId}/reschedule`, { new_datetime: newDatetime, reason }),
  completeAppointment: (appointmentId, completionNotes) => api.put(`/api/v1/appointments/${appointmentId}/complete`, { completion_notes: completionNotes }),
  getUpcomingAppointments: (tenantId, daysAhead = 7) => api.get(`/api/v1/appointments/tenant/${tenantId}/upcoming?days_ahead=${daysAhead}`),
  getAppointmentsByDateRange: (tenantId, startDate, endDate) => api.get(`/api/v1/appointments/tenant/${tenantId}/date-range?start_date=${startDate}&end_date=${endDate}`),
  getAvailableSlots: (tenantId, targetDate, durationMinutes = 60) => api.get(`/api/v1/appointments/tenant/${tenantId}/available-slots?target_date=${targetDate}&duration_minutes=${durationMinutes}`),
  holdSlot: (tenantId, slotStart, slotEnd, customerName, customerPhone, holdDurationMinutes = 10) =>
    api.post(`/api/v1/appointments/tenant/${tenantId}/hold-slot`, {
      slot_start: slotStart,
      slot_end: slotEnd,
      customer_name: customerName,
      customer_phone: customerPhone,
      hold_duration_minutes: holdDurationMinutes,
    }),
  releaseSlotHold: (holdId) => api.delete(`/api/v1/appointments/hold/${holdId}`),
};

export const voiceAgentAPI = {
  startSession: (tenantId, serviceType, testMode = true, phoneNumber = null, metadata = null) =>
    api.post('/api/v1/voice-agent/start-session', {
      tenant_id: tenantId,
      service_type: serviceType,
      test_mode: testMode,
      phone_number: phoneNumber,
      metadata,
    }),
  endSession: (sessionId) => api.post(`/api/v1/voice-agent/end-session/${sessionId}`),
  getSessionStatus: (sessionId) => api.get(`/api/v1/voice-agent/session-status/${sessionId}`),
  getTenantSessions: (tenantId, activeOnly = true) => api.get(`/api/v1/voice-agent/tenant/${tenantId}/sessions?active_only=${activeOnly}`),
  getAgentStats: (tenantId) => api.get(`/api/v1/voice-agent/tenant/${tenantId}/agent-stats`),
  getCallHistory: (tenantId) => api.get(`/api/v1/voice-agent/tenant/${tenantId}/sessions?active_only=false`),
};

export const agentAPI = {
  createAgent: (tenantId, agentData) => api.post(`/api/v1/agents/tenant/${tenantId}`, agentData),
  listAgents: (tenantId) => api.get(`/api/v1/agents/tenant/${tenantId}`),
  getAgent: (agentId) => api.get(`/api/v1/agents/${agentId}`),
  updateAgent: (agentId, agentData) => api.put(`/api/v1/agents/${agentId}`, agentData),
  deleteAgent: (agentId) => api.delete(`/api/v1/agents/${agentId}`),
  activateAgent: (agentId) => api.post(`/api/v1/agents/${agentId}/activate`),
  deactivateAgent: (agentId) => api.post(`/api/v1/agents/${agentId}/deactivate`),
  getAvailableVoices: () => api.get('/api/v1/agents/voices/list'),
  getVoicePreviewUrl: (voiceId) => api.get(`/api/v1/agents/voices/preview/${voiceId}`),
};

export const chatbotAgentAPI = {
  createChatbotAgent: (chatbotData) => api.post('/api/v1/chatbot-agents', chatbotData),
  listChatbotAgents: (limit = 100, offset = 0) => api.get(`/api/v1/chatbot-agents?limit=${limit}&offset=${offset}`),
  getChatbotAgent: (chatbotId) => api.get(`/api/v1/chatbot-agents/${chatbotId}`),
  updateChatbotAgent: (chatbotId, chatbotData) => api.put(`/api/v1/chatbot-agents/${chatbotId}`, chatbotData),
  deleteChatbotAgent: (chatbotId) => api.delete(`/api/v1/chatbot-agents/${chatbotId}`),
  generateEmbedToken: (chatbotId, origin) => api.post(`/api/v1/chatbot-agents/${chatbotId}/embed-token`, { origin }),
  revokeEmbedTokens: (chatbotId) => api.post(`/api/v1/chatbot-agents/${chatbotId}/revoke-embed-tokens`),
  listRuntimeLogs: (chatbotId, limit = 100, statusFilter = '') =>
    api.get(`/api/v1/chatbot-agents/${chatbotId}/runtime-logs?limit=${limit}${statusFilter ? `&status_filter=${encodeURIComponent(statusFilter)}` : ''}`),
  getRuntimeKillSwitch: () => api.get('/api/v1/chatbot-agents/runtime/kill-switch'),
  setRuntimeKillSwitch: (enabled) => api.post('/api/v1/chatbot-agents/runtime/kill-switch', { enabled }),
  getEmbedConfig: (token) => api.get(`/api/v1/chatbot-embed/config?token=${encodeURIComponent(token)}`),
  listLiveChats: (limit = 100) => api.get(`/api/v1/chatbot-agents/live-chats?limit=${limit}`),
  getLiveChat: (sessionId) => api.get(`/api/v1/chatbot-agents/live-chats/${sessionId}`),
  takeOverLiveChat: (sessionId) => api.post(`/api/v1/chatbot-agents/live-chats/${sessionId}/takeover`),
  releaseLiveChat: (sessionId) => api.post(`/api/v1/chatbot-agents/live-chats/${sessionId}/release`),
  sendLiveChatMessage: (sessionId, payload) => api.post(`/api/v1/chatbot-agents/live-chats/${sessionId}/messages`, payload),
  closeLiveChat: (sessionId) => api.post(`/api/v1/chatbot-agents/live-chats/${sessionId}/close`),
  getLiveChatStreamUrl: (sessionId, accessToken) =>
    `${WS_BASE_URL}/api/v1/chatbot-agents/live-chats/${sessionId}/stream?access_token=${encodeURIComponent(accessToken || '')}`,
};

export const coldCallerAPI = {
  createCampaign: (payload) => coldCallerClient.post('/api/v1/cold-caller/campaigns', payload),
  listCampaigns: (tenantId, limit = 100, offset = 0) =>
    coldCallerClient.get(`/api/v1/cold-caller/campaigns?tenant_id=${tenantId}&limit=${limit}&offset=${offset}`),
  getCampaign: (campaignId) => coldCallerClient.get(`/api/v1/cold-caller/campaigns/${campaignId}`),
  updateCampaign: (campaignId, payload) => coldCallerClient.put(`/api/v1/cold-caller/campaigns/${campaignId}`, payload),
  uploadContacts: (campaignId, formData) =>
    coldCallerClient.post(`/api/v1/cold-caller/campaigns/${campaignId}/contacts/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  createIntroAudioUploadUrl: (campaignId, payload) =>
    coldCallerClient.post(`/api/v1/cold-caller/campaigns/${campaignId}/intro-audio/upload-url`, payload),
  confirmIntroAudio: (campaignId, payload) =>
    coldCallerClient.post(`/api/v1/cold-caller/campaigns/${campaignId}/intro-audio/confirm`, payload),
  controlCampaign: (campaignId, action) => coldCallerClient.post(`/api/v1/cold-caller/campaigns/${campaignId}/${action}`),
  listContacts: (campaignId, limit = 200, offset = 0) =>
    coldCallerClient.get(`/api/v1/cold-caller/campaigns/${campaignId}/contacts?limit=${limit}&offset=${offset}`),
  listAttempts: (campaignId, limit = 200, offset = 0) =>
    coldCallerClient.get(`/api/v1/cold-caller/campaigns/${campaignId}/attempts?limit=${limit}&offset=${offset}`),
  uploadDnc: (tenantId, formData) =>
    coldCallerClient.post(`/api/v1/cold-caller/dnc/upload?tenant_id=${tenantId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const telephonyAPI = {
  getTenantStatus: (tenantId) => api.get(`/api/v1/telephony/tenant/${tenantId}/status`),
  listTenantNumbers: (tenantId) => api.get(`/api/v1/telephony/tenant/${tenantId}/numbers`),
  bindColdCallerOutbound: (tenantId, phoneNumber) => api.post(`/api/v1/telephony/tenant/${tenantId}/cold-caller-outbound/bind`, { phone_number: phoneNumber }),
  unbindColdCallerOutbound: (tenantId, phoneNumber) => api.post(`/api/v1/telephony/tenant/${tenantId}/cold-caller-outbound/unbind`, { phone_number: phoneNumber }),
};

export const twilioIntegrationAPI = {
  createTwilioIntegration: tenantAPI.createTwilioIntegration,
  getTwilioIntegration: tenantAPI.getTwilioIntegration,
  updateTwilioIntegration: tenantAPI.updateTwilioIntegration,
  deleteTwilioIntegration: tenantAPI.deleteTwilioIntegration,
};

export const phoneNumberAPI = {
  createPhoneNumber: (tenantId, phoneData) => api.post(`/api/v1/phone-numbers/tenant/${tenantId}`, phoneData),
  listPhoneNumbers: (tenantId) => api.get(`/api/v1/phone-numbers/tenant/${tenantId}`),
  getPhoneNumber: (phoneId) => api.get(`/api/v1/phone-numbers/${phoneId}`),
  getPhoneByAgent: (agentId) => api.get(`/api/v1/phone-numbers/agent/${agentId}`),
  updatePhoneNumber: (phoneId, phoneData) => api.put(`/api/v1/phone-numbers/${phoneId}`, phoneData),
  deletePhoneNumber: (phoneId) => api.delete(`/api/v1/phone-numbers/${phoneId}`),
  assignPhoneToAgent: (tenantId, agentId, phoneNumber) => api.post(`/api/v1/phone-numbers/tenant/${tenantId}/assign`, {
    agent_id: agentId,
    phone_number: phoneNumber,
  }),
  unassignPhoneFromAgent: (agentId) => api.delete(`/api/v1/phone-numbers/agent/${agentId}/unassign`),
};

export const healthAPI = {
  check: () => api.get('/api/v1/health'.replace(/\/+$/, '')),
  detailed: () => api.get('/api/v1/health/detailed'.replace(/\/+$/, '')),
  ready: () => api.get('/api/v1/health/ready'.replace(/\/+$/, '')),
  live: () => api.get('/api/v1/health/live'.replace(/\/+$/, '')),
};

if (process.env.NODE_ENV !== 'test') {
  setTimeout(() => {
    healthAPI
      .check()
      .then((response) => {
        console.log('Backend Health Check:', {
          status: response.data.status,
          service: response.data.service,
          version: response.data.version,
          environment: response.data.environment,
          timestamp: response.data.timestamp,
        });
      })
      .catch((error) => {
        console.error('Backend Health Check Failed:', error.message);
        console.log('API Base URL:', API_BASE_URL);
      });
  }, 0);
}

export default api;
