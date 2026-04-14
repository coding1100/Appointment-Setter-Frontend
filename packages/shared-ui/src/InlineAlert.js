import React from 'react';

const VARIANT_CLASSES = {
  error: 'border-rose-200 bg-rose-50 text-rose-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  info: 'border-sky-200 bg-sky-50 text-sky-700',
};

const InlineAlert = ({ children, variant = 'info', actions = null, className = '' }) => {
  const mergedClassName = `rounded-2xl border px-4 py-3 text-sm ${VARIANT_CLASSES[variant] || VARIANT_CLASSES.info} ${className}`.trim();

  if (actions) {
    return React.createElement(
      'div',
      { className: mergedClassName },
      React.createElement(
        'div',
        { className: 'flex flex-col gap-3 md:flex-row md:items-center md:justify-between' },
        React.createElement('span', null, children),
        actions
      )
    );
  }

  return React.createElement('div', { className: mergedClassName }, children);
};

export default InlineAlert;
