import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';

import { chatbotAgentAPI } from '../../domains/chatbot-agents/api';
import { formatApiError } from '../../shared/utils/errors';

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

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'ar', label: 'Arabic' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ur', label: 'Urdu' },
];

const TONE_OPTIONS = [
  { value: 'friendly', label: 'Friendly' },
  { value: 'professional', label: 'Professional' },
  { value: 'empathetic', label: 'Empathetic' },
  { value: 'sales', label: 'Sales-focused' },
  { value: 'technical', label: 'Technical' },
];

const RESPONSE_STYLE_OPTIONS = [
  { value: 'concise', label: 'Short answers' },
  { value: 'balanced', label: 'Balanced answers' },
  { value: 'detailed', label: 'Detailed answers' },
];

const BEHAVIOR_PRESETS = [
  {
    id: 'support',
    label: 'Customer Support',
    description: 'Great for helping with common questions and issues.',
    values: {
      persona: 'Friendly support assistant',
      goal: 'Resolve customer questions quickly and clearly',
      tone: 'friendly',
      response_style: 'balanced',
      escalation_instructions: 'Escalate billing disputes, refunds, and account issues to a human support manager.',
      custom_instructions: 'Always ask for order number or account email before giving account-specific help.',
      allowed_topics_text: 'Orders\nReturns\nShipping\nAccount help',
      blocked_topics_text: 'Medical advice\nLegal advice',
    },
  },
  {
    id: 'sales',
    label: 'Sales Assistant',
    description: 'Best for lead capture, qualification, and product guidance.',
    values: {
      persona: 'Helpful sales guide',
      goal: 'Understand visitor needs and guide them to the best product or service',
      tone: 'sales',
      response_style: 'balanced',
      escalation_instructions: 'Escalate pricing exceptions, enterprise deals, and contract requests to a human sales rep.',
      custom_instructions: 'Ask one qualifying question at a time and finish with a clear next step.',
      allowed_topics_text: 'Products\nPricing\nPackages\nDemos',
      blocked_topics_text: 'Medical advice\nLegal advice',
    },
  },
  {
    id: 'booking',
    label: 'Booking Assistant',
    description: 'Useful for appointments, availability, and scheduling support.',
    values: {
      persona: 'Scheduling assistant',
      goal: 'Help users book appointments with minimum friction',
      tone: 'professional',
      response_style: 'concise',
      escalation_instructions: 'Escalate urgent same-day requests and calendar conflicts to front desk staff.',
      custom_instructions: 'Always confirm date, time, and contact details before final confirmation.',
      allowed_topics_text: 'Availability\nAppointments\nRescheduling\nCancellations',
      blocked_topics_text: 'Medical advice\nFinancial advice',
    },
  },
];

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

