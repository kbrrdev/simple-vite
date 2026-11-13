import Markdown, { type Components } from 'react-markdown';
import { env } from '@/config/env';
import { allowedElements, isUploadedImage } from './markdown';

const components: Components = {
  img: ({ src, alt }) =>
    typeof src === 'string' && isUploadedImage(src, env.imageOrigins) ? (
      <img src={src} alt={alt ?? ''} loading="lazy" className="my-2 w-full rounded-md bg-muted" />
    ) : (
      <span className="text-sm text-muted-foreground italic">
        Image not shown, as only images from Files are allowed{alt ? `: ${alt}` : ''}.
      </span>
    ),
  h2: ({ children }) => <h2 className="mt-6 text-xl font-semibold first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-5 text-lg font-semibold first:mt-0">{children}</h3>,
  h4: ({ children }) => <h4 className="mt-4 font-semibold first:mt-0">{children}</h4>,
  p: ({ children }) => <p className="mt-3 leading-relaxed first:mt-0">{children}</p>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline underline-offset-3"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="mt-3 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="mt-3 list-decimal space-y-1 pl-5">{children}</ol>,
  blockquote: ({ children }) => (
    <blockquote className="mt-3 border-l-2 pl-4 text-muted-foreground">{children}</blockquote>
  ),
  code: ({ children }) => <code className="rounded bg-muted px-1 py-0.5 text-sm">{children}</code>,
  pre: ({ children }) => (
    <pre className="mt-3 overflow-x-auto rounded-md bg-muted p-3 text-sm">{children}</pre>
  ),
  hr: () => <hr className="my-6" />,
};

/** Shows a post's Markdown as shoppers will read it. Loaded only when the preview opens. */
export default function MarkdownPreview({ content }: { content: string }) {
  return (
    <div className="max-w-prose text-base">
      <Markdown allowedElements={allowedElements} unwrapDisallowed components={components}>
        {content}
      </Markdown>
    </div>
  );
}
