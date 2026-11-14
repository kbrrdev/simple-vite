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
import { ContentField } from '@/features/blogs/ContentField';
import {
  useContentPage,
  useCreateContentPage,
  useDeleteContentPage,
  useUpdateContentPage,
  type ContentPage,
  type ContentPageChanges,
} from './api';
import { slugify } from './slug';

const formId = 'content-page';

interface Values {
  title: string;
  slug: string;
  content: string;
  published: boolean;
}

function valuesOf(page?: ContentPage): Values {
  return {
    title: page?.title ?? '',
    slug: page?.slug ?? '',
    content: page?.content ?? '',
    published: page?.published ?? false,
  };
}

/** The fields that differ from the saved page, trimmed as the backend stores them. */
function changesFrom(values: Values, page?: ContentPage): ContentPageChanges {
  const saved = valuesOf(page);
  const changes: ContentPageChanges = {};
  for (const field of ['title', 'slug', 'content'] as const) {
    if (values[field].trim() !== saved[field]) changes[field] = values[field].trim();
  }
  if (values.published !== saved.published) changes.published = values.published;
  return changes;
}

/** Mirrors the backend's slug rule as a hint. The backend decides. */
function slugProblem(slug: string) {
  if (!slug) return 'Fill this in.';
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    return 'Use lowercase letters, numbers, and single dashes, such as returns-policy.';
  }
  if (slug === 'admin') return 'This address is taken by the admin. Pick another.';
  return undefined;
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
 * Shopify's page editor: the title and text on the left, and visibility and the address on the
 * right. Everything saves together through the save bar.
 */
