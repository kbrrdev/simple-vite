import { Link, Navigate, useSearchParams } from 'react-router';
import { NativeSelect } from '@/components/NativeSelect';
import { Pagination } from '@/components/Pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { errorMessage } from '@/lib/api';
import { usePageParam } from '@/lib/use-page-param';
import { pageSize, useBlogs } from './api';

const dateFormat = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' });

export function BlogsPage() {
  const [page, setPage] = usePageParam();
  const [searchParams, setSearchParams] = useSearchParams();
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

  function setFilter(value: string) {
    setSearchParams(value ? { published: value } : {});
  }

  let empty = 'No posts yet. Write one to tell shoppers what is new.';
  if (published === true) empty = 'No published posts.';
  if (published === false) empty = 'No drafts.';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Blog</h1>
        <Button asChild>
          <Link to="/blogs/new">New post</Link>
        </Button>
      </div>

      <div className="space-y-2 sm:w-48">
        <Label htmlFor="blog-filter">Show</Label>
        <NativeSelect
          id="blog-filter"
          value={publishedParam === 'true' || publishedParam === 'false' ? publishedParam : ''}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value="">All posts</option>
          <option value="true">Published</option>
          <option value="false">Drafts</option>
        </NativeSelect>
      </div>

      {blogs.isPending && (
        <p role="status" className="text-muted-foreground">
          Loading…
        </p>
      )}

      {blogs.isError && (
        <div className="space-y-4">
          <p role="alert">{errorMessage(blogs.error)}</p>
          <Button variant="outline" onClick={() => blogs.refetch()}>
            Try again
          </Button>
        </div>
      )}

      {blogs.data?.meta.total === 0 && <p className="text-muted-foreground">{empty}</p>}

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
                      {!blog.published && <Badge variant="secondary">Draft</Badge>}
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
