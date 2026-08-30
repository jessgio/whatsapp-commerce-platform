"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Select } from "@/components/ui";
import { formatBytes, resizeImageFile } from "@/lib/image-resize";

const PRESETS = [
  { label: "Email (600)", width: 600 },
  { label: "Large (900)", width: 900 },
  { label: "HD (1200)", width: 1200 },
  { label: "Original", width: 0 },
] as const;

type Props = {
  file: File;
  onCancel: () => void;
  onConfirm: (file: File) => void;
};

export function ImageResizeModal({ file, onCancel, onConfirm }: Props) {
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [maxWidth, setMaxWidth] = useState(900);
  const [useOriginal, setUseOriginal] = useState(false);
  const [quality, setQuality] = useState(0.85);
  const [format, setFormat] = useState<"image/jpeg" | "image/png" | "image/webp">(
    "image/jpeg",
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBytes, setPreviewBytes] = useState<number | null>(null);
  const [outSize, setOutSize] = useState<{ w: number; h: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [encoding, setEncoding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Re-encoding is a full canvas draw plus a blob encode, far too heavy to run
   * on every slider tick. Sliders update `maxWidth`/`quality` for the labels,
   * while encoding follows these settled values.
   */
  const [settled, setSettled] = useState({ maxWidth: 900, quality: 0.85 });
  const settleNow = () => setSettled({ maxWidth, quality });

  const objectUrl = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => {
    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
      // Default: cap to 900 unless already smaller
      if (img.naturalWidth <= 900) {
        setMaxWidth(img.naturalWidth);
      }
    };
    img.src = objectUrl;
  }, [objectUrl]);

  // Fallback for keyboard input and any pointer release we miss.
  useEffect(() => {
    const id = window.setTimeout(() => setSettled({ maxWidth, quality }), 260);
    return () => window.clearTimeout(id);
  }, [maxWidth, quality]);

  useEffect(() => {
    if (!natural) return;
    let cancelled = false;

    async function run() {
      setError(null);
      try {
        if (useOriginal) {
          if (cancelled) return;
          setPreviewUrl(objectUrl);
          setPreviewBytes(file.size);
          setOutSize(natural);
          return;
        }
        setEncoding(true);
        const { file: resized, width, height } = await resizeImageFile(file, {
          maxWidth: settled.maxWidth,
          quality: settled.quality,
          output: format,
        });
        if (cancelled) return;
        const url = URL.createObjectURL(resized);
        setPreviewUrl((prev) => {
          if (prev && prev !== objectUrl) URL.revokeObjectURL(prev);
          return url;
        });
        setPreviewBytes(resized.size);
        setOutSize({ w: width, h: height });
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Resize failed.");
        }
      } finally {
        if (!cancelled) setEncoding(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    file,
    natural,
    settled.maxWidth,
    settled.quality,
    format,
    useOriginal,
    objectUrl,
  ]);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      if (useOriginal) {
        onConfirm(file);
        return;
      }
      const { file: resized } = await resizeImageFile(file, {
        maxWidth,
        quality,
        output: format,
      });
      onConfirm(resized);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Resize failed.");
      setBusy(false);
    }
  }

  const targetW = useOriginal
    ? natural?.w
    : natural
      ? Math.min(maxWidth, natural.w)
      : maxWidth;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Resize image"
      onClick={onCancel}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[16px] border border-border bg-surface p-5 shadow-[0_16px_48px_rgba(45,43,42,0.2)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-foreground">Resize image</h2>
        <p className="mt-1 text-xs text-muted">
          Shrink large photos for email. Source: {formatBytes(file.size)}
          {natural ? ` · ${natural.w}×${natural.h}` : ""}
        </p>

        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-cream">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl ?? objectUrl}
            alt="Resize preview"
            className="max-h-56 w-full object-contain"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:border-merlot/40 hover:bg-merlot/5"
              onClick={() => {
                if (p.width === 0) {
                  setUseOriginal(true);
                } else {
                  setUseOriginal(false);
                  setMaxWidth(p.width);
                  setSettled((s) => ({ ...s, maxWidth: p.width }));
                }
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {!useOriginal && (
          <div className="mt-4 space-y-3">
            <label className="block text-xs font-medium text-foreground">
              Max width: {targetW ?? maxWidth}px
              <input
                type="range"
                min={320}
                max={Math.max(320, natural?.w ?? 2000)}
                step={10}
                value={maxWidth}
                onChange={(e) => {
                  setUseOriginal(false);
                  setMaxWidth(Number(e.target.value));
                }}
                onPointerUp={settleNow}
                onKeyUp={settleNow}
                className="mt-2 w-full accent-merlot"
              />
            </label>

            <label className="block text-xs font-medium text-foreground">
              Quality: {Math.round(quality * 100)}%
              <input
                type="range"
                min={0.5}
                max={0.95}
                step={0.05}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                onPointerUp={settleNow}
                onKeyUp={settleNow}
                className="mt-2 w-full accent-merlot"
                disabled={format === "image/png"}
              />
            </label>

            <label className="block text-xs font-medium text-foreground">
              Format
              <Select
                className="mt-1.5 w-full"
                value={format}
                onChange={(v) =>
                  setFormat(v as "image/jpeg" | "image/png" | "image/webp")
                }
                options={[
                  { value: "image/jpeg", label: "JPEG (best for photos / email)" },
                  { value: "image/webp", label: "WebP" },
                  { value: "image/png", label: "PNG (graphics, no quality slider)" },
                ]}
              />
            </label>
          </div>
        )}

        <p className="mt-3 text-xs text-muted">
          Output: {outSize ? `${outSize.w}×${outSize.h}` : "…"}
          {previewBytes != null ? ` · ~${formatBytes(previewBytes)}` : ""}
          {useOriginal ? " (original file)" : ""}
          {encoding ? " · updating…" : ""}
        </p>

        {error && (
          <p className="mt-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void confirm()} disabled={busy || !!error}>
            {busy ? "Working…" : "Upload resized image"}
          </Button>
        </div>
      </div>
    </div>
  );
}
