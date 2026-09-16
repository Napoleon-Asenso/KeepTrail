import React, { InputHTMLAttributes, forwardRef } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = "", id, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-[var(--on-surface-color)]"
          >
            {label}
            {props.required && <span className="text-[var(--error-color)] ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          className={`w-full px-3.5 py-2.5 text-sm rounded bg-[var(--surface-container-lowest-color)] text-[var(--on-surface-color)] border ${
            error
              ? "border-[var(--error-color)] focus:border-[var(--error-color)]"
              : "border-[var(--outline-variant-color)] focus:border-[var(--primary-color)]"
          } transition-colors placeholder:text-[var(--outline-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:ring-opacity-20 disabled:opacity-50 disabled:bg-[var(--surface-variant-color)] ${className}`}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-[var(--error-color)] mt-1 font-medium" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-xs text-[var(--outline-color)] mt-1">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
