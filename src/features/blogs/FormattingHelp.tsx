import { lazy, Suspense } from 'react';

// The same renderer as the preview, so the guide always matches what shoppers see.
const MarkdownPreview = lazy(() => import('./MarkdownPreview'));

const examples = [
  {
    want: 'New paragraph',
    type: 'First paragraph.\n\nSecond paragraph.',
    note: 'Leave an empty line between them.',
  },
  { want: 'Heading', type: '## Opening hours' },
  { want: 'Smaller heading', type: '### Weekdays' },
  { want: 'Bold', type: 'Enjoy **free shipping** today.' },
  { want: 'Italic', type: 'Only *limited stock* left.' },
  { want: 'Link', type: 'See [our size guide](https://example.com).' },
  { want: 'Bulleted list', type: '- Red\n- Blue', note: 'One item per line.' },
  { want: 'Numbered list', type: '1. Choose a size\n2. Add to cart' },
  { want: 'Quote', type: '> Love these shoes!' },
  { want: 'Divider', type: '---' },
];

/** What to type for each kind of formatting, and what shoppers see. */
export function FormattingHelp({ id }: { id: string }) {
  return (
    <div id={id} className="space-y-4 rounded-lg border p-4">
      <table className="w-full text-sm">
        <caption className="sr-only">Formatting help</caption>
        <thead className="hidden text-left text-muted-foreground sm:table-header-group">
          <tr className="border-b">
            <th scope="col" className="py-2 pr-4 font-normal">
              Want
            </th>
            <th scope="col" className="py-2 pr-4 font-normal">
              Type
            </th>
            <th scope="col" className="py-2 font-normal">
              Shoppers see
            </th>
          </tr>
        </thead>
        <tbody>
          {examples.map((example) => (
            // Each row stacks on phones: what it is, what to type, then the result.
            <tr
              key={example.want}
              className="grid gap-1 border-b py-3 last:border-b-0 sm:table-row sm:py-0"
            >
              <th scope="row" className="text-left align-top font-medium sm:py-3 sm:pr-4">
                {example.want}
                {example.note && (
                  <span className="block font-normal text-muted-foreground">{example.note}</span>
                )}
              </th>
              <td className="align-top sm:py-3 sm:pr-4">
                <code className="block rounded bg-muted px-2 py-1 whitespace-pre-wrap">
                  {example.type}
                </code>
              </td>
              <td className="align-top sm:py-3">
                <Suspense fallback={<span className="text-muted-foreground">…</span>}>
                  <MarkdownPreview content={example.type} />
                </Suspense>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="space-y-1 text-sm">
        <p className="font-medium">Not supported</p>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Images in the text. Add the photo as the cover image instead.</li>
          <li>
            A single <code>#</code> heading, as the post title already uses that level. Use{' '}
            <code>##</code>.
          </li>
          <li>HTML. It is left out of the post.</li>
        </ul>
      </div>
    </div>
  );
}
