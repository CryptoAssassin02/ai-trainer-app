/**
 * Native HTML Radio Group Component
 * 
 * A native radio button group using HTML <input type="radio"> elements
 * This component eliminates the infinite loop issues caused by Radix UI RadioGroup
 * while maintaining the same visual appearance and functionality
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface NativeRadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface NativeRadioGroupProps {
  name: string;
  value?: string;
  onValueChange?: (value: string) => void;
  options: NativeRadioOption[];
  disabled?: boolean;
  className?: string;
  error?: boolean;
}

const NativeRadioGroup = React.forwardRef<HTMLDivElement, NativeRadioGroupProps>(
  ({ name, value, onValueChange, options, disabled, className, error, ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      onValueChange?.(event.target.value);
    };

    return (
      <div
        ref={ref}
        className={cn("grid gap-2", className)}
        role="radiogroup"
        {...props}
      >
        {options.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <input
              type="radio"
              id={`${name}-${option.value}`}
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={handleChange}
              disabled={disabled || option.disabled}
              className={cn(
                // Base styles matching Radix UI RadioGroup
                "aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                // Error styles
                error && "border-destructive focus-visible:ring-destructive"
              )}
            />
            <label
              htmlFor={`${name}-${option.value}`}
              className={cn(
                "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
                disabled && "cursor-not-allowed opacity-70"
              )}
            >
              {option.label}
            </label>
          </div>
        ))}
      </div>
    );
  }
);

NativeRadioGroup.displayName = "NativeRadioGroup";

export { NativeRadioGroup };
