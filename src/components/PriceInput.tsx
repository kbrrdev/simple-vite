import type { ComponentProps } from 'react';
import { cn } from 'cn';
import { Input } from '@/components/ui/input';

/** A peso amount typed as text, such as "199.99". Read it with `parsePesos`. */
export function PriceInput({ className, ...props }: Omit<ComponentProps<'input'>, 'type'>) {
  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-muted-foreground"
      >
        ₱
      </span>
      <Input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0.00"
        className={cn('pl-6 tabular-nums', className)}
        {...props}
      />
    </div>
  );
}
