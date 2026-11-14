import { useState } from 'react';
import Cropper from 'react-easy-crop';
// A stylesheet rather than the injected style tag, so that a Content Security Policy allows it.
import 'react-easy-crop/react-easy-crop.css';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cropImage, type CropArea } from './crop-image';

/** Below this many pixels across, the store may show the crop soft. */
const sharpWidth = 1024;

interface Props {
  file: File;
  /** A URL the browser can show the file from, made with `URL.createObjectURL`. */
  source: string;
  /** Width over height of the shape the store shows, such as 1 for a square. */
  aspect: number;
  description: string;
  /** Called with the cropped file, or the original for Use whole image. */
  onDone: (file: File) => void;
  onCancel: () => void;
}

/**
 * Places a photo in the shape the store shows before it is uploaded, by dragging and zooming.
 * The crop happens in the browser, so the backend receives an ordinary image.
 */
export default function CropImageDialog({
  file,
  source,
  aspect,
  description,
  onDone,
  onCancel,
}: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<CropArea | null>(null);
  const [cropping, setCropping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!area) return;
    setCropping(true);
    setError(null);
    try {
      onDone(await cropImage(file, area));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The image could not be cropped.');
      setCropping(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crop image</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="relative h-72 overflow-hidden rounded-md bg-muted sm:h-80">
          <Cropper
            image={source}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, pixels) => setArea(pixels)}
            disableAutomaticStylesInjection
            cropperProps={{
              role: 'group',
              'aria-label': 'Crop area. Drag the photo, or use the arrow keys, to move it.',
            }}
          />
        </div>

        <div className="flex items-center gap-3">
          <Label htmlFor="crop-zoom" className="shrink-0">
            Zoom
          </Label>
          <input
            id="crop-zoom"
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="w-full accent-primary"
          />
        </div>

        {area && area.width < sharpWidth && (
          <p className="text-sm text-muted-foreground">
            This crop is {Math.round(area.width)} pixels across, so it may look soft on large
            screens. Zoom out, or use a larger photo.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant="outline" disabled={cropping} onClick={() => onDone(file)}>
            Use whole image
          </Button>
          <Button type="button" disabled={!area || cropping} onClick={save}>
            {cropping ? 'Cropping…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
