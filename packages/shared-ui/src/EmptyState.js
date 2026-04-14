import React from 'react';

const EmptyState = ({ icon: Icon, title, description, action = null, className = '' }) =>
  React.createElement(
    'div',
    { className: `flex min-h-[320px] flex-col items-center justify-center px-6 text-center ${className}`.trim() },
    Icon ? React.createElement(Icon, { className: 'h-16 w-16 text-slate-300' }) : null,
    React.createElement('h3', { className: 'mt-6 text-2xl font-semibold tracking-[-0.02em] text-slate-900' }, title),
    description
      ? React.createElement('p', { className: 'mt-3 max-w-2xl text-sm leading-7 text-slate-600' }, description)
      : null,
    action
  );

export default EmptyState;
