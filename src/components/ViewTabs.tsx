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
 * Saved views of a list as tabs, after Shopify Admin. Each is a link that sets the list's URL
 * filters, so Back and shared links work.
 */
export function ViewTabs({ label, tabs }: { label: string; tabs: ViewTab[] }) {
  return (
    // Phones scroll the row sideways rather than wrapping it.
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex min-w-max border-b">
        {tabs.map((tab) => (
          <li key={tab.label}>
            <Link
              to={tab.to}
              aria-current={tab.selected ? 'page' : undefined}
              className={cn(
                '-mb-px flex min-h-11 items-center gap-2 border-b-2 px-3 text-sm whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset md:min-h-9',
                tab.selected
                  ? 'border-foreground font-medium text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
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
