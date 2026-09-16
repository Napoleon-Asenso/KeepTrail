import React, { TextareaHTMLAttributes, forwardRef } from "react";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  charCount?: number;
  maxChars?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, charCount, maxChars, className = "", id, ...props }, ref) => {
    const textareaId = id || props.name;

    return (
      <div className="w-full space-y-1.5">
        <div className="flex justify-between items-baseline">
          {label && (
            <label
              htmlFor={textareaId}
              className="block text-sm font-medium text-[var(--on-surface-color)]"
            >
              {label}
              {props.required && <span className="text-[var(--error-color)] ml-1" aria-hidden="true">*</span>}
            </label>
          )}
          {maxChars && (
            <span
              className={`text-xs ${
                charCount !== undefined && charCount > maxChars
                  ? "text-[var(--error-color)] font-semibold"
                  : "text-[var(--outline-color)]"
              }`}
              aria-live="polite"
            >
              {charCount !== undefined ? `${charCount} / ${maxChars}` : `Max ${maxChars}`}
            </span>
          )}
        </div>
        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={
            error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined
          }
          className={`w-full px-3.5 py-2.5 text-sm rounded bg-[var(--surface-container-lowest-color)] text-[var(--on-surface-color)] border ${
            error
              ? "border-[var(--error-color)] focus:border-[var(--error-color)]"
              : "border-[var(--outline-variant-color)] focus:border-[var(--primary-color)]"
          } transition-colors placeholder:text-[var(--outline-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:ring-opacity-20 disabled:opacity-50 disabled:bg-[var(--surface-variant-color)] resize-y min-h-[120px] ${className}`}
          {...props}
        />
        {error && (
          <p id={`${textareaId}-error`} className="text-xs text-[var(--error-color)] mt-1 font-medium" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${textareaId}-hint`} className="text-xs text-[var(--outline-color)] mt-1">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
