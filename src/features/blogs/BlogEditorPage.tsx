import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useBlocker, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DetailSkeleton } from '@/components/Loading';
import type { MoreMenuItem } from '@/components/MoreMenu';
import { RecordHeader } from '@/components/RecordHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, errorMessage } from '@/lib/api';
import { useHistoryItem } from '@/features/audit-log/history';
import { ImageField, type ChosenImage } from '@/features/files/ImageField';
import {
  useBlog,
  useCreateBlog,
  useDeleteBlog,
  useUpdateBlog,
  type Blog,
  type BlogChanges,
} from './api';
import { ContentField } from './ContentField';

interface Values {
  title: string;
  author: string;
  content: string;
  cover: ChosenImage | null;
}

function valuesOf(blog?: Blog): Values {
  return {
    title: blog?.title ?? '',
    author: blog?.author ?? '',
    content: blog?.content ?? '',
    cover: blog?.coverAssetId ? { id: blog.coverAssetId, url: blog.coverImageUrl } : null,
  };
}

/** The fields that differ from the saved post, trimmed as the backend stores them. */
function changesFrom(values: Values, blog?: Blog): BlogChanges {
  const saved = valuesOf(blog);
  const changes: BlogChanges = {};
  for (const field of ['title', 'author', 'content'] as const) {
    if (values[field].trim() !== saved[field]) changes[field] = values[field].trim();
  }
  if ((values.cover?.id ?? null) !== (saved.cover?.id ?? null)) {
    changes.coverAssetId = values.cover?.id ?? null;
  }
  return changes;
}

type Confirming = 'unpublish' | 'delete';

const dateFormat = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' });