function Editor({ page }: { page?: ContentPage }) {
  const [values, setValues] = useState(() => valuesOf(page));
  // A new page's address follows its title until someone types one.
  const [slugEdited, setSlugEdited] = useState(Boolean(page));
  const [checked, setChecked] = useState<Record<string, string>>({});
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const create = useCreateContentPage();
  const update = useUpdateContentPage();
  const remove = useDeleteContentPage();
  const save = page ? update : create;
  const navigate = useNavigate();
  const history = useHistoryItem('page', page?.id);
  const changes = changesFrom(values, page);
  const dirty = Object.keys(changes).length > 0;
  const leaveGuard = useLeaveGuard(dirty, 'Your changes to this page will be lost.');

  function set(change: Partial<Values>) {
    setValues((current) => ({ ...current, ...change }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors: Record<string, string> = {};
    if (!values.title.trim()) errors.title = 'Fill this in.';
    if (!values.content.trim()) errors.content = 'Fill this in.';
    const slugError = slugProblem(values.slug.trim());
    if (slugError) errors.slug = slugError;
    setChecked(errors);
    if (Object.keys(errors).length > 0) return;

    if (!page) {
      create.mutate(
        {
          title: values.title.trim(),
          slug: values.slug.trim(),
          content: values.content.trim(),
          published: values.published,
        },
        {
          onSuccess: ({ data }) => {
            toast.success(values.published ? 'Page published' : 'Draft saved');
            leaveGuard.allowLeave();
            navigate(`/pages/${data.id}`, { replace: true });
          },
        },
      );
      return;
    }

    if (!dirty) {
      toast.info('No changes to save.');
      return;
    }

    let message = 'Page saved';
    if (changes.published === true) message = 'Page published';
    if (changes.published === false) message = 'Page moved to drafts';
    update.mutate({ id: page.id, body: changes }, { onSuccess: () => toast.success(message) });
  }

  function discard() {
    setValues(valuesOf(page));
    setSlugEdited(Boolean(page));
    setChecked({});
    save.reset();
  }

  const apiError = save.error instanceof ApiError ? save.error : undefined;
  // A taken address is a 409 without details, so it is shown by the address.
  const fieldError = (field: string) =>
    checked[field] ??
    (field === 'slug' && apiError?.status === 409 ? apiError.message : undefined) ??
    apiError?.details.find((item) => item.field === field)?.message;
  const fields = ['title', 'slug', 'content'];
  const otherError =
    save.error &&
    apiError?.status !== 409 &&
    !apiError?.details.some((item) => fields.includes(item.field));

  const menu: MoreMenuItem[] = [...history];
  if (page) {
    menu.push({
      key: 'delete',
      label: 'Delete',
      destructive: true,
      onSelect: () => setConfirmingDelete(true),
    });
  }

  const slug = values.slug.trim();

  return (
    // Room at the end for the save bar, so it never covers the last card.
    <div className={cn('mx-auto max-w-6xl space-y-6', dirty && 'pb-24')}>
      {/* The saved title, so the header names the page while its field is being edited. */}
      <RecordHeader
        back={{ to: '/pages', label: 'Back to pages' }}
        title={page ? page.title : 'New page'}
        badges={
          page &&
          (page.published ? (
            <Badge variant="success">Published</Badge>
          ) : (
            <Badge variant="secondary">Draft</Badge>
          ))
        }
        menu={menu}
        facts={page && `Last saved ${dateFormat.format(new Date(page.updatedAt))}`}
      />

      <form
        id={formId}
        onSubmit={handleSubmit}
        noValidate
        className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start"
      >
        <section aria-label="Page" className="min-w-0 space-y-4 rounded-lg border p-4">
          <div className="space-y-2">
            <Label htmlFor="page-title">Title</Label>
            <Input
              id="page-title"
              maxLength={255}
              aria-invalid={Boolean(fieldError('title'))}
              aria-describedby={fieldError('title') ? 'page-title-error' : undefined}
              value={values.title}
              onChange={(event) =>
                set({
                  title: event.target.value,
                  ...(slugEdited ? {} : { slug: slugify(event.target.value) }),
                })
              }
            />
            <FieldError id="page-title-error" message={fieldError('title')} />
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
                    name="page-visibility"
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
            {page?.published && !values.published && (
              <p className="text-sm text-muted-foreground">
                Once you save, shoppers can no longer read it. It stays here as a draft.
              </p>
            )}
          </PanelSection>

          <PanelSection title="Address">
            <div className="space-y-2">
              <Label htmlFor="page-slug">URL handle</Label>
              <Input
                id="page-slug"
                maxLength={100}
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={Boolean(fieldError('slug'))}
                aria-describedby={`page-slug-hint${fieldError('slug') ? ' page-slug-error' : ''}`}
                value={values.slug}
                onChange={(event) => {
                  setSlugEdited(true);
                  set({ slug: event.target.value });
                }}
              />
              <FieldError id="page-slug-error" message={fieldError('slug')} />
              <p id="page-slug-hint" className="text-sm text-muted-foreground">
                The end of the page's address on the storefront
                {slug && (
                  <>
                    , such as <span className="font-mono break-all text-foreground">…/{slug}</span>
                  </>
                )}
                .
              </p>
              {page?.published && slug !== page.slug && (
                <p className="text-sm text-muted-foreground">
                  Links to the old address stop working once you save.
                </p>
              )}
            </div>
          </PanelSection>
        </SidePanel>
      </form>

      {dirty && <SaveBar formId={formId} saving={save.isPending} onDiscard={discard} />}

      {confirmingDelete && page && (
        <ConfirmDialog
          title="Delete page"
          description={`Delete “${page.title}” for good? This cannot be undone, and links to it stop working. To hide it but keep it, make it a draft instead.`}
          actionLabel="Delete"
          destructive
          pending={remove.isPending}
          error={remove.error}
          onConfirm={() =>
            remove.mutate(page.id, {
              onSuccess: () => {
                toast.success('Page deleted');
                leaveGuard.allowLeave();
                navigate('/pages', { replace: true });
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

export function NewContentPagePage() {
  return <Editor />;
}

export function ContentPageEditorPage() {
  const { id = '' } = useParams();
  const page = useContentPage(id);

  if (page.isPending) {
    return <DetailSkeleton />;
  }

  if (page.isError) {
    const notFound = page.error instanceof ApiError && page.error.status === 404;
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild className="-ml-2">
          <Link to="/pages">Back to pages</Link>
        </Button>
        <h1 className="text-2xl font-semibold">{notFound ? 'Page not found' : 'Page'}</h1>
        {notFound ? (
          <p className="text-muted-foreground">This page does not exist, or its link is wrong.</p>
        ) : (
          <>
            <p role="alert">{errorMessage(page.error)}</p>
            <Button variant="outline" onClick={() => page.refetch()}>
              Try again
            </Button>
          </>
        )}
      </div>
    );
  }

  // Keyed by updatedAt, so that the form shows the saved page after each change.
  return <Editor key={page.data.data.updatedAt} page={page.data.data} />;
}
