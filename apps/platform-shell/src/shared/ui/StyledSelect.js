import React from "react";
import { ChevronDown } from "lucide-react";

export const selectClass =
  "w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-3 pr-10 text-sm font-medium text-slate-700 focus:border-[#68fadd]/50 focus:outline-none focus:ring-2 focus:ring-[#68fadd]/20";

const StyledSelect = ({ children, className = selectClass, ...props }) => (
  <label className="relative block w-full">
    <select className={className} {...props}>
      {children}
    </select>
    <ChevronDown
      aria-hidden="true"
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
    />
  </label>
);

export default StyledSelect;
