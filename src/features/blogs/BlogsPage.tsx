import { Link, Navigate, useSearchParams } from 'react-router';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { FileTextIcon } from 'lucide-react';
import { Pagination } from '@/components/Pagination';
import { ViewTabs } from '@/components/ViewTabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/api';
import { usePageParam } from '@/lib/use-page-param';
import { ListSkeleton } from '@/components/Loading';
import { pageSize, useBlogs } from './api';

const dateFormat = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' });

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

      <ViewTabs label="Post views" tabs={views} />

      {blogs.isPending && <ListSkeleton media />}

      {blogs.isError && (
        <div className="space-y-4">
          <p role="alert">{errorMessage(blogs.error)}</p>
          <Button variant="outline" onClick={() => blogs.refetch()}>
            Try again
          </Button>
        </div>
      )}

      {blogs.data?.meta.total === 0 && (
        <EmptyState
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
        <>
          <ul
            aria-label="Posts"
            className="overflow-hidden rounded-lg border [&>li:first-child>a]:border-t-0"
          >
            {blogs.data.data.map((blog) => (
              <li key={blog.id}>
                <Link
                  to={`/blogs/${blog.id}`}
                  className="flex items-center gap-3 border-t px-4 py-3 outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset"
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
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-medium">
                      <span className="truncate">{blog.title}</span>
                      {blog.published ? (
                        <Badge variant="success">Published</Badge>
                      ) : (
                        <Badge variant="secondary">Draft</Badge>
                      )}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {blog.author} · Updated {dateFormat.format(new Date(blog.updatedAt))}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            loading={blogs.isPlaceholderData}
          />
        </>
      )}
    </div>
  );
}
