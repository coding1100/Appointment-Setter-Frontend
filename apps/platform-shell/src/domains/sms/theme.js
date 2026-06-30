// Shared style tokens for the SMS Outreach pages so they match the platform
// redesign (mint/teal accent #68fadd, slate borders, rounded-lg inputs) instead
// of the original green styling. Keep these in sync with shared/ui/StyledSelect.

// Text input / textarea — mirrors StyledSelect's field styling.
export const SMS_INPUT =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 ' +
  'focus:border-[#68fadd]/50 focus:outline-none focus:ring-2 focus:ring-[#68fadd]/20';

// Primary action button (dark navy, matches the shell brand).
export const SMS_BTN_PRIMARY =
  'inline-flex items-center justify-center rounded-lg bg-[#1a1a2e] px-5 py-2.5 text-sm ' +
  'font-semibold text-white transition hover:bg-[#26263f] disabled:opacity-50';

// Secondary / outline button.
export const SMS_BTN_SECONDARY =
  'inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-2.5 ' +
  'text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50';

// Accent text/link color used across the SMS app.
export const SMS_ACCENT_TEXT = 'text-[#0f766e]'; // teal-700, readable on white
