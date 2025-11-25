import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { tenantAPI } from '../../services/api';
import { Building, Clock, Save, ArrowLeft } from 'lucide-react';
import Loader from '../Loader';

const TenantEditForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    timezone: 'UTC'
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  const timezones = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney'
  ];

  useEffect(() => {
    const fetchTenant = async () => {
      if (!id) {
        setError('Tenant ID is required');
        setFetching(false);
        return;
      }

      try {
        setFetching(true);
        setError('');
        const response = await tenantAPI.getTenant(id);
        const tenant = response.data;
        
        setFormData({
          name: tenant.name || '',
          timezone: tenant.timezone || 'UTC'
        });
      } catch (err) {
        const errorDetail = err.response?.data?.detail;
        setError(typeof errorDetail === 'string' ? errorDetail : 'Failed to fetch tenant');
      } finally {
        setFetching(false);
      }
    };

    fetchTenant();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await tenantAPI.updateTenant(id, formData);
      navigate('/tenants');
    } catch (err) {
      const errorDetail = err.response?.data?.detail;
      if (Array.isArray(errorDetail)) {
        const errorMessages = errorDetail.map(e => `${e.loc?.join('.')} - ${e.msg}`).join(', ');
        setError(errorMessages);
      } else {
        setError(typeof errorDetail === 'string' ? errorDetail : 'Failed to update tenant');
      }
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <Loader message="Loading tenant..." fullScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <button
              onClick={() => navigate('/tenants')}
              className="mr-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Tenant</h1>
              <p className="mt-2 text-gray-600">
                Update tenant information and settings.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 gap-6">
                {/* Tenant Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Tenant Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Building className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="name"
                      id="name"
                      required
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter tenant name"
                      value={formData.name}
                      onChange={handleChange}
                    />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    This will be the display name for your tenant.
                  </p>
                </div>

                {/* Timezone */}
                <div>
                  <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-2">
                    Timezone
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Clock className="h-5 w-5 text-gray-400" />
                    </div>
                    <select
                      name="timezone"
                      id="timezone"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={formData.timezone}
                      onChange={handleChange}
                    >
                      {timezones.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Select the timezone for this tenant's business operations.
                  </p>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => navigate('/tenants')}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Update Tenant
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantEditForm;

