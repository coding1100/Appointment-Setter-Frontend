import React, { useState, useEffect } from 'react';
import { tenantAPI } from '../../services/api';
import AgentList from './AgentList';
import { Building } from 'lucide-react';

const AgentManagement = () => {
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

useEffect(() => {
  fetchTenants();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  const formatError = (err, defaultMsg) => {
    const errorDetail = err.response?.data?.detail;
    if (Array.isArray(errorDetail)) {
      return errorDetail.map(e => `${e.loc?.join('.')} - ${e.msg}`).join(', ');
    }
    return typeof errorDetail === 'string' ? errorDetail : defaultMsg;
  };

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const response = await tenantAPI.listTenants();
      const tenantsList = Array.isArray(response.data) ? response.data : [];
      
      setTenants(tenantsList);
      
      // Auto-select first tenant if available
      if (tenantsList.length > 0) {
        setSelectedTenant(tenantsList[0].id);
      }
      
      setError('');
    } catch (err) {
      setError(formatError(err, 'Failed to fetch tenants'));
      setTenants([]); // Ensure we always have an array
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (tenants.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No tenants found</h3>
            <p className="text-gray-600 mb-6">
              You need to create a tenant before managing agents
            </p>
            <a
              href="/tenants/create"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Create First Tenant
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Tenant Selector */}
        {tenants.length > 1 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Tenant
            </label>
            <select
              value={selectedTenant || ''}
              onChange={(e) => setSelectedTenant(e.target.value)}
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

        {/* Agent List */}
        {selectedTenant && <AgentList tenantId={selectedTenant} />}
      </div>
    </div>
  );
};

export default AgentManagement;

