import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { appointmentAPI, tenantAPI } from '../../services/api';
import { Calendar, Plus, Search, Clock, CheckCircle, XCircle, AlertCircle, MapPin, Phone, Mail } from 'lucide-react';
import Loader from '../Loader';

const AppointmentList = () => {
  const [appointments, setAppointments] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tenantsLoaded, setTenantsLoaded] = useState(false); // Track if tenants have been loaded

  // Fetch tenants function - no dependencies to prevent circular issues
  const fetchTenants = useCallback(async () => {
    try {
      const response = await tenantAPI.listTenants();
      const tenantsList = Array.isArray(response.data) ? response.data : [];
      
      setTenants(tenantsList);
      setTenantsLoaded(true);
      
      // Only auto-select on initial load using functional setState to access current state
      if (tenantsList.length > 0) {
        setSelectedTenant(prev => prev || tenantsList[0].id);
      }
    } catch (error) {
      setError('Failed to fetch tenants');
      console.error('Error fetching tenants:', error);
      setTenants([]); // Ensure we always have an array
    }
  }, []); // Empty deps - only create once

  // Fetch appointments function - with proper dependencies
  const fetchAppointments = useCallback(async () => {
    // Guard: Don't call API if tenant is not selected
    if (!selectedTenant || selectedTenant === '') {
      console.log('Skipping fetchAppointments - no tenant selected');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (statusFilter) {
        params.status = statusFilter;
      }
      console.log('Fetching appointments for tenant:', selectedTenant);
      const response = await appointmentAPI.listAppointments(selectedTenant, params);
      setAppointments(response.data.appointments || []);
    } catch (error) {
      setError('Failed to fetch appointments');
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedTenant, statusFilter]);

  // Fetch tenants ONCE on mount only
  useEffect(() => {
    fetchTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - run only once on mount

  // Fetch appointments when tenant or filter changes - ONLY after tenants are loaded
  useEffect(() => {
    // Don't fetch until tenants are loaded
    if (!tenantsLoaded) {
      console.log('Waiting for tenants to load...');
      return;
    }
    
    // Only fetch if we have a valid tenant ID (check for undefined, null, empty string)
    if (selectedTenant && selectedTenant !== '' && selectedTenant !== 'undefined' && typeof selectedTenant === 'string') {
      console.log('Calling fetchAppointments for tenant:', selectedTenant);
      fetchAppointments();
    } else {
      console.log('Skipping fetchAppointments - invalid tenant:', selectedTenant);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenant, statusFilter, tenantsLoaded]); // Added tenantsLoaded to prevent fetching before tenants are ready

  const getStatusIcon = (status) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      scheduled: { bg: 'bg-blue-100', text: 'text-blue-800' },
      confirmed: { bg: 'bg-green-100', text: 'text-green-800' },
      completed: { bg: 'bg-green-100', text: 'text-green-800' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800' },
      rescheduled: { bg: 'bg-yellow-100', text: 'text-yellow-800' }
    };

    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800' };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {status}
      </span>
    );
  };

  const formatDateTime = (dateTime) => {
    return new Date(dateTime).toLocaleString();
  };

  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = appointment.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         appointment.service_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         appointment.customer_phone.includes(searchTerm);
    return matchesSearch;
  });

  const selectedTenantData = tenants.find(t => t.id === selectedTenant);

  if (loading && !selectedTenant) {
    return <Loader message="Loading appointments..." fullScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
              <p className="mt-2 text-gray-600">
                Manage appointments for {selectedTenantData?.name || 'your tenants'}.
              </p>
            </div>
            <Link
              to="/appointments/create"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Appointment
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Tenant Selection */}
              <div>
                <label htmlFor="tenant" className="block text-sm font-medium text-gray-700 mb-2">
                  Tenant
                </label>
                <select
                  id="tenant"
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

              {/* Status Filter */}
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  id="status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">All Statuses</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="rescheduled">Rescheduled</option>
                </select>
              </div>

              {/* Search */}
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Search appointments..."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Appointments List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            {loading ? (
              <div className="py-12">
                <Loader message="Loading appointments..." />
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAppointments.length > 0 ? (
                  filteredAppointments.map((appointment) => (
                    <div key={appointment.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            {getStatusIcon(appointment.status)}
                            <h3 className="text-lg font-medium text-gray-900">
                              {appointment.customer_name}
                            </h3>
                            {getStatusBadge(appointment.status)}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                            <div className="space-y-1">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2" />
                                {formatDateTime(appointment.appointment_datetime)}
                              </div>
                              <div className="flex items-center">
                                <MapPin className="h-4 w-4 mr-2" />
                                {appointment.service_address}
                              </div>
                            </div>
                            
                            <div className="space-y-1">
                              <div className="flex items-center">
                                <Phone className="h-4 w-4 mr-2" />
                                {appointment.customer_phone}
                              </div>
                              {appointment.customer_email && (
                                <div className="flex items-center">
                                  <Mail className="h-4 w-4 mr-2" />
                                  {appointment.customer_email}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="mt-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {appointment.service_type}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Link
                            to={`/appointments/${appointment.id}`}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            View
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Get started by creating a new appointment.
                    </p>
                    <div className="mt-6">
                      <Link
                        to="/appointments/create"
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Appointment
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentList;
