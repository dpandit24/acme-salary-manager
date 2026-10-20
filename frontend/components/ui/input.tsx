import * as React from 'react';
import { cn } from '@/lib/utils';

const field_classes =
  'flex w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input type={type} className={cn(field_classes, 'h-9', className)} ref={ref} {...props} />
  ),
);
Input.displayName = 'Input';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea className={cn(field_classes, 'min-h-[60px] py-2', className)} ref={ref} {...props} />
  ),
);
Textarea.displayName = 'Textarea';

export { Input, Textarea, field_classes };