function Editor({ blog }: { blog?: Blog }) {
  const [values, setValues] = useState(() => valuesOf(blog));
  const [missing, setMissing] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState<Confirming | null>(null);
  const create = useCreateBlog();
  const update = useUpdateBlog();
  const remove = useDeleteBlog();
  const save = blog ? update : create;
  const navigate = useNavigate();
  const history = useHistoryItem('blog', blog?.id);
  // Set just before leaving on purpose, after a save or a delete.
  const leaving = useRef(false);

  const dirty = Object.keys(changesFrom(values, blog)).length > 0;
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !leaving.current && currentLocation.pathname !== nextLocation.pathname,
  );

  // Closing or reloading the tab is outside React Router, so the browser asks instead.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  function set(change: Partial<Values>) {
    setValues((current) => ({ ...current, ...change }));
  }

  /** Saves the form. `published` is left out to keep the post as it is. */
  function submit(published?: boolean) {
    const empty = (['title', 'author', 'content'] as const).filter(
      (field) => !values[field].trim(),
    );
    setMissing(empty);
    if (empty.length > 0) return;

    if (!blog) {
      create.mutate(
        {
          title: values.title.trim(),
          author: values.author.trim(),
          content: values.content.trim(),
          coverAssetId: values.cover?.id ?? null,
          published: published ?? false,
        },
        {
          onSuccess: ({ data }) => {
            toast.success(published ? 'Post published' : 'Draft saved');
            leaving.current = true;
            navigate(`/blogs/${data.id}`, { replace: true });
          },
        },
      );
      return;
    }

    const changes = changesFrom(values, blog);
    if (published !== undefined && published !== blog.published) changes.published = published;
    if (Object.keys(changes).length === 0) {
      toast.info('No changes to save.');
      return;
    }

    let message = 'Post saved';
    if (changes.published === true) message = 'Post published';
    if (changes.published === false) message = 'Post moved to drafts';
    update.mutate(
      { id: blog.id, body: changes },
      {
        onSuccess: () => {
          toast.success(message);
          setConfirming(null);
        },
      },
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit();
  }

  const apiError = save.error instanceof ApiError ? save.error : undefined;
  const fieldError = (field: string) =>
    missing.includes(field)
      ? 'Fill this in.'
      : apiError?.details.find((item) => item.field === field)?.message;
  const fields = ['title', 'author', 'content', 'coverAssetId'];
  const otherError = save.error && !apiError?.details.some((item) => fields.includes(item.field));
  const busy = save.isPending || uploading;

  const menu: MoreMenuItem[] = [...history];
  if (blog?.published) {
    menu.push({ key: 'unpublish', label: 'Unpublish', onSelect: () => setConfirming('unpublish') });
  }
  if (blog) {
    menu.push({
      key: 'delete',
      label: 'Delete',
      destructive: true,
      onSelect: () => setConfirming('delete'),
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mx-auto max-w-3xl space-y-6">
      {/* The saved title, so the header names the post while its field is being edited. */}
      <RecordHeader
        back={{ to: '/blogs', label: 'Back to blog' }}
        title={blog ? blog.title : 'New post'}
        badges={
          blog &&
          (blog.published ? (
            <Badge variant="success">Published</Badge>
          ) : (
            <Badge variant="secondary">Draft</Badge>
          ))
        }
        menu={menu}
        facts={
          blog && `By ${blog.author} · Last saved ${dateFormat.format(new Date(blog.updatedAt))}`
        }
      />

      <section className="grid gap-4 rounded-lg border p-4">
        {(['title', 'author'] as const).map((field) => {
          const error = fieldError(field);
          return (
            <div key={field} className="space-y-2">
              <Label htmlFor={`blog-${field}`}>{field === 'title' ? 'Title' : 'Author'}</Label>
              <Input
                id={`blog-${field}`}
                maxLength={field === 'title' ? 255 : 100}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `blog-${field}-error` : undefined}
                value={values[field]}
                onChange={(event) => set({ [field]: event.target.value })}
              />
              {error && (
                <p id={`blog-${field}-error`} className="text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
          );
        })}

        <ImageField
          legend="Cover image"
          image={values.cover}
          onChange={(cover) => set({ cover })}
          error={fieldError('coverAssetId')}
          onUploadingChange={setUploading}
        />

        <ContentField
          value={values.content}
          onChange={(content) => set({ content })}
          error={fieldError('content')}
        />
      </section>

      {otherError && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage(save.error)}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
        {blog?.published ? (
          <Button type="submit" disabled={busy}>
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        ) : (
          <>
            <Button type="submit" variant="outline" disabled={busy}>
              Save draft
            </Button>
            <Button type="button" disabled={busy} onClick={() => submit(true)}>
              {save.isPending ? 'Saving…' : 'Publish'}
            </Button>
          </>
        )}
      </div>

      {confirming === 'unpublish' && (
        <ConfirmDialog
          title="Unpublish post"
          description="Shoppers can no longer read it. It stays here as a draft."
          actionLabel="Unpublish"
          destructive
          pending={update.isPending}
          error={update.error}
          onConfirm={() => submit(false)}
          onClose={() => {
            update.reset();
            setConfirming(null);
          }}
        />
      )}

      {confirming === 'delete' && blog && (
        <ConfirmDialog
          title="Delete post"
          description={`Delete “${blog.title}” for good? This cannot be undone. To hide it but keep it, unpublish it instead.`}
          actionLabel="Delete"
          destructive
          pending={remove.isPending}
          error={remove.error}
          onConfirm={() =>
            remove.mutate(blog.id, {
              onSuccess: () => {
                toast.success('Post deleted');
                leaving.current = true;
                navigate('/blogs', { replace: true });
              },
            })
          }
          onClose={() => {
            remove.reset();
            setConfirming(null);
          }}
        />
      )}

      {blocker.state === 'blocked' && (
        <ConfirmDialog
          title="Leave without saving?"
          description="Your changes to this post will be lost."
          actionLabel="Leave"
          destructive
          pending={false}
          error={null}
          onConfirm={() => blocker.proceed()}
          onClose={() => blocker.reset()}
        />
      )}
    </form>
  );
}

export function NewBlogPage() {
  return <Editor />;
}

export function BlogEditorPage() {
  const { id = '' } = useParams();
  const blog = useBlog(id);

  if (blog.isPending) {
    return <DetailSkeleton />;
  }

  if (blog.isError) {
    const notFound = blog.error instanceof ApiError && blog.error.status === 404;
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild className="-ml-2">
          <Link to="/blogs">Back to blog</Link>
        </Button>
        <h1 className="text-2xl font-semibold">{notFound ? 'Post not found' : 'Post'}</h1>
        {notFound ? (
          <p className="text-muted-foreground">This post does not exist, or its link is wrong.</p>
        ) : (
          <>
            <p role="alert">{errorMessage(blog.error)}</p>
            <Button variant="outline" onClick={() => blog.refetch()}>
              Try again
            </Button>
          </>
        )}
      </div>
    );
  }

  // Keyed by updatedAt, so that the form shows the saved post after each change.
  return <Editor key={blog.data.data.updatedAt} blog={blog.data.data} />;
}
