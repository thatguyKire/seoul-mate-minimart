import type { Page } from '@playwright/test';

/** A JPEG made in the browser, with an EXIF block carrying a made-up location, as phone photos do. */
export async function photoWithLocation(page: Page): Promise<Buffer> {
  const base64 = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 900;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No canvas');
    context.fillStyle = '#e8508a';
    context.fillRect(0, 0, 1200, 900);
    context.fillStyle = '#1e2b5e';
    context.fillRect(150, 150, 600, 400);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.9);
    });
    if (!blob) throw new Error('No JPEG');
    let text = '';
    for (const byte of new Uint8Array(await blob.arrayBuffer())) text += String.fromCharCode(byte);
    return btoa(text);
  });
  const jpeg = Buffer.from(base64, 'base64');
  const description = Buffer.from('GPS 12.3700N 123.6200E SECRET-LOCATION\0', 'ascii');
  // A minimal big-endian TIFF block with one ImageDescription tag.
  const tiff = Buffer.alloc(26);
  tiff.write('MM', 0, 'ascii');
  tiff.writeUInt16BE(42, 2);
  tiff.writeUInt32BE(8, 4);
  tiff.writeUInt16BE(1, 8);
  tiff.writeUInt16BE(0x010e, 10);
  tiff.writeUInt16BE(2, 12);
  tiff.writeUInt32BE(description.length, 14);
  tiff.writeUInt32BE(26, 18);
  tiff.writeUInt32BE(0, 22);
  const exif = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff, description]);
  const marker = Buffer.alloc(4);
  marker.writeUInt16BE(0xffe1, 0);
  marker.writeUInt16BE(exif.length + 2, 2);
  return Buffer.concat([jpeg.subarray(0, 2), marker, exif, jpeg.subarray(2)]);
}
