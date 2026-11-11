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
import { errorMessage } from '@/lib/api';
import { useDeleteAsset, type Asset } from './api';

interface Props {
  asset: Asset;
  onClose: () => void;
}

export function DeleteAssetDialog({ asset, onClose }: Props) {
  const remove = useDeleteAsset();

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete image</DialogTitle>
          <DialogDescription>
            Delete this image? Images that a product or blog still uses cannot be deleted.
          </DialogDescription>
        </DialogHeader>
        <img src={asset.url} alt="" className="max-h-48 w-full rounded-md object-contain" />
        {remove.error && (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage(remove.error)}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={remove.isPending}
            onClick={() =>
              remove.mutate(asset.id, {
                onSuccess: () => {
                  toast.success('Image deleted');
                  onClose();
                },
              })
            }
          >
            {remove.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
