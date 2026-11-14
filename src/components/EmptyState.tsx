import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from 'cn';

interface Props {
  icon: LucideIcon;
  title: string;
  /** One sentence on what goes here, or what to try. */
  children?: ReactNode;
  /** The way forward, such as New banner or Clear filters. */
  action?: ReactNode;
  /** Without its own border, inside an `IndexCard`. */
  bare?: boolean;
}

/** An empty list, after Shopify Admin: an icon, what is missing, and what to do about it. */
export function EmptyState({ icon: Icon, title, children, action, bare = false }: Props) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 px-6 py-12 text-center',
        !bare && 'rounded-lg border border-dashed',
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Icon aria-hidden className="size-6 text-muted-foreground" />
      </span>
      <h2 className="font-semibold">{title}</h2>
      {children && <p className="max-w-sm text-sm text-muted-foreground">{children}</p>}
      {action}
    </div>
  );
}
