import React, { HTMLAttributes } from "react";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "active" | "neutral";
}

export function Badge({
  children,
  variant = "active",
  className = "",
  ...props
}: BadgeProps) {
  const variantStyles = {
    active:
      "bg-[var(--primary-container-color)] text-[var(--on-primary-container-color)] border border-[var(--primary-color)]/20",
    neutral:
      "bg-[var(--surface-container-high-color)] text-[var(--on-surface-variant-color)] border border-[var(--outline-variant-color)]",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide uppercase ${variantStyles[variant]} ${className}`}
      {...props}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80" aria-hidden="true" />
      {children}
    </span>
  );
}
