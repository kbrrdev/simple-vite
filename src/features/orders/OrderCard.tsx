import { useId, type ReactNode } from 'react';

interface Props {
  title: string;
  children: ReactNode;
  /** Buttons for the footer, secondary first and the main action last. */
  actions?: ReactNode;
}

/**
 * A card with its actions in a footer bar. The main action sits on the right, or on top on
 * phones, and side-by-side cards keep their footers on one line.
 */
export function OrderCard({ title, children, actions }: Props) {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col overflow-hidden rounded-lg border"
    >
      <h2 id={headingId} className="px-4 pt-4 font-medium">
        {title}
      </h2>
      <div className="flex-1 space-y-4 p-4">{children}</div>
      {actions && (
        <div className="flex flex-col-reverse gap-2 border-t bg-muted/50 p-4 *:w-full sm:flex-row sm:justify-end sm:*:w-auto">
          {actions}
        </div>
      )}
    </section>
  );
}
