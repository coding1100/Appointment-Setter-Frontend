import axios from 'axios';

// API Configuration with environment detection
// Production-level configuration that handles multiple environments
const getApiBaseUrl = () => {
  const envUrl = process.env.REACT_APP_API_URL;
  
  // If no env variable is set, use default local dev URL
  if (!envUrl) {
    return 'http://localhost:8001';
  }
  
  // Remove trailing slash and return as-is (base URL should NOT include /api/v1)
  let baseUrl = envUrl.trim();
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }
  
  return baseUrl;
};

// Get base URL and ensure it has NO trailing slash
let API_BASE_URL = getApiBaseUrl();
// CRITICAL: Remove any trailing slashes from base URL
API_BASE_URL = API_BASE_URL.replace(/\/+$/, '');

// Validate and log API configuration in development
if (process.env.NODE_ENV === 'development') {
  console.log('🔗 API Base URL:', API_BASE_URL);
  
  // Warn about common configuration issues
  if (API_BASE_URL.includes('localhost:8000')) {
    console.warn('⚠️  WARNING: Using port 8000. Expected port 8001 for local development.');
    console.warn('   Update .env: REACT_APP_API_URL=http://localhost:8001');
  }
  
  if (API_BASE_URL.includes('/api/v1')) {
    console.warn('⚠️  WARNING: Base URL should NOT include /api/v1');
    console.warn('   Current:', API_BASE_URL);
    console.warn('   Expected format: http://localhost:8001');
    console.warn('   Endpoints will include /api/v1 prefix automatically');
  }
  
  // Warn if base URL has trailing slash (should never happen after normalization)
  if (API_BASE_URL.endsWith('/')) {
    console.error('❌ ERROR: API Base URL has trailing slash after normalization!');
    console.error('   This should never happen. Please check getApiBaseUrl() function.');
  }
}

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout (agent creation can take 5-10 seconds on first call)
});

// Helper function to normalize URLs - removes trailing slashes
const normalizeUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  // Remove trailing slashes except for root path '/'
  return url === '/' ? url : url.replace(/\/+$/, '');
};

// Request interceptor to add auth token and normalize URLs
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // CRITICAL: Remove trailing slashes from all API paths to prevent 301 redirects
    // This prevents Nginx from redirecting and causing CORS issues
    
    // Normalize baseURL - remove ALL trailing slashes
    if (config.baseURL) {
      config.baseURL = normalizeUrl(String(config.baseURL));
    }
    
    // Normalize url - remove trailing slashes (but preserve root path '/')
    if (config.url) {
      config.url = normalizeUrl(String(config.url));
    }
    
    // Final check: normalize the full URL if axios has resolved it
    // This catches any trailing slashes that might have been added during axios's internal processing
    if (config.url && config.baseURL) {
      const fullUrl = config.baseURL + config.url;
      // If the combined URL has a trailing slash, fix the url part
      if (fullUrl.endsWith('/') && config.url !== '/') {
        config.url = normalizeUrl(config.url);
      }
    }
    
    // Debug logging in development to track URL normalization
    if (process.env.NODE_ENV === 'development' && config.url) {
      const finalUrl = (config.baseURL || '') + (config.url || '');
      if (finalUrl.endsWith('/') && config.url !== '/') {
        console.warn('⚠️ URL normalization warning:', {
          baseURL: config.baseURL,
          url: config.url,
          finalUrl: finalUrl
        });
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await api.post('/api/v1/auth/refresh', {
            refresh_token: refreshToken
          });
          
          const { access_token } = response.data;
          localStorage.setItem('access_token', access_token);
          
          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }
    
    // Ensure error response is properly formatted
    if (error.response?.data) {
      error.response.data = {
        detail: error.response.data.detail || error.response.data.message || 'An error occurred',
        ...error.response.data
      };
    }
    
    return Promise.reject(error);
  }
);

// Authentication API
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

