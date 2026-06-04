import React from "react";
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  RefreshCw,
  TrendingUp,
  XCircle,
} from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";
import { useDashboardData } from "../../domains/appointment-setter/hooks/useDashboardData";
import { NAVY, TEAL, TEAL_DEEP } from "../Platform/WorkspaceShellLayout";
import Loader from "../Loader";

const getStatusMeta = (status) => {
  switch (status) {
    case "scheduled":
      return {
        icon: Clock,
        badge: "bg-[#68fadd]/25 text-[#006b5c]",
        label: "Scheduled",
      };
    case "completed":
      return {
        icon: CheckCircle,
        badge: "bg-emerald-50 text-emerald-700",
        label: "Completed",
      };
    case "cancelled":
      return {
        icon: XCircle,
        badge: "bg-rose-50 text-rose-700",
        label: "Cancelled",
      };
    default:
      return {
        icon: AlertCircle,
        badge: "bg-slate-100 text-slate-600",
        label: status || "Unknown",
      };
  }
};

const StatCard = ({ label, value, icon: Icon }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          {label}
        </p>
        <p className="mt-2 text-2xl font-semibold tracking-tight" style={{ color: NAVY }}>
          {value}
        </p>
      </div>
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-100"
        style={{ backgroundColor: NAVY }}
      >
        <Icon className="h-5 w-5" style={{ color: TEAL }} strokeWidth={1.75} />
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const { stats, recentAppointments, loading, error, refetch } = useDashboardData();

  const displayName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.first_name || "there";

  const formatDateTime = (dateTime) =>
    new Date(dateTime).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  const statCards = [
    { label: "Total tenants", value: stats.totalTenants, icon: Building2 },
    { label: "Total appointments", value: stats.totalAppointments, icon: Calendar },
    { label: "Upcoming", value: stats.upcomingAppointments, icon: TrendingUp },
    { label: "Today's appointments", value: stats.todayAppointments, icon: Clock },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center">
        <Loader message="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: NAVY }}>
            Operations dashboard
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">Welcome back, {displayName}.</p>
        </div>
        <button
          type="button"
          onClick={refetch}
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-700 transition hover:bg-slate-50 sm:self-auto"
        >
          <RefreshCw className="h-4 w-4" strokeWidth={2} />
          Refresh data
        </button>
      </div>

      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <span>{error}</span>
          <button
            type="button"
            onClick={refetch}
            className="font-mono text-[10px] font-semibold uppercase tracking-wider text-rose-700 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      <section>
        <div className="mb-4 flex items-center gap-4">
          <p
            className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: TEAL_DEEP }}
          >
            Recent activity
          </p>
          <div className="h-px flex-1 rounded-full" style={{ backgroundColor: `${TEAL}55` }} />
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-1 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Appointments
              </p>
              <h2 className="mt-0.5 text-lg font-semibold tracking-tight" style={{ color: NAVY }}>
                Recent appointments
              </h2>
            </div>
            <span
              className="inline-flex w-fit rounded-full px-2.5 py-1 font-mono text-xs font-semibold  uppercase tracking-wide"
              style={{ backgroundColor: `${TEAL}22`, color: TEAL_DEEP }}
            >
              {recentAppointments.length} shown
            </span>
          </div>

          {recentAppointments.length > 0 ? (
            <>
              <div className="hidden border-b border-slate-200 bg-slate-50/90 px-4 py-2 md:grid md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_120px] md:items-center md:gap-4">
                {["Customer / service", "Service address", "Appointment time", "Status"].map(
                  (col) => (
                    <span
                      key={col}
                      className="w-full font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400"
                    >
                      {col}
                    </span>
                  ),
                )}
              </div>

              <div className="divide-y divide-slate-100">
                {recentAppointments.map((appointment) => {
                  const meta = getStatusMeta(appointment.status);
                  const StatusIcon = meta.icon;

                  return (
                    <div
                      key={appointment.id}
                      className="px-4 py-3 transition hover:bg-slate-50/80"
                    >
                      <div className="grid gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_120px] md:items-center md:gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-100"
                            style={{ backgroundColor: NAVY }}
                          >
                            <StatusIcon className="h-5 w-5" style={{ color: TEAL }} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold" style={{ color: NAVY }}>
                              {appointment.customer_name}
                            </p>
                            <p className="mt-0.5 truncate text-xs capitalize text-slate-500">
                              {appointment.service_type}
                            </p>
                          </div>
                        </div>

                        <div className="min-w-0 text-sm text-slate-600">
                          <p className="font-mono text-[9px] uppercase tracking-wide text-slate-400 md:hidden">
                            Service address
                          </p>
                          <p className="truncate md:mt-0">{appointment.service_address}</p>
                        </div>

                        <div className="text-sm text-slate-600">
                          <p className="font-mono text-[9px] uppercase tracking-wide text-slate-400 md:hidden">
                            Appointment time
                          </p>
                          <p className="md:mt-0">{formatDateTime(appointment.appointment_datetime)}</p>
                        </div>

                        <div>
                          <p className="font-mono text-[9px] uppercase tracking-wide text-slate-400 md:hidden">
                            Status
                          </p>
                          <span
                            className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide md:mt-0 ${meta.badge}`}
                          >
                            {meta.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <Calendar className="h-12 w-12 text-slate-300" strokeWidth={1.25} />
              <p className="mt-4 font-semibold text-slate-700">No appointments found</p>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Recent bookings will appear here once they are scheduled across your tenants.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
