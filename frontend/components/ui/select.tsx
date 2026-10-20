import * as React from 'react';
import { cn } from '@/lib/utils';
import { field_classes } from './input';

/** Native select styled like shadcn inputs: keyboard and screen-reader behavior come from the browser. */
const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(field_classes, 'h-9 pr-8', className)} {...props}>
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

export { Select };
