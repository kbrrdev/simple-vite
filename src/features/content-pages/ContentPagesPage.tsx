import { FileTextIcon } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { EmptyState } from '@/components/EmptyState';
import { IndexCard, IndexError, IndexList, type IndexColumn } from '@/components/IndexCard';
import { ListSkeleton } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { ViewTabs } from '@/components/ViewTabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useContentPages } from './api';

const dateFormat = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' });

// The widths match the rows' below, so the headings sit over their values.
const columns: IndexColumn[] = [
  { label: 'Page', className: 'md:flex-1' },
  { label: 'Status', className: 'md:w-28' },
  { label: 'Updated', className: 'md:w-32' },
];

/**
 * Shopify's Online Store › Pages: terms, privacy, and other pages with their own address. The
 * backend returns them all at once, so the tabs filter here rather than in the request.
 */
export function ContentPagesPage() {
  const [searchParams] = useSearchParams();
  const publishedParam = searchParams.get('published');
  const published =
    publishedParam === 'true' ? true : publishedParam === 'false' ? false : undefined;
  const pages = useContentPages();
  const shown = pages.data?.data.filter(
    (page) => published === undefined || page.published === published,
  );

  const views = [
    { label: 'All', value: undefined, to: '?' },
    { label: 'Published', value: true, to: '?published=true' },
    { label: 'Drafts', value: false, to: '?published=false' },
  ].map((view) => ({ label: view.label, to: view.to, selected: view.value === published }));

  let empty = {
    title: 'No pages yet',
    text: 'Add the terms, privacy policy, and other pages shoppers can read.',
  };
  if (published === true) {
    empty = { title: 'No published pages', text: 'Pages show here once you publish them.' };
  }
  if (published === false) {
    empty = { title: 'No drafts', text: 'Pages you save as drafts show here.' };
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pages"
        actions={
          <Button asChild>
            <Link to="/pages/new">New page</Link>
          </Button>
        }
      />

      <IndexCard
        tabs={<ViewTabs label="Page views" tabs={views} />}
        columns={shown?.length ? columns : undefined}
      >
        {pages.isPending && <ListSkeleton bare />}

        {pages.isError && <IndexError error={pages.error} onRetry={() => pages.refetch()} />}

        {shown?.length === 0 && (
          <EmptyState
            bare
            icon={FileTextIcon}
            title={empty.title}
            action={
              published === undefined && (
                <Button asChild>
                  <Link to="/pages/new">New page</Link>
                </Button>
              )
            }
          >
            {empty.text}
          </EmptyState>
        )}

        {shown && shown.length > 0 && (
          <IndexList label="Pages">
            {shown.map((page) => (
              <li key={page.id}>
                <Link
                  to={`/pages/${page.id}`}
                  className="flex items-center gap-3 px-4 py-3 outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset md:gap-4"
                >
                  {/* Two lines on phones, and columns from md up. */}
                  <div className="min-w-0 flex-1 md:flex md:items-center md:gap-4">
                    <p className="flex items-center gap-2 md:contents">
                      <span className="min-w-0 truncate md:flex-1">
                        <span className="font-medium">{page.title}</span>
                        <span className="text-sm text-muted-foreground"> /{page.slug}</span>
                      </span>
                      <span className="md:w-28">
                        {page.published ? (
                          <Badge variant="success">Published</Badge>
                        ) : (
                          <Badge variant="secondary">Draft</Badge>
                        )}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground tabular-nums md:w-32">
                      <span className="md:sr-only">Updated </span>
                      {dateFormat.format(new Date(page.updatedAt))}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </IndexList>
        )}
      </IndexCard>
    </div>
  );
}
