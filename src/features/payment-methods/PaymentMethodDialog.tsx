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
import { ImageField, type ChosenImage } from '@/features/files/ImageField';
import { imageSizes } from '@/features/files/image-sizes';
import {
  useCreatePaymentMethod,
  useUpdatePaymentMethod,
  type PaymentMethod,
  type PaymentMethodChanges,
} from './api';

const textFields = [
  { name: 'providerName', label: 'Provider', placeholder: 'GCash' },
  { name: 'accountName', label: 'Account name', placeholder: 'Juan Store' },
  { name: 'accountNumber', label: 'Account number', placeholder: '0917 000 0000' },
] as const;

type TextField = (typeof textFields)[number]['name'];

interface Props {
  /** The method to edit. Leave it out to add one. */
  method?: PaymentMethod;
  onClose: () => void;
}

export function PaymentMethodDialog({ method, onClose }: Props) {
  const [text, setText] = useState<Record<TextField, string>>({
    providerName: method?.providerName ?? '',
    accountName: method?.accountName ?? '',
    accountNumber: method?.accountNumber ?? '',
  });
  const [qr, setQr] = useState<ChosenImage | null>(
    method?.qrAssetId ? { id: method.qrAssetId, url: method.qrUrl } : null,
  );
  const [enabled, setEnabled] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [missing, setMissing] = useState<TextField[]>([]);
  const create = useCreatePaymentMethod();
  const update = useUpdatePaymentMethod();
  const save = method ? update : create;

  function done(message: string) {
    toast.success(message);
    onClose();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const empty = textFields.map((field) => field.name).filter((name) => !text[name].trim());
    setMissing(empty);
    if (empty.length > 0) return;

    const values = {
      providerName: text.providerName.trim(),
      accountName: text.accountName.trim(),
      accountNumber: text.accountNumber.trim(),
      qrAssetId: qr?.id ?? null,
    };

    if (!method) {
      create.mutate({ ...values, enabled }, { onSuccess: () => done('Payment method added') });
      return;
    }

    // Only what changed is sent, the same as other edits in this app.
    const changes: PaymentMethodChanges = {};
    for (const { name } of textFields) {
      if (values[name] !== method[name]) changes[name] = values[name];
    }
    if (values.qrAssetId !== method.qrAssetId) changes.qrAssetId = values.qrAssetId;

    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }
    update.mutate(
      { id: method.id, body: changes },
      { onSuccess: () => done('Payment method saved') },
    );
  }

  const apiError = save.error instanceof ApiError ? save.error : undefined;
  const fieldError = (name: string) => {
    if (missing.includes(name as TextField)) return 'Fill this in.';
    const detail = apiError?.details.find((item) => item.field === name)?.message;
    // A duplicate account is a 409, which belongs with the account number.
    if (!detail && name === 'accountNumber' && apiError?.status === 409) return apiError.message;
    return detail;
  };
  const fieldNames = ['providerName', 'accountName', 'accountNumber', 'qrAssetId'];
  // A 409 and field errors show next to their fields, so only other errors need the alert.
  const shownElsewhere =
    apiError?.status === 409 || apiError?.details.some((item) => fieldNames.includes(item.field));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{method ? 'Edit payment method' : 'New payment method'}</DialogTitle>
            <DialogDescription>
              Changes show on new orders. Orders already placed keep the details they were placed
              with.
            </DialogDescription>
          </DialogHeader>

          {textFields.map((field) => {
            const error = fieldError(field.name);
            const id = `payment-${field.name}`;
            return (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={id}>{field.label}</Label>
                <Input
                  id={id}
                  maxLength={100}
                  placeholder={field.placeholder}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? `${id}-error` : undefined}
                  value={text[field.name]}
                  onChange={(event) =>
                    setText((current) => ({ ...current, [field.name]: event.target.value }))
                  }
                />
                {error && (
                  <p id={`${id}-error`} className="text-sm text-destructive">
                    {error}
                  </p>
                )}
              </div>
            );
          })}

          <ImageField
            legend="QR code"
            size={imageSizes.qrCode}
            image={qr}
            onChange={setQr}
            error={fieldError('qrAssetId')}
            onUploadingChange={setUploading}
          />

          {!method && (
            <label className="flex min-h-11 items-center gap-3 text-sm md:min-h-8">
              <input
                type="checkbox"
                className="size-5 accent-primary"
                checked={enabled}
                onChange={(event) => setEnabled(event.target.checked)}
              />
              Offered at checkout
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
            <Button type="submit" disabled={save.isPending || uploading}>
              {save.isPending ? 'Saving…' : method ? 'Save' : 'Add payment method'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