// Tenant API
export const tenantAPI = {
  createTenant: (tenantData) => api.post('/api/v1/tenants', tenantData),
  listTenants: (limit = 100, offset = 0) => api.get(`/api/v1/tenants?limit=${limit}&offset=${offset}`),
  getTenant: (tenantId) => api.get(`/api/v1/tenants/${tenantId}`),
  updateTenant: (tenantId, tenantData) => api.put(`/api/v1/tenants/${tenantId}`, tenantData),
  activateTenant: (tenantId) => api.post(`/api/v1/tenants/${tenantId}/activate`),
  deactivateTenant: (tenantId) => api.post(`/api/v1/tenants/${tenantId}/deactivate`),
  
  // Business Info
  createBusinessInfo: (tenantId, businessData) => api.post(`/api/v1/tenants/${tenantId}/business-info`, businessData),
  getBusinessInfo: (tenantId) => api.get(`/api/v1/tenants/${tenantId}/business-info`),
  updateBusinessInfo: (tenantId, businessData) => api.put(`/api/v1/tenants/${tenantId}/business-info`, businessData),
  
  // Agent Settings
  createAgentSettings: (tenantId, agentData) => api.post(`/api/v1/tenants/${tenantId}/agent-settings`, agentData),
  getAgentSettings: (tenantId) => api.get(`/api/v1/tenants/${tenantId}/agent-settings`),
  updateAgentSettings: (tenantId, agentData) => api.put(`/api/v1/tenants/${tenantId}/agent-settings`, agentData),
  
  // Twilio Integration (FIXED: Using correct dedicated router endpoints)
  createTwilioIntegration: (tenantId, twilioData) => api.post(`/api/v1/twilio-integration/tenant/${tenantId}/create`, twilioData),
  getTwilioIntegration: (tenantId) => api.get(`/api/v1/twilio-integration/tenant/${tenantId}`),
  updateTwilioIntegration: (tenantId, twilioData) => api.put(`/api/v1/twilio-integration/tenant/${tenantId}/update`, twilioData),
  deleteTwilioIntegration: (tenantId) => api.delete(`/api/v1/twilio-integration/tenant/${tenantId}`),
};

// Appointment API
export const appointmentAPI = {
  createAppointment: (appointmentData) => api.post('/api/v1/appointments', appointmentData),
  getAppointment: (appointmentId) => api.get(`/api/v1/appointments/${appointmentId}`),
  listAppointments: (tenantId, params = {}) => api.get(`/api/v1/appointments/tenant/${tenantId}`, { params }),
  updateAppointmentStatus: (appointmentId, status, notes) => 
    api.put(`/api/v1/appointments/${appointmentId}/status`, { status, notes }),
  cancelAppointment: (appointmentId, reason) => 
    api.put(`/api/v1/appointments/${appointmentId}/cancel`, { reason }),
  rescheduleAppointment: (appointmentId, newDatetime, reason) => 
    api.put(`/api/v1/appointments/${appointmentId}/reschedule`, { new_datetime: newDatetime, reason }),
  completeAppointment: (appointmentId, completionNotes) => 
    api.put(`/api/v1/appointments/${appointmentId}/complete`, { completion_notes: completionNotes }),
  getUpcomingAppointments: (tenantId, daysAhead = 7) => 
    api.get(`/api/v1/appointments/tenant/${tenantId}/upcoming?days_ahead=${daysAhead}`),
  getAppointmentsByDateRange: (tenantId, startDate, endDate) => 
    api.get(`/api/v1/appointments/tenant/${tenantId}/date-range?start_date=${startDate}&end_date=${endDate}`),
  getAvailableSlots: (tenantId, targetDate, durationMinutes = 60) => 
    api.get(`/api/v1/appointments/tenant/${tenantId}/available-slots?target_date=${targetDate}&duration_minutes=${durationMinutes}`),
  holdSlot: (tenantId, slotStart, slotEnd, customerName, customerPhone, holdDurationMinutes = 10) => 
    api.post(`/api/v1/appointments/tenant/${tenantId}/hold-slot`, {
      slot_start: slotStart,
      slot_end: slotEnd,
      customer_name: customerName,
      customer_phone: customerPhone,
      hold_duration_minutes: holdDurationMinutes
    }),
  releaseSlotHold: (holdId) => api.delete(`/api/v1/appointments/hold/${holdId}`),
};

// Voice Agent API (Unified)
export const voiceAgentAPI = {
  // Start session (browser testing or phone call)
  startSession: (tenantId, serviceType, testMode = true, phoneNumber = null, metadata = null) =>
    api.post('/api/v1/voice-agent/start-session', {
      tenant_id: tenantId,
      service_type: serviceType,
      test_mode: testMode,
      phone_number: phoneNumber,
      metadata: metadata
    }),

  // End session
  endSession: (sessionId) => api.post(`/api/v1/voice-agent/end-session/${sessionId}`),

  // Get session status
  getSessionStatus: (sessionId) => api.get(`/api/v1/voice-agent/session-status/${sessionId}`),

  // Get all sessions for a tenant
  getTenantSessions: (tenantId, activeOnly = true) =>
    api.get(`/api/v1/voice-agent/tenant/${tenantId}/sessions?active_only=${activeOnly}`),

  // Get agent statistics for a tenant
  getAgentStats: (tenantId) => api.get(`/api/v1/voice-agent/tenant/${tenantId}/agent-stats`),

  // Get call history for a tenant
  getCallHistory: (tenantId) => api.get(`/api/v1/voice-agent/tenant/${tenantId}/sessions?active_only=false`),
};

