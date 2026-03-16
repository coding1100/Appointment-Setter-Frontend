import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { chatbotAgentAPI } from '../../services/api';

const STEPS = ['Basics', 'Domain', 'Behavior', 'Knowledge', 'Launcher', 'Install'];

const DOMAIN_OPTIONS = [
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'customer_support', label: 'Customer Support' },
  { value: 'education', label: 'Education' },
  { value: 'home_services', label: 'Home Services' },
  { value: 'professional_services', label: 'Professional Services' },
  { value: 'custom', label: 'Custom' },
];

const DEFAULT_THEME = {
  primary_color: '#0EA5E9',
  background_color: '#FFFFFF',
  text_color: '#111111',
};

const getDefaultForm = () => ({
  name: '',
  status: 'active',
  allowed_origins_text: '',
  welcome_message: '',
  theme: { ...DEFAULT_THEME },
  domain_key: 'customer_support',
  custom_domain_name: '',
  behavior: {
    persona: 'Helpful assistant',
    goal: 'Help users quickly and clearly',
    tone: 'friendly',
    response_style: 'balanced',
    language: 'en',
    allowed_topics_text: '',
    blocked_topics_text: '',
    escalation_instructions: 'Escalate complex requests to a human agent.',
    custom_instructions: '',
  },
  knowledge: {
    business_facts: '',
    faq_text: '',
  },
  launcher: {
    position: 'bottom-right',
    button_label: 'Chat with us',
    button_icon: 'message-circle',
    accent_color: '#0EA5E9',
  },
});

const parseList = (value) =>
  value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

const parseFaq = (value) =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [question, ...answerParts] = line.split('|');
      return {
        question: (question || '').trim(),
        answer: answerParts.join('|').trim(),
      };
    })
    .filter((entry) => entry.question && entry.answer);

const faqToText = (faqItems = []) =>
  faqItems
    .map((item) => {
      const question = item?.question?.trim();
      const answer = item?.answer?.trim();
      if (!question || !answer) return null;
      return `${question} | ${answer}`;
    })
    .filter(Boolean)
    .join('\n');

