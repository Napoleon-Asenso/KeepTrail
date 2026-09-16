import React, { ButtonHTMLAttributes, forwardRef } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = "",
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      type = "button",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-colors duration-150 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

    const sizeStyles = {
      sm: "text-xs px-3 py-1.5 gap-1.5",
      md: "text-sm px-4 py-2 gap-2",
      lg: "text-base px-5 py-2.5 gap-2.5",
    };

    const variantStyles = {
      primary:
        "bg-[var(--primary-color)] text-[var(--on-primary-color)] hover:brightness-110 active:brightness-95 focus-visible:outline-[var(--primary-color)] shadow-sm",
      secondary:
        "bg-[var(--secondary-container-color)] text-[var(--on-secondary-container-color)] hover:brightness-105 active:brightness-95 focus-visible:outline-[var(--secondary-color)]",
      danger:
        "bg-[var(--error-color)] text-[var(--on-error-color)] hover:brightness-110 active:brightness-95 focus-visible:outline-[var(--error-color)] shadow-sm",
      outline:
        "border border-[var(--outline-variant-color)] bg-transparent text-[var(--on-surface-color)] hover:bg-[var(--surface-container-high-color)] focus-visible:outline-[var(--outline-color)]",
      ghost:
        "bg-transparent text-[var(--on-surface-variant-color)] hover:bg-[var(--surface-container-color)] hover:text-[var(--on-surface-color)] focus-visible:outline-[var(--outline-color)]",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-0.5 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
