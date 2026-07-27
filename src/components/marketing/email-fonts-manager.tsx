"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Upload } from "lucide-react";
import {
  createEmailFontUploadSlotAction,
  deleteEmailFontAction,
  saveEmailFontAction,
} from "@/app/(portal)/marketing/design/email/actions";
import type { EmailCustomFont, EmailFontFile } from "@/lib/email-fonts";
import { detectFontFormat, sanitizeCssFamily } from "@/lib/email-fonts";
import {
  BUILTIN_FONTS,
  EMAIL_FONT_LABELS,
  type BuiltinEmailFont,
} from "@/lib/email-style";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

const fieldClass =
  "mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-merlot focus:ring-2 focus:ring-merlot/20";

export function EmailFontsManager({
  initial,
  canEdit,
}: {
  initial: EmailCustomFont[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [fallback, setFallback] = useState<BuiltinEmailFont>("sans");
  const [files, setFiles] = useState<EmailFontFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  async function handleUpload(fileList: FileList | null) {
    if (!fileList?.length) return;
    setUploading(true);
    setMessage(null);
    try {
      const nextFiles = [...files];
      for (const file of Array.from(fileList)) {
        const format = detectFontFormat(file.name, file.type);
        if (!format) {
          setMessage({
            ok: false,
            text: `${file.name}: use WOFF2, WOFF, TTF, or OTF.`,
          });
          continue;
        }
        const slot = await createEmailFontUploadSlotAction({
          filename: file.name,
          contentType: file.type,
          size: file.size,
        });
        if (!slot.ok) {
          setMessage({ ok: false, text: slot.error ?? "Upload failed." });
          continue;
        }

        let url = slot.publicUrl ?? "";
        if (slot.demo) {
          url = URL.createObjectURL(file);
        } else {
          if (!slot.path || !slot.token) {
            setMessage({ ok: false, text: "Upload slot incomplete." });
            continue;
          }
          const supabase = createSupabaseBrowserClient();
          const { error } = await supabase.storage
            .from("email-fonts")
            .uploadToSignedUrl(slot.path, slot.token, file, {
              contentType: file.type || "application/octet-stream",
              cacheControl: "31536000",
            });
          if (error) {
            setMessage({ ok: false, text: error.message });
            continue;
          }
          if (!url) {
            url = supabase.storage.from("email-fonts").getPublicUrl(slot.path)
              .data.publicUrl;
          }
        }

        nextFiles.push({ format, url, filename: file.name });
      }
      setFiles(nextFiles);
      if (nextFiles.length) {
        setMessage({
          ok: true,
          text: "Font file(s) uploaded. Save the package to use it in the editor.",
        });
      }
    } finally {
      setUploading(false);
    }
  }

  function handleSave() {
    startTransition(async () => {
      setMessage(null);
      const res = await saveEmailFontAction({
        name,
        cssFamily: sanitizeCssFamily(name),
        fallback,
        files,
      });
      if (res.ok) {
        setName("");
        setFiles([]);
        setMessage({ ok: true, text: "Brand font saved." });
        router.refresh();
      } else {
        setMessage({ ok: false, text: res.error ?? "Save failed." });
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[14px] border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-foreground">
          How custom fonts work in email
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Uploaded fonts are hosted publicly and injected with{" "}
          <code className="rounded bg-surface-muted px-1">@font-face</code>.
          Apple Mail and many iOS clients will show them; Gmail, Outlook, and
          Yahoo usually fall back to the system stack you pick below. Always
          design with a sensible fallback.
        </p>
      </div>

      {canEdit ? (
        <div className="rounded-[14px] border border-border bg-surface p-5 space-y-3">
          <h2 className="text-sm font-semibold">Upload font package</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Display name</label>
              <input
                className={fieldClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aeris Display"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Fallback stack</label>
              <select
                className={fieldClass}
                value={fallback}
                onChange={(e) =>
                  setFallback(e.target.value as BuiltinEmailFont)
                }
              >
                {BUILTIN_FONTS.map((f) => (
                  <option key={f} value={f}>
                    {EMAIL_FONT_LABELS[f]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-surface-muted">
            <Upload size={14} />
            {uploading ? "Uploading…" : "Add WOFF2 / WOFF / TTF / OTF"}
            <input
              type="file"
              accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                void handleUpload(e.target.files);
                e.target.value = "";
              }}
            />
          </label>

          {files.length > 0 ? (
            <ul className="space-y-1 text-xs text-muted">
              {files.map((f) => (
                <li key={`${f.url}-${f.format}`}>
                  {f.filename ?? f.url} · {f.format}
                </li>
              ))}
            </ul>
          ) : null}

          {message ? (
            <p
              className={cn(
                "rounded-lg px-3 py-2 text-sm",
                message.ok
                  ? "bg-success/10 text-success"
                  : "bg-danger/10 text-danger",
              )}
            >
              {message.text}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button
              type="button"
              disabled={pending || !name.trim() || files.length === 0}
              onClick={handleSave}
            >
              {pending ? "Saving…" : "Save font package"}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[16px] border border-border bg-surface">
        {initial.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">
            No brand fonts uploaded yet.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-muted/50 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">CSS family</th>
                <th className="px-4 py-3 font-medium">Fallback</th>
                <th className="px-4 py-3 font-medium">Files</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {initial.map((font) => (
                <tr
                  key={font.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-3 font-medium">{font.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">
                    {font.cssFamily}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {EMAIL_FONT_LABELS[font.fallback]}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {font.files.map((f) => f.format).join(", ")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canEdit ? (
                      <button
                        type="button"
                        className="rounded p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                        aria-label="Delete font"
                        onClick={() => {
                          if (!confirm(`Delete font “${font.name}”?`)) return;
                          startTransition(async () => {
                            await deleteEmailFontAction(font.id);
                            router.refresh();
                          });
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
