import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Play, Pause, RotateCcw, XCircle, Upload, PhoneCall } from 'lucide-react';

import { agentAPI, coldCallerAPI, telephonyAPI, tenantAPI } from '../../services/api';

const DEFAULT_FORM = {
  name: '',
  description: '',
  voice_agent_id: '',
  outbound_phone_number_id: '',
  timezone: 'UTC',
  call_window_start: '09:00',
  call_window_end: '18:00',
  max_attempts_per_contact: 3,
  max_attempts_per_day: 1,
  retry_delay_minutes: 10,
  recording_enabled: false,
  recording_disclosure: '',
};

const COMMON_TIMEZONES = [
  'UTC',
  'Asia/Karachi',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Dubai',
];

const ColdCallerPage = () => {
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [agents, setAgents] = useState([]);
  const [outboundNumbers, setOutboundNumbers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [contacts, setContacts] = useState([]);
  const [attempts, setAttempts] = useState([]);

  const [campaignForm, setCampaignForm] = useState(DEFAULT_FORM);
  const [contactsFile, setContactsFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [dncFile, setDncFile] = useState(null);
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [manualContactNumbers, setManualContactNumbers] = useState('');
  const [manualDncNumbers, setManualDncNumbers] = useState('');

  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedCampaignId) || null,
    [campaigns, selectedCampaignId]
  );

  const currentBusy = (action) => busyAction === action;

  const loadTenants = async () => {
    const response = await tenantAPI.listTenants(100, 0);
    const rows = response?.data || [];
    setTenants(rows);
    if (!selectedTenant && rows.length > 0) {
      setSelectedTenant(rows[0].id);
    }
  };

  const loadAgents = async (tenantId) => {
    if (!tenantId) {
      setAgents([]);
      return;
    }
    const response = await agentAPI.listAgents(tenantId);
    const rows = response?.data || [];
    setAgents(rows);
    const selectedStillValid = rows.some((row) => row.id === campaignForm.voice_agent_id);
    if (rows.length > 0 && (!campaignForm.voice_agent_id || !selectedStillValid)) {
      setCampaignForm((prev) => ({ ...prev, voice_agent_id: rows[0].id }));
    }
  };

  const loadCampaigns = async (tenantId) => {
    if (!tenantId) {
      setCampaigns([]);
      return;
    }
    const response = await coldCallerAPI.listCampaigns(tenantId);
    const rows = response?.data || [];
    setCampaigns(rows);
    if (rows.length === 0) {
      setSelectedCampaignId('');
      setContacts([]);
      setAttempts([]);
      return;
    }
    if (!selectedCampaignId || !rows.some((row) => row.id === selectedCampaignId)) {
      setSelectedCampaignId(rows[0].id);
    }
  };

  const loadOutboundNumbers = async (tenantId) => {
    if (!tenantId) {
      setOutboundNumbers([]);
      return;
    }
    const response = await telephonyAPI.listTenantNumbers(tenantId);
    const rows = Array.isArray(response?.data) ? response.data : [];
    const outbound = rows.filter(
      (row) =>
        row.status === 'active' &&
        row.usage_role === 'cold_caller_outbound' &&
        row.role_status === 'active' &&
        !row.conflict_code
    );
    setOutboundNumbers(outbound);
    const selectedStillValid = outbound.some((row) => row.id === campaignForm.outbound_phone_number_id);
    if (outbound.length > 0 && (!campaignForm.outbound_phone_number_id || !selectedStillValid)) {
      setCampaignForm((prev) => ({ ...prev, outbound_phone_number_id: outbound[0].id }));
    } else if (outbound.length === 0) {
      setCampaignForm((prev) => ({ ...prev, outbound_phone_number_id: '' }));
    }
  };

  const loadCampaignDetails = async (campaignId) => {
    if (!campaignId) {
      setContacts([]);
      setAttempts([]);
      return;
    }
    const [contactsResponse, attemptsResponse] = await Promise.all([
      coldCallerAPI.listContacts(campaignId),
      coldCallerAPI.listAttempts(campaignId),
    ]);
    setContacts(contactsResponse?.data || []);
    setAttempts(attemptsResponse?.data || []);
  };

  const refreshAll = async ({ keepNotice = false } = {}) => {
    try {
      if (!keepNotice) setNotice('');
      setError('');
      setLoading(true);
      await loadTenants();
      if (selectedTenant) {
        await Promise.all([loadAgents(selectedTenant), loadCampaigns(selectedTenant), loadOutboundNumbers(selectedTenant)]);
      }
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Failed to load Cold Caller data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    if (!selectedTenant) return;
    (async () => {
      try {
        setError('');
        await Promise.all([loadAgents(selectedTenant), loadCampaigns(selectedTenant), loadOutboundNumbers(selectedTenant)]);
      } catch (err) {
        setError(err?.response?.data?.detail || err.message || 'Failed to load tenant campaigns');
      }
    })();
  }, [selectedTenant]);

  useEffect(() => {
    if (!selectedCampaignId) return;
    (async () => {
      try {
        await loadCampaignDetails(selectedCampaignId);
      } catch (err) {
        setError(err?.response?.data?.detail || err.message || 'Failed to load campaign details');
      }
    })();
  }, [selectedCampaignId]);

  const createCampaign = async (event) => {
    event.preventDefault();
    try {
      setBusyAction('create-campaign');
      setError('');
      setNotice('');

      const payload = {
        tenant_id: selectedTenant,
        name: campaignForm.name,
        description: campaignForm.description,
        voice_agent_id: campaignForm.voice_agent_id,
        outbound_phone_number_id: campaignForm.outbound_phone_number_id,
        recording_enabled: Boolean(campaignForm.recording_enabled),
        recording_disclosure: campaignForm.recording_disclosure,
        compliance: {
          timezone: campaignForm.timezone,
          call_window_start: campaignForm.call_window_start,
          call_window_end: campaignForm.call_window_end,
          max_attempts_per_contact: Number(campaignForm.max_attempts_per_contact),
          max_attempts_per_day: Number(campaignForm.max_attempts_per_day),
          retry_delay_minutes: Number(campaignForm.retry_delay_minutes),
          retry_on_statuses: ['busy', 'no-answer'],
          excluded_numbers: [],
        },
      };
      const response = await coldCallerAPI.createCampaign(payload);
      const created = response?.data;
      setNotice(`Campaign "${created?.name || payload.name}" created`);
      setCampaignForm((prev) => ({
        ...DEFAULT_FORM,
        voice_agent_id: prev.voice_agent_id,
        outbound_phone_number_id: prev.outbound_phone_number_id,
      }));
      await loadCampaigns(selectedTenant);
      if (created?.id) setSelectedCampaignId(created.id);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Failed to create campaign');
    } finally {
      setBusyAction('');
    }
  };

  const uploadContacts = async () => {
    if (!selectedCampaignId || !contactsFile) return;
    try {
      setBusyAction('upload-contacts');
      setError('');
      setNotice('');
      const form = new FormData();
      form.append('file', contactsFile);
      const response = await coldCallerAPI.uploadContacts(selectedCampaignId, form);
      const result = response?.data;
      setNotice(
        `Contacts uploaded. Accepted: ${result?.accepted_count || 0}, Rejected: ${result?.rejected_count || 0}`
      );
      setContactsFile(null);
      await Promise.all([loadCampaigns(selectedTenant), loadCampaignDetails(selectedCampaignId)]);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Failed to upload contacts');
    } finally {
      setBusyAction('');
    }
  };

  const uploadIntroAudio = async () => {
    if (!selectedCampaignId || !audioFile) return;
    try {
      setBusyAction('upload-audio');
      setError('');
      setNotice('');

      const createResponse = await coldCallerAPI.createIntroAudioUploadUrl(selectedCampaignId, {
        file_name: audioFile.name,
        content_type: audioFile.type || 'audio/mpeg',
      });
      const uploadPayload = createResponse?.data;
      if (!uploadPayload?.upload_url) {
        throw new Error('Failed to generate upload URL');
      }

      const putResult = await fetch(uploadPayload.upload_url, {
        method: 'PUT',
        headers: {
          'Content-Type': audioFile.type || 'audio/mpeg',
        },
        body: audioFile,
      });
      if (!putResult.ok) {
        throw new Error(`Upload failed with status ${putResult.status}`);
      }

      await coldCallerAPI.confirmIntroAudio(selectedCampaignId, {
        object_key: uploadPayload.object_key,
        file_name: audioFile.name,
        content_type: audioFile.type || 'audio/mpeg',
        public_url: uploadPayload.public_url,
      });

      setNotice('Intro audio uploaded and confirmed');
      setAudioFile(null);
      await loadCampaigns(selectedTenant);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Failed to upload intro audio');
    } finally {
      setBusyAction('');
    }
  };

  const uploadDnc = async () => {
    if (!selectedTenant || !dncFile) return;
    try {
      setBusyAction('upload-dnc');
      setError('');
      setNotice('');
      const form = new FormData();
      form.append('file', dncFile);
      const response = await coldCallerAPI.uploadDnc(selectedTenant, form);
      const payload = response?.data;
      setNotice(`DNC uploaded. Added: ${payload?.accepted_count || 0}, Ignored: ${payload?.ignored_count || 0}`);
      setDncFile(null);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Failed to upload DNC');
    } finally {
      setBusyAction('');
    }
  };

  const parseNumbersFromText = (text) =>
    text
      .split(/[\n,;]+/)
      .map((item) => item.trim())
      .filter(Boolean);

  const buildPhoneCsvFile = (numbers, fileName) => {
    const uniqueNumbers = [...new Set(numbers)];
    const csvBody = uniqueNumbers.join('\n');
    const csvContent = `phone_number\n${csvBody}`;
    const csvBlob = new Blob([csvContent], { type: 'text/csv' });
    return new File([csvBlob], fileName, { type: 'text/csv' });
  };

  const addManualContacts = async () => {
    if (!selectedCampaignId || !manualContactNumbers.trim()) return;

    try {
      setBusyAction('manual-contacts');
      setError('');
      setNotice('');

      const numbers = parseNumbersFromText(manualContactNumbers);
      if (numbers.length === 0) {
        throw new Error('Please enter at least one phone number');
      }

      const file = buildPhoneCsvFile(numbers, 'manual-contacts.csv');
      const form = new FormData();
      form.append('file', file);

      const response = await coldCallerAPI.uploadContacts(selectedCampaignId, form);
      const result = response?.data;
      setNotice(
        `Manual numbers processed. Accepted: ${result?.accepted_count || 0}, Rejected: ${result?.rejected_count || 0}`
      );
      setManualContactNumbers('');
      await Promise.all([loadCampaigns(selectedTenant), loadCampaignDetails(selectedCampaignId)]);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Failed to add manual contacts');
    } finally {
      setBusyAction('');
    }
  };

  const addManualDncNumbers = async () => {
    if (!selectedTenant || !manualDncNumbers.trim()) return;

    try {
      setBusyAction('manual-dnc');
      setError('');
      setNotice('');

      const numbers = parseNumbersFromText(manualDncNumbers);
      if (numbers.length === 0) {
        throw new Error('Please enter at least one DNC number');
      }

      const file = buildPhoneCsvFile(numbers, 'manual-dnc.csv');
      const form = new FormData();
      form.append('file', file);

      const response = await coldCallerAPI.uploadDnc(selectedTenant, form);
      const payload = response?.data;
      setNotice(`DNC updated. Added: ${payload?.accepted_count || 0}, Ignored: ${payload?.ignored_count || 0}`);
      setManualDncNumbers('');
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Failed to add manual DNC numbers');
    } finally {
      setBusyAction('');
    }
  };

  const controlCampaign = async (action) => {
    if (!selectedCampaignId) return;
    try {
      setBusyAction(action);
      setError('');
      setNotice('');
      await coldCallerAPI.controlCampaign(selectedCampaignId, action);
      setNotice(`Campaign ${action} request submitted`);
      await Promise.all([loadCampaigns(selectedTenant), loadCampaignDetails(selectedCampaignId)]);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || `Failed to ${action} campaign`);
    } finally {
      setBusyAction('');
    }
  };

  const addTestPhoneNumber = async ({ startAfterAdd = false } = {}) => {
    if (!selectedCampaignId || !testPhoneNumber.trim()) return;

    const actionKey = startAfterAdd ? 'add-test-and-start' : 'add-test-number';

    try {
      setBusyAction(actionKey);
      setError('');
      setNotice('');

      const sanitizedPhone = testPhoneNumber.trim().replace(/[\r\n,]+/g, '');
      const csvContent = `phone_number,name,notes\n${sanitizedPhone},Quick Test Contact,Added from Cold Caller UI`;
      const csvBlob = new Blob([csvContent], { type: 'text/csv' });
      const csvFile = new File([csvBlob], 'quick-test-contact.csv', { type: 'text/csv' });

      const form = new FormData();
      form.append('file', csvFile);

      const uploadResponse = await coldCallerAPI.uploadContacts(selectedCampaignId, form);
      const uploadResult = uploadResponse?.data;
      const acceptedCount = uploadResult?.accepted_count || 0;

      if (acceptedCount < 1) {
        const rejectionReason = uploadResult?.rejected?.[0]?.reason;
        throw new Error(rejectionReason || 'Test phone number was not accepted');
      }

      let message = 'Test phone number added successfully.';

      if (startAfterAdd) {
        const startResponse = await coldCallerAPI.controlCampaign(selectedCampaignId, 'start');
        message = `Test number added. ${startResponse?.data?.message || 'Campaign start requested.'}`;
      }

      setNotice(message);
      setTestPhoneNumber('');
      await Promise.all([loadCampaigns(selectedTenant), loadCampaignDetails(selectedCampaignId)]);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Failed to add test phone number');
    } finally {
      setBusyAction('');
    }
  };

  const formatTime = (value) => {
    if (!value || !value.includes(':')) return value || '--:--';
    const [hoursText, minutesText] = value.split(':');
    const hours = Number(hoursText);
    if (Number.isNaN(hours)) return value;
    const normalizedHour = hours % 12 === 0 ? 12 : hours % 12;
    const meridiem = hours >= 12 ? 'PM' : 'AM';
    return `${normalizedHour}:${minutesText} ${meridiem}`;
  };

  if (loading) {
    return (
      <div className="p-6 text-gray-700 flex items-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading cold caller...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <PhoneCall className="h-7 w-7 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cold Caller Campaigns</h1>
          <p className="text-sm text-gray-600">Upload contacts, set intro audio, and run sequential outbound calls.</p>
        </div>
      </div>

      {error && <div className="rounded border border-red-300 bg-red-50 p-3 text-red-700 text-sm">{error}</div>}
      {notice && <div className="rounded border border-green-300 bg-green-50 p-3 text-green-700 text-sm">{notice}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Step 1</p>
            <h2 className="text-lg font-semibold text-gray-900">Tenant Setup</h2>
            <p className="text-sm text-gray-600 mt-1">Choose which tenant this campaign belongs to.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tenant</label>
            <select
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
              className="w-full border rounded-md p-2"
            >
              <option value="">Select tenant</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </div>

          <div className="border border-gray-200 rounded-md p-3 bg-gray-50">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tenant DNC CSV</label>
            <p className="text-xs text-gray-600 mb-2">
              Upload numbers that must never be called. File needs a <code>phone_number</code> column.
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setDncFile(e.target.files?.[0] || null)}
              className="w-full border rounded-md p-2 text-sm bg-white"
            />
            <button
              type="button"
              onClick={uploadDnc}
              disabled={!selectedTenant || !dncFile || currentBusy('upload-dnc')}
              className="mt-2 w-full bg-gray-900 text-white rounded-md px-3 py-2 text-sm disabled:opacity-50"
            >
              {currentBusy('upload-dnc') ? 'Uploading DNC...' : 'Upload DNC List'}
            </button>
          </div>

          <div className="border border-gray-200 rounded-md p-3 bg-gray-50">
            <label className="block text-sm font-medium text-gray-700 mb-1">Add DNC Numbers Manually</label>
            <p className="text-xs text-gray-600 mb-2">Enter one number per line or comma-separated values.</p>
            <textarea
              value={manualDncNumbers}
              onChange={(e) => setManualDncNumbers(e.target.value)}
              placeholder="+923001234567&#10;+14155550123"
              className="w-full border rounded-md p-2 text-sm bg-white min-h-[88px]"
            />
            <button
              type="button"
              onClick={addManualDncNumbers}
              disabled={!selectedTenant || !manualDncNumbers.trim() || currentBusy('manual-dnc')}
              className="mt-2 w-full bg-gray-900 text-white rounded-md px-3 py-2 text-sm disabled:opacity-50"
            >
              {currentBusy('manual-dnc') ? 'Adding DNC...' : 'Add DNC Numbers'}
            </button>
          </div>
        </div>

        <form className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-5 space-y-5" onSubmit={createCampaign}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Step 2</p>
            <h2 className="text-xl font-semibold text-gray-900">Create Campaign</h2>
            <p className="text-sm text-gray-600 mt-1">
              Set your campaign details now. You can upload contacts and intro audio right after this step.
            </p>
            {outboundNumbers.length === 0 && (
              <p className="text-xs text-red-700 mt-2">
                No valid outbound number found. Bind at least one number to <strong>Cold Caller outbound</strong> in
                Telephony Hub before creating a campaign.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name *</label>
              <input
                type="text"
                placeholder="e.g. Real Estate Follow-up - March"
                value={campaignForm.name}
                onChange={(e) => setCampaignForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full border rounded-md p-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Voice Agent *</label>
              <select
                value={campaignForm.voice_agent_id}
                onChange={(e) => setCampaignForm((prev) => ({ ...prev, voice_agent_id: e.target.value }))}
                className="w-full border rounded-md p-2"
                required
              >
                <option value="">Select voice agent</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Outbound Number *</label>
            <select
              value={campaignForm.outbound_phone_number_id}
              onChange={(e) => setCampaignForm((prev) => ({ ...prev, outbound_phone_number_id: e.target.value }))}
              className="w-full border rounded-md p-2"
              required
            >
              <option value="">Select outbound number</option>
              {outboundNumbers.map((numberRow) => (
                <option key={numberRow.id} value={numberRow.id}>
                  {numberRow.phone_number}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              This must be a Telephony Hub number with role <strong>Cold Caller outbound</strong>.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
            <textarea
              placeholder="Add context for your team, like audience type or call objective."
              value={campaignForm.description}
              onChange={(e) => setCampaignForm((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full border rounded-md p-2 min-h-[80px]"
            />
          </div>

          <div className="border border-gray-200 rounded-md p-4 bg-gray-50 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Calling Rules</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                <input
                  list="cold-caller-timezones"
                  value={campaignForm.timezone}
                  onChange={(e) => setCampaignForm((prev) => ({ ...prev, timezone: e.target.value }))}
                  className="w-full border rounded-md p-2"
                  placeholder="UTC"
                />
                <datalist id="cold-caller-timezones">
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz} value={tz} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Call Start</label>
                  <input
                    type="time"
                    value={campaignForm.call_window_start}
                    onChange={(e) => setCampaignForm((prev) => ({ ...prev, call_window_start: e.target.value }))}
                    className="w-full border rounded-md p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Call End</label>
                  <input
                    type="time"
                    value={campaignForm.call_window_end}
                    onChange={(e) => setCampaignForm((prev) => ({ ...prev, call_window_end: e.target.value }))}
                    className="w-full border rounded-md p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Attempts Per Contact</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={campaignForm.max_attempts_per_contact}
                  onChange={(e) =>
                    setCampaignForm((prev) => ({ ...prev, max_attempts_per_contact: Number(e.target.value || 1) }))
                  }
                  className="w-full border rounded-md p-2"
                />
                <p className="text-xs text-gray-500 mt-1">Recommended: 2-3 attempts.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Attempts Per Day</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={campaignForm.max_attempts_per_day}
                  onChange={(e) =>
                    setCampaignForm((prev) => ({ ...prev, max_attempts_per_day: Number(e.target.value || 1) }))
                  }
                  className="w-full border rounded-md p-2"
                />
                <p className="text-xs text-gray-500 mt-1">Controls daily call pressure on each lead.</p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Retry Delay (Minutes)</label>
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={campaignForm.retry_delay_minutes}
                  onChange={(e) =>
                    setCampaignForm((prev) => ({ ...prev, retry_delay_minutes: Number(e.target.value || 1) }))
                  }
                  className="w-full border rounded-md p-2"
                />
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-md p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Recording</h3>
            <div className="flex items-start gap-2">
              <input
                id="recording_enabled"
                type="checkbox"
                checked={campaignForm.recording_enabled}
                onChange={(e) => setCampaignForm((prev) => ({ ...prev, recording_enabled: e.target.checked }))}
                className="mt-1"
              />
              <label htmlFor="recording_enabled" className="text-sm text-gray-700">
                Enable call recording for this campaign.
                <span className="block text-xs text-gray-500 mt-1">
                  If your region requires consent, add a disclosure message below.
                </span>
              </label>
            </div>
            <input
              type="text"
              placeholder="Recording disclosure (optional)"
              value={campaignForm.recording_disclosure}
              onChange={(e) => setCampaignForm((prev) => ({ ...prev, recording_disclosure: e.target.value }))}
              className="w-full border rounded-md p-2"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs text-gray-600">
              Calls will run in <strong>{campaignForm.timezone || 'UTC'}</strong> between{' '}
              <strong>{formatTime(campaignForm.call_window_start)}</strong> and{' '}
              <strong>{formatTime(campaignForm.call_window_end)}</strong>.
            </p>
            <button
              type="submit"
              disabled={
                !selectedTenant ||
                !campaignForm.name.trim() ||
                !campaignForm.voice_agent_id ||
                !campaignForm.outbound_phone_number_id ||
                currentBusy('create-campaign')
              }
              className="bg-blue-600 text-white rounded-md px-5 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {currentBusy('create-campaign') ? 'Creating Campaign...' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Campaigns</h2>
          <div className="space-y-2 max-h-[420px] overflow-auto">
            {campaigns.length === 0 ? (
              <p className="text-sm text-gray-600">No campaigns found for this tenant.</p>
            ) : (
              campaigns.map((campaign) => (
                <button
                  key={campaign.id}
                  type="button"
                  onClick={() => setSelectedCampaignId(campaign.id)}
                  className={`w-full text-left border rounded-md p-3 ${
                    selectedCampaignId === campaign.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="font-medium text-gray-900">{campaign.name}</div>
                  <div className="text-xs text-gray-600 mt-1">Status: {campaign.status}</div>
                  <div className="text-xs text-gray-600">Outbound: {campaign?.outbound_phone_number?.phone_number || '-'}</div>
                  <div className="text-xs text-gray-600">
                    Contacts: {campaign.completed_contacts}/{campaign.total_contacts} completed
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-4 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Campaign Actions</h2>
          {!selectedCampaign ? (
            <p className="text-sm text-gray-600">Select a campaign to manage.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="border rounded-md p-3 md:col-span-2 bg-blue-50 border-blue-200">
                  <p className="text-sm font-semibold text-blue-900">Quick Test Number</p>
                  <p className="text-xs text-blue-800 mt-1">
                    Add one phone number directly from UI to quickly test this campaign without preparing a CSV file.
                  </p>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={testPhoneNumber}
                      onChange={(e) => setTestPhoneNumber(e.target.value)}
                      placeholder="e.g. +923001234567"
                      className="sm:col-span-2 border rounded-md p-2 text-sm bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => addTestPhoneNumber({ startAfterAdd: false })}
                      disabled={!testPhoneNumber.trim() || currentBusy('add-test-number') || currentBusy('add-test-and-start')}
                      className="bg-blue-700 text-white rounded-md px-3 py-2 text-sm disabled:opacity-50"
                    >
                      {currentBusy('add-test-number') ? 'Adding...' : 'Add Test Number'}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => addTestPhoneNumber({ startAfterAdd: true })}
                    disabled={!testPhoneNumber.trim() || currentBusy('add-test-number') || currentBusy('add-test-and-start')}
                    className="mt-2 bg-indigo-700 text-white rounded-md px-3 py-2 text-sm disabled:opacity-50"
                  >
                    {currentBusy('add-test-and-start') ? 'Adding & Starting...' : 'Add & Start Test'}
                  </button>
                </div>

                <div className="border rounded-md p-3 md:col-span-2">
                  <p className="text-sm font-semibold text-gray-900">Add Numbers Manually</p>
                  <p className="text-xs text-gray-600 mt-1">
                    No CSV needed. Paste one number per line (or comma-separated) and add directly to this campaign.
                  </p>
                  <textarea
                    value={manualContactNumbers}
                    onChange={(e) => setManualContactNumbers(e.target.value)}
                    placeholder="+923001234567&#10;+14155550123"
                    className="mt-2 w-full border rounded-md p-2 text-sm min-h-[88px]"
                  />
                  <button
                    type="button"
                    onClick={addManualContacts}
                    disabled={!manualContactNumbers.trim() || currentBusy('manual-contacts')}
                    className="mt-2 bg-gray-900 text-white rounded-md px-3 py-2 text-sm disabled:opacity-50"
                  >
                    {currentBusy('manual-contacts') ? 'Adding Numbers...' : 'Add Numbers to Campaign'}
                  </button>
                </div>

                <div className="border rounded-md p-3">
                  <p className="text-sm font-medium text-gray-700">Upload Contacts CSV</p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setContactsFile(e.target.files?.[0] || null)}
                    className="w-full border rounded-md p-2 text-sm mt-2"
                  />
                  <button
                    type="button"
                    onClick={uploadContacts}
                    disabled={!contactsFile || currentBusy('upload-contacts')}
                    className="mt-2 w-full bg-gray-900 text-white rounded-md px-3 py-2 text-sm disabled:opacity-50"
                  >
                    <Upload className="h-4 w-4 inline mr-1" />
                    {currentBusy('upload-contacts') ? 'Uploading...' : 'Upload Contacts'}
                  </button>
                </div>

                <div className="border rounded-md p-3">
                  <p className="text-sm font-medium text-gray-700">Upload Intro Audio</p>
                  <input
                    type="file"
                    accept=".mp3,.wav,audio/mpeg,audio/wav"
                    onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                    className="w-full border rounded-md p-2 text-sm mt-2"
                  />
                  <button
                    type="button"
                    onClick={uploadIntroAudio}
                    disabled={!audioFile || currentBusy('upload-audio')}
                    className="mt-2 w-full bg-gray-900 text-white rounded-md px-3 py-2 text-sm disabled:opacity-50"
                  >
                    <Upload className="h-4 w-4 inline mr-1" />
                    {currentBusy('upload-audio') ? 'Uploading...' : 'Upload Intro Audio'}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => controlCampaign('start')}
                  disabled={currentBusy('start')}
                  className="bg-green-600 text-white rounded-md px-3 py-2 text-sm disabled:opacity-50"
                >
                  <Play className="h-4 w-4 inline mr-1" />
                  Start
                </button>
                <button
                  type="button"
                  onClick={() => controlCampaign('pause')}
                  disabled={currentBusy('pause')}
                  className="bg-yellow-600 text-white rounded-md px-3 py-2 text-sm disabled:opacity-50"
                >
                  <Pause className="h-4 w-4 inline mr-1" />
                  Pause
                </button>
                <button
                  type="button"
                  onClick={() => controlCampaign('resume')}
                  disabled={currentBusy('resume')}
                  className="bg-blue-600 text-white rounded-md px-3 py-2 text-sm disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4 inline mr-1" />
                  Resume
                </button>
                <button
                  type="button"
                  onClick={() => controlCampaign('cancel')}
                  disabled={currentBusy('cancel')}
                  className="bg-red-600 text-white rounded-md px-3 py-2 text-sm disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4 inline mr-1" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => loadCampaignDetails(selectedCampaignId)}
                  className="bg-gray-200 text-gray-800 rounded-md px-3 py-2 text-sm"
                >
                  Refresh Logs
                </button>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="border rounded-md p-3">
                  <h3 className="font-medium text-gray-900 mb-2">Contacts</h3>
                  <div className="max-h-64 overflow-auto text-sm">
                    {contacts.length === 0 ? (
                      <p className="text-gray-600">No contacts loaded.</p>
                    ) : (
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-gray-600 border-b">
                            <th className="py-1 pr-2">Phone</th>
                            <th className="py-1 pr-2">Status</th>
                            <th className="py-1 pr-2">Attempts</th>
                          </tr>
                        </thead>
                        <tbody>
                          {contacts.map((contact) => (
                            <tr key={contact.id} className="border-b last:border-b-0">
                              <td className="py-1 pr-2">{contact.phone_number}</td>
                              <td className="py-1 pr-2">{contact.status}</td>
                              <td className="py-1 pr-2">{contact.attempt_count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                <div className="border rounded-md p-3">
                  <h3 className="font-medium text-gray-900 mb-2">Attempts</h3>
                  <div className="max-h-64 overflow-auto text-sm">
                    {attempts.length === 0 ? (
                      <p className="text-gray-600">No attempts yet.</p>
                    ) : (
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-gray-600 border-b">
                            <th className="py-1 pr-2">Attempt</th>
                            <th className="py-1 pr-2">Status</th>
                            <th className="py-1 pr-2">Call SID</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attempts.map((attempt) => (
                            <tr key={attempt.id} className="border-b last:border-b-0">
                              <td className="py-1 pr-2">#{attempt.attempt_number}</td>
                              <td className="py-1 pr-2">{attempt.status}</td>
                              <td className="py-1 pr-2">{attempt.twilio_call_sid || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ColdCallerPage;
