'use client';

import { useRef, useState, useTransition } from 'react';
import { ArrowLeft, ArrowRight, ImagePlus, Star, Trash2 } from 'lucide-react';
import { Alert, EmptyState } from '@/components/ui';
import {
  deletePanelImage,
  movePanelImage,
  setPanelCoverImage,
  uploadPanelImage,
  type PanelActionState,
} from '@/app/admin/h/actions';
import { cn } from '@/lib/utils';

export interface ImageRow {
  id: string;
  url: string;
  alt_text: string | null;
  is_cover: boolean;
}

const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif';
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Upload, order, cover and delete photos for a hotel or one room type.
 *
 * Files go up one per request so a batch of large photos never trips the
 * server-action size limit, and progress can be shown per file.
 */
export function ImageManager({
  kind,
  ownerId,
  images,
  canWrite,
  altPrefix,
}: {
  kind: 'hotel' | 'room';
  ownerId: string;
  images: ImageRow[];
  canWrite: boolean;
  altPrefix: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [progress, setProgress] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);

  function upload(files: File[]) {
    if (!files.length) return;
    setErrors([]);
    start(async () => {
      const problems: string[] = [];
      for (const [i, file] of files.entries()) {
        if (!ACCEPT.split(',').includes(file.type)) {
          problems.push(`${file.name}: use JPEG, PNG, WebP or AVIF.`);
          continue;
        }
        if (file.size > MAX_BYTES) {
          problems.push(`${file.name}: larger than 10 MB.`);
          continue;
        }
        setProgress(`Uploading ${i + 1} of ${files.length}…`);
        const data = new FormData();
        data.set('kind', kind);
        data.set('owner_id', ownerId);
        data.set('file', file);
        data.set('alt_text', altPrefix);
        const result = await uploadPanelImage(data);
        if (result.error) problems.push(`${file.name}: ${result.error}`);
      }
      setProgress(null);
      setErrors(problems);
      if (input.current) input.current.value = '';
    });
  }

  function run(fn: () => Promise<PanelActionState>) {
    setErrors([]);
    start(async () => {
      const result = await fn();
      if (result.error) setErrors([result.error]);
    });
  }

  return (
    <div className="space-y-4">
      {canWrite ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            upload(Array.from(e.dataTransfer.files));
          }}
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition',
            dragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white',
          )}
        >
          <ImagePlus className="h-7 w-7 text-slate-400" aria-hidden="true" />
          <p className="text-sm text-slate-600">
            Drag photos here, or{' '}
            <button
              type="button"
              className="font-semibold text-blue-600 hover:underline"
              onClick={() => input.current?.click()}
              disabled={pending}
            >
              choose files
            </button>
          </p>
          <p className="text-xs text-slate-400">JPEG, PNG, WebP or AVIF · up to 10 MB each</p>
          <input
            ref={input}
            type="file"
            accept={ACCEPT}
            multiple
            className="sr-only"
            onChange={(e) => upload(Array.from(e.target.files ?? []))}
          />
          {progress ? <p className="text-sm font-medium text-slate-700" role="status">{progress}</p> : null}
        </div>
      ) : null}

      {errors.length ? (
        <Alert>
          <ul className="space-y-1">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      {images.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {images.map((image, i) => (
            <li key={image.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="relative aspect-[4/3] bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt={image.alt_text ?? ''} className="h-full w-full object-cover" loading="lazy" />
                {image.is_cover ? (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-green-700 px-2 py-0.5 text-xs font-semibold text-white">
                    <Star className="h-3 w-3" fill="currentColor" aria-hidden="true" /> Cover
                  </span>
                ) : null}
                <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
                  {i + 1}
                </span>
              </div>

              {canWrite ? (
                <div className="flex items-center gap-1 p-2">
                  <IconButton
                    label="Move earlier"
                    disabled={pending || i === 0}
                    onClick={() => run(() => movePanelImage(kind, image.id, -1))}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </IconButton>
                  <IconButton
                    label="Move later"
                    disabled={pending || i === images.length - 1}
                    onClick={() => run(() => movePanelImage(kind, image.id, 1))}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </IconButton>
                  {!image.is_cover ? (
                    <button
                      type="button"
                      className="ml-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                      disabled={pending}
                      onClick={() => run(() => setPanelCoverImage(kind, image.id))}
                    >
                      Make cover
                    </button>
                  ) : null}
                  <IconButton
                    label="Delete photo"
                    className="ml-auto text-rose-600 hover:bg-rose-50"
                    disabled={pending}
                    onClick={() => {
                      if (window.confirm('Delete this photo? It will be removed from the website.')) {
                        run(() => deletePanelImage(kind, image.id));
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No photos yet" description="The first photo you upload becomes the cover." />
      )}
    </div>
  );
}

function IconButton({
  label,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn('rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30', className)}
      {...props}
    >
      {children}
    </button>
  );
}
