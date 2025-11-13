import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { tenantAPI, appointmentAPI } from '../../services/api';
import { Calendar, Building, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalTenants: 0,
    totalAppointments: 0,
    upcomingAppointments: 0,
    todayAppointments: 0
  });
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Memoized fetch function to prevent infinite loops
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch tenants
      const tenantsResponse = await tenantAPI.listTenants();
      const tenants = Array.isArray(tenantsResponse.data) ? tenantsResponse.data : [];

      // Fetch appointments for each tenant
      let totalAppointments = 0;
      let upcomingAppointments = 0;
      let todayAppointments = 0;
      let recentAppointmentsList = [];

      for (const tenant of tenants) {
        try {
          // Skip if tenant.id is invalid
          if (!tenant.id || tenant.id === 'undefined' || typeof tenant.id !== 'string') {
            console.warn('Skipping invalid tenant:', tenant);
            continue;
          }
          
          const appointmentsResponse = await appointmentAPI.listAppointments(tenant.id);
          const appointments = appointmentsResponse.data.appointments || [];
          
          totalAppointments += appointments.length;
          
          const today = new Date().toISOString().split('T')[0];
          const upcoming = appointments.filter(apt => 
            new Date(apt.appointment_datetime) > new Date() && 
            apt.status === 'scheduled'
          );
          const todayApts = appointments.filter(apt => 
            apt.appointment_datetime.startsWith(today)
          );

          upcomingAppointments += upcoming.length;
          todayAppointments += todayApts.length;

          recentAppointmentsList.push(...appointments.slice(0, 5));
        } catch (error) {
          console.error(`Error fetching appointments for tenant ${tenant.id}:`, error);
          // Continue processing other tenants even if one fails
        }
      }

      setStats({
        totalTenants: tenants.length,
        totalAppointments,
        upcomingAppointments,
        todayAppointments
      });

      // Sort recent appointments by date
      recentAppointmentsList.sort((a, b) => 
        new Date(b.appointment_datetime) - new Date(a.appointment_datetime)
      );
      setRecentAppointments(recentAppointmentsList.slice(0, 10));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch data only once on mount
  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount, no dependencies needed

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

  const formatDateTime = (dateTime) => {
    return new Date(dateTime).toLocaleString();
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
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Welcome back, {user?.first_name}! Here's what's happening with your appointments.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex justify-between items-center">
            <span>{error}</span>
            <button 
              onClick={fetchDashboardData}
              className="text-sm underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Building className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Tenants
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.totalTenants}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Calendar className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Appointments
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.totalAppointments}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Upcoming
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.upcomingAppointments}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Today's Appointments
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.todayAppointments}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Appointments */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Recent Appointments
            </h3>
            <div className="flow-root">
              <ul className="-my-5 divide-y divide-gray-200">
                {recentAppointments.length > 0 ? (
                  recentAppointments.map((appointment) => (
                    <li key={appointment.id} className="py-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          {getStatusIcon(appointment.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {appointment.customer_name}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {appointment.service_type} - {appointment.service_address}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-sm text-gray-500">
                          {formatDateTime(appointment.appointment_datetime)}
                        </div>
                        <div className="flex-shrink-0">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                            appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                            appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {appointment.status}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="py-4 text-center text-gray-500">
                    No appointments found
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
