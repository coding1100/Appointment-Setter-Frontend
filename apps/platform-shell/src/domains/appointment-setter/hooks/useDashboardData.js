import { useCallback, useEffect, useState } from 'react';

import { appointmentAPI, tenantAPI } from '../api';

export const useDashboardData = () => {
  const [stats, setStats] = useState({
    totalTenants: 0,
    totalAppointments: 0,
    upcomingAppointments: 0,
    todayAppointments: 0,
  });
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const tenantsResponse = await tenantAPI.listTenants();
      const tenants = Array.isArray(tenantsResponse.data) ? tenantsResponse.data : [];

      let totalAppointments = 0;
      let upcomingAppointments = 0;
      let todayAppointments = 0;
      let recentAppointmentsList = [];

      for (const tenant of tenants) {
        try {
          if (!tenant.id || tenant.id === 'undefined' || typeof tenant.id !== 'string') {
            console.warn('Skipping invalid tenant:', tenant);
            continue;
          }

          const appointmentsResponse = await appointmentAPI.listAppointments(tenant.id);
          const appointments = appointmentsResponse.data.appointments || [];

          totalAppointments += appointments.length;

          const today = new Date().toISOString().split('T')[0];
          const upcoming = appointments.filter(
            (apt) => new Date(apt.appointment_datetime) > new Date() && apt.status === 'scheduled'
          );
          const todayApts = appointments.filter((apt) => apt.appointment_datetime.startsWith(today));

          upcomingAppointments += upcoming.length;
          todayAppointments += todayApts.length;

          recentAppointmentsList.push(...appointments.slice(0, 5));
        } catch (fetchError) {
          console.error(`Error fetching appointments for tenant ${tenant.id}:`, fetchError);
        }
      }

      setStats({
        totalTenants: tenants.length,
        totalAppointments,
        upcomingAppointments,
        todayAppointments,
      });

      recentAppointmentsList.sort((a, b) => new Date(b.appointment_datetime) - new Date(a.appointment_datetime));
      setRecentAppointments(recentAppointmentsList.slice(0, 10));
    } catch (fetchError) {
      console.error('Error fetching dashboard data:', fetchError);
      setError('Failed to load dashboard data. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    stats,
    recentAppointments,
    loading,
    error,
    refetch: fetchDashboardData,
  };
};

