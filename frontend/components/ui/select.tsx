import * as React from 'react';
import { cn } from '@/lib/utils';
import { field_classes } from './input';

/**
 * Native select styled like shadcn inputs: keyboard and screen-reader behavior come from the browser.
 * The native arrow ignores padding, so `select-chevron` (globals.css) draws one inset from the edge.
 */
const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(field_classes, 'select-chevron h-9 cursor-pointer pr-10', className)} {...props}>
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

export { Select };
