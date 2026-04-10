import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building, Mail, Save } from 'lucide-react';

import { tenantAPI } from '../../services/api';
import Loader from '../Loader';

const TenantEditForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    owner_email: '',
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({
    name: '',
    owner_email: '',
  });

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
          owner_email: tenant.owner_email || '',
        });
      } catch (fetchError) {
        const errorDetail = fetchError.response?.data?.detail;
        setError(typeof errorDetail === 'string' ? errorDetail : 'Failed to fetch tenant');
      } finally {
        setFetching(false);
      }
    };

    fetchTenant();
  }, [id]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (error) {
      setError('');
    }
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({ name: '', owner_email: '' });

    try {
      await tenantAPI.updateTenant(id, formData);
      navigate(`/app/appointment-setter/tenants/${id}`);
    } catch (submitError) {
      const errorDetail = submitError.response?.data?.detail;
      const statusCode = submitError.response?.status;

      if (statusCode === 400 || statusCode === 409 || (errorDetail && typeof errorDetail === 'string')) {
        const errorMessage =
          typeof errorDetail === 'string' ? errorDetail : submitError.response?.data?.message || 'Failed to update tenant';
        const lowerMessage = errorMessage.toLowerCase();

        if (
          lowerMessage.includes('duplicate') ||
          lowerMessage.includes('already exists') ||
          lowerMessage.includes('unique constraint')
        ) {
          if (lowerMessage.includes('owner_email') || lowerMessage.includes('email')) {
            setError('A tenant with this owner email already exists. Please choose a different email.');
            setFieldErrors({
              name: '',
              owner_email: 'This owner email is already in use.',
            });
          } else {
            setError('A tenant with this name already exists. Please choose a different name.');
            setFieldErrors({
              name: 'This tenant name is already in use.',
              owner_email: '',
            });
          }
        } else {
          setError(errorMessage);
        }
      } else if (Array.isArray(errorDetail)) {
        const errorMessages = errorDetail.map((entry) => `${entry.loc?.join('.')} - ${entry.msg}`).join(', ');
        setError(errorMessages);
      } else {
        setError(typeof errorDetail === 'string' ? errorDetail : 'Failed to update tenant. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <Loader message="Loading tenant..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate(`/app/appointment-setter/tenants/${id}`)}
          className="mt-1 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white transition hover:bg-white/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="text-[0.78rem] uppercase tracking-[0.32em] text-white/68">Tenant Setup</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-white">Edit Tenant</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-white/72">
            Update tenant identity details while staying inside the same unified Appointment Setter workspace.
          </p>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/8 bg-white/[0.04] p-6 md:p-7">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="rounded-2xl border border-rose-300/18 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</div>}

          <div className="grid gap-6">
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-medium text-white/84">
                Tenant Name
              </label>
              <div className="relative">
                <Building className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/34" />
                <input
                  type="text"
                  name="name"
                  id="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter tenant name"
                  className={`shell-input pl-12 ${fieldErrors.name ? 'border-rose-300/40 text-rose-100' : ''}`}
                />
              </div>
              <p className={`mt-2 text-sm ${fieldErrors.name ? 'text-rose-200' : 'text-white/50'}`}>
                {fieldErrors.name || 'This will be the display name for your tenant.'}
              </p>
            </div>

            <div>
              <label htmlFor="owner_email" className="mb-2 block text-sm font-medium text-white/84">
                Owner Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/34" />
                <input
                  type="email"
                  name="owner_email"
                  id="owner_email"
                  required
                  value={formData.owner_email}
                  onChange={handleChange}
                  placeholder="Enter owner email"
                  className={`shell-input pl-12 ${fieldErrors.owner_email ? 'border-rose-300/40 text-rose-100' : ''}`}
                />
              </div>
              <p className={`mt-2 text-sm ${fieldErrors.owner_email ? 'text-rose-200' : 'text-white/50'}`}>
                {fieldErrors.owner_email || 'This email will receive ownership-related notifications.'}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-white/8 pt-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate(`/app/appointment-setter/tenants/${id}`)}
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2f66ea] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(19,57,150,0.28)] transition hover:bg-[#295ad0] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-white" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Update Tenant
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TenantEditForm;
