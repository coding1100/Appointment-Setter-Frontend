import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Mail,
  MapPin,
  Phone,
  Search,
  XCircle,
} from 'lucide-react';

import { appointmentAPI, tenantAPI } from '../../services/api';
import Loader from '../Loader';

const AppointmentList = () => {
  const [appointments, setAppointments] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tenantsLoaded, setTenantsLoaded] = useState(false);

  const fetchTenants = useCallback(async () => {
    try {
      const response = await tenantAPI.listTenants();
      const tenantsList = Array.isArray(response.data) ? response.data : [];

      setTenants(tenantsList);
      setTenantsLoaded(true);

      if (tenantsList.length > 0) {
        setSelectedTenant((prev) => prev || tenantsList[0].id);
      }
    } catch (fetchError) {
      setError('Failed to fetch tenants');
      console.error('Error fetching tenants:', fetchError);
      setTenants([]);
    }
  }, []);

  const fetchAppointments = useCallback(async () => {
    if (!selectedTenant || selectedTenant === '') {
      return;
    }

    try {
      setLoading(true);
      setError('');
      const params = {};
      if (statusFilter) {
        params.status = statusFilter;
      }
      const response = await appointmentAPI.listAppointments(selectedTenant, params);
      setAppointments(response.data.appointments || []);
    } catch (fetchError) {
      setError('Failed to fetch appointments');
      console.error('Error fetching appointments:', fetchError);
    } finally {
      setLoading(false);
    }
  }, [selectedTenant, statusFilter]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  useEffect(() => {
    if (!tenantsLoaded) return;
    if (selectedTenant && selectedTenant !== '' && selectedTenant !== 'undefined' && typeof selectedTenant === 'string') {
      fetchAppointments();
    }
  }, [selectedTenant, statusFilter, tenantsLoaded, fetchAppointments]);

  const getStatusMeta = (status) => {
    switch (status) {
      case 'scheduled':
        return {
          icon: <Clock className="h-4 w-4 text-sky-200" />,
          badge: 'bg-sky-300/14 text-sky-100',
        };
      case 'confirmed':
      case 'completed':
        return {
          icon: <CheckCircle className="h-4 w-4 text-emerald-200" />,
          badge: 'bg-emerald-300/14 text-emerald-100',
        };
      case 'cancelled':
        return {
          icon: <XCircle className="h-4 w-4 text-rose-200" />,
          badge: 'bg-rose-300/14 text-rose-100',
        };
      default:
        return {
          icon: <AlertCircle className="h-4 w-4 text-white/58" />,
          badge: 'bg-white/10 text-white/68',
        };
    }
  };

  const formatDateTime = (dateTime) => new Date(dateTime).toLocaleString();

  const filteredAppointments = useMemo(
    () =>
      appointments.filter((appointment) => {
        const search = searchTerm.toLowerCase();
        return (
          appointment.customer_name.toLowerCase().includes(search) ||
          appointment.service_type.toLowerCase().includes(search) ||
          appointment.customer_phone.includes(searchTerm)
        );
      }),
    [appointments, searchTerm]
  );

  const selectedTenantData = tenants.find((tenant) => tenant.id === selectedTenant);

  if (loading && !selectedTenant) {
    return <Loader message="Loading appointments..." />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[0.78rem] uppercase tracking-[0.32em] text-white/68">Appointment Operations</p>
          <h1 className="mt-3 text-[2rem] font-semibold tracking-[-0.03em] text-white">Appointments</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/72">
            Review booking activity for {selectedTenantData?.name || 'your tenants'}, filter by status, and keep the
            scheduling workflow inside the unified Appointment Setter workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={fetchAppointments}
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Refresh
          </button>
          {selectedTenant && (
            <Link
              to={`/app/appointment-setter/tenants/${selectedTenant}`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2f66ea] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(19,57,150,0.28)] transition hover:bg-[#295ad0] no-underline"
            >
              Open Tenant
            </Link>
          )}
        </div>
      </div>

      {error && <div className="rounded-2xl border border-rose-300/18 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</div>}

      <div className="rounded-[26px] border border-white/8 bg-white/[0.04] p-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div>
            <label htmlFor="tenant" className="mb-2 block text-sm font-medium text-white/84">
              Tenant
            </label>
            <select id="tenant" value={selectedTenant} onChange={(e) => setSelectedTenant(e.target.value)} className="shell-input">
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="status" className="mb-2 block text-sm font-medium text-white/84">
              Status
            </label>
            <select id="status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="shell-input">
              <option value="">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="rescheduled">Rescheduled</option>
            </select>
          </div>

          <div>
            <label htmlFor="search" className="mb-2 block text-sm font-medium text-white/84">
              Search
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/36" />
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="shell-input pl-11"
                placeholder="Search appointments..."
              />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[26px] border border-white/8 bg-white/[0.04]">
        <div className="flex flex-col gap-2 border-b border-white/8 px-4 py-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[0.78rem] uppercase tracking-[0.28em] text-white/48">Booking Feed</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Appointment Records</h2>
          </div>
          <p className="text-sm text-white/58">{filteredAppointments.length} matching appointment{filteredAppointments.length === 1 ? '' : 's'}</p>
        </div>

        {loading ? (
          <div className="px-4 py-10">
            <Loader message="Loading appointments..." />
          </div>
        ) : filteredAppointments.length > 0 ? (
          <div className="divide-y divide-white/8">
            {filteredAppointments.map((appointment) => {
              const meta = getStatusMeta(appointment.status);
              return (
                <div key={appointment.id} className="px-4 py-4">
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_240px_240px_160px] xl:items-start">
                    <div className="min-w-0">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/8">
                          {meta.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-lg font-semibold text-white">{appointment.customer_name}</h3>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${meta.badge}`}>
                              {appointment.status}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-white/68">{appointment.service_type}</p>
                          <div className="mt-3 flex flex-col gap-2 text-sm text-white/62">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-white/34" />
                              <span className="truncate">{appointment.service_address}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-white/34" />
                              <span>{appointment.customer_phone}</span>
                            </div>
                            {appointment.customer_email && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-white/34" />
                                <span className="truncate">{appointment.customer_email}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-sm text-white/72">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-white/42 xl:hidden">Scheduled for</div>
                      <div className="mt-1 flex items-center gap-2 xl:mt-0">
                        <Calendar className="h-4 w-4 text-white/34" />
                        {formatDateTime(appointment.appointment_datetime)}
                      </div>
                    </div>

                    <div className="text-sm text-white/60">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-white/42 xl:hidden">Tenant</div>
                      <div className="mt-1 xl:mt-0">{selectedTenantData?.name || 'Current tenant'}</div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {selectedTenant && (
                        <Link
                          to={`/app/appointment-setter/tenants/${selectedTenant}`}
                          className="inline-flex items-center rounded-2xl border border-white/10 bg-white/6 px-3.5 py-2.5 text-sm text-white transition hover:bg-white/10 no-underline"
                        >
                          Open Tenant
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-4 py-10 text-center">
            <Calendar className="mx-auto h-14 w-14 text-white/30" />
            <h3 className="mt-5 text-2xl font-semibold tracking-[-0.02em] text-white">No appointments found</h3>
            <p className="mt-3 text-sm leading-7 text-white/66">
              Try switching tenants or filters. Detailed appointment creation can continue through tenant-specific
              scheduling workflows.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentList;
