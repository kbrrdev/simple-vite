import { useId, type ReactNode } from 'react';

/** One bordered card at the right of a record's page, with sections divided by hairlines. */
export function SidePanel({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border">{children}</div>;
}

export function PanelSection({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="space-y-3 border-t p-4 first:border-t-0">
      <h2 id={headingId} className="font-medium">
        {title}
      </h2>
      {children}
    </section>
  );
}
