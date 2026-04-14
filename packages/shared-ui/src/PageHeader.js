import React from 'react';

const PageHeader = ({ eyebrow, title, description, actions }) =>
  React.createElement(
    'div',
    { className: 'flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between' },
    React.createElement(
      'div',
      null,
      eyebrow
        ? React.createElement('p', { className: 'text-[0.78rem] uppercase tracking-[0.32em] text-slate-500' }, eyebrow)
        : null,
      React.createElement('h1', { className: 'mt-3 text-[2rem] font-semibold tracking-[-0.03em] text-slate-900' }, title),
      description
        ? React.createElement('p', { className: 'mt-2 max-w-3xl text-sm leading-6 text-slate-600' }, description)
        : null
    ),
    actions ? React.createElement('div', { className: 'flex flex-wrap gap-2' }, actions) : null
  );

export default PageHeader;
