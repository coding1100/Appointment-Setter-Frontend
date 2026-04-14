import React from 'react';
import { AlertCircle, Building, Calendar, CheckCircle, Clock, TrendingUp, XCircle } from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import { useDashboardData } from '../../domains/appointment-setter/hooks/useDashboardData';
import InlineAlert from '../../shared/ui/InlineAlert';
import PageHeader from '../../shared/ui/PageHeader';
import SectionPanel from '../../shared/ui/SectionPanel';
import Loader from '../Loader';

const Dashboard = () => {
  const { user } = useAuth();
  const { stats, recentAppointments, loading, error, refetch } = useDashboardData();

  const getStatusMeta = (status) => {
    switch (status) {
      case 'scheduled':
        return {
          icon: <Clock className="h-4 w-4 text-sky-600" />,
          badge: 'bg-sky-50 text-sky-700',
        };
      case 'completed':
        return {
          icon: <CheckCircle className="h-4 w-4 text-emerald-600" />,
          badge: 'bg-emerald-50 text-emerald-700',
        };
      case 'cancelled':
        return {
          icon: <XCircle className="h-4 w-4 text-rose-600" />,
          badge: 'bg-rose-50 text-rose-700',
        };
      default:
        return {
          icon: <AlertCircle className="h-4 w-4 text-slate-400" />,
          badge: 'bg-slate-100 text-slate-600',
        };
    }
  };

  const formatDateTime = (dateTime) => new Date(dateTime).toLocaleString();

  const statCards = [
    {
      label: 'Total Tenants',
      value: stats.totalTenants,
      icon: Building,
      iconTone: 'text-sky-600',
      glow: 'from-sky-100 to-transparent',
    },
    {
      label: 'Total Appointments',
      value: stats.totalAppointments,
      icon: Calendar,
      iconTone: 'text-emerald-600',
      glow: 'from-emerald-100 to-transparent',
    },
    {
      label: 'Upcoming',
      value: stats.upcomingAppointments,
      icon: TrendingUp,
      iconTone: 'text-amber-600',
      glow: 'from-amber-100 to-transparent',
    },
    {
      label: "Today's Appointments",
      value: stats.todayAppointments,
      icon: Clock,
      iconTone: 'text-violet-600',
      glow: 'from-violet-100 to-transparent',
    },
  ];

  if (loading) {
    return <Loader message="Loading dashboard..." />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operations Overview"
        title="Operations Dashboard"
        description={`Welcome back, ${user?.first_name}.`}
        actions={
          <button
            onClick={refetch}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Refresh data
          </button>
        }
      />

      {error ? (
        <InlineAlert
          variant="error"
          actions={
            <button onClick={refetch} className="text-left text-sm font-semibold text-rose-700 underline">
              Retry
            </button>
          }
        >
          {error}
        </InlineAlert>
      ) : null}

      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="relative overflow-hidden rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className={`absolute inset-0 bg-gradient-to-br ${card.glow}`} />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.26em] text-slate-500">{card.label}</p>
                  <p className="mt-3 text-[2rem] font-semibold tracking-[-0.04em] text-slate-900">{card.value}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
                  <Icon className={`h-5 w-5 ${card.iconTone}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <SectionPanel>
        <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[0.78rem] uppercase tracking-[0.28em] text-slate-500">Recent Activity</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Recent Appointments</h2>
          </div>
        </div>

        {recentAppointments.length > 0 ? (
          <div className="divide-y divide-slate-200">
            {recentAppointments.map((appointment) => {
              const meta = getStatusMeta(appointment.status);
              return (
                <div
                  key={appointment.id}
                  className="flex flex-col gap-4 px-4 py-3.5 lg:grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_180px_120px] lg:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
                        {meta.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{appointment.customer_name}</p>
                        <p className="mt-1 truncate text-sm text-slate-500">{appointment.service_type}</p>
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0 text-sm text-slate-600">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 lg:hidden">Service address</div>
                    <p className="mt-1 truncate lg:mt-0">{appointment.service_address}</p>
                  </div>

                  <div className="text-sm text-slate-600">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 lg:hidden">Appointment time</div>
                    <p className="mt-1 lg:mt-0">{formatDateTime(appointment.appointment_datetime)}</p>
                  </div>

                  <div>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 lg:hidden">Status</div>
                    <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] lg:mt-0 ${meta.badge}`}>
                      {appointment.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-4 py-10 text-center text-sm text-slate-500">No appointments found.</div>
        )}
      </SectionPanel>
    </div>
  );
};

export default Dashboard;
