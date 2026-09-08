"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui";

const LOGO_SRC = "/brand/aeris-mark-512.png";
const QR_SIZE = 360;

async function paintBrandedQr(
  canvas: HTMLCanvasElement,
  url: string,
): Promise<void> {
  await QRCode.toCanvas(canvas, url, {
    width: QR_SIZE,
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: "#2d2b2a", light: "#ffffff" },
  });

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const logo = new Image();
  logo.crossOrigin = "anonymous";
  logo.src = LOGO_SRC;
  await logo.decode();

  const logoSize = QR_SIZE * 0.22;
  const pad = 8;
  const x = (QR_SIZE - logoSize) / 2;
  const y = (QR_SIZE - logoSize) / 2;

  ctx.fillStyle = "#ffffff";
  const box = logoSize + pad * 2;
  const bx = x - pad;
  const by = y - pad;
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(bx, by, box, box, 10);
  } else {
    ctx.rect(bx, by, box, box);
  }
  ctx.fill();
  ctx.drawImage(logo, x, y, logoSize, logoSize);
}

export function FormShareQr({
  url,
  fileName,
}: {
  url: string;
  fileName: string;
}) {
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState<string>("");

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setPreview("");
    const canvas = document.createElement("canvas");
    canvas.width = QR_SIZE;
    canvas.height = QR_SIZE;
    void paintBrandedQr(canvas, url)
      .then(() => {
        if (!cancelled) setPreview(canvas.toDataURL("image/png"));
      })
      .catch((e) => {
        console.error("[form-qr] render failed", e);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  function downloadPng() {
    if (!preview) return;
    const a = document.createElement("a");
    a.href = preview;
    a.download = fileName.endsWith(".png") ? fileName : `${fileName}.png`;
    a.click();
  }

  return (
    <div className="min-w-0 space-y-2">
      <div className="flex items-center gap-1">
        <input
          readOnly
          value={url}
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface-muted px-2 py-1.5 font-mono text-[11px] text-foreground"
        />
        <Button
          type="button"
          variant="secondary"
          className="h-8 shrink-0 px-2 text-xs"
          onClick={() => void copyLink()}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </Button>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-white p-2">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Form QR code"
            className="mx-auto block aspect-square h-auto w-full min-h-0 min-w-0 max-w-[180px] object-contain"
            draggable={false}
          />
        ) : (
          <div className="mx-auto aspect-square w-full max-w-[180px] bg-surface-muted" />
        )}
      </div>
      <Button
        type="button"
        variant="secondary"
        className="h-8 w-full text-xs"
        disabled={!preview}
        onClick={downloadPng}
      >
        <Download size={13} /> Download QR
      </Button>
    </div>
  );
}
