import type { ReactNode } from 'react';

interface Props {
  title: string;
  /** One line under the title, such as what a settings page is for. */
  description?: ReactNode;
  /** The page's main action on the right, such as New product. */
  actions?: ReactNode;
}

/** The top of a list page, after Shopify Admin: the title on the left, the main action on the right. */
export function PageHeader({ title, description, actions }: Props) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-col items-end gap-1">{actions}</div>}
    </div>
  );
}
