import { useState, type FormEvent, type ReactNode } from 'react';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from 'cn';
import { DetailSkeleton } from '@/components/Loading';
import { NativeSelect } from '@/components/NativeSelect';
import { PageHeader } from '@/components/PageHeader';
import { SaveBar } from '@/components/SaveBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, errorMessage } from '@/lib/api';
import { useLeaveGuard } from '@/lib/use-leave-guard';
import {
  useSaveStoreInfo,
  useStoreInfo,
  type SocialPlatform,
  type StoreInfo,
  type StoreInfoBody,
} from './api';

const formId = 'store-details';

/** The backend's limit, mirrored to disable Add link. */
const maxSocialLinks = 10;

const platformLabels: Record<SocialPlatform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  x: 'X',
  messenger: 'Messenger',
  viber: 'Viber',
  whatsapp: 'WhatsApp',
  shopee: 'Shopee',
  lazada: 'Lazada',
};

const platforms = Object.keys(platformLabels) as SocialPlatform[];

const textFields = [
  'name',
  'email',
  'phone',
  'line1',
  'line2',
  'barangay',
  'city',
  'province',
  'postalCode',
  'businessHours',
] as const;

type TextField = (typeof textFields)[number];

interface LinkValues {
  /** Only for React's list keys, never sent. */
  key: string;
  platform: SocialPlatform;
  url: string;
  label: string;
}

type Values = Record<TextField, string> & { socialLinks: LinkValues[] };

function valuesOf(info: StoreInfo): Values {
  return {
    name: info.name,
    email: info.email ?? '',
    phone: info.phone ?? '',
    line1: info.line1 ?? '',
    line2: info.line2 ?? '',
    barangay: info.barangay ?? '',
    city: info.city ?? '',
    province: info.province ?? '',
    postalCode: info.postalCode ?? '',
    businessHours: info.businessHours ?? '',
    socialLinks: info.socialLinks.map((link) => ({
      key: crypto.randomUUID(),
      platform: link.platform,
      url: link.url,
      label: link.label ?? '',
    })),
  };
}

const orNull = (value: string) => value.trim() || null;

/** The whole form as the backend takes it, with empty fields sent as null. */
function bodyOf(values: Values): StoreInfoBody {
  return {
    name: values.name.trim(),
    email: orNull(values.email),
    phone: orNull(values.phone),
    line1: orNull(values.line1),
    line2: orNull(values.line2),
    barangay: orNull(values.barangay),
    city: orNull(values.city),
    province: orNull(values.province),
    postalCode: orNull(values.postalCode),
    businessHours: orNull(values.businessHours),
    socialLinks: values.socialLinks.map((link) => ({
      platform: link.platform,
      url: link.url.trim(),
      label: orNull(link.label),
    })),
  };
}

