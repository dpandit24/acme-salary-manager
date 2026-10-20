'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

const MAX_TILT_DEG = 5;

/**
 * Card that tilts slightly toward the pointer and lifts with a soft glare.
 * Reserved for headline figures (overview stats, current pay) so the effect stays special.
 * Writes CSS variables on the element directly, so moving the pointer never re-renders React.
 */
export function TiltCard({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const ref = React.useRef<HTMLDivElement>(null);

  const on_move = (event: React.PointerEvent<HTMLDivElement>) => {
    const node = ref.current;
    if (!node || event.pointerType !== 'mouse') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = node.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    node.style.setProperty('--tilt-x', `${((0.5 - y) * MAX_TILT_DEG * 2).toFixed(2)}deg`);
    node.style.setProperty('--tilt-y', `${((x - 0.5) * MAX_TILT_DEG * 2).toFixed(2)}deg`);
    node.style.setProperty('--glare-x', `${(x * 100).toFixed(1)}%`);
    node.style.setProperty('--glare-y', `${(y * 100).toFixed(1)}%`);
  };

  const on_leave = () => {
    const node = ref.current;
    if (!node) return;
    node.style.setProperty('--tilt-x', '0deg');
    node.style.setProperty('--tilt-y', '0deg');
  };

  return (
    <div
      ref={ref}
      onPointerMove={on_move}
      onPointerLeave={on_leave}
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow-card',
        'transition-[transform,box-shadow,border-color] duration-300 ease-out will-change-transform',
        '[transform:perspective(900px)_rotateX(var(--tilt-x,0deg))_rotateY(var(--tilt-y,0deg))]',
        'hover:border-primary/30 hover:shadow-lift',
        'hover:[transform:perspective(900px)_rotateX(var(--tilt-x,0deg))_rotateY(var(--tilt-y,0deg))_translateY(-4px)]',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(420px circle at var(--glare-x, 50%) var(--glare-y, 0%), rgb(59 130 246 / 0.10), transparent 60%)',
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
