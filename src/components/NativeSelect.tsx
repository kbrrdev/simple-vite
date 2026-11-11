import type { ComponentProps } from 'react';
import { cn } from 'cn';

/** A native select styled like `Input`. Native selects use the phone's own picker. */
export function NativeSelect({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring aria-invalid:border-destructive md:h-8 md:text-sm dark:bg-input/30',
        className,
      )}
      {...props}
    />
  );
}
