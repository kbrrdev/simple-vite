import { lazy, Suspense, useLayoutEffect, useRef, useState } from 'react';
import {
  BoldIcon,
  Heading2Icon,
  ImageIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
} from 'lucide-react';
import { LinesSkeleton } from '@/components/Loading';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FormattingHelp } from './FormattingHelp';
import { InsertImageDialog } from './InsertImageDialog';
import { insertImage, link, prefixLines, wrap, type Edit } from './markdown-edit';

// The Markdown library is only needed for the preview, so it loads when the preview opens.
const MarkdownPreview = lazy(() => import('./MarkdownPreview'));

type Format = (text: string, start: number, end: number) => Edit;

const tools: { label: string; icon: typeof BoldIcon; format: Format }[] = [
  { label: 'Heading', icon: Heading2Icon, format: (t, s, e) => prefixLines(t, s, e, '## ') },
  { label: 'Bold', icon: BoldIcon, format: (t, s, e) => wrap(t, s, e, '**', 'bold text') },
  { label: 'Italic', icon: ItalicIcon, format: (t, s, e) => wrap(t, s, e, '*', 'italic text') },
  { label: 'Link', icon: LinkIcon, format: link },
  { label: 'Bulleted list', icon: ListIcon, format: (t, s, e) => prefixLines(t, s, e, '- ') },
  {
    label: 'Numbered list',
    icon: ListOrderedIcon,
    format: (t, s, e) => prefixLines(t, s, e, '', true),
  },
  { label: 'Quote', icon: QuoteIcon, format: (t, s, e) => prefixLines(t, s, e, '> ') },
];

interface Props {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

/** The post's text, written in Markdown, with a toolbar, a preview, and formatting help. */
export function ContentField({ value, onChange, error }: Props) {
  const [preview, setPreview] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  // The selection when Image was pressed, as the dialog takes the focus from the text box.
  const [imageAt, setImageAt] = useState<[number, number] | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  // The selection to restore once a toolbar edit has reached the text box.
  const pendingSelection = useRef<[number, number] | null>(null);

  useLayoutEffect(() => {
    const element = textarea.current;
    const selection = pendingSelection.current;
    if (!element || !selection) return;
    pendingSelection.current = null;
    element.focus();
    element.setSelectionRange(selection[0], selection[1]);
  }, [value]);

  function apply(format: Format) {
    const element = textarea.current;
    if (!element) return;
    const edit = format(value, element.selectionStart, element.selectionEnd);
    pendingSelection.current = [edit.selectionStart, edit.selectionEnd];
    onChange(edit.text);
  }

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
            <Suspense fallback={<LinesSkeleton lines={5} label="Loading preview…" />}>
              <MarkdownPreview content={value} />
            </Suspense>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-input focus-within:border-ring focus-within:ring-3 focus-within:ring-ring has-aria-invalid:border-destructive">
          <div
            role="group"
            aria-label="Formatting"
            className="flex flex-wrap gap-0.5 border-b bg-muted/50 p-1"
          >
            {tools.map((tool) => (
              <Button
                key={tool.label}
                type="button"
                variant="ghost"
                size="icon"
                aria-label={tool.label}
                title={tool.label}
                aria-controls="blog-content"
                onClick={() => apply(tool.format)}
              >
                <tool.icon />
              </Button>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Image"
              title="Image"
              aria-controls="blog-content"
              onClick={() => {
                const element = textarea.current;
                setImageAt(
                  element
                    ? [element.selectionStart, element.selectionEnd]
                    : [value.length, value.length],
                );
              }}
            >
              <ImageIcon />
            </Button>
          </div>
          <textarea
            ref={textarea}
            id="blog-content"
            aria-invalid={Boolean(error)}
            aria-describedby={`blog-content-hint${error ? ' blog-content-error' : ''}`}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            // Grows with the text where the browser supports it, from a tall start.
            className="field-sizing-content block min-h-64 w-full min-w-0 bg-transparent px-2.5 py-2 text-base leading-relaxed outline-none md:text-sm dark:bg-input/30"
          />
        </div>
      )}

      <p
        id="blog-content-hint"
        className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground"
      >
        Uses Markdown.
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-11 px-0 text-xs md:h-auto"
          aria-expanded={helpOpen}
          aria-controls="blog-formatting-help"
          onClick={() => setHelpOpen((open) => !open)}
        >
          {helpOpen ? 'Hide formatting help' : 'Formatting help'}
        </Button>
      </p>
      {helpOpen && <FormattingHelp id="blog-formatting-help" />}

      {imageAt && (
        <InsertImageDialog
          onInsert={(alt, url) => {
            apply((text) => insertImage(text, imageAt[0], imageAt[1], alt, url));
            setImageAt(null);
          }}
          onClose={() => setImageAt(null)}
        />
      )}

      {error && (
        <p id="blog-content-error" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
