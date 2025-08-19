/**
 * Native HTML Select Component
 * 
 * A native <select> element styled to match our design system
 * This component eliminates the infinite loop issues caused by Radix UI Select
 * while maintaining the same visual appearance and functionality
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface NativeSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface NativeSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: NativeSelectOption[];
  placeholder?: string;
  error?: boolean;
  onValueChange?: (value: string) => void;
}

const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, options, placeholder, error, onValueChange, onChange, ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
      const value = event.target.value;
      onValueChange?.(value);
      onChange?.(event);
    };

    return (
      <select
        className={cn(
          // Base styles matching SelectTrigger
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground",
          // Focus styles
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          // Disabled styles  
          "disabled:cursor-not-allowed disabled:opacity-50",
          // Error styles
          error && "border-destructive focus:ring-destructive",
          // Custom arrow styling for consistency
          "appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 4 5\"><path fill=\"%23666\" d=\"M2 0L0 2h4zm0 5L0 3h4z\"/></svg>')] bg-[length:12px] bg-[position:calc(100%-12px)_center] bg-no-repeat",
          className
        )}
        ref={ref}
        onChange={handleChange}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
    );
  }
);

NativeSelect.displayName = "NativeSelect";

export { NativeSelect };
