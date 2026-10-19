// Photo checks and processing in the staff member's browser (FR-43, FR-44, D-019).
// The original file never leaves the device: it is redrawn on a canvas at three widths,
// which drops all metadata, including EXIF and location, and only those copies are uploaded.
import { photoWidths, type PhotoFormat } from '../../catalog/photos';

export const maxOriginalBytes = 5 * 1024 * 1024;
/** The storage bucket refuses larger files (BACKEND-SCHEMA 6). */
export const maxStoredBytes = 1024 * 1024;

export type PhotoProblem = 'wrongType' | 'tooLarge' | 'unreadable' | 'processedTooLarge';

export class PhotoError extends Error {
  constructor(readonly problem: PhotoProblem) {
    super(problem);
    this.name = 'PhotoError';
  }
}

/** The image type from the file's first bytes, whatever its name or stated type claims. */
export function sniffImageType(bytes: Uint8Array): 'jpeg' | 'png' | 'webp' | null {
  const at = (i: number) => bytes[i] ?? -1;
  if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return 'jpeg';
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (png.every((byte, i) => at(i) === byte)) return 'png';
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...Array.from(bytes.subarray(start, end)));
  if (bytes.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'webp';
  return null;
}

/** Size and type checks before any processing. */
export async function checkPhoto(file: Blob): Promise<PhotoProblem | null> {
  if (file.size > maxOriginalBytes) return 'tooLarge';
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  return sniffImageType(head) ? null : 'wrongType';
}

export interface ProcessedPhoto {
  format: PhotoFormat;
  files: { width: number; blob: Blob }[];
  /** The decoded image, for a preview before saving. */
  preview: ImageBitmap;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

let webpSupport: Promise<boolean> | undefined;

/** Some browsers, notably Safari, cannot encode WebP and return PNG instead. */
function canEncodeWebp(): Promise<boolean> {
  webpSupport ??= (async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const blob = await toBlob(canvas, 'image/webp', 0.8);
    return blob?.type === 'image/webp';
  })();
  return webpSupport;
}

export async function processPhoto(file: Blob): Promise<ProcessedPhoto> {
  const problem = await checkPhoto(file);
  if (problem) throw new PhotoError(problem);

  let bitmap: ImageBitmap;
  try {
    // Applies the EXIF rotation, so photos taken on a phone stand the right way up.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new PhotoError('unreadable');
  }

  const format: PhotoFormat = (await canEncodeWebp()) ? 'webp' : 'jpg';
  const type = format === 'webp' ? 'image/webp' : 'image/jpeg';
  const files: ProcessedPhoto['files'] = [];

  for (const width of photoWidths) {
    // Never enlarge: a small original keeps its own width at every size.
    const w = Math.min(width, bitmap.width);
    const h = Math.max(1, Math.round((bitmap.height * w) / bitmap.width));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const context = canvas.getContext('2d');
    if (!context) throw new PhotoError('unreadable');
    if (format === 'jpg') {
      // JPEG has no transparency; transparent areas would turn black.
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, w, h);
    }
    context.drawImage(bitmap, 0, 0, w, h);

    let blob: Blob | null = null;
    for (const quality of [0.82, 0.7, 0.55]) {
      blob = await toBlob(canvas, type, quality);
      if (blob && blob.size <= maxStoredBytes) break;
    }
    if (!blob || blob.size > maxStoredBytes) throw new PhotoError('processedTooLarge');
    files.push({ width, blob });
  }

  return { format, files, preview: bitmap };
}
