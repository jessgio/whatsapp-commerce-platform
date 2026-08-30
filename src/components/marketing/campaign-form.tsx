"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Select } from "@/components/ui";
import { EmailTemplateEditor } from "@/components/settings/email-template-editor";
import {
  saveCampaignAction,
  scheduleCampaignAction,
  sendCampaignAction,
  type CampaignSaveInput,
} from "@/app/(portal)/marketing/campaigns/actions";
import {
  CAMPAIGN_STATUS_LABELS,
  type Campaign,
  type CampaignChannel,
  type CampaignWaMode,
} from "@/lib/campaigns";
import { DEFAULT_LEAD_WELCOME_BLOCKS } from "@/lib/email-blocks";
import type { EmailCustomFont } from "@/lib/email-fonts";
import type { EmailTemplate } from "@/lib/email-templates";
import { cn } from "@/lib/utils";

const fieldClass =
  "mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-merlot focus:ring-2 focus:ring-merlot/20";

type SegmentOption = { id: string; name: string; memberCount: number };
type DesignOption = { id: string; name: string };

export function CampaignForm({
  initial,
  segments,
  templateDesigns,
  interactiveDesigns,
  emailLibrary,
  customFonts,
  canSend,
  audienceCount,
}: {
  initial: Campaign;
  segments: SegmentOption[];
  templateDesigns: DesignOption[];
  interactiveDesigns: DesignOption[];
  emailLibrary: EmailTemplate[];
  customFonts: EmailCustomFont[];
  canSend: boolean;
  audienceCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(initial.name);
  const [channel, setChannel] = useState<CampaignChannel>(initial.channel);
  const [segmentId, setSegmentId] = useState(initial.segmentId ?? "");
  const [scheduledAt, setScheduledAt] = useState(
    initial.scheduledAt ? initial.scheduledAt.slice(0, 16) : "",
  );
  const [waMode, setWaMode] = useState<CampaignWaMode>(
    initial.waMode ?? "template",
  );
  const [waDesignId, setWaDesignId] = useState(initial.waDesignId ?? "");
  const [emailTemplateId, setEmailTemplateId] = useState(
    initial.emailTemplateId ?? "",
  );
  const [emailDraft, setEmailDraft] = useState<EmailTemplate>(() => ({
    id: `campaign-email-${initial.id}`,
    name: initial.name,
    description: null,
    kind: "campaign",
    subject: initial.emailSubject ?? "Halo {name} — penawaran Aeris Beauté",
    accentColor: initial.emailAccentColor ?? "#6f2c3f",
    blocks: initial.emailBlocks?.length
      ? initial.emailBlocks
      : DEFAULT_LEAD_WELCOME_BLOCKS,
    updatedAt: initial.updatedAt,
  }));
  const [editorKey, setEditorKey] = useState(0);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  const designOptions =
    waMode === "template" ? templateDesigns : interactiveDesigns;

  const libraryOptions = useMemo(
    () =>
      emailLibrary.map((t) => ({
        id: t.id,
        name: t.kind === "system" ? `${t.name} (system)` : t.name,
      })),
    [emailLibrary],
  );

  function buildPayload(
    email?: {
      name?: string;
      subject: string;
      accentColor: string;
      blocks: EmailTemplate["blocks"];
    },
  ): CampaignSaveInput {
    return {
      id: initial.id,
      name,
      channel,
      segmentId: segmentId || null,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      waMode: channel === "whatsapp" ? waMode : null,
      waDesignId: channel === "whatsapp" ? waDesignId || null : null,
      emailTemplateId:
        channel === "email" ? emailTemplateId || null : null,
      emailSubject:
        channel === "email"
          ? (email?.subject ?? emailDraft.subject)
          : null,
      emailAccentColor:
        channel === "email"
          ? (email?.accentColor ?? emailDraft.accentColor)
          : null,
      emailBlocks:
        channel === "email" ? (email?.blocks ?? emailDraft.blocks) : null,
    };
  }

  function loadLibraryTemplate(id: string) {
    setEmailTemplateId(id);
    const tpl = emailLibrary.find((t) => t.id === id);
    if (!tpl) return;
    setEmailDraft({
      id: `campaign-email-${initial.id}`,
      name: tpl.name,
      description: tpl.description,
      kind: "campaign",
      subject: tpl.subject,
      accentColor: tpl.accentColor,
      blocks: [...tpl.blocks],
      updatedAt: tpl.updatedAt,
    });
    setEditorKey((k) => k + 1);
    setMessage({
      ok: true,
      text: `Loaded “${tpl.name}” into this campaign. Save to keep the copy.`,
    });
  }

  function handleSaveBasics() {
    startTransition(async () => {
      setMessage(null);
      const res = await saveCampaignAction(buildPayload());
      setMessage({
        ok: res.ok,
        text: res.ok ? "Campaign saved." : (res.error ?? "Save failed."),
      });
      if (res.ok) router.refresh();
    });
  }

  function handleSchedule() {
    startTransition(async () => {
      setMessage(null);
      const save = await saveCampaignAction(buildPayload());
      if (!save.ok) {
        setMessage({ ok: false, text: save.error ?? "Save failed." });
        return;
      }
      const res = await scheduleCampaignAction(
        initial.id,
        scheduledAt ? new Date(scheduledAt).toISOString() : "",
      );
      setMessage({
        ok: res.ok,
        text: res.ok
          ? "Campaign scheduled."
          : (res.error ?? "Schedule failed."),
      });
      if (res.ok) router.refresh();
    });
  }

  function handleSendNow() {
    startTransition(async () => {
      setMessage(null);
      const save = await saveCampaignAction(buildPayload());
      if (!save.ok) {
        setMessage({ ok: false, text: save.error ?? "Save failed." });
        return;
      }
      const res = await sendCampaignAction(initial.id);
      const detail = [
        typeof res.sent === "number" ? `${res.sent} sent` : null,
        typeof res.failed === "number" && res.failed > 0
          ? `${res.failed} failed`
          : null,
        typeof res.skipped === "number" && res.skipped > 0
          ? `${res.skipped} skipped`
          : null,
      ]
        .filter(Boolean)
        .join(" · ");
      setMessage({
        ok: res.ok,
        text: res.ok
          ? `Campaign send completed${detail ? ` (${detail})` : "."}`
          : (res.error ?? "Send failed."),
      });
      if (res.ok || res.sent) router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[14px] border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Campaign</h2>
            <p className="mt-1 text-xs text-muted">
              Status: {CAMPAIGN_STATUS_LABELS[initial.status]}
              {initial.sendCount > 0
                ? ` · last send reached ${initial.sendCount}`
                : ""}
              {initial.errorCount > 0 ? ` · ${initial.errorCount} errors` : ""}
            </p>
            {initial.lastError ? (
              <p className="mt-1 text-xs text-danger">{initial.lastError}</p>
            ) : null}
            {initial.status === "scheduled" && initial.scheduledAt ? (
              <p className="mt-1 text-xs text-muted">
                Worker runs every 5 minutes · due{" "}
                {new Date(initial.scheduledAt).toLocaleString()}
              </p>
            ) : null}
          </div>
          <p className="rounded-lg bg-surface-muted px-2.5 py-1 text-xs text-muted">
            Audience ≈ {audienceCount} opted-in
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Name</label>
            <input
              className={fieldClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Channel</label>
            <Select
              className="mt-1 w-full"
              value={channel}
              onChange={(v) => setChannel(v as CampaignChannel)}
              options={[
                { value: "whatsapp", label: "WhatsApp" },
                { value: "email", label: "Email" },
              ]}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Segment</label>
            <Select
              className="mt-1 w-full"
              value={segmentId}
              onChange={setSegmentId}
              placeholder="Select segment…"
              options={[
                { value: "", label: "Select segment…" },
                ...segments.map((s) => ({
                  value: s.id,
                  label: `${s.name} (${s.memberCount})`,
                })),
              ]}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Schedule</label>
            <input
              type="datetime-local"
              className={fieldClass}
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
        </div>

        {channel === "whatsapp" ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">WhatsApp mode</label>
              <Select
                className="mt-1 w-full"
                value={waMode}
                onChange={(v) => {
                  setWaMode(v as CampaignWaMode);
                  setWaDesignId("");
                }}
                options={[
                  { value: "template", label: "Template (broadcast-safe)" },
                  { value: "interactive", label: "Interactive (24h window only)" },
                ]}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Message design</label>
              <Select
                className="mt-1 w-full"
                value={waDesignId}
                onChange={setWaDesignId}
                placeholder="Select design…"
                options={[
                  { value: "", label: "Select design…" },
                  ...designOptions.map((d) => ({
                    value: d.id,
                    label: d.name,
                  })),
                ]}
              />
            </div>
            {waMode === "interactive" ? (
              <p className="sm:col-span-2 text-xs text-warning">
                Interactive campaigns only deliver to customers currently inside
                the 24h messaging window. Prefer templates for scheduled blasts.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="mt-4">
            <label className="text-sm font-medium">
              Start from email template
            </label>
            <div className="mt-1 flex flex-wrap gap-2">
              <Select
                className="mt-0 max-w-md flex-1"
                value={emailTemplateId}
                onChange={loadLibraryTemplate}
                placeholder="Custom / blank campaign design…"
                options={[
                  { value: "", label: "Custom / blank campaign design…" },
                  ...libraryOptions.map((t) => ({
                    value: t.id,
                    label: t.name,
                  })),
                ]}
              />
              <Link
                href="/marketing/design/email"
                className="inline-flex items-center text-xs text-merlot hover:underline"
              >
                Manage templates
              </Link>
            </div>
            <p className="mt-1 text-xs text-muted">
              Loading a template copies it into this campaign so you can tweak
              without changing the library original.
            </p>
          </div>
        )}

        {message ? (
          <p
            className={cn(
              "mt-4 rounded-lg px-3 py-2 text-sm",
              message.ok
                ? "bg-success/10 text-success"
                : "bg-danger/10 text-danger",
            )}
          >
            {message.text}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={handleSaveBasics}
          >
            Save draft
          </Button>
          {canSend ? (
            <>
              <Button
                type="button"
                variant="secondary"
                disabled={pending || !scheduledAt}
                onClick={handleSchedule}
              >
                Schedule
              </Button>
              <Button type="button" disabled={pending} onClick={handleSendNow}>
                Send now
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {channel === "email" ? (
        <div className="rounded-[14px] border border-border bg-surface p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">
            Email message design
          </h2>
          <EmailTemplateEditor
            key={editorKey}
            initial={emailDraft}
            customFonts={customFonts}
            heightClass="h-[70vh] min-h-[560px]"
            showNameField={false}
            successMessage="Campaign email design saved."
            saveLabel="Save email design"
            onSave={async (email) => {
              setEmailDraft((prev) => ({
                ...prev,
                subject: email.subject,
                accentColor: email.accentColor,
                blocks: email.blocks,
              }));
              const res = await saveCampaignAction(buildPayload(email));
              if (res.ok) router.refresh();
              return res;
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
