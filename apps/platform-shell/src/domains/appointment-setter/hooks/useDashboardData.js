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
      const validTenants = tenants.filter((tenant) => tenant?.id && tenant.id !== 'undefined' && typeof tenant.id === 'string');
      const today = new Date().toISOString().split('T')[0];

      const tenantResults = await Promise.all(
        validTenants.map(async (tenant) => {
          try {
            const appointmentsResponse = await appointmentAPI.listAppointments(tenant.id);
            const appointments = appointmentsResponse.data.appointments || [];
            const upcoming = appointments.filter(
              (apt) => new Date(apt.appointment_datetime) > new Date() && apt.status === 'scheduled'
            );
            const todayApts = appointments.filter((apt) => apt.appointment_datetime.startsWith(today));

            return {
              appointments,
              upcomingCount: upcoming.length,
              todayCount: todayApts.length,
              recent: appointments.slice(0, 5),
            };
          } catch (fetchError) {
            console.error(`Error fetching appointments for tenant ${tenant.id}:`, fetchError);
            return {
              appointments: [],
              upcomingCount: 0,
              todayCount: 0,
              recent: [],
            };
          }
        })
      );

      const totalAppointments = tenantResults.reduce((sum, result) => sum + result.appointments.length, 0);
      const upcomingAppointments = tenantResults.reduce((sum, result) => sum + result.upcomingCount, 0);
      const todayAppointments = tenantResults.reduce((sum, result) => sum + result.todayCount, 0);
      const recentAppointmentsList = tenantResults.flatMap((result) => result.recent);

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