const ChatbotForm = ({ chatbot, existingChatbots = [], onClose, onSuccess }) => {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState(getDefaultForm());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!chatbot) {
      setStep(0);
      setFormData(getDefaultForm());
      return;
    }
    const defaults = getDefaultForm();

    setFormData({
      name: chatbot.name || '',
      status: chatbot.status || 'active',
      allowed_origins_text: Array.isArray(chatbot.allowed_origins) ? chatbot.allowed_origins.join('\n') : '',
      welcome_message: chatbot.welcome_message || '',
      theme: {
        primary_color: chatbot.theme?.primary_color || DEFAULT_THEME.primary_color,
        background_color: chatbot.theme?.background_color || DEFAULT_THEME.background_color,
        text_color: chatbot.theme?.text_color || DEFAULT_THEME.text_color,
      },
      domain_key: chatbot.domain_key || 'customer_support',
      custom_domain_name: chatbot.custom_domain_name || '',
      behavior: {
        persona: chatbot.behavior_config?.persona || defaults.behavior.persona,
        goal: chatbot.behavior_config?.goal || defaults.behavior.goal,
        tone: chatbot.behavior_config?.tone || 'friendly',
        response_style: chatbot.behavior_config?.response_style || 'balanced',
        language: chatbot.behavior_config?.language || 'en',
        allowed_topics_text: Array.isArray(chatbot.behavior_config?.allowed_topics)
          ? chatbot.behavior_config.allowed_topics.join('\n')
          : '',
        blocked_topics_text: Array.isArray(chatbot.behavior_config?.blocked_topics)
          ? chatbot.behavior_config.blocked_topics.join('\n')
          : '',
        escalation_instructions: chatbot.behavior_config?.escalation_instructions || defaults.behavior.escalation_instructions,
        custom_instructions: chatbot.behavior_config?.custom_instructions || '',
      },
      knowledge: {
        business_facts: chatbot.knowledge_config?.business_facts || '',
        faq_text: faqToText(chatbot.knowledge_config?.faq_items || []),
      },
      launcher: {
        position: chatbot.launcher_config?.position || 'bottom-right',
        button_label: chatbot.launcher_config?.button_label || 'Chat with us',
        button_icon: chatbot.launcher_config?.button_icon || 'message-circle',
        accent_color: chatbot.launcher_config?.accent_color || chatbot.theme?.primary_color || '#0EA5E9',
      },
    });
    setStep(0);
  }, [chatbot]);

  const parsedOrigins = useMemo(() => parseList(formData.allowed_origins_text), [formData.allowed_origins_text]);

  const formatError = (err, fallback) => {
    const detail = err.response?.data?.detail;
    if (Array.isArray(detail)) {
      return detail.map((e) => `${e.loc?.join('.')} - ${e.msg}`).join(', ');
    }
    return typeof detail === 'string' ? detail : fallback;
  };

  const isDuplicateName = () =>
    existingChatbots.some((entry) => {
      if (chatbot && entry.id === chatbot.id) return false;
      return entry.name?.trim().toLowerCase() === formData.name.trim().toLowerCase();
    });

  const validateBeforeSubmit = () => {
    if (!formData.name.trim()) return 'Name is required.';
    if (isDuplicateName()) return 'A chatbot with this name already exists.';
    if (parsedOrigins.length === 0) return 'At least one allowed origin is required.';
    if (!formData.welcome_message.trim()) return 'Welcome message is required.';
    if (!formData.domain_key) return 'Domain is required.';
    if (formData.domain_key === 'custom' && !formData.custom_domain_name.trim()) {
      return 'Custom domain name is required when domain is custom.';
    }
    if (!formData.behavior.persona.trim()) return 'Behavior persona is required.';
    if (!formData.behavior.goal.trim()) return 'Behavior goal is required.';
    if (!formData.behavior.escalation_instructions.trim()) return 'Escalation instructions are required.';
    if (!formData.knowledge.business_facts.trim()) return 'Business facts are required.';
    if (!formData.launcher.button_label.trim()) return 'Launcher button label is required.';
    return '';
  };

  const handleFieldChange = (name, value) => setFormData((prev) => ({ ...prev, [name]: value }));
  const handleThemeChange = (name, value) =>
    setFormData((prev) => ({ ...prev, theme: { ...prev.theme, [name]: value } }));
  const handleBehaviorChange = (name, value) =>
    setFormData((prev) => ({ ...prev, behavior: { ...prev.behavior, [name]: value } }));
  const handleKnowledgeChange = (name, value) =>
    setFormData((prev) => ({ ...prev, knowledge: { ...prev.knowledge, [name]: value } }));
  const handleLauncherChange = (name, value) =>
    setFormData((prev) => ({ ...prev, launcher: { ...prev.launcher, [name]: value } }));

  const buildPayload = () => ({
    name: formData.name.trim(),
    status: formData.status,
    allowed_origins: parsedOrigins,
    welcome_message: formData.welcome_message.trim(),
    theme: formData.theme,
    domain_key: formData.domain_key,
    custom_domain_name: formData.domain_key === 'custom' ? formData.custom_domain_name.trim() : null,
    behavior_config: {
      persona: formData.behavior.persona.trim(),
      goal: formData.behavior.goal.trim(),
      tone: formData.behavior.tone,
      response_style: formData.behavior.response_style,
      language: formData.behavior.language.trim(),
      allowed_topics: parseList(formData.behavior.allowed_topics_text),
      blocked_topics: parseList(formData.behavior.blocked_topics_text),
      escalation_instructions: formData.behavior.escalation_instructions.trim(),
      custom_instructions: formData.behavior.custom_instructions.trim(),
    },
    knowledge_config: {
      business_facts: formData.knowledge.business_facts.trim(),
      faq_items: parseFaq(formData.knowledge.faq_text),
    },
    launcher_config: {
      mode: 'launcher',
      position: formData.launcher.position,
      button_label: formData.launcher.button_label.trim(),
      button_icon: formData.launcher.button_icon.trim(),
      accent_color: formData.launcher.accent_color,
    },
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const validationError = validateBeforeSubmit();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      const payload = buildPayload();
      if (chatbot) {
        await chatbotAgentAPI.updateChatbotAgent(chatbot.id, payload);
      } else {
        await chatbotAgentAPI.createChatbotAgent(payload);
      }
      onSuccess();
    } catch (err) {
      setError(formatError(err, 'Failed to save chatbot agent'));
    } finally {
      setLoading(false);
    }
  };

  const canGoBack = step > 0;
  const canGoNext = step < STEPS.length - 1;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 my-8">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{chatbot ? 'Edit Chatbot Agent' : 'Create Chatbot Agent'}</h2>
            <p className="text-sm text-gray-600 mt-1">
              Step {step + 1} of {STEPS.length}: {STEPS[step]}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="px-6 pt-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {STEPS.map((label, index) => (
              <div
                key={label}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  index === step ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

          {step === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., Customer Success Assistant"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleFieldChange('status', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Allowed Origins *</label>
                <textarea
                  value={formData.allowed_origins_text}
                  onChange={(e) => handleFieldChange('allowed_origins_text', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none"
                  placeholder={'https://www.yourwebsite.com\nhttps://staging.yourwebsite.com'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Welcome Message *</label>
                <textarea
                  value={formData.welcome_message}
                  onChange={(e) => handleFieldChange('welcome_message', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="color"
                    value={formData.theme.primary_color}
                    onChange={(e) => handleThemeChange('primary_color', e.target.value)}
                    className="w-full h-10 border border-gray-300 rounded"
                  />
                  <input
                    type="color"
                    value={formData.theme.background_color}
                    onChange={(e) => handleThemeChange('background_color', e.target.value)}
                    className="w-full h-10 border border-gray-300 rounded"
                  />
                  <input
                    type="color"
                    value={formData.theme.text_color}
                    onChange={(e) => handleThemeChange('text_color', e.target.value)}
                    className="w-full h-10 border border-gray-300 rounded"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Domain *</label>
                <select
                  value={formData.domain_key}
                  onChange={(e) => handleFieldChange('domain_key', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  {DOMAIN_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {formData.domain_key === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Custom Domain Name *</label>
                  <input
                    type="text"
                    value={formData.custom_domain_name}
                    onChange={(e) => handleFieldChange('custom_domain_name', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., Legal Intake Assistant"
                  />
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={formData.behavior.persona}
                  onChange={(e) => handleBehaviorChange('persona', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Persona"
                />
                <input
                  type="text"
                  value={formData.behavior.goal}
                  onChange={(e) => handleBehaviorChange('goal', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Goal"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select
                  value={formData.behavior.tone}
                  onChange={(e) => handleBehaviorChange('tone', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="professional">professional</option>
                  <option value="friendly">friendly</option>
                  <option value="sales">sales</option>
                  <option value="empathetic">empathetic</option>
                  <option value="technical">technical</option>
                </select>
                <select
                  value={formData.behavior.response_style}
                  onChange={(e) => handleBehaviorChange('response_style', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="concise">concise</option>
                  <option value="balanced">balanced</option>
                  <option value="detailed">detailed</option>
                </select>
                <input
                  type="text"
                  value={formData.behavior.language}
                  onChange={(e) => handleBehaviorChange('language', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Language code (e.g., en)"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <textarea
                  value={formData.behavior.allowed_topics_text}
                  onChange={(e) => handleBehaviorChange('allowed_topics_text', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none"
                  placeholder="Allowed topics (one per line)"
                />
                <textarea
                  value={formData.behavior.blocked_topics_text}
                  onChange={(e) => handleBehaviorChange('blocked_topics_text', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none"
                  placeholder="Blocked topics (one per line)"
                />
              </div>

              <textarea
                value={formData.behavior.escalation_instructions}
                onChange={(e) => handleBehaviorChange('escalation_instructions', e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none"
                placeholder="Escalation instructions"
              />
              <textarea
                value={formData.behavior.custom_instructions}
                onChange={(e) => handleBehaviorChange('custom_instructions', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none"
                placeholder="Custom instructions (optional)"
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <textarea
                value={formData.knowledge.business_facts}
                onChange={(e) => handleKnowledgeChange('business_facts', e.target.value)}
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none"
                placeholder="Business facts (hours, policies, contacts, core offerings)"
              />
              <textarea
                value={formData.knowledge.faq_text}
                onChange={(e) => handleKnowledgeChange('faq_text', e.target.value)}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none"
                placeholder={'FAQ format: Question | Answer\nExample: What are your hours? | Mon-Fri 9 AM to 6 PM'}
              />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                  value={formData.launcher.position}
                  onChange={(e) => handleLauncherChange('position', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="bottom-right">bottom-right</option>
                  <option value="bottom-left">bottom-left</option>
                </select>
                <input
                  type="text"
                  value={formData.launcher.button_label}
                  onChange={(e) => handleLauncherChange('button_label', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Button label"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={formData.launcher.button_icon}
                  onChange={(e) => handleLauncherChange('button_icon', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Button icon id"
                />
                <input
                  type="color"
                  value={formData.launcher.accent_color}
                  onChange={(e) => handleLauncherChange('accent_color', e.target.value)}
                  className="w-full h-10 border border-gray-300 rounded"
                />
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3 text-sm text-gray-700">
              <div>
                <span className="font-medium">Name:</span> {formData.name || '-'}
              </div>
              <div>
                <span className="font-medium">Domain:</span>{' '}
                {formData.domain_key === 'custom' ? formData.custom_domain_name || 'custom' : formData.domain_key}
              </div>
              <div>
                <span className="font-medium">Allowed Origins:</span> {parsedOrigins.length}
              </div>
              <div>
                <span className="font-medium">Launcher:</span> {formData.launcher.position} / {formData.launcher.button_label}
              </div>
              <div className="text-xs text-gray-500">
                Submitting saves production settings. Then use "Generate Launcher" or "Copy Launcher Snippet" from the list.
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep((value) => Math.max(0, value - 1))}
              disabled={!canGoBack}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <div className="flex gap-3">
              {canGoNext ? (
                <button
                  type="button"
                  onClick={() => setStep((value) => Math.min(STEPS.length - 1, value + 1))}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                  {loading ? 'Saving...' : chatbot ? 'Update Chatbot' : 'Create Chatbot'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatbotForm;