// Agent Management API
export const agentAPI = {
  // Create a new agent
  createAgent: (tenantId, agentData) => api.post(`/api/v1/agents/tenant/${tenantId}`, agentData),
  
  // List all agents for a tenant
  listAgents: (tenantId) => api.get(`/api/v1/agents/tenant/${tenantId}`),
  
  // Get agent by ID
  getAgent: (agentId) => api.get(`/api/v1/agents/${agentId}`),
  
  // Update agent
  updateAgent: (agentId, agentData) => api.put(`/api/v1/agents/${agentId}`, agentData),
  
  // Delete agent
  deleteAgent: (agentId) => api.delete(`/api/v1/agents/${agentId}`),
  
  // Activate agent
  activateAgent: (agentId) => api.post(`/api/v1/agents/${agentId}/activate`),
  
  // Deactivate agent
  deactivateAgent: (agentId) => api.post(`/api/v1/agents/${agentId}/deactivate`),
  
  // Get available voices
  getAvailableVoices: () => api.get('/api/v1/agents/voices/list'),
  
  // Get voice preview audio URL
  getVoicePreviewUrl: (voiceId) => api.get(`/api/v1/agents/voices/preview/${voiceId}`),
};

// Phone Number Management API
export const phoneNumberAPI = {
  // Create phone number assignment
  createPhoneNumber: (tenantId, phoneData) => api.post(`/api/v1/phone-numbers/tenant/${tenantId}`, phoneData),
  
  // List all phone numbers for a tenant
  listPhoneNumbers: (tenantId) => api.get(`/api/v1/phone-numbers/tenant/${tenantId}`),
  
  // Get phone number by ID
  getPhoneNumber: (phoneId) => api.get(`/api/v1/phone-numbers/${phoneId}`),
  
  // Get phone number assigned to agent
  getPhoneByAgent: (agentId) => api.get(`/api/v1/phone-numbers/agent/${agentId}`),
  
  // Update phone number assignment
  updatePhoneNumber: (phoneId, phoneData) => api.put(`/api/v1/phone-numbers/${phoneId}`, phoneData),
  
  // Delete phone number assignment
  deletePhoneNumber: (phoneId) => api.delete(`/api/v1/phone-numbers/${phoneId}`),
  
  // Assign phone number to agent
  assignPhoneToAgent: (tenantId, agentId, phoneNumber) => 
    api.post(`/api/v1/phone-numbers/tenant/${tenantId}/assign`, {
      agent_id: agentId,
      phone_number: phoneNumber
    }),
  
  // Unassign phone number from agent
  unassignPhoneFromAgent: (agentId) => api.delete(`/api/v1/phone-numbers/agent/${agentId}/unassign`),
};

// Health Check API
// CRITICAL: Explicitly ensure no trailing slashes in health check endpoints
export const healthAPI = {
  check: () => {
    // Explicitly remove any trailing slash that might be added
    return api.get('/api/v1/health'.replace(/\/+$/, ''));
  },
  detailed: () => api.get('/api/v1/health/detailed'.replace(/\/+$/, '')),
  ready: () => api.get('/api/v1/health/ready'.replace(/\/+$/, '')),
  live: () => api.get('/api/v1/health/live'.replace(/\/+$/, '')),
};

// Check backend health on API service load and log to console
// Use setTimeout to ensure axios interceptors are fully initialized
setTimeout(() => {
  healthAPI.check()
    .then((response) => {
      console.log('✅ Backend Health Check:', {
        status: response.data.status,
        service: response.data.service,
        version: response.data.version,
        environment: response.data.environment,
        timestamp: response.data.timestamp
      });
    })
    .catch((error) => {
      console.error('❌ Backend Health Check Failed:', error.message);
      console.log('API Base URL:', API_BASE_URL);
      if (error.config) {
        console.log('Request URL:', error.config.url);
        console.log('Request Base URL:', error.config.baseURL);
        console.log('Full URL would be:', (error.config.baseURL || '') + (error.config.url || ''));
      }
    });
}, 0);

export default api;
