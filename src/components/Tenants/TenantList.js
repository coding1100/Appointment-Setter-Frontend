import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { tenantAPI } from '../../services/api';
import { Plus, Building, Settings, Eye, Play, Pause } from 'lucide-react';

const TenantList = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Memoized fetch function to prevent recreating on every render
  const fetchTenants = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await tenantAPI.listTenants();
      
      // Handle both response formats: direct array or {data: [...]}
      const tenantsList = Array.isArray(response.data) ? response.data : response.data?.tenants || [];
      
      // Ensure it's an array
      if (Array.isArray(tenantsList)) {
        setTenants(tenantsList);
      } else {
        console.error('Invalid tenants data structure:', tenantsList);
        setTenants([]);
        setError('Invalid data structure received from server');
      }
    } catch (error) {
      setError('Failed to fetch tenants');
      console.error('Error fetching tenants:', error);
      setTenants([]); // Ensure we always have an array
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  const handleActivateTenant = async (tenantId) => {
    try {
      await tenantAPI.activateTenant(tenantId);
      fetchTenants(); // Refresh the list
    } catch (error) {
      console.error('Error activating tenant:', error);
    }
  };

  const handleDeactivateTenant = async (tenantId) => {
    try {
      await tenantAPI.deactivateTenant(tenantId);
      fetchTenants(); // Refresh the list
    } catch (error) {
      console.error('Error deactivating tenant:', error);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' },
      inactive: { bg: 'bg-red-100', text: 'text-red-800', label: 'Inactive' },
      draft: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Draft' }
    };

    const config = statusConfig[status] || statusConfig.draft;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tenants</h1>
              <p className="mt-2 text-gray-600">
                Manage your business tenants and their configurations.
              </p>
            </div>
            <Link
              to="/tenants/create"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Tenant
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Tenants Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tenants.map((tenant) => (
            <div key={tenant.id} className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow duration-200">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Building className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-medium text-gray-900">
                        {tenant.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {tenant.timezone}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(tenant.status)}
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Created:</span>
                    <span className="text-gray-900">
                      {new Date(tenant.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Updated:</span>
                    <span className="text-gray-900">
                      {new Date(tenant.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <div className="flex space-x-2">
                    <Link
                      to={`/tenants/${tenant.id}`}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Link>
                    <Link
                      to={`/tenants/${tenant.id}/edit`}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Configure
                    </Link>
                  </div>
                  
                  <div className="flex space-x-1">
                    {tenant.status === 'active' ? (
                      <button
                        onClick={() => handleDeactivateTenant(tenant.id)}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <Pause className="h-3 w-3" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivateTenant(tenant.id)}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <Play className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {tenants.length === 0 && !loading && (
          <div className="text-center py-12">
            <Building className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No tenants</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new tenant.
            </p>
            <div className="mt-6">
              <Link
                to="/tenants/create"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Tenant
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TenantList;
