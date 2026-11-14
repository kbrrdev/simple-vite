import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { cn } from 'cn';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DetailSkeleton } from '@/components/Loading';
import type { MoreMenuItem } from '@/components/MoreMenu';
import { RecordHeader } from '@/components/RecordHeader';
import { SaveBar } from '@/components/SaveBar';
import { PanelSection, SidePanel } from '@/components/SidePanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, errorMessage } from '@/lib/api';
import { useLeaveGuard } from '@/lib/use-leave-guard';
import { useHistoryItem } from '@/features/audit-log/history';
import { ImageField, type ChosenImage } from '@/features/files/ImageField';
import { imageSizes } from '@/features/files/image-sizes';
import {
  useBlog,
  useCreateBlog,
  useDeleteBlog,
  useUpdateBlog,
  type Blog,
  type BlogChanges,
} from './api';
import { ContentField } from './ContentField';

const formId = 'blog-post';

interface Values {
  title: string;
  author: string;
  content: string;
  cover: ChosenImage | null;
  published: boolean;
}

function valuesOf(blog?: Blog): Values {
  return {
    title: blog?.title ?? '',
    author: blog?.author ?? '',
    content: blog?.content ?? '',
    cover: blog?.coverAssetId ? { id: blog.coverAssetId, url: blog.coverImageUrl } : null,
    published: blog?.published ?? false,
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
  if (values.published !== saved.published) changes.published = values.published;
  return changes;
}

const dateFormat = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' });

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  );
}

/**
 * Shopify's post editor: the title and text on the left, and visibility, cover, and author on
 * the right. Everything saves together through the save bar.
 */
function Editor({ blog }: { blog?: Blog }) {
  const [values, setValues] = useState(() => valuesOf(blog));
  const [missing, setMissing] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const create = useCreateBlog();
  const update = useUpdateBlog();
  const remove = useDeleteBlog();
  const save = blog ? update : create;
  const navigate = useNavigate();
  const history = useHistoryItem('blog', blog?.id);
  const changes = changesFrom(values, blog);
  const dirty = Object.keys(changes).length > 0;
  const leaveGuard = useLeaveGuard(dirty, 'Your changes to this post will be lost.');

  function set(change: Partial<Values>) {
    setValues((current) => ({ ...current, ...change }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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
          published: values.published,
        },
        {
          onSuccess: ({ data }) => {
            toast.success(values.published ? 'Post published' : 'Draft saved');
            leaveGuard.allowLeave();
            navigate(`/blogs/${data.id}`, { replace: true });
          },
        },
      );
      return;
    }

    if (!dirty) {
      toast.info('No changes to save.');
      return;
    }

    let message = 'Post saved';
    if (changes.published === true) message = 'Post published';
    if (changes.published === false) message = 'Post moved to drafts';
    update.mutate({ id: blog.id, body: changes }, { onSuccess: () => toast.success(message) });
  }

  function discard() {
    setValues(valuesOf(blog));
    setMissing([]);
    save.reset();
  }

  const apiError = save.error instanceof ApiError ? save.error : undefined;
  const fieldError = (field: string) =>
    missing.includes(field)
      ? 'Fill this in.'
      : apiError?.details.find((item) => item.field === field)?.message;
  const fields = ['title', 'author', 'content', 'coverAssetId'];
  const otherError = save.error && !apiError?.details.some((item) => fields.includes(item.field));

  const menu: MoreMenuItem[] = [...history];
  if (blog) {
    menu.push({
      key: 'delete',
      label: 'Delete',
      destructive: true,
      onSelect: () => setConfirmingDelete(true),
    });
  }

  return (
    // Room at the end for the save bar, so it never covers the last card.
    <div className={cn('mx-auto max-w-6xl space-y-6', dirty && 'pb-24')}>
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

      <form
        id={formId}
        onSubmit={handleSubmit}
        noValidate
        className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start"
      >
        <section aria-label="Post" className="min-w-0 space-y-4 rounded-lg border p-4">
          <div className="space-y-2">
            <Label htmlFor="blog-title">Title</Label>
            <Input
              id="blog-title"
              maxLength={255}
              aria-invalid={Boolean(fieldError('title'))}
              aria-describedby={fieldError('title') ? 'blog-title-error' : undefined}
              value={values.title}
              onChange={(event) => set({ title: event.target.value })}
            />
            <FieldError id="blog-title-error" message={fieldError('title')} />
          </div>

          <ContentField
            value={values.content}
            onChange={(content) => set({ content })}
            error={fieldError('content')}
          />

          {otherError && (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage(save.error)}
            </p>
          )}
        </section>

        <SidePanel>
          <PanelSection title="Visibility">
            <div role="radiogroup" aria-label="Visibility" className="space-y-1">
              {(
                [
                  [true, 'Published', 'Shoppers can read it.'],
                  [false, 'Draft', 'Only staff can see it.'],
                ] as const
              ).map(([published, label, hint]) => (
                <label
                  key={label}
                  className="flex min-h-11 items-start gap-3 py-1 text-sm md:min-h-8"
                >
                  <input
                    type="radio"
                    name="blog-visibility"
                    className="mt-0.5 size-5 shrink-0 accent-primary"
                    checked={values.published === published}
                    onChange={() => set({ published })}
                  />
                  <span>
                    <span className="block font-medium">{label}</span>
                    <span className="block text-muted-foreground">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
            {blog?.published && !values.published && (
              <p className="text-sm text-muted-foreground">
                Once you save, shoppers can no longer read it. It stays here as a draft.
              </p>
            )}
          </PanelSection>

          <PanelSection title="Cover image">
            <ImageField
              legend="Cover image"
              size={imageSizes.blogCover}
              image={values.cover}
              onChange={(cover) => set({ cover })}
              error={fieldError('coverAssetId')}
              onUploadingChange={setUploading}
            />
          </PanelSection>

          <PanelSection title="Author">
            <div className="space-y-2">
              <Label htmlFor="blog-author" className="sr-only">
                Author
              </Label>
              <Input
                id="blog-author"
                maxLength={100}
                aria-invalid={Boolean(fieldError('author'))}
                aria-describedby={fieldError('author') ? 'blog-author-error' : undefined}
                value={values.author}
                onChange={(event) => set({ author: event.target.value })}
              />
              <FieldError id="blog-author-error" message={fieldError('author')} />
            </div>
          </PanelSection>
        </SidePanel>
      </form>

      {/* Waits for an upload, so that the post never saves without its cover. */}
      {dirty && (
        <SaveBar formId={formId} saving={save.isPending || uploading} onDiscard={discard} />
      )}

      {confirmingDelete && blog && (
        <ConfirmDialog
          title="Delete post"
          description={`Delete “${blog.title}” for good? This cannot be undone. To hide it but keep it, make it a draft instead.`}
          actionLabel="Delete"
          destructive
          pending={remove.isPending}
          error={remove.error}
          onConfirm={() =>
            remove.mutate(blog.id, {
              onSuccess: () => {
                toast.success('Post deleted');
                leaveGuard.allowLeave();
                navigate('/blogs', { replace: true });
              },
            })
          }
          onClose={() => {
            remove.reset();
            setConfirmingDelete(false);
          }}
        />
      )}

      {leaveGuard.dialog}
    </div>
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
