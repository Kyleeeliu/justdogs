import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', loading = false, disabled, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none text-center whitespace-nowrap';
    
    const variants = {
      default: 'bg-[rgb(0_32_96)] text-white hover:bg-[rgb(0_24_72)] focus-visible:ring-[rgb(0_32_96)]',
      destructive: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
      outline: 'border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 focus-visible:ring-[rgb(0_32_96)]',
      secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-500',
      ghost: 'text-gray-900 hover:bg-gray-100 focus-visible:ring-gray-500',
      link: 'text-[rgb(0_32_96)] underline-offset-4 hover:underline focus-visible:ring-[rgb(0_32_96)]',
    };

    const sizes = {
      default: 'h-10 py-2 px-4 min-h-[2.5rem]',
      sm: 'h-9 px-3 rounded-md min-h-[2.25rem]',
      lg: 'h-11 px-8 rounded-md min-h-[2.75rem]',
      icon: 'h-10 w-10 min-h-[2.5rem] min-w-[2.5rem]',
    };

    return (
      <button
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        <span className="flex items-center justify-center w-full">
          {loading && (
            <svg
              className="mr-2 h-4 w-4 animate-spin flex-shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
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
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
          {children}
        </span>
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
