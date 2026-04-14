import React from 'react';

const SectionPanel = ({ children, className = '' }) =>
  React.createElement(
    'div',
    { className: `overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm ${className}`.trim() },
    children
  );

export default SectionPanel;
