'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { ImagePlus, Star, X } from 'lucide-react';
import { Alert, Field } from '@/components/ui';
import { createPanelRoomType, uploadPanelImage, type PanelActionState } from '@/app/admin/h/actions';
import { cn } from '@/lib/utils';

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_PHOTOS = 20;

interface Picked {
  key: string;
  file: File;
  preview: string;
}

/**
 * New room type for one hotel, with its photos.
 *
 * The room is created first; the photos then go up one per request through
 * the same action the Photos page uses, so a batch of large images never hits
 * the server-action size limit. If a photo fails, the room still exists and
 * the photo page it lands on says which ones to retry.
 */
export function RoomTypeForm({
  hotelId,
  hotelName,
  cancelHref,
}: {
  hotelId: string;
  hotelName: string;
  cancelHref: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<PanelActionState>({});
  const [pending, start] = useTransition();
  const [progress, setProgress] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Picked[]>([]);
  const [photoErrors, setPhotoErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const err = (name: string) => state.fieldErrors?.[name];

  // Release preview URLs when photos are removed or the form unmounts.
  const previews = useRef(new Set<string>());
  useEffect(() => {
    const urls = previews.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  function addPhotos(files: File[]) {
    const problems: string[] = [];
    const next: Picked[] = [];
    for (const file of files) {
      if (!ACCEPT.includes(file.type)) problems.push(`${file.name}: use JPEG, PNG, WebP or AVIF.`);
      else if (file.size > MAX_BYTES) problems.push(`${file.name}: larger than 10 MB.`);
      else if (photos.length + next.length >= MAX_PHOTOS) problems.push(`${file.name}: at most ${MAX_PHOTOS} photos at once.`);
      else {
        const preview = URL.createObjectURL(file);
        previews.current.add(preview);
        next.push({ key: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`, file, preview });
      }
    }
    setPhotoErrors(problems);
    setPhotos((current) => [...current, ...next]);
    if (picker.current) picker.current.value = '';
  }

  function removePhoto(key: string) {
    setPhotos((current) => {
      const gone = current.find((p) => p.key === key);
      if (gone) {
        URL.revokeObjectURL(gone.preview);
        previews.current.delete(gone.preview);
      }
      return current.filter((p) => p.key !== key);
    });
  }

  function makeCover(key: string) {
    setPhotos((current) => {
      const chosen = current.find((p) => p.key === key);
      return chosen ? [chosen, ...current.filter((p) => p.key !== key)] : current;
    });
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    start(async () => {
      setProgress('Creating room…');
      const result = await createPanelRoomType({}, data);
      setState(result);
      if (!result.roomTypeId || !result.next) {
        setProgress(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // In picked order, so the first photo becomes the cover.
      let failed = 0;
      for (const [i, photo] of photos.entries()) {
        setProgress(`Uploading photo ${i + 1} of ${photos.length}…`);
        const upload = new FormData();
        upload.set('kind', 'room');
        upload.set('owner_id', result.roomTypeId);
        upload.set('file', photo.file);
        upload.set('alt_text', `${String(data.get('name') ?? '').trim()} at ${hotelName}`);
        const uploaded = await uploadPanelImage(upload);
        if (uploaded.error) failed++;
      }

      setProgress('Done');
      router.push(failed ? `${result.next}&failed=${failed}` : result.next);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <input type="hidden" name="hotel_id" value={hotelId} />
      {state.error ? <Alert>{state.error}</Alert> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-bold text-slate-900">Room</h2>
        <p className="text-sm text-slate-500">What guests see on the room card.</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Room name" htmlFor="name" error={err('name')}>
            <input id="name" name="name" className="input" placeholder="Deluxe Sea View" required maxLength={80} />
          </Field>
          <Field label="Bed type" htmlFor="bed_type" error={err('bed_type')}>
            <input id="bed_type" name="bed_type" className="input" placeholder="1 King bed" maxLength={60} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description" htmlFor="description" error={err('description')}>
              <textarea
                id="description"
                name="description"
                className="input min-h-24"
                maxLength={2000}
                placeholder="A bright room on the upper floors with a balcony facing the sea."
              />
            </Field>
          </div>
          <Field label="Room size (sq ft)" htmlFor="room_size_sqft" error={err('room_size_sqft')}>
            <input id="room_size_sqft" name="room_size_sqft" type="number" min={50} className="input" placeholder="320" />
          </Field>
          <Field
            label="Amenities"
            htmlFor="amenities"
            error={err('amenities')}
            hint="Separate with commas. Icons are matched automatically."
          >
            <input id="amenities" name="amenities" className="input" placeholder="Air conditioning, Wi-Fi, Balcony, Mini bar" />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-bold text-slate-900">Photos</h2>
        <p className="text-sm text-slate-500">
          Optional — you can add more later. The first photo is the cover on the room card.
        </p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addPhotos(Array.from(e.dataTransfer.files));
          }}
          className={cn(
            'mt-4 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-6 text-center transition',
            dragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300',
          )}
        >
          <ImagePlus className="h-7 w-7 text-slate-400" aria-hidden="true" />
          <p className="text-sm text-slate-600">
            Drag photos here, or{' '}
            <button
              type="button"
              className="font-semibold text-blue-600 hover:underline"
              onClick={() => picker.current?.click()}
              disabled={pending}
            >
              choose files
            </button>
          </p>
          <p className="text-xs text-slate-400">JPEG, PNG, WebP or AVIF · up to 10 MB each</p>
          {/* No name: the photos are uploaded separately, not with the form. */}
          <input
            ref={picker}
            type="file"
            accept={ACCEPT.join(',')}
            multiple
            className="sr-only"
            aria-label="Choose room photos"
            onChange={(e) => addPhotos(Array.from(e.target.files ?? []))}
          />
        </div>

        {photoErrors.length ? (
          <div className="mt-3">
            <Alert>
              <ul className="space-y-1">
                {photoErrors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </Alert>
          </div>
        ) : null}

        {photos.length ? (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((photo, i) => (
              <li key={photo.key} className="overflow-hidden rounded-xl border border-slate-200">
                <div className="relative aspect-[4/3] bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.preview} alt="" className="h-full w-full object-cover" />
                  {i === 0 ? (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-green-700 px-2 py-0.5 text-xs font-semibold text-white">
                      <Star className="h-3 w-3" fill="currentColor" aria-hidden="true" /> Cover
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.key)}
                    disabled={pending}
                    aria-label={`Remove ${photo.file.name}`}
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                  <span className="truncate text-xs text-slate-500">{photo.file.name}</span>
                  {i > 0 ? (
                    <button
                      type="button"
                      onClick={() => makeCover(photo.key)}
                      disabled={pending}
                      className="shrink-0 text-xs font-semibold text-slate-600 hover:text-slate-900"
                    >
                      Make cover
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-bold text-slate-900">Guests</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Adults" htmlFor="max_adults" error={err('max_adults')}>
            <input id="max_adults" name="max_adults" type="number" min={1} max={20} defaultValue={2} className="input" required />
          </Field>
          <Field label="Children" htmlFor="max_children" error={err('max_children')}>
            <input id="max_children" name="max_children" type="number" min={0} max={20} defaultValue={1} className="input" />
          </Field>
          <Field label="Max guests in total" htmlFor="max_occupancy" error={err('max_occupancy')}>
            <input id="max_occupancy" name="max_occupancy" type="number" min={1} max={30} defaultValue={3} className="input" required />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-bold text-slate-900">Price &amp; rooms</h2>
        <p className="text-sm text-slate-500">
          Opens the room for booking for the next 12 months. Change prices for particular nights in Pricing &amp; Availability.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Price per night (₹)" htmlFor="base_price" error={err('base_price')}>
            <input id="base_price" name="base_price" type="number" min={1} step="1" className="input" placeholder="4500" required />
          </Field>
          <Field label="Discount (%)" htmlFor="discount_percent" error={err('discount_percent')}>
            <input id="discount_percent" name="discount_percent" type="number" min={0} max={90} defaultValue={0} className="input" />
          </Field>
          <Field
            label="Number of rooms"
            htmlFor="physical_rooms"
            error={err('physical_rooms')}
            hint="How many of this room the hotel has."
          >
            <input id="physical_rooms" name="physical_rooms" type="number" min={1} max={500} defaultValue={1} className="input" required />
          </Field>
        </div>

        <div className="mt-4 flex flex-col gap-3 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="is_refundable" defaultChecked className="h-4 w-4 rounded border-slate-300" />
            Free cancellation (refundable)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="is_active" defaultChecked className="h-4 w-4 rounded border-slate-300" />
            Show on the website now
          </label>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending
            ? progress ?? 'Creating…'
            : photos.length
              ? `Create room type with ${photos.length} photo${photos.length > 1 ? 's' : ''}`
              : 'Create room type'}
        </button>
        <Link href={cancelHref} className="btn-ghost">Cancel</Link>
        {pending && progress ? (
          <p className="text-sm text-slate-500" role="status">{progress}</p>
        ) : null}
      </div>
    </form>
  );
}
