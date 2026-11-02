import "server-only";
import sharp from "sharp";

const HASH_WIDTH = 9;
const HASH_HEIGHT = 8;

/** 64-bit difference hash, stored as hex: survives resizing and recompression. */
export async function computeImageHash(image: Buffer): Promise<string> {
  const pixels = await sharp(image)
    .greyscale()
    .resize(HASH_WIDTH, HASH_HEIGHT, { fit: "fill" })
    .raw()
    .toBuffer();

  let hash = 0n;
  for (let y = 0; y < HASH_HEIGHT; y += 1) {
    for (let x = 0; x < HASH_WIDTH - 1; x += 1) {
      const left = pixels[y * HASH_WIDTH + x]!;
      const right = pixels[y * HASH_WIDTH + x + 1]!;
      hash = (hash << 1n) | (left > right ? 1n : 0n);
    }
  }

  return hash.toString(16).padStart(16, "0");
}

export async function hasEmbeddedMetadata(image: Buffer): Promise<boolean> {
  const metadata = await sharp(image).metadata();
  return Boolean(metadata.exif || metadata.xmp || metadata.iptc);
}

/**
 * The browser strips metadata by redrawing to a canvas, but a request can skip
 * the browser. Re-encoding here keeps GPS out of storage regardless. sharp drops
 * all metadata unless told to keep it.
 */
export async function stripMetadata(image: Buffer): Promise<Buffer> {
  return sharp(image).rotate().webp({ quality: 80 }).toBuffer();
}