/** Hints before sending. The backend checks the same and decides. */
function checkValues(values: Values) {
  const errors: Record<string, string> = {};
  if (!values.name.trim()) errors.name = 'Fill this in.';
  if (values.email.trim() && !/^\S+@\S+\.\S+$/.test(values.email.trim())) {
    errors.email = 'Enter an email address, such as hello@example.com.';
  }
  if (values.postalCode.trim() && !/^\d{4}$/.test(values.postalCode.trim())) {
    errors.postalCode = 'Postal code must be 4 digits.';
  }
  values.socialLinks.forEach((link, index) => {
    if (!link.url.trim()) errors[`socialLinks.${index}.url`] = 'Fill this in.';
    else if (!/^https:\/\/\S+$/.test(link.url.trim())) {
      errors[`socialLinks.${index}.url`] = 'Start the link with https://';
    }
  });
  return errors;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  );
}

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const id = `store-${title.toLowerCase().replace(/\W+/g, '-')}`;
  return (
    <section aria-labelledby={id} className="space-y-4 rounded-lg border p-4">
      <div className="space-y-1">
        <h2 id={id} className="font-semibold">
          {title}
        </h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/**
 * Shopify's Settings › Store details: what the storefront shows shoppers about the store, in
 * cards, saved together through the save bar.
 */
function Editor({ info }: { info: StoreInfo }) {
  const [values, setValues] = useState(() => valuesOf(info));
  const [checked, setChecked] = useState<Record<string, string>>({});
  const save = useSaveStoreInfo();
  const body = bodyOf(values);
  const dirty = JSON.stringify(body) !== JSON.stringify(bodyOf(valuesOf(info)));
  const leaveGuard = useLeaveGuard(dirty, 'Your changes to the store details will be lost.');

  function set(change: Partial<Values>) {
    setValues((current) => ({ ...current, ...change }));
  }

  function setLink(key: string, change: Partial<LinkValues>) {
    set({
      socialLinks: values.socialLinks.map((link) =>
        link.key === key ? { ...link, ...change } : link,
      ),
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = checkValues(values);
    setChecked(errors);
    if (Object.keys(errors).length > 0) return;

    save.mutate(body, {
      onSuccess: () => {
        toast.success('Store details saved');
        leaveGuard.allowLeave();
      },
    });
  }

  function discard() {
    setValues(valuesOf(info));
    setChecked({});
    save.reset();
  }

  const apiError = save.error instanceof ApiError ? save.error : undefined;
  const fieldError = (field: string) =>
    checked[field] ?? apiError?.details.find((item) => item.field === field)?.message;
  const shownFields = new Set<string>([
    ...textFields,
    ...values.socialLinks.flatMap((_, index) => [
      `socialLinks.${index}.url`,
      `socialLinks.${index}.label`,
      `socialLinks.${index}.platform`,
    ]),
  ]);
  const otherError = save.error && !apiError?.details.some((item) => shownFields.has(item.field));

  function textInput(
    field: TextField,
    label: string,
    props: {
      type?: string;
      maxLength: number;
      inputMode?: 'numeric';
      autoComplete?: string;
      className?: string;
    },
  ) {
    const error = fieldError(field);
    const { className, ...inputProps } = props;
    return (
      <div className={cn('space-y-2', className)}>
        <Label htmlFor={`store-${field}`}>{label}</Label>
        <Input
          id={`store-${field}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `store-${field}-error` : undefined}
          value={values[field]}
          onChange={(event) => set({ [field]: event.target.value })}
          {...inputProps}
        />
        <FieldError id={`store-${field}-error`} message={error} />
      </div>
    );
  }

  return (
    // Room at the end for the save bar, so it never covers the last card.
    <div className={cn('mx-auto max-w-3xl space-y-6', dirty && 'pb-24')}>
      <PageHeader
        title="Store details"
        description="How shoppers reach the store. The storefront shows these in its footer and contact page."
      />

      <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-4">
        <Card title="Profile">
          <div className="grid gap-4 md:grid-cols-2">
            {textInput('name', 'Store name', { maxLength: 100, className: 'md:col-span-2' })}
            {textInput('email', 'Contact email', {
              type: 'email',
              maxLength: 255,
              autoComplete: 'off',
            })}
            {textInput('phone', 'Phone', { type: 'tel', maxLength: 30, autoComplete: 'off' })}
          </div>
        </Card>

        <Card title="Address" description="Leave it empty if the store has no shop to visit.">
          <div className="grid gap-4 md:grid-cols-2">
            {textInput('line1', 'Street address', { maxLength: 255, className: 'md:col-span-2' })}
            {textInput('line2', 'Unit, building, or floor', {
              maxLength: 255,
              className: 'md:col-span-2',
            })}
            {textInput('barangay', 'Barangay', { maxLength: 100 })}
            {textInput('city', 'City', { maxLength: 100 })}
            {textInput('province', 'Province', { maxLength: 100 })}
            {textInput('postalCode', 'Postal code', { maxLength: 4, inputMode: 'numeric' })}
          </div>
        </Card>

        <Card title="Business hours" description="Shown as typed, such as Mon to Sat, 9am to 6pm.">
          {textInput('businessHours', 'Hours', { maxLength: 200 })}
        </Card>

        <Card
          title="Social links"
          description={`Shown in this order, up to ${maxSocialLinks}. Each link starts with https://.`}
        >
          {values.socialLinks.length === 0 && (
            <p className="text-sm text-muted-foreground">No links yet.</p>
          )}
          <ul className="space-y-4">
            {values.socialLinks.map((link, index) => {
              const urlError = fieldError(`socialLinks.${index}.url`);
              const labelError = fieldError(`socialLinks.${index}.label`);
              const name = `${platformLabels[link.platform]} link`;
              return (
                <li
                  key={link.key}
                  // On phones Remove sits beside the platform, and the link and label span the row.
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b pb-4 last:border-b-0 last:pb-0 md:grid-cols-[9rem_minmax(0,1fr)_9rem_auto] md:items-start"
                >
                  <div className="space-y-2">
                    <Label htmlFor={`link-${link.key}-platform`}>Platform</Label>
                    <NativeSelect
                      id={`link-${link.key}-platform`}
                      value={link.platform}
                      onChange={(event) =>
                        setLink(link.key, { platform: event.target.value as SocialPlatform })
                      }
                    >
                      {platforms.map((platform) => (
                        <option key={platform} value={platform}>
                          {platformLabels[platform]}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="col-span-2 space-y-2 md:col-span-1">
                    <Label htmlFor={`link-${link.key}-url`}>Link</Label>
                    <Input
                      id={`link-${link.key}-url`}
                      type="url"
                      maxLength={500}
                      placeholder="https://"
                      aria-invalid={Boolean(urlError)}
                      aria-describedby={urlError ? `link-${link.key}-url-error` : undefined}
                      value={link.url}
                      onChange={(event) => setLink(link.key, { url: event.target.value })}
                    />
                    <FieldError id={`link-${link.key}-url-error`} message={urlError} />
                  </div>
                  <div className="col-span-2 space-y-2 md:col-span-1">
                    <Label htmlFor={`link-${link.key}-label`}>Label (optional)</Label>
                    <Input
                      id={`link-${link.key}-label`}
                      maxLength={50}
                      aria-invalid={Boolean(labelError)}
                      aria-describedby={labelError ? `link-${link.key}-label-error` : undefined}
                      value={link.label}
                      onChange={(event) => setLink(link.key, { label: event.target.value })}
                    />
                    <FieldError id={`link-${link.key}-label-error`} message={labelError} />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${name}`}
                    className="col-start-2 row-start-1 mt-6 self-start justify-self-end md:col-start-4"
                    onClick={() =>
                      set({
                        socialLinks: values.socialLinks.filter((item) => item.key !== link.key),
                      })
                    }
                  >
                    <Trash2Icon aria-hidden />
                  </Button>
                </li>
              );
            })}
          </ul>
          <Button
            type="button"
            variant="outline"
            disabled={values.socialLinks.length >= maxSocialLinks}
            onClick={() =>
              set({
                socialLinks: [
                  ...values.socialLinks,
                  { key: crypto.randomUUID(), platform: 'facebook', url: '', label: '' },
                ],
              })
            }
          >
            <PlusIcon aria-hidden />
            Add link
          </Button>
        </Card>

        {otherError && (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage(save.error)}
          </p>
        )}
      </form>

      {dirty && <SaveBar formId={formId} saving={save.isPending} onDiscard={discard} />}
      {leaveGuard.dialog}
    </div>
  );
}

export function StoreDetailsPage() {
  const info = useStoreInfo();

  if (info.isPending) return <DetailSkeleton />;

  if (info.isError) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Store details</h1>
        <p role="alert">{errorMessage(info.error)}</p>
        <Button variant="outline" onClick={() => info.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  // Keyed by updatedAt, so that the form shows the saved details after each save.
  return <Editor key={info.data.data.updatedAt} info={info.data.data} />;
}
