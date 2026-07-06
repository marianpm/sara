import React from "react";

const base =
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 px-4";

const variants = {
  default: "bg-slate-900 text-slate-50 hover:bg-slate-800",
  outline: "border border-slate-300 bg-white text-slate-900 hover:bg-slate-100",
  ghost: "bg-transparent text-slate-900 hover:bg-slate-100",
  destructive: "bg-red-600 text-white hover:bg-red-700",
};

export function Button({ className = "", variant = "default", ...props }) {
  const styles = variants[variant] || variants.default;
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}
