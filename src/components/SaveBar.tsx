import { Button } from '@/components/ui/button';

interface Props {
  /** The form the Save button submits, so Enter in a field saves the same way. */
  formId: string;
  saving: boolean;
  onDiscard: () => void;
}

/**
 * Shown while a record has unsaved changes, after Shopify Admin's save bar. It is fixed to the
 * bottom of the window, beside the sidebar, so it never covers the header or Back. Pages leave
 * room for it at the end while it shows.
 */
export function SaveBar({ formId, saving, onDiscard }: Props) {
  return (
    <div
      role="region"
      aria-label="Unsaved changes"
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-background pb-[env(safe-area-inset-bottom)] shadow-lg md:left-56"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
        <p className="text-sm font-medium">Unsaved changes</p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" disabled={saving} onClick={onDiscard}>
            Discard
          </Button>
          <Button type="submit" form={formId} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}
