/**
 * Toast Provider Component
 * Modern toast notifications using Sonner with dark mode support
 */

'use client';

import { Toaster } from 'sonner';
import { useTheme } from 'next-themes';

export function ToastProvider() {
  const { theme } = useTheme();

  return (
    <Toaster
      theme={theme as 'light' | 'dark' | 'system'}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: 'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          error: 'group-[.toaster]:bg-destructive group-[.toaster]:text-destructive-foreground group-[.toaster]:border-destructive',
          success: 'group-[.toaster]:bg-green-500 group-[.toaster]:text-white',
          warning: 'group-[.toaster]:bg-orange-500 group-[.toaster]:text-white',
          info: 'group-[.toaster]:bg-blue-500 group-[.toaster]:text-white',
        },
      }}
      position="bottom-right"
      expand={true}
      richColors={true}
      closeButton={true}
      duration={4000}
    />
  );
}