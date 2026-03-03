'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  disabled,
  className = '',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-200',
    secondary: 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50',
    danger: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Processing...
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          {icon}
          {children}
        </span>
      )}
    </button>
  );
};

export const CalendarImage: React.FC<{
  isActive: boolean;
  onClick: () => void;
}> = ({ isActive, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-4 py-3 min-h-[44px] min-w-[44px] rounded-lg text-sm font-semibold transition-colors touch-manipulation ${
      isActive
        ? 'bg-white text-indigo-700 shadow'
        : 'text-slate-600 hover:text-slate-900'
    }`}
  >
    Calendar Image
  </button>
);

export const ShiftMessages: React.FC<{
  isActive: boolean;
  onClick: () => void;
}> = ({ isActive, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-4 py-3 min-h-[44px] min-w-[44px] rounded-lg text-sm font-semibold transition-colors touch-manipulation ${
      isActive
        ? 'bg-white text-indigo-700 shadow'
        : 'text-slate-600 hover:text-slate-900'
    }`}
  >
    Shift Messages
  </button>
);

export const ProcessCalendar: React.FC<{
  isProcessing: boolean;
  onClick: () => void;
}> = ({ isProcessing, onClick }) => (
  <Button
    onClick={onClick}
    disabled={isProcessing}
    isLoading={isProcessing}
    icon={
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    }
  >
    Process Calendar
  </Button>
);

export const ProcessScreenshot: React.FC<{
  isProcessing: boolean;
  count: number;
  onClick: () => void;
}> = ({ isProcessing, count, onClick }) => (
  <Button
    onClick={onClick}
    disabled={isProcessing}
    isLoading={isProcessing}
    icon={
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    }
  >
    {`Process ${count} Screenshot${count === 1 ? '' : 's'}`}
  </Button>
);

export const ProcessPastedMessages: React.FC<{
  isProcessing: boolean;
  onClick: () => void;
}> = ({ isProcessing, onClick }) => (
  <Button
    onClick={onClick}
    disabled={isProcessing}
    isLoading={isProcessing}
    variant="primary"
    className="w-full from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 shadow-cyan-200"
    icon={
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    }
  >
    Process Pasted Messages
  </Button>
);

export const Clear: React.FC<{
  isProcessing: boolean;
  onClick: () => void;
}> = ({ isProcessing, onClick }) => (
  <Button
    onClick={onClick}
    disabled={isProcessing}
    variant="secondary"
    icon={
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    }
  >
    Clear
  </Button>
);
