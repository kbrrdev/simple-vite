import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, errorMessage } from '@/lib/api';
import { fromLocalInput, toLocalInput } from '@/lib/schedule';
import { ImageField, type ChosenImage } from '@/features/files/ImageField';
import { useCreateBanner, useUpdateBanner, type Banner, type BannerChanges } from './api';

const textFields = [
  {
    name: 'altText',
    label: 'Alt text',
    max: 200,
    hint: 'What the image shows, for screen readers',
  },
  { name: 'title', label: 'Title', max: 100, hint: 'Optional' },
  { name: 'subtitle', label: 'Subtitle', max: 200, hint: 'Optional' },
  {
    name: 'linkUrl',
    label: 'Link',
    max: 500,
    hint: 'Optional. A store path such as /categories/…, or an https:// link',
  },
] as const;

type TextField = (typeof textFields)[number]['name'];

// The backend's rule, mirrored as a hint: a store path, or an https link.
const linkPattern = /^(\/(?![/\\])|https:\/\/)\S*$/;

interface Props {
  /** The banner to edit. Leave it out to add one. */
  banner?: Banner;
  /** Where a new banner goes: after the last one. */
  nextPosition: number;
  onClose: () => void;
}

export function BannerDialog({ banner, nextPosition, onClose }: Props) {
  const [text, setText] = useState<Record<TextField, string>>({
    altText: banner?.altText ?? '',
    title: banner?.title ?? '',
    subtitle: banner?.subtitle ?? '',
    linkUrl: banner?.linkUrl ?? '',
  });
  const [image, setImage] = useState<ChosenImage | null>(
    banner ? { id: banner.assetId, url: banner.imageUrl } : null,
  );
  const [mobileImage, setMobileImage] = useState<ChosenImage | null>(
    banner?.mobileAssetId ? { id: banner.mobileAssetId, url: banner.mobileImageUrl } : null,
  );
  const [startsAt, setStartsAt] = useState(toLocalInput(banner?.startsAt ?? null));
  const [endsAt, setEndsAt] = useState(toLocalInput(banner?.endsAt ?? null));
  const [isActive, setIsActive] = useState(true);
  // One per field, so one upload finishing does not unlock Save while the other runs.
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const create = useCreateBanner();
  const update = useUpdateBanner();
  const save = banner ? update : create;

  function done(message: string) {
    toast.success(message);
    onClose();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const found: Record<string, string> = {};
    if (!image) found.assetId = 'Choose an image.';
    if (!text.altText.trim()) found.altText = 'Describe the image.';
    const link = text.linkUrl.trim();
    if (link && !linkPattern.test(link)) found.linkUrl = 'Start the link with / or https://.';
    if (startsAt && endsAt && endsAt <= startsAt) found.endsAt = 'End after the start.';
    setErrors(found);
    if (!image || Object.keys(found).length > 0) return;

    const optional = (value: string) => value.trim() || null;
    const values = {
      assetId: image.id,
      mobileAssetId: mobileImage?.id ?? null,
      altText: text.altText.trim(),
      title: optional(text.title),
      subtitle: optional(text.subtitle),
      linkUrl: optional(text.linkUrl),
      startsAt: fromLocalInput(startsAt),
      endsAt: fromLocalInput(endsAt),
    };

    if (!banner) {
      create.mutate(
        { ...values, isActive, position: nextPosition },
        { onSuccess: () => done('Banner added') },
      );
      return;
    }

    // Only what changed is sent. Dates compare as the field shows them, so an untouched one
    // is not resent with different seconds.
    const changes: BannerChanges = {};
    for (const field of [
      'assetId',
      'mobileAssetId',
      'altText',
      'title',
      'subtitle',
      'linkUrl',
    ] as const) {
      if (values[field] !== banner[field]) Object.assign(changes, { [field]: values[field] });
    }
    if (startsAt !== toLocalInput(banner.startsAt)) changes.startsAt = values.startsAt;
    if (endsAt !== toLocalInput(banner.endsAt)) changes.endsAt = values.endsAt;

    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }
    update.mutate({ id: banner.id, body: changes }, { onSuccess: () => done('Banner saved') });
  }

  const apiError = save.error instanceof ApiError ? save.error : undefined;
  const fieldError = (name: string) =>
    errors[name] ?? apiError?.details.find((item) => item.field === name)?.message;
  const fieldNames = [
    ...textFields.map((field) => field.name),
    'assetId',
    'mobileAssetId',
    'startsAt',
    'endsAt',
  ];
  const shownElsewhere = apiError?.details.some((item) => fieldNames.includes(item.field));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <form onSubmit={handleSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{banner ? 'Edit banner' : 'New banner'}</DialogTitle>
            <DialogDescription>
              Shown at the top of the store, in the order of the list.
            </DialogDescription>
          </DialogHeader>

          <ImageField
            legend="Image"
            image={image}
            onChange={setImage}
            error={fieldError('assetId')}
            onUploadingChange={setUploadingImage}
          />
          <ImageField
            legend="Phone image (optional)"
            image={mobileImage}
            onChange={setMobileImage}
            error={fieldError('mobileAssetId')}
            onUploadingChange={setUploadingMobile}
          />

          {textFields.map((field) => {
            const error = fieldError(field.name);
            const id = `banner-${field.name}`;
            return (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={id}>{field.label}</Label>
                <Input
                  id={id}
                  maxLength={field.max}
                  aria-invalid={Boolean(error)}
                  aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
                  value={text[field.name]}
                  onChange={(event) =>
                    setText((current) => ({ ...current, [field.name]: event.target.value }))
                  }
                />
                <p id={`${id}-hint`} className="text-xs text-muted-foreground">
                  {field.hint}
                </p>
                {error && (
                  <p id={`${id}-error`} className="text-sm text-destructive">
                    {error}
                  </p>
                )}
              </div>
            );
          })}

          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-2 text-sm font-medium">Schedule (optional)</legend>
            {(
              [
                ['startsAt', 'Starts', startsAt, setStartsAt],
                ['endsAt', 'Ends', endsAt, setEndsAt],
              ] as const
            ).map(([name, label, value, setValue]) => {
              const error = fieldError(name);
              return (
                <div key={name} className="space-y-2">
                  <Label htmlFor={`banner-${name}`}>{label}</Label>
                  <Input
                    id={`banner-${name}`}
                    type="datetime-local"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? `banner-${name}-error` : undefined}
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                  />
                  {error && (
                    <p id={`banner-${name}-error`} className="text-sm text-destructive">
                      {error}
                    </p>
                  )}
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Leave both empty to show it as long as it is on.
            </p>
          </fieldset>

          {!banner && (
            <label className="flex min-h-11 items-center gap-3 text-sm md:min-h-8">
              <input
                type="checkbox"
                className="size-5 accent-primary"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
              />
              On as soon as it is added
            </label>
          )}

          {save.error && !shownElsewhere && (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage(save.error)}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending || uploadingImage || uploadingMobile}>
              {save.isPending ? 'Saving…' : banner ? 'Save' : 'Add banner'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
