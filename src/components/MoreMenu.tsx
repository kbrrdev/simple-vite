import { ChevronDownIcon } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface MoreMenuItem {
  key: string;
  label: string;
  /** A page to open, such as History. Links come first, above the actions. */
  to?: string;
  onSelect?: () => void;
  /** Red, for actions that cancel, deactivate, or delete. They still ask first. */
  destructive?: boolean;
  disabled?: boolean;
  /** Why the item is disabled, shown under it. */
  reason?: string;
}

/** A record's rarer actions, in a menu at the right of its header. Left out when empty. */
export function MoreMenu({ items }: { items: MoreMenuItem[] }) {
  if (items.length === 0) return null;

  const links = items.filter((item) => item.to);
  const actions = items.filter((item) => !item.to);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* A button, not a submit, as editors put their header inside the form. */}
        <Button type="button" variant="outline" size="sm">
          More
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        {links.map((item) => (
          <DropdownMenuItem key={item.key} asChild>
            <Link to={item.to ?? ''}>{item.label}</Link>
          </DropdownMenuItem>
        ))}
        {links.length > 0 && actions.length > 0 && <DropdownMenuSeparator />}
        {actions.map((item) => (
          <DropdownMenuItem
            key={item.key}
            variant={item.destructive ? 'destructive' : 'default'}
            disabled={item.disabled}
            onSelect={item.onSelect}
            className={item.reason ? 'min-h-11 flex-col items-start gap-0 md:min-h-8' : undefined}
          >
            {item.label}
            {item.reason && <span className="text-xs text-muted-foreground">{item.reason}</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
