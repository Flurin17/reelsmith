import sharp from 'sharp';

/**
 * Remove a uniform white studio background from a catalog product photo and
 * write a transparent PNG cutout.
 *
 * Strategy: flood-fill from the image borders, clearing only near-white,
 * low-saturation pixels that are *connected to the edge*. This removes the
 * background without punching holes in light areas inside the product (silver
 * tubes, white badges, light text), which a global white threshold would.
 * The alpha edge is lightly feathered for a clean composite over footage.
 */
export async function removeWhiteBackground(srcPath: string, outPath: string): Promise<void> {
  const { data, info } = await sharp(srcPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const channels = info.channels; // 4 (RGBA)
  const n = width * height;

  // Near-white + low-saturation test (tolerant of soft shadows / JPEG noise).
  const isBackground = (px: number): boolean => {
    const i = px * channels;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const min = Math.min(r, g, b);
    const max = Math.max(r, g, b);
    return min >= 232 && max - min <= 22;
  };

  // BFS flood fill from every border pixel.
  const bg = new Uint8Array(n);
  const stack = new Int32Array(n);
  let sp = 0;
  const push = (p: number) => {
    if (p >= 0 && p < n && !bg[p] && isBackground(p)) {
      bg[p] = 1;
      stack[sp++] = p;
    }
  };
  for (let x = 0; x < width; x++) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    push(y * width);
    push(y * width + width - 1);
  }
  while (sp > 0) {
    const p = stack[--sp];
    const x = p % width;
    if (x > 0) push(p - 1);
    if (x < width - 1) push(p + 1);
    if (p - width >= 0) push(p - width);
    if (p + width < n) push(p + width);
  }

  // Apply transparency; feather pixels on the boundary for a soft edge.
  for (let p = 0; p < n; p++) {
    const a = p * channels + 3;
    if (bg[p]) {
      data[a] = 0;
      continue;
    }
    const x = p % width;
    const y = (p / width) | 0;
    const nearBg =
      (x > 0 && bg[p - 1]) ||
      (x < width - 1 && bg[p + 1]) ||
      (y > 0 && bg[p - width]) ||
      (y < height - 1 && bg[p + width]);
    if (nearBg) data[a] = 150; // soft edge so cutouts don't look jagged
  }

  await sharp(data, { raw: { width, height, channels } }).png({ compressionLevel: 9 }).toFile(outPath);
}
