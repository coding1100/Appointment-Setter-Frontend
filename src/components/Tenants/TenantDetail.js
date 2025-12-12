import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { tenantAPI, agentAPI } from '../../services/api';
import { 
  Building, 
  Clock, 
  ArrowLeft, 
  Edit, 
  Users, 
  Phone, 
  Settings,
  Calendar,
  Globe,
  Info
} from 'lucide-react';
import Loader from '../Loader';

const TenantDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [tenant, setTenant] = useState(null);
  const [businessInfo, setBusinessInfo] = useState(null);
  const [agentSettings, setAgentSettings] = useState(null);
  const [twilioIntegration, setTwilioIntegration] = useState(null);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchTenantDetails();
    }
  }, [id]);

  const fetchTenantDetails = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError('');

      // Fetch all tenant-related data in parallel
      const [tenantRes, businessRes, settingsRes, integrationRes, agentsRes] = await Promise.allSettled([
        tenantAPI.getTenant(id),
        tenantAPI.getBusinessInfo(id).catch(() => null),
        tenantAPI.getAgentSettings(id).catch(() => null),
        tenantAPI.getTwilioIntegration(id).catch(() => null),
        agentAPI.listAgents(id).catch(() => ({ data: [] }))
      ]);

      // Handle tenant data
      if (tenantRes.status === 'fulfilled') {
        setTenant(tenantRes.value.data);
      } else {
        throw new Error('Failed to fetch tenant information');
      }

      // Handle business info
      if (businessRes.status === 'fulfilled' && businessRes.value) {
        setBusinessInfo(businessRes.value.data);
      }

      // Handle agent settings
      if (settingsRes.status === 'fulfilled' && settingsRes.value) {
        setAgentSettings(settingsRes.value.data);
      }

      // Handle Twilio integration
      if (integrationRes.status === 'fulfilled' && integrationRes.value) {
        setTwilioIntegration(integrationRes.value.data);
      }

      // Handle agents
      if (agentsRes.status === 'fulfilled') {
        setAgents(agentsRes.value.data || []);
      }

    } catch (err) {
      const errorDetail = err.response?.data?.detail || err.message;
      setError(typeof errorDetail === 'string' ? errorDetail : 'Failed to load tenant details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loader message="Loading tenant details..." fullScreen />;
  }

  if (error && !tenant) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="mb-4">
            <button
              onClick={() => navigate('/tenants')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Tenants
            </button>
          </div>
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/tenants')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Tenants
          </button>
          
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <Building className="h-12 w-12 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{tenant.name}</h1>
                <p className="mt-1 text-sm text-gray-600">Tenant Details and Configuration</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link
                to={`/tenants/${tenant.id}/edit`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Info className="h-5 w-5 mr-2 text-blue-600" />
                  Basic Information
                </h2>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Tenant Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{tenant.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 flex items-center">
                      <Globe className="h-4 w-4 mr-1" />
                      Timezone
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">{tenant.timezone}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      Created
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(tenant.created_at).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(tenant.updated_at).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true
                      })}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Business Information */}
            {businessInfo && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Building className="h-5 w-5 mr-2 text-blue-600" />
                    Business Information
                  </h2>
                  <dl className="grid grid-cols-1 gap-4">
                    {businessInfo.business_name && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Business Name</dt>
                        <dd className="mt-1 text-sm text-gray-900">{businessInfo.business_name}</dd>
                      </div>
                    )}
                    {businessInfo.address && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Address</dt>
                        <dd className="mt-1 text-sm text-gray-900">{businessInfo.address}</dd>
                      </div>
                    )}
                    {businessInfo.phone && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Phone</dt>
                        <dd className="mt-1 text-sm text-gray-900">{businessInfo.phone}</dd>
                      </div>
                    )}
                    {businessInfo.email && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Email</dt>
                        <dd className="mt-1 text-sm text-gray-900">{businessInfo.email}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            )}

            {/* Agents */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-gray-900 flex items-center">
                    <Users className="h-5 w-5 mr-2 text-blue-600" />
                    Agents ({agents.length})
                  </h2>
                  <Link
                    to="/agents"
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Manage Agents →
                  </Link>
                </div>
                {agents.length > 0 ? (
                  <div className="space-y-3">
                    {agents.slice(0, 5).map((agent) => (
                      <div key={agent.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{agent.name}</p>
                          <p className="text-xs text-gray-500">{agent.service_type}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          agent.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {agent.status}
                        </span>
                      </div>
                    ))}
                    {agents.length > 5 && (
                      <p className="text-sm text-gray-500 text-center">
                        +{agents.length - 5} more agents
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No agents configured yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Twilio Integration */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-blue-600" />
                  Twilio Integration
                </h3>
                {twilioIntegration ? (
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Connected
                      </span>
                    </div>
                    {twilioIntegration.account_sid && (
                      <p className="text-xs text-gray-500 mt-2">
                        Account SID: {twilioIntegration.account_sid.substring(0, 10)}...
                      </p>
                    )}
                    <Link
                      to="/twilio-integration"
                      className="text-xs text-blue-600 hover:text-blue-800 mt-2 inline-block"
                    >
                      Manage Integration →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Not Connected
                    </span>
                    <Link
                      to="/twilio-integration"
                      className="text-xs text-blue-600 hover:text-blue-800 mt-2 inline-block"
                    >
                      Set Up Integration →
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Agent Settings */}
            {agentSettings && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
                    <Settings className="h-4 w-4 mr-2 text-blue-600" />
                    Agent Settings
                  </h3>
                  <p className="text-xs text-gray-500">
                    Custom agent settings are configured for this tenant.
                  </p>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <Link
                    to="/agents"
                    className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
                  >
                    Manage Agents
                  </Link>
                  <Link
                    to="/twilio-integration"
                    className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
                  >
                    Twilio Integration
                  </Link>
                  <Link
                    to="/voice-agent"
                    className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
                  >
                    Test Voice Agent
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantDetail;

