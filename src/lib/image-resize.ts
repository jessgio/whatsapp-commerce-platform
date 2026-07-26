export type ResizeImageOptions = {
  /** Max width in CSS pixels (height scales to keep aspect ratio). */
  maxWidth: number;
  /** JPEG/WebP quality 0–1. Ignored for PNG. */
  quality?: number;
  /** Prefer jpeg for photos to keep email payloads smaller. */
  output?: "image/jpeg" | "image/png" | "image/webp";
};

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image."));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Could not encode image."));
        else resolve(blob);
      },
      type,
      quality,
    );
  });
}

/** Resize an image client-side, preserving aspect ratio. */
export async function resizeImageFile(
  file: File,
  options: ResizeImageOptions,
): Promise<{ file: File; width: number; height: number }> {
  const img = await loadImage(file);
  const maxWidth = Math.max(120, Math.min(4000, options.maxWidth));
  const scale = img.width > maxWidth ? maxWidth / img.width : 1;
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available.");
  ctx.drawImage(img, 0, 0, width, height);

  const output =
    options.output ??
    (file.type === "image/png" || file.type === "image/webp"
      ? file.type
      : "image/jpeg");
  const quality = options.quality ?? 0.85;
  const blob = await canvasToBlob(canvas, output, quality);

  const base = file.name.replace(/\.[^.]+$/, "") || "banner";
  const ext =
    output === "image/png" ? "png" : output === "image/webp" ? "webp" : "jpg";
  const resized = new File([blob], `${base}-${width}w.${ext}`, {
    type: output,
    lastModified: Date.now(),
  });

  return { file: resized, width, height };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
