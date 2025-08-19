/**
 * Native HTML Checkbox Component
 * 
 * A native <input type="checkbox"> element styled to match our design system
 * This component eliminates the infinite loop issues caused by Radix UI Checkbox
 * while maintaining the same visual appearance and functionality
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface NativeCheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  error?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const NativeCheckbox = React.forwardRef<HTMLInputElement, NativeCheckboxProps>(
  ({ className, error, onCheckedChange, onChange, ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const checked = event.target.checked;
      onCheckedChange?.(checked);
      onChange?.(event);
    };

    return (
      <input
        type="checkbox"
        className={cn(
          // Base styles matching Radix UI Checkbox
          "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          // Checked state styling
          "checked:bg-primary checked:text-primary-foreground",
          // Error styles
          error && "border-destructive focus-visible:ring-destructive",
          className
        )}
        ref={ref}
        onChange={handleChange}
        {...props}
      />
    );
  }
);

NativeCheckbox.displayName = "NativeCheckbox";

export { NativeCheckbox };
