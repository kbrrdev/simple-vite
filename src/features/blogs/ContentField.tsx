import { lazy, Suspense, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

// The Markdown library is only needed for the preview, so it loads when the preview opens.
const MarkdownPreview = lazy(() => import('./MarkdownPreview'));

interface Props {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

/** The post's text, written in Markdown, with a preview of how shoppers will see it. */
export function ContentField({ value, onChange, error }: Props) {
  const [preview, setPreview] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="blog-content">Content</Label>
        <div role="group" aria-label="Content view" className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant={preview ? 'outline' : 'default'}
            aria-pressed={!preview}
            onClick={() => setPreview(false)}
          >
            Write
          </Button>
          <Button
            type="button"
            size="sm"
            variant={preview ? 'default' : 'outline'}
            aria-pressed={preview}
            onClick={() => setPreview(true)}
          >
            Preview
          </Button>
        </div>
      </div>

      {preview ? (
        <div className="min-h-64 rounded-lg border p-4">
          {value.trim() ? (
            <Suspense
              fallback={
                <p role="status" className="text-sm text-muted-foreground">
                  Loading preview…
                </p>
              }
            >
              <MarkdownPreview content={value} />
            </Suspense>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
          )}
        </div>
      ) : (
        <textarea
          id="blog-content"
          aria-invalid={Boolean(error)}
          aria-describedby={`blog-content-hint${error ? ' blog-content-error' : ''}`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          // Grows with the text where the browser supports it, from a tall start.
          className="field-sizing-content min-h-64 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring aria-invalid:border-destructive md:text-sm dark:bg-input/30"
        />
      )}

      <p id="blog-content-hint" className="text-xs text-muted-foreground">
        Markdown: ## Heading · **bold** · *italic* · [link](https://…) · - list · &gt; quote
      </p>
      {error && (
        <p id="blog-content-error" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
