import { Link, Navigate, useSearchParams } from 'react-router';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { IndexCard, IndexError, IndexList, type IndexColumn } from '@/components/IndexCard';
import { FileTextIcon } from 'lucide-react';
import { Pagination } from '@/components/Pagination';
import { ViewTabs } from '@/components/ViewTabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePageParam } from '@/lib/use-page-param';
import { ListSkeleton } from '@/components/Loading';
import { pageSize, useBlogs } from './api';

const dateFormat = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' });

// The widths match the rows' below, so the headings sit over their values.
const columns: IndexColumn[] = [
  { label: 'Post', className: 'md:flex-1' },
  { label: 'Status', className: 'md:w-28' },
  { label: 'Author', className: 'md:w-40' },
  { label: 'Updated', className: 'md:w-32' },
];

export function BlogsPage() {
  const [page, setPage] = usePageParam();
  const [searchParams] = useSearchParams();
  const publishedParam = searchParams.get('published');
  const published =
    publishedParam === 'true' ? true : publishedParam === 'false' ? false : undefined;
  const blogs = useBlogs({ page, published });

  const totalPages = Math.max(1, Math.ceil((blogs.data?.meta.total ?? 0) / pageSize));

  // A change can empty the last page, so step back to the new last page.
  if (blogs.data && !blogs.isPlaceholderData && page > totalPages) {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(totalPages));
    return <Navigate to={`?${params}`} replace />;
  }

  const views = [
    { label: 'All', value: undefined, to: '?' },
    { label: 'Published', value: true, to: '?published=true' },
    { label: 'Drafts', value: false, to: '?published=false' },
  ].map((view) => ({ label: view.label, to: view.to, selected: view.value === published }));

  let empty = { title: 'No posts yet', text: 'Write one to tell shoppers what is new.' };
  if (published === true) {
    empty = { title: 'No published posts', text: 'Posts show here once you publish them.' };
  }
  if (published === false) {
    empty = { title: 'No drafts', text: 'Posts you save as drafts show here.' };
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Blog"
        actions={
          <Button asChild>
            <Link to="/blogs/new">New post</Link>
          </Button>
        }
      />

      <IndexCard
        tabs={<ViewTabs label="Post views" tabs={views} />}
        columns={blogs.data?.meta.total ? columns : undefined}
        footer={
          blogs.data &&
          blogs.data.meta.total > 0 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              loading={blogs.isPlaceholderData}
            />
          )
        }
      >
        {blogs.isPending && <ListSkeleton bare media />}

        {blogs.isError && <IndexError error={blogs.error} onRetry={() => blogs.refetch()} />}

        {blogs.data?.meta.total === 0 && (
          <EmptyState
            bare
            icon={FileTextIcon}
            title={empty.title}
            action={
              published === undefined && (
                <Button asChild>
                  <Link to="/blogs/new">New post</Link>
                </Button>
              )
            }
          >
            {empty.text}
          </EmptyState>
        )}

        {blogs.data && blogs.data.meta.total > 0 && (
          <IndexList label="Posts">
            {blogs.data.data.map((blog) => (
              <li key={blog.id}>
                <Link
                  to={`/blogs/${blog.id}`}
                  className="flex items-center gap-3 px-4 py-3 outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset md:gap-4"
                >
                  {blog.coverImageUrl ? (
                    <img
                      src={blog.coverImageUrl}
                      alt=""
                      loading="lazy"
                      className="h-12 w-16 shrink-0 rounded-md bg-muted object-cover"
                    />
                  ) : (
                    <div className="h-12 w-16 shrink-0 rounded-md bg-muted" />
                  )}
                  {/* Two lines on phones, and columns from md up. */}
                  <div className="min-w-0 flex-1 md:flex md:items-center md:gap-4">
                    <p className="flex items-center gap-2 font-medium md:contents">
                      <span className="truncate md:flex-1">{blog.title}</span>
                      <span className="md:w-28">
                        {blog.published ? (
                          <Badge variant="success">Published</Badge>
                        ) : (
                          <Badge variant="secondary">Draft</Badge>
                        )}
                      </span>
                    </p>
                    <p className="truncate text-sm text-muted-foreground md:contents">
                      <span className="md:w-40 md:truncate">{blog.author}</span>
                      <span className="md:hidden"> · </span>
                      <span className="tabular-nums md:w-32">
                        <span className="md:sr-only">Updated </span>
                        {dateFormat.format(new Date(blog.updatedAt))}
                      </span>
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
