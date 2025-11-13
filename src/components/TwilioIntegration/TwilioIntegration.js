import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api, { tenantAPI, agentAPI, phoneNumberAPI } from '../../services/api';
import { Phone, CheckCircle, XCircle, AlertCircle, Settings, TestTube, User, Users, ShoppingCart, Search, Copy, RefreshCw, Info, ChevronDown, ChevronUp, Globe2, Key } from 'lucide-react';

// Get API base URL for direct fetch calls (should NOT include /api/v1)
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001';

const TwilioIntegration = () => {
  const { user } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [integration, setIntegration] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [agents, setAgents] = useState([]);
  const [phoneAssignments, setPhoneAssignments] = useState([]);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [flowMode, setFlowMode] = useState('tenant'); // tenant | system | tenant-purchase
  const [unassignedNumbers, setUnassignedNumbers] = useState([]);
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [searchParams, setSearchParams] = useState({ country: 'US', numberType: 'local', areaCode: '' });
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [copyToast, setCopyToast] = useState('');

  // Simplified form state - just credentials for initial setup
  const [formData, setFormData] = useState({
    accountSid: '',
    authToken: '',
    webhookUrl: '',
    statusCallbackUrl: ''
  });

  useEffect(() => {
    fetchTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedTenant) {
      fetchIntegration();
      fetchAgents();
      fetchPhoneAssignments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenant]);

  const fetchTenants = async () => {
    try {
      const response = await tenantAPI.listTenants();
      const tenantsList = Array.isArray(response.data) ? response.data : [];
      
      setTenants(tenantsList);
      
      if (tenantsList.length > 0 && !selectedTenant) {
        setSelectedTenant(tenantsList[0].id);
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
      setTenants([]);
    }
  };

  const fetchIntegration = async () => {
    if (!selectedTenant) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/twilio-integration/tenant/${selectedTenant}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setIntegration(data);
        setFormData({
          accountSid: data.account_sid || '',
          authToken: '', // Never populate for security
          webhookUrl: data.webhook_url || '',
          statusCallbackUrl: data.status_callback_url || ''
        });
      } else {
        setIntegration(null);
        setFormData({
          accountSid: '',
          authToken: '',
          webhookUrl: '',
          statusCallbackUrl: ''
        });
      }
    } catch (error) {
      console.error('Error fetching integration:', error);
    }
  };

  const fetchUnassignedNumbers = async () => {
    if (!selectedTenant) return;
    if (flowMode === 'tenant' && !integration) {
      setError('Please configure Twilio integration first');
      return;
    }
    setLoading(true);
    setError('');
    try {
      let url;
      if (flowMode === 'system') {
        url = `${API_BASE_URL}/api/v1/twilio-integration/system/unassigned?tenant_id=${selectedTenant}`;
      } else {
        url = `${API_BASE_URL}/api/v1/twilio-integration/tenant/${selectedTenant}/unassigned`;
      }
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data) {
        setUnassignedNumbers(data.phone_numbers || []);
        setSuccess(`Found ${data.phone_numbers?.length || 0} unassigned numbers`);
      }
    } catch (e) {
      console.error('Error fetching unassigned numbers', e);
      let errorMsg = 'Failed to fetch unassigned numbers';
      if (e.message) {
        errorMsg = e.message;
      } else if (typeof e === 'string') {
        errorMsg = e;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const testCredentials = async () => {
    if (!formData.accountSid || !formData.authToken) {
      setError('Please fill in Account SID and Auth Token');
      return;
    }

    setLoading(true);
    setError('');
    setTestResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/twilio-integration/test-credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          account_sid: formData.accountSid,
          auth_token: formData.authToken
          // phone_number is now optional
        })
      });

      const result = await response.json();

      if (response.ok) {
        setTestResult(result);
        setSuccess('Credentials tested successfully!');
      } else {
        setError(result.detail || result.message || 'Failed to test credentials');
      }
    } catch (error) {
      setError('Failed to test credentials');
    } finally {
      setLoading(false);
    }
  };

  const searchAvailable = async () => {
    if (!selectedTenant) return;
    if (flowMode === 'tenant-purchase' && !integration) {
      setError('Please configure Twilio integration first');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = {
        mode: flowMode === 'system' ? 'system' : 'tenant',
        tenant_id: selectedTenant,
        country: searchParams.country || 'US',
        number_type: searchParams.numberType || 'local',
        area_code: searchParams.areaCode || undefined,
      };
      const res = await api.post('/api/v1/twilio-integration/search-available', payload);
      setAvailableNumbers(res.data.available_numbers || []);
      setSuccess(`Found ${res.data.available_numbers?.length || 0} available numbers`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to search numbers');
    } finally {
      setLoading(false);
    }
  };

  const purchaseNumber = async (phoneNumber) => {
    if (!selectedTenant || !phoneNumber) return;
    if (flowMode === 'tenant-purchase' && !integration) {
      setError('Please configure Twilio integration first');
      return;
    }
    setPurchaseLoading(true);
    setError('');
    setSuccess('');
    try {
      if (flowMode === 'system') {
        await api.post('/api/v1/twilio-integration/system/purchase', {
          tenant_id: selectedTenant,
          phone_number: phoneNumber,
        });
        setSuccess('Phone number purchased via system account!');
      } else {
        await api.post(`/api/v1/twilio-integration/tenant/${selectedTenant}/purchase`, {
          phone_number: phoneNumber,
        });
        setSuccess('Phone number purchased via your account!');
      }
      // Refresh lists
      if (flowMode === 'tenant') {
        fetchUnassignedNumbers();
      }
      fetchPhoneAssignments();
      // Pre-select for assignment if agent selected
      if (selectedAgentId) {
        await handleAssignPhone(selectedAgentId, phoneNumber);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to purchase number');
    } finally {
      setPurchaseLoading(false);
    }
  };

  const saveIntegration = async () => {
    if (!selectedTenant) {
      setError('Please select a tenant');
      return;
    }

    if (!formData.accountSid || !formData.authToken) {
      setError('Please fill in Account SID and Auth Token');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const url = integration 
        ? `${API_BASE_URL}/api/v1/twilio-integration/tenant/${selectedTenant}/update`
        : `${API_BASE_URL}/api/v1/twilio-integration/tenant/${selectedTenant}/create`;

      const response = await fetch(url, {
        method: integration ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          account_sid: formData.accountSid,
          auth_token: formData.authToken,
          phone_number: '', // Not required for initial setup
          webhook_url: formData.webhookUrl || null,
          status_callback_url: formData.statusCallbackUrl || null
        })
      });

      // Clone response to read it multiple times if needed
      const responseClone = response.clone();
      let result;
      
      try {
        result = await response.json();
      } catch (jsonError) {
        // If response is not JSON, get text instead
        try {
          const text = await responseClone.text();
          setError(`Server error (${response.status}): ${text || 'Unknown error'}`);
        } catch (textError) {
          setError(`Server error (${response.status}): Unable to read response`);
        }
        setLoading(false);
        return;
      }

      if (response.ok) {
        setSuccess(integration ? 'Integration updated successfully!' : 'Integration created! Now you can manage phone numbers below.');
        fetchIntegration();
      } else {
        // Show detailed error message
        const errorMsg = result.detail || result.message || `Server returned ${response.status}: ${response.statusText}`;
        setError(errorMsg);
      }
    } catch (error) {
      console.error('Error saving integration:', error);
      setError(`Network error: ${error.message || 'Failed to save integration. Please check your connection and try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteIntegration = async () => {
    if (!selectedTenant || !integration) return;

    if (!window.confirm('Are you sure you want to delete this integration? This will also remove all phone number assignments.')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/twilio-integration/tenant/${selectedTenant}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (response.ok) {
        setSuccess('Integration deleted successfully');
        setIntegration(null);
        setFormData({
          accountSid: '',
          authToken: '',
          webhookUrl: '',
          statusCallbackUrl: ''
        });
        fetchPhoneAssignments();
      } else {
        const result = await response.json();
        setError(result.detail || result.message || 'Failed to delete integration');
      }
    } catch (error) {
      setError('Failed to delete integration');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const fetchAgents = async () => {
    if (!selectedTenant) return;
    
    try {
      const response = await agentAPI.listAgents(selectedTenant);
      setAgents(response.data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const fetchPhoneAssignments = async () => {
    if (!selectedTenant) return;
    
    try {
      const response = await phoneNumberAPI.listPhoneNumbers(selectedTenant);
      setPhoneAssignments(response.data || []);
    } catch (error) {
      console.error('Error fetching phone assignments:', error);
    }
  };

  const handleAssignPhone = async (agentId, phoneNumber) => {
    if (!phoneNumber || !phoneNumber.trim()) {
      setError('Please enter a phone number');
      return;
    }

    setAssignmentLoading(true);
    setError('');
    setSuccess('');

    try {
      await phoneNumberAPI.assignPhoneToAgent(selectedTenant, agentId, phoneNumber);
      setSuccess('Phone number assigned successfully!');
      fetchPhoneAssignments();
      fetchUnassignedNumbers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to assign phone number');
    } finally {
      setAssignmentLoading(false);
    }
  };

  const handleUnassignPhone = async (agentId) => {
    if (!window.confirm('Are you sure you want to unassign this phone number?')) {
      return;
    }

    setAssignmentLoading(true);
    setError('');
    setSuccess('');

    try {
      await phoneNumberAPI.unassignPhoneFromAgent(agentId);
      setSuccess('Phone number unassigned successfully!');
      fetchPhoneAssignments();
      fetchUnassignedNumbers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to unassign phone number');
    } finally {
      setAssignmentLoading(false);
    }
  };

  const getAssignedPhone = (agentId) => {
    return phoneAssignments.find(p => p.agent_id === agentId);
  };

  const capabilityBadge = (label, enabled) => (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mr-1 ${enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}
    >
      {label}
    </span>
  );

  const NumberRow = ({ n, right, showCountry = true }) => (
    <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:shadow-sm transition bg-white">
      <div className="flex-1">
        <div className="flex items-center space-x-2 mb-1">
          <p className="font-semibold text-gray-900">{n.phone_number}</p>
          {showCountry && n.iso_country && (
            <span className="text-[10px] uppercase tracking-wide bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{n.iso_country}</span>
          )}
        </div>
        {n.friendly_name && <p className="text-xs text-gray-500 mb-2">{n.friendly_name}</p>}
        <div className="flex items-center">
          {capabilityBadge('voice', Boolean(n.capabilities?.voice))}
          {capabilityBadge('sms', Boolean(n.capabilities?.sms))}
          {capabilityBadge('mms', Boolean(n.capabilities?.mms))}
        </div>
      </div>
      <div className="flex items-center space-x-2 ml-4">
        <button
          onClick={() => { 
            navigator.clipboard.writeText(n.phone_number); 
            setCopyToast(n.phone_number); 
            setTimeout(() => setCopyToast(''), 1500); 
          }}
          className="inline-flex items-center px-2 py-1 border border-gray-200 text-xs rounded-md text-gray-600 hover:bg-gray-50"
          title="Copy number"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        {right}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Twilio Integration</h1>
          <p className="mt-2 text-gray-600">
            Connect your Twilio account to enable voice agent phone calls. You can also purchase numbers using our system account.
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
            <XCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            <span>{typeof error === 'string' ? error : JSON.stringify(error)}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
            <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            <span>{typeof success === 'string' ? success : JSON.stringify(success)}</span>
          </div>
        )}

        {/* Step 1: Connect Twilio Account */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                  <Key className="h-5 w-5 mr-2 text-blue-600" />
                  Step 1: Connect Twilio Account
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Enter your Twilio credentials. Phone numbers can be added in the next step.
                </p>
              </div>
              {integration && (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  <span className="font-medium">Connected</span>
                </div>
              )}
            </div>

            {/* Tenant Selection */}
            <div className="mb-4">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Account SID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account SID *
                </label>
                <input
                  type="text"
                  name="accountSid"
                  value={formData.accountSid}
                  onChange={handleInputChange}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              {/* Auth Token */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Auth Token *
                </label>
                <input
                  type="password"
                  name="authToken"
                  value={formData.authToken}
                  onChange={handleInputChange}
                  placeholder="Enter your Twilio Auth Token"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Advanced Settings (Collapsible) */}
            <div className="mb-4">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                {showAdvanced ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                Advanced Settings (Optional)
              </button>
              
              {showAdvanced && (
                <div className="mt-3 space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-xs text-gray-500 mb-3">
                    <Info className="h-4 w-4 inline mr-1" />
                    Webhooks are automatically configured from TWILIO_WEBHOOK_BASE_URL if left empty. Only override if you need custom URLs.
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Webhook URL
                    </label>
                    <input
                      type="url"
                      name="webhookUrl"
                      value={formData.webhookUrl}
                      onChange={handleInputChange}
                      placeholder="https://your-domain.com/api/v1/voice-agent/twilio/webhook"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Status Callback URL
                    </label>
                    <input
                      type="url"
                      name="statusCallbackUrl"
                      value={formData.statusCallbackUrl}
                      onChange={handleInputChange}
                      placeholder="https://your-domain.com/api/v1/voice-agent/twilio/status"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={testCredentials}
                disabled={loading || !formData.accountSid || !formData.authToken}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <TestTube className="h-4 w-4 mr-2" />
                {loading ? 'Testing...' : 'Test Credentials'}
              </button>

              <button
                onClick={saveIntegration}
                disabled={loading || !formData.accountSid || !formData.authToken}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Settings className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : (integration ? 'Update Integration' : 'Save Integration')}
              </button>

              {integration && (
                <button
                  onClick={deleteIntegration}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Delete
                </button>
              )}
            </div>

            {/* Test Results */}
            {testResult && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center text-blue-700 mb-2">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  <span className="font-medium">Credentials Verified</span>
                </div>
                <div className="text-sm text-blue-800">
                  <p><strong>Account:</strong> {testResult.account_info?.friendly_name || 'Verified'}</p>
                  <p><strong>Status:</strong> {testResult.account_info?.status || 'Active'}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Phone Number Management */}
        {selectedTenant && agents.length > 0 && (
          <div className="bg-white shadow rounded-lg mb-8">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                    <Phone className="h-5 w-5 mr-2 text-blue-600" />
                    Step 2: Manage Phone Numbers
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {integration ? 'Use your existing numbers or buy new ones' : 'Buy phone numbers using our system account or connect your own'}
                  </p>
                </div>
              </div>

              {/* Agent and Flow Selection */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Agent
                  </label>
                  <select
                    value={selectedAgentId}
                    onChange={(e) => setSelectedAgentId(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">Choose an agent</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Action
                  </label>
                  <select
                    value={flowMode}
                    onChange={(e) => { 
                      setFlowMode(e.target.value); 
                      setAvailableNumbers([]); 
                      setUnassignedNumbers([]); 
                    }}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    {integration ? (
                      <>
                        <option value="tenant">Use my existing numbers</option>
                        <option value="tenant-purchase">Buy from my Twilio account</option>
                      </>
                    ) : (
                      <option value="system">Buy from system account</option>
                    )}
                  </select>
                </div>
                <div className="flex items-end">
                  {(flowMode === 'tenant' || flowMode === 'system') && (
                    <button
                      onClick={fetchUnassignedNumbers}
                      disabled={loading}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 w-full justify-center"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" /> Load Numbers
                    </button>
                  )}
                </div>
              </div>

              {/* Unassigned Numbers List */}
              {flowMode === 'tenant' && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-md font-semibold text-gray-900">Your Unassigned Numbers</h4>
                    {unassignedNumbers.length > 0 && (
                      <span className="text-sm text-gray-500">{unassignedNumbers.length} available</span>
                    )}
                  </div>
                  {!integration ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <Info className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                        <div>
                          <p className="text-sm text-yellow-800 font-medium">Connect your Twilio account first</p>
                          <p className="text-xs text-yellow-700 mt-1">
                            Please save your credentials in Step 1 above to use your existing phone numbers.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {unassignedNumbers.map((n, idx) => (
                        <NumberRow
                          key={idx}
                          n={n}
                          right={(
                            <button
                              disabled={!selectedAgentId || assignmentLoading}
                              onClick={() => handleAssignPhone(selectedAgentId, n.phone_number)}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Phone className="h-4 w-4 mr-1" /> Assign
                            </button>
                          )}
                        />
                      ))}
                      {unassignedNumbers.length === 0 && (
                        <div className="text-center py-8 text-gray-500 border border-gray-200 rounded-lg">
                          <Phone className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm">No unassigned numbers found.</p>
                          <p className="text-xs mt-1">Click "Load Numbers" to refresh or buy numbers below.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Search & Purchase */}
              {(flowMode === 'tenant-purchase' || flowMode === 'system') && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-md font-semibold text-gray-900">
                      {flowMode === 'system' ? 'Buy Phone Number from System Account' : 'Buy Phone Number from Your Account'}
                    </h4>
                    {availableNumbers.length > 0 && (
                      <span className="text-sm text-gray-500">{availableNumbers.length} available</span>
                    )}
                  </div>
                  {flowMode === 'tenant-purchase' && !integration && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                      <div className="flex items-start">
                        <Info className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                        <p className="text-sm text-yellow-800">
                          Please connect your Twilio account in Step 1 first to purchase numbers from your account.
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                    <input
                      type="text"
                      placeholder="Country (e.g., US)"
                      value={searchParams.country}
                      onChange={(e) => setSearchParams(p => ({ ...p, country: e.target.value }))}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    <select
                      value={searchParams.numberType}
                      onChange={(e) => setSearchParams(p => ({ ...p, numberType: e.target.value }))}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="local">Local</option>
                      <option value="tollfree">Toll-Free</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Area code (optional)"
                      value={searchParams.areaCode}
                      onChange={(e) => setSearchParams(p => ({ ...p, areaCode: e.target.value }))}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    <button
                      onClick={searchAvailable}
                      disabled={loading}
                      className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Search className="h-4 w-4 mr-2" /> Search
                    </button>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {availableNumbers.map((n, idx) => (
                      <NumberRow
                        key={idx}
                        n={n}
                        right={(
                          <button
                            onClick={() => purchaseNumber(n.phone_number)}
                            disabled={purchaseLoading || !selectedAgentId}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ShoppingCart className="h-4 w-4 mr-1" /> Purchase
                          </button>
                        )}
                      />
                    ))}
                    {availableNumbers.length === 0 && (
                      <div className="text-center py-8 text-gray-500 border border-gray-200 rounded-lg">
                        <Search className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">No results yet.</p>
                        <p className="text-xs mt-1">Enter search criteria above and click "Search" to find available numbers.</p>
                      </div>
                    )}
                  </div>
                  {copyToast && (
                    <div className="mt-2 text-xs text-green-600 flex items-center">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Copied {copyToast}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Current Assignments Overview */}
        {selectedTenant && agents.length > 0 && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center mb-6">
                <Users className="h-6 w-6 text-blue-600 mr-2" />
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Step 3: Phone Number Assignments
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    View and manage phone numbers assigned to your agents
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {agents.map((agent) => {
                  const assignedPhone = getAssignedPhone(agent.id);
                  const allAssignments = phoneAssignments.filter(p => p.agent_id === agent.id);

                  return (
                    <div key={agent.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="flex-shrink-0">
                            <User className="h-10 w-10 text-blue-600 bg-blue-50 p-2 rounded-full" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900">{agent.name}</h4>
                            <p className="text-sm text-gray-500 capitalize">{agent.service_type}</p>
                            <p className="text-xs text-gray-400 mt-1">Language: {agent.language}</p>
                            
                            {allAssignments.length > 0 ? (
                              <div className="mt-3 space-y-2">
                                {allAssignments.map((assignment) => (
                                  <div key={assignment.id} className="flex items-center space-x-2 bg-gray-50 p-2 rounded">
                                    <div className="flex items-center text-green-600 flex-1">
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      <span className="text-sm font-medium">{assignment.phone_number}</span>
                                    </div>
                                    <button
                                      onClick={() => handleUnassignPhone(agent.id)}
                                      disabled={assignmentLoading}
                                      className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="mt-3 text-xs text-gray-400">
                                No phone number assigned yet. Use Step 2 above to assign a number.
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex-shrink-0 ml-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            agent.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {agent.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {agents.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <User className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>No agents found. Create agents first before assigning phone numbers.</p>
                  <a
                    href="/agents"
                    className="inline-flex items-center mt-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Create Agents
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-3 flex items-center">
            <Globe2 className="h-5 w-5 mr-2" />
            Quick Start Guide
          </h3>
          <div className="text-sm text-blue-800 space-y-2">
            <div className="flex items-start">
              <span className="font-semibold mr-2">1.</span>
              <div>
                <p className="font-medium">Connect your Twilio account (optional)</p>
                <p className="text-xs text-blue-700 mt-1">
                  Enter your Account SID and Auth Token. You can find these in your{' '}
                  <a href="https://console.twilio.com/" target="_blank" rel="noopener noreferrer" className="underline">Twilio Console</a>.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="font-semibold mr-2">2.</span>
              <div>
                <p className="font-medium">Manage phone numbers</p>
                <p className="text-xs text-blue-700 mt-1">
                  You can use existing numbers from your account, buy new numbers from your account, or buy from our system account (no credentials needed).
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="font-semibold mr-2">3.</span>
              <div>
                <p className="font-medium">Assign to agents</p>
                <p className="text-xs text-blue-700 mt-1">
                  Select an agent and assign a phone number. One number can be assigned to one agent, but one agent can have multiple numbers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TwilioIntegration;
