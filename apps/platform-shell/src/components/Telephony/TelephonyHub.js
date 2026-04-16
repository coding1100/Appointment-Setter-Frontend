import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, Link2, Link2Off, PhoneCall, PhoneIncoming, ShieldCheck } from 'lucide-react';

import { telephonyAPI, tenantAPI } from '../../services/api';
import { getAppName } from '../../utils/appName';

const TelephonyHub = () => {
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [statusData, setStatusData] = useState(null);
  const [numbers, setNumbers] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionBusyPhone, setActionBusyPhone] = useState('');

  const outboundCandidates = useMemo(
    () =>
      numbers.filter(
        (row) =>
          (row.usage_role === 'cold_caller_outbound' || (row.usage_role === 'voice_agent_inbound' && !row.agent_id))
      ),
    [numbers]
  );

  const loadTenants = async () => {
    const response = await tenantAPI.listTenants(100, 0);
    const rows = Array.isArray(response?.data) ? response.data : [];
    setTenants(rows);
    if (!selectedTenant && rows.length > 0) {
      setSelectedTenant(rows[0].id);
    }
  };

  const loadTelephonyData = async (tenantId) => {
    if (!tenantId) {
      setStatusData(null);
      setNumbers([]);
      return;
    }
    const [statusResponse, numbersResponse] = await Promise.all([
      telephonyAPI.getTenantStatus(tenantId),
      telephonyAPI.listTenantNumbers(tenantId),
    ]);
    setStatusData(statusResponse?.data || null);
    setNumbers(Array.isArray(numbersResponse?.data) ? numbersResponse.data : []);
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError('');
        await loadTenants();
      } catch (err) {
        setError(err?.response?.data?.detail || err.message || 'Failed to load tenants');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedTenant) return;
    (async () => {
      try {
        setLoading(true);
        setError('');
        await loadTelephonyData(selectedTenant);
      } catch (err) {
        setError(err?.response?.data?.detail || err.message || 'Failed to load telephony ownership');
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedTenant]);

  const bindOutbound = async (phoneNumber) => {
    if (!selectedTenant || !phoneNumber) return;
    try {
      setActionBusyPhone(phoneNumber);
      setError('');
      setNotice('');
      await telephonyAPI.bindColdCallerOutbound(selectedTenant, phoneNumber);
      setNotice(`Bound ${phoneNumber} to Cold Caller outbound`);
      await loadTelephonyData(selectedTenant);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Failed to bind outbound number');
    } finally {
      setActionBusyPhone('');
    }
  };

  const unbindOutbound = async (phoneNumber) => {
    if (!selectedTenant || !phoneNumber) return;
    try {
      setActionBusyPhone(phoneNumber);
      setError('');
      setNotice('');
      await telephonyAPI.unbindColdCallerOutbound(selectedTenant, phoneNumber);
      setNotice(`Unbound ${phoneNumber} from Cold Caller outbound`);
      await loadTelephonyData(selectedTenant);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Failed to unbind outbound number');
    } finally {
      setActionBusyPhone('');
    }
  };

  if (loading && !statusData && numbers.length === 0) {
    return (
      <div className="p-6 text-gray-700 flex items-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading telephony hub...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Telephony Hub</h1>
        <p className="text-sm text-gray-600 mt-1">
          Shared Twilio credentials with strict number ownership between {getAppName()} and Cold Caller.
        </p>
      </div>

      {error && <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {notice && <div className="rounded border border-green-300 bg-green-50 p-3 text-sm text-green-700">{notice}</div>}

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Tenant</label>
        <select
          className="w-full md:w-96 border rounded-md p-2"
          value={selectedTenant}
          onChange={(event) => setSelectedTenant(event.target.value)}
        >
          <option value="">Select tenant</option>
          {tenants.map((tenant) => (
            <option key={tenant.id} value={tenant.id}>
              {tenant.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-700 mb-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            <span className="font-semibold">Shared Credentials</span>
          </div>
          <p className="text-sm text-gray-700">
            {statusData?.has_shared_twilio_credentials ? 'Connected' : 'Not connected'}
          </p>
          {statusData?.shared_account_sid && (
            <p className="text-xs text-gray-500 mt-1 break-all">{statusData.shared_account_sid}</p>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-700 mb-2">
            <PhoneIncoming className="h-5 w-5 text-indigo-600" />
            <span className="font-semibold">{getAppName()}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{statusData?.voice_agent_inbound_numbers || 0}</p>
          <p className="text-xs text-gray-500">Inbound owned numbers</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-700 mb-2">
            <PhoneCall className="h-5 w-5 text-green-600" />
            <span className="font-semibold">Cold Caller</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{statusData?.cold_caller_outbound_numbers || 0}</p>
          <p className="text-xs text-gray-500">Outbound owned numbers</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-semibold text-gray-900">Conflicts</h2>
        </div>
        {(statusData?.conflicts_count || 0) === 0 ? (
          <p className="text-sm text-green-700">No conflicts detected.</p>
        ) : (
          <div className="space-y-2">
            {(statusData?.conflicts || []).map((row) => (
              <div key={row.id} className="border border-red-200 bg-red-50 rounded p-3 text-sm">
                <div className="font-medium text-red-800">{row.phone_number}</div>
                <div className="text-red-700">{row.conflict_code || 'CONFLICT'}</div>
                <div className="text-red-700">{row.conflict_message || 'Resolve ownership before usage.'}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Phone Ownership</h2>
          <span className="text-xs text-gray-500">Hard conflicts are blocked automatically</span>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-600 border-b">
                <th className="text-left py-2 pr-2">Number</th>
                <th className="text-left py-2 pr-2">Role</th>
                <th className="text-left py-2 pr-2">Status</th>
                <th className="text-left py-2 pr-2">Agent</th>
                <th className="text-left py-2 pr-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {numbers.map((row) => (
                <tr key={row.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-2 font-medium text-gray-900">{row.phone_number}</td>
                  <td className="py-2 pr-2">
                    {row.usage_role === 'cold_caller_outbound' ? 'Cold Caller Outbound' : 'Voice Agent Inbound'}
                  </td>
                  <td className="py-2 pr-2">{row.role_status}</td>
                  <td className="py-2 pr-2">{row.agent_name || '-'}</td>
                  <td className="py-2 pr-2">
                    {row.usage_role === 'cold_caller_outbound' ? (
                      <button
                        type="button"
                        onClick={() => unbindOutbound(row.phone_number)}
                        disabled={actionBusyPhone === row.phone_number}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 bg-red-100 text-red-700 rounded disabled:opacity-50"
                      >
                        <Link2Off className="h-3.5 w-3.5" />
                        Unbind Outbound
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => bindOutbound(row.phone_number)}
                        disabled={
                          actionBusyPhone === row.phone_number ||
                          row.role_status === 'conflict' ||
                          !!row.agent_id
                        }
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 bg-green-100 text-green-700 rounded disabled:opacity-50"
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        Bind Outbound
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {numbers.length === 0 && (
          <p className="text-sm text-gray-500 mt-3">
            No numbers found for this tenant. Add numbers in Twilio Integration first.
          </p>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-1">Conflict Rules</h3>
        <p className="text-xs text-blue-800">
          A number cannot be active in both services. Voice-assigned numbers must be unassigned before outbound bind.
          Outbound numbers cannot be used by campaigns unless role is valid and active.
        </p>
        {outboundCandidates.length === 0 && (
          <p className="text-xs text-amber-700 mt-2">
            No outbound candidate is currently available. Unassign a voice number or purchase a new number.
          </p>
        )}
      </div>
    </div>
  );
};

export default TelephonyHub;
