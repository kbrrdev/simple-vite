import { Link } from 'react-router';
import { cn } from 'cn';
import { Badge } from '@/components/ui/badge';

export interface ViewTab {
  label: string;
  /** The list's URL with this view's filters, such as `?status=confirmed`. */
  to: string;
  selected: boolean;
  /** Work waiting in the view, from the backend. Shown when above 0. */
  count?: number;
}

/**
 * Saved views of a list as tabs at the top of its `IndexCard`, after Shopify Admin. Each is a
 * link that sets the list's URL filters, so Back and shared links work.
 */
export function ViewTabs({ label, tabs }: { label: string; tabs: ViewTab[] }) {
  return (
    // Phones scroll the row sideways rather than wrapping it.
    <nav aria-label={label} className="overflow-x-auto border-b p-2">
      <ul className="flex min-w-max gap-1">
        {tabs.map((tab) => (
          <li key={tab.label}>
            <Link
              to={tab.to}
              aria-current={tab.selected ? 'page' : undefined}
              className={cn(
                'flex min-h-11 items-center gap-2 rounded-md px-3 text-sm whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring md:min-h-8',
                tab.selected
                  ? 'bg-muted font-medium text-foreground'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              {tab.label}
              {/* Keeps the count apart from the label when read aloud, as "To ship 2". */}{' '}
              {tab.count !== undefined && tab.count > 0 && (
                <Badge variant="warning" className="tabular-nums">
                  {tab.count}
                </Badge>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
