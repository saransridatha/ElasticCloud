// components/common/Button.tsx
import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const base = 'inline-flex items-center justify-center font-medium rounded transition-colors focus:outline-none select-none disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-aws-orange text-white hover:bg-aws-orange-hover active:bg-aws-orange-dark shadow-sm border border-transparent',
    secondary: 'bg-console-surface text-console-text border border-console-border hover:bg-console-surface-alt active:bg-console-border shadow-xs',
    danger: 'bg-aws-red text-white hover:bg-red-700 active:bg-red-800 border border-transparent shadow-sm',
    ghost: 'text-console-text-secondary hover:text-console-text hover:bg-console-surface-alt border border-transparent',
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-1 gap-1.5',
    md: 'text-sm px-3.5 py-1.5 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};