const mergeLineItems = (existing, additions) => {
  const merged = new Set([...parseList(existing), ...parseList(additions)]);
  return Array.from(merged).join('\n');
};

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
  const [showAdvancedBehavior, setShowAdvancedBehavior] = useState(false);
  const [activeBehaviorPreset, setActiveBehaviorPreset] = useState('');

  useEffect(() => {
    if (!chatbot) {
      setStep(0);
      setFormData(getDefaultForm());
      setShowAdvancedBehavior(false);
      setActiveBehaviorPreset('');
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
    const hasAdvancedBehaviorFields =
      Boolean(chatbot.behavior_config?.custom_instructions) ||
      (chatbot.behavior_config?.allowed_topics || []).length > 0 ||
      (chatbot.behavior_config?.blocked_topics || []).length > 0;
    setShowAdvancedBehavior(hasAdvancedBehaviorFields);
    setActiveBehaviorPreset('');
    setStep(0);
  }, [chatbot]);

  const parsedOrigins = useMemo(() => parseList(formData.allowed_origins_text), [formData.allowed_origins_text]);

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

  const applyBehaviorPreset = (presetId) => {
    const preset = BEHAVIOR_PRESETS.find((entry) => entry.id === presetId);
    if (!preset) return;
    setActiveBehaviorPreset(presetId);
    setShowAdvancedBehavior(true);
    setFormData((prev) => ({
      ...prev,
      behavior: {
        ...prev.behavior,
        ...preset.values,
      },
    }));
  };

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
      setError(formatApiError(err, 'Failed to save chatbot agent'));
    } finally {
      setLoading(false);
    }
  };

  const canGoBack = step > 0;
  const canGoNext = step < STEPS.length - 1;
  const fieldLabelClass = 'shell-field-label';
  const helperTextClass = 'shell-field-help';
  const inputClass = 'shell-input';
  const colorInputClass = 'h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] p-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#04070fcc] px-4 py-8 backdrop-blur-sm">
      <div className="shell-modal my-8 flex max-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[28px]">
        <div className="flex items-start justify-between border-b border-white/8 px-6 py-5">
          <div>
            <p className="text-[0.78rem] uppercase tracking-[0.28em] text-white/50">Chatbot Workspace</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">
              {chatbot ? 'Edit Chatbot Agent' : 'Create Chatbot Agent'}
            </h2>
            <p className="mt-2 text-sm text-white/56">
              Step {step + 1} of {STEPS.length}: {STEPS[step]}
            </p>
          </div>
          <button onClick={onClose} className="text-white/46 transition hover:text-white/80">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="border-b border-white/8 px-6 pt-4">
          <div className="flex gap-2 overflow-x-auto pb-4">
            {STEPS.map((label, index) => (
              <div
                key={label}
                className={`rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                  index === step
                    ? 'bg-[#2f66ea] text-white'
                    : 'border border-white/8 bg-white/[0.03] text-white/56'
                }`}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {error && (
              <div className="rounded-2xl border border-rose-300/18 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            )}

          {step === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={fieldLabelClass}>Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    className={inputClass}
                    placeholder="e.g., Customer Success Assistant"
                  />
                </div>
                <div>
                  <label className={fieldLabelClass}>Status *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleFieldChange('status', e.target.value)}
                    className={inputClass}
                  >
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={fieldLabelClass}>Allowed Origins *</label>
                <textarea
                  value={formData.allowed_origins_text}
                  onChange={(e) => handleFieldChange('allowed_origins_text', e.target.value)}
                  rows={3}
                  className={`${inputClass} resize-none`}
                  placeholder={'https://www.yourwebsite.com\nhttps://staging.yourwebsite.com'}
                />
                <p className={helperTextClass}>List each approved website origin on its own line.</p>
              </div>

              <div>
                <label className={fieldLabelClass}>Welcome Message *</label>
                <textarea
                  value={formData.welcome_message}
                  onChange={(e) => handleFieldChange('welcome_message', e.target.value)}
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div className="shell-info-panel">
                <label className={fieldLabelClass}>Theme</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="color"
                    value={formData.theme.primary_color}
                    onChange={(e) => handleThemeChange('primary_color', e.target.value)}
                    className={colorInputClass}
                  />
                  <input
                    type="color"
                    value={formData.theme.background_color}
                    onChange={(e) => handleThemeChange('background_color', e.target.value)}
                    className={colorInputClass}
                  />
                  <input
                    type="color"
                    value={formData.theme.text_color}
                    onChange={(e) => handleThemeChange('text_color', e.target.value)}
                    className={colorInputClass}
                  />
                </div>
                <p className={helperTextClass}>These colors affect the embedded launcher and chat widget appearance.</p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className={fieldLabelClass}>Domain *</label>
                <select
                  value={formData.domain_key}
                  onChange={(e) => handleFieldChange('domain_key', e.target.value)}
                  className={inputClass}
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
                  <label className={fieldLabelClass}>Custom Domain Name *</label>
                  <input
                    type="text"
                    value={formData.custom_domain_name}
                    onChange={(e) => handleFieldChange('custom_domain_name', e.target.value)}
                    className={inputClass}
                    placeholder="e.g., Legal Intake Assistant"
                  />
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-[22px] border border-sky-300/18 bg-sky-300/10 px-4 py-3">
                <p className="text-sm font-semibold text-sky-100">Set your chatbot personality in plain language</p>
                <p className="mt-1 text-sm text-sky-100/80">
                  Start with a preset, then adjust tone and response style. Advanced controls are optional.
                </p>
              </div>

              <div>
                <p className={fieldLabelClass}>Quick Setup Presets</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {BEHAVIOR_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyBehaviorPreset(preset.id)}
                      className={`rounded-[22px] border p-4 text-left transition ${
                        activeBehaviorPreset === preset.id
                          ? 'border-sky-300/24 bg-sky-300/10'
                          : 'border-white/8 bg-white/[0.03] hover:border-sky-300/20 hover:bg-white/[0.05]'
                      }`}
                    >
                      <p className="text-sm font-semibold text-white">{preset.label}</p>
                      <p className="mt-1 text-xs text-white/58">{preset.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={fieldLabelClass}>Who is this bot? *</label>
                  <input
                    type="text"
                    value={formData.behavior.persona}
                    onChange={(e) => handleBehaviorChange('persona', e.target.value)}
                    className={inputClass}
                    placeholder="Example: Friendly support assistant"
                  />
                </div>
                <div>
                  <label className={fieldLabelClass}>Main job of the bot *</label>
                  <input
                    type="text"
                    value={formData.behavior.goal}
                    onChange={(e) => handleBehaviorChange('goal', e.target.value)}
                    className={inputClass}
                    placeholder="Example: Help customers with orders and returns"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={fieldLabelClass}>Tone *</label>
                  <select
                    value={formData.behavior.tone}
                    onChange={(e) => handleBehaviorChange('tone', e.target.value)}
                    className={inputClass}
                  >
                    {TONE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={fieldLabelClass}>Answer style *</label>
                  <select
                    value={formData.behavior.response_style}
                    onChange={(e) => handleBehaviorChange('response_style', e.target.value)}
                    className={inputClass}
                  >
                    {RESPONSE_STYLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={fieldLabelClass}>Language *</label>
                  <select
                    value={formData.behavior.language}
                    onChange={(e) => handleBehaviorChange('language', e.target.value)}
                    className={inputClass}
                  >
                    {LANGUAGE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label} ({option.value})
                      </option>
                    ))}
                    {!LANGUAGE_OPTIONS.some((option) => option.value === formData.behavior.language) && (
                      <option value={formData.behavior.language}>{formData.behavior.language}</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className={fieldLabelClass}>When should it hand over to a human? *</label>
                <textarea
                  value={formData.behavior.escalation_instructions}
                  onChange={(e) => handleBehaviorChange('escalation_instructions', e.target.value)}
                  rows={3}
                  className={`${inputClass} resize-none`}
                  placeholder="Example: Escalate billing disputes and account closure requests to support manager."
                />
              </div>

              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                <button
                  type="button"
                  onClick={() => setShowAdvancedBehavior((value) => !value)}
                  className="text-sm font-medium text-sky-100 hover:text-white"
                >
                  {showAdvancedBehavior ? 'Hide advanced behavior settings' : 'Show advanced behavior settings'}
                </button>
                <p className="mt-1 text-xs text-white/50">
                  Advanced settings are optional. Use them only if you need strict topic boundaries.
                </p>
              </div>

              {showAdvancedBehavior && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={fieldLabelClass}>Allowed topics (optional)</label>
                      <textarea
                        value={formData.behavior.allowed_topics_text}
                        onChange={(e) => handleBehaviorChange('allowed_topics_text', e.target.value)}
                        rows={5}
                        className={`${inputClass} resize-none`}
                        placeholder="One per line. Example: Orders, Pricing, Scheduling"
                      />
                    </div>
                    <div>
                      <label className={fieldLabelClass}>Blocked topics (optional)</label>
                      <textarea
                        value={formData.behavior.blocked_topics_text}
                        onChange={(e) => handleBehaviorChange('blocked_topics_text', e.target.value)}
                        rows={5}
                        className={`${inputClass} resize-none`}
                        placeholder="One per line. Example: Medical advice, Legal advice"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleBehaviorChange(
                            'blocked_topics_text',
                            mergeLineItems(formData.behavior.blocked_topics_text, 'Medical advice\nLegal advice\nFinancial advice')
                          )
                        }
                        className="mt-2 text-xs text-sky-100 hover:text-white"
                      >
                        + Add common sensitive topics
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={fieldLabelClass}>Extra instructions for your team voice (optional)</label>
                    <textarea
                      value={formData.behavior.custom_instructions}
                      onChange={(e) => handleBehaviorChange('custom_instructions', e.target.value)}
                      rows={4}
                      className={`${inputClass} resize-none`}
                      placeholder="Example: Greet with first name when available. Never promise refunds without approval."
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-[22px] border border-emerald-300/18 bg-emerald-300/10 px-4 py-3">
                <p className="text-sm font-semibold text-emerald-100">Give your bot trusted business information</p>
                <p className="mt-1 text-sm text-emerald-100/78">
                  The bot will use this information as source-of-truth while answering users.
                </p>
              </div>
              <div>
                <label className={fieldLabelClass}>Business facts *</label>
                <textarea
                  value={formData.knowledge.business_facts}
                  onChange={(e) => handleKnowledgeChange('business_facts', e.target.value)}
                  rows={6}
                  className={`${inputClass} resize-none`}
                  placeholder="Include hours, location, return policy, contact details, service areas, and important rules."
                />
              </div>
              <div>
                <label className={fieldLabelClass}>FAQ pairs (optional)</label>
                <textarea
                  value={formData.knowledge.faq_text}
                  onChange={(e) => handleKnowledgeChange('faq_text', e.target.value)}
                  rows={7}
                  className={`${inputClass} resize-none`}
                  placeholder={'Format: Question | Answer\nExample: What are your hours? | Mon-Fri 9 AM to 6 PM'}
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="rounded-[22px] border border-amber-300/18 bg-amber-300/10 px-4 py-3">
                <p className="text-sm font-semibold text-amber-100">Choose how the launcher looks on your website</p>
                <p className="mt-1 text-sm text-amber-100/78">
                  These settings control the floating button visitors click to open chat.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={fieldLabelClass}>Button position</label>
                  <select
                    value={formData.launcher.position}
                    onChange={(e) => handleLauncherChange('position', e.target.value)}
                    className={inputClass}
                  >
                    <option value="bottom-right">Bottom right</option>
                    <option value="bottom-left">Bottom left</option>
                  </select>
                </div>
                <div>
                  <label className={fieldLabelClass}>Button label *</label>
                  <input
                    type="text"
                    value={formData.launcher.button_label}
                    onChange={(e) => handleLauncherChange('button_label', e.target.value)}
                    className={inputClass}
                    placeholder="Example: Chat with us"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={fieldLabelClass}>Icon name</label>
                  <input
                    type="text"
                    value={formData.launcher.button_icon}
                    onChange={(e) => handleLauncherChange('button_icon', e.target.value)}
                    className={inputClass}
                    placeholder="Example: message-circle"
                  />
                </div>
                <div>
                  <label className={fieldLabelClass}>Accent color</label>
                  <input
                    type="color"
                    value={formData.launcher.accent_color}
                    onChange={(e) => handleLauncherChange('accent_color', e.target.value)}
                    className={colorInputClass}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="shell-info-panel space-y-3 text-sm text-white/76">
              <div>
                <span className="font-medium text-white">Name:</span> {formData.name || '-'}
              </div>
              <div>
                <span className="font-medium text-white">Domain:</span>{' '}
                {formData.domain_key === 'custom' ? formData.custom_domain_name || 'custom' : formData.domain_key}
              </div>
              <div>
                <span className="font-medium text-white">Allowed Origins:</span> {parsedOrigins.length}
              </div>
              <div>
                <span className="font-medium text-white">Launcher:</span> {formData.launcher.position} / {formData.launcher.button_label}
              </div>
              <div className="text-xs text-white/46">
                Submitting saves production settings. Then use "Generate Launcher" or "Copy Launcher Snippet" from the list.
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-white/8 pt-5">
            <button
              type="button"
              onClick={() => setStep((value) => Math.max(0, value - 1))}
              disabled={!canGoBack}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <div className="flex gap-3">
              {canGoNext ? (
                <button
                  type="button"
                  onClick={() => setStep((value) => Math.min(STEPS.length - 1, value + 1))}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#2f66ea] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#295ad0]"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Saving...' : chatbot ? 'Update Chatbot' : 'Create Chatbot'}
                </button>
              )}
            </div>
          </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatbotForm;
