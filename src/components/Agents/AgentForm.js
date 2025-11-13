import React, { useState, useEffect } from 'react';
import { agentAPI } from '../../services/api';
import { X, Volume2, Loader } from 'lucide-react';

const AgentForm = ({ tenantId, agent, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    voice_id: '',
    language: 'en-US',
    greeting_message: '',
    service_type: 'Home Services',
  });
  const [voices, setVoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [voicesLoading, setVoicesLoading] = useState(true);
  const [error, setError] = useState('');
  const [playingVoice, setPlayingVoice] = useState(null);

  const serviceTypes = [
    'Home Services',
    'Plumbing',
    'Electrician',
    'Painter',
    'Carpenter',
    'Maids',
  ];

  const languages = [
    { code: 'en-US', name: 'English (US)' },
    { code: 'en-GB', name: 'English (UK)' },
    { code: 'es-ES', name: 'Spanish (Spain)' },
    { code: 'es-MX', name: 'Spanish (Mexico)' },
    { code: 'fr-FR', name: 'French' },
    { code: 'de-DE', name: 'German' },
    { code: 'it-IT', name: 'Italian' },
    { code: 'pt-BR', name: 'Portuguese (Brazil)' },
  ];

  useEffect(() => {
    fetchVoices();
    if (agent) {
      setFormData({
        name: agent.name,
        voice_id: agent.voice_id,
        language: agent.language,
        greeting_message: agent.greeting_message,
        service_type: agent.service_type,
      });
    }
  }, [agent]);

  const fetchVoices = async () => {
    try {
      setVoicesLoading(true);
      const response = await agentAPI.getAvailableVoices();
      setVoices(response.data.voices);
    } catch (err) {
      console.error('Failed to fetch voices:', err);
    } finally {
      setVoicesLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleVoicePreview = async (voiceId) => {
    try {
      setPlayingVoice(voiceId);
      
      // Get the audio file URL from backend
      const response = await agentAPI.getVoicePreviewUrl(voiceId);
      const audioUrl = response.data.audio_url;
      
      // Create full URL (backend base URL + audio path)
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const fullAudioUrl = `${baseURL}${audioUrl}`;
      
      // Create and play audio
      const audio = new Audio(fullAudioUrl);
      
      audio.onended = () => {
        setPlayingVoice(null);
      };
      
      audio.onerror = (e) => {
        console.error('Failed to play audio:', e);
        setError('Audio file not found. Please run voice sample generator script.');
        setPlayingVoice(null);
      };
      
      await audio.play();
      
    } catch (err) {
      console.error('Failed to preview voice:', err);
      if (err.response?.status === 404) {
        setError('Voice samples not generated yet. Please ask admin to run: python generate_voice_samples.py');
      }
      setPlayingVoice(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (agent) {
        // Update existing agent
        await agentAPI.updateAgent(agent.id, formData);
      } else {
        // Create new agent
        await agentAPI.createAgent(tenantId, formData);
      }
      onSuccess();
    } catch (err) {
      const errorDetail = err.response?.data?.detail;
      if (Array.isArray(errorDetail)) {
        // Handle Pydantic validation errors
        const errorMessages = errorDetail.map(e => `${e.loc?.join('.')} - ${e.msg}`).join(', ');
        setError(errorMessages);
      } else if (typeof errorDetail === 'string') {
        setError(errorDetail);
      } else {
        setError('Failed to save agent');
      }
    } finally {
      setLoading(false);
    }
  };

  const getVoiceById = (voiceId) => {
    return voices.find((v) => v.voice_id === voiceId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 my-8">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {agent ? 'Edit Agent' : 'Create New Agent'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Agent Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Agent Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Receptionist Sarah"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Give your agent a friendly name</p>
          </div>

          {/* Voice Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Voice *
            </label>
            {voicesLoading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader className="h-4 w-4 animate-spin" />
                Loading voices...
              </div>
            ) : (
              <div className="space-y-2">
                <select
                  name="voice_id"
                  value={formData.voice_id}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a voice</option>
                  {voices.map((voice) => (
                    <option key={voice.voice_id} value={voice.voice_id}>
                      {voice.name} - {voice.description} ({voice.category})
                    </option>
                  ))}
                </select>
                
                {/* Voice Preview Button */}
                {formData.voice_id && (
                  <button
                    type="button"
                    onClick={() => handleVoicePreview(formData.voice_id)}
                    disabled={playingVoice !== null}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition disabled:opacity-50"
                  >
                    {playingVoice === formData.voice_id ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        Playing...
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-4 w-4" />
                        Preview Voice
                      </>
                    )}
                  </button>
                )}
                
                {/* Selected Voice Info */}
                {formData.voice_id && getVoiceById(formData.voice_id) && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-900 font-medium">
                      {getVoiceById(formData.voice_id).name}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      {getVoiceById(formData.voice_id).description}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Best for: {getVoiceById(formData.voice_id).use_case.replace(/_/g, ' ')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Language *
            </label>
            <select
              name="language"
              value={formData.language}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* Service Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service Type *
            </label>
            <select
              name="service_type"
              value={formData.service_type}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {serviceTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Greeting Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Greeting Message *
            </label>
            <textarea
              name="greeting_message"
              value={formData.greeting_message}
              onChange={handleChange}
              placeholder="Hello! Thank you for calling. How can I help you today?"
              required
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              This message will be spoken when a call is received
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : agent ? 'Update Agent' : 'Create Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AgentForm;

