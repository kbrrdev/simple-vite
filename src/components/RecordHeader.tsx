import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { MoreMenu, type MoreMenuItem } from './MoreMenu';

interface Props {
  back: { to: string; label: string };
  title: ReactNode;
  /** States such as Draft or Paid, beside the title. */
  badges?: ReactNode;
  /** The rarer actions and History. The menu is left out when there are none. */
  menu?: MoreMenuItem[];
  /** One line of facts under the title, such as who wrote it and when it was saved. */
  facts?: ReactNode;
}

/** The top of a record's page: Back, the title with its badges, More, and a line of facts. */
export function RecordHeader({ back, title, badges, menu = [], facts }: Props) {
  return (
    <div className="space-y-2">
      <Button variant="ghost" asChild className="-ml-2">
        <Link to={back.to}>{back.label}</Link>
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="min-w-0 text-2xl font-semibold break-words">{title}</h1>
          {badges}
        </div>
        <MoreMenu items={menu} />
      </div>
      {facts && <p className="text-sm break-words text-muted-foreground tabular-nums">{facts}</p>}
    </div>
  );
}
