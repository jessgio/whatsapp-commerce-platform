"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  applyWaVars,
  type WaInteractiveDesign,
  type WaTemplateDesign,
} from "@/lib/whatsapp-designs";

function PhoneShell({
  children,
  caption,
}: {
  children: ReactNode;
  caption?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-[320px]">
      <div className="rounded-[2rem] border border-charcoal/15 bg-charcoal p-2.5 shadow-[0_12px_40px_rgba(45,43,42,0.18)]">
        <div className="overflow-hidden rounded-[1.55rem] bg-[#ece5dd]">
          <div className="flex items-center gap-2 bg-[#075e54] px-3 py-2.5 text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-xs font-semibold">
              A
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-medium">Aeris Beauté</p>
              <p className="text-[10px] text-white/70">Business account</p>
            </div>
          </div>
          <div className="min-h-[360px] space-y-2 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22><path fill=%22%23d9d0c5%22 fill-opacity=%220.35%22 d=%22M0 60h120M60 0v120%22/></svg>')] bg-repeat px-3 py-4">
            {children}
          </div>
        </div>
      </div>
      {caption ? (
        <p className="mt-2 text-center text-[11px] text-muted">{caption}</p>
      ) : null}
    </div>
  );
}

function Bubble({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "ml-auto max-w-[92%] rounded-lg rounded-tr-sm bg-[#dcf8c6] px-2.5 py-2 text-[13px] leading-snug text-charcoal shadow-sm",
        className,
      )}
    >
      {children}
      <div className="mt-1 text-right text-[10px] text-charcoal/45">12:04</div>
    </div>
  );
}

export function WaTemplatePhonePreview({
  design,
}: {
  design: WaTemplateDesign;
}) {
  const body = applyWaVars(design.body, design.variableDefaults);
  const headerText =
    design.header.type === "text"
      ? applyWaVars(design.header.text, design.variableDefaults)
      : null;

  return (
    <PhoneShell caption="Template preview · Meta-approved structure">
      <Bubble>
        {design.header.type === "image" && design.header.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={design.header.imageUrl}
            alt=""
            className="mb-2 h-28 w-full rounded-md object-cover"
          />
        ) : null}
        {headerText ? (
          <p className="mb-1 font-semibold text-charcoal">{headerText}</p>
        ) : null}
        <p className="whitespace-pre-wrap">{body}</p>
        {design.footer ? (
          <p className="mt-1.5 text-[11px] text-charcoal/55">{design.footer}</p>
        ) : null}
        {design.buttons.length > 0 ? (
          <div className="mt-2 space-y-1 border-t border-charcoal/10 pt-2">
            {design.buttons.map((b) => (
              <div
                key={b.id}
                className="rounded-md bg-white/50 py-1.5 text-center text-xs font-medium text-[#075e54]"
              >
                {b.type === "url" ? "↗ " : b.type === "phone" ? "☎ " : ""}
                {b.text}
              </div>
            ))}
          </div>
        ) : null}
      </Bubble>
    </PhoneShell>
  );
}

export function WaInteractivePhonePreview({
  design,
}: {
  design: WaInteractiveDesign;
}) {
  return (
    <PhoneShell caption="Interactive preview · valid inside 24h window only">
      <Bubble>
        {design.kind === "image" && design.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={design.imageUrl}
            alt=""
            className="mb-2 h-28 w-full rounded-md object-cover"
          />
        ) : null}
        {design.headerText ? (
          <p className="mb-1 font-semibold">{design.headerText}</p>
        ) : null}
        <p className="whitespace-pre-wrap">{design.body}</p>
        {design.footerText ? (
          <p className="mt-1.5 text-[11px] text-charcoal/55">{design.footerText}</p>
        ) : null}

        {design.kind === "reply_buttons" ? (
          <div className="mt-2 space-y-1 border-t border-charcoal/10 pt-2">
            {design.buttons.slice(0, 3).map((b) => (
              <div
                key={b.id}
                className="rounded-md bg-white/50 py-1.5 text-center text-xs font-medium text-[#075e54]"
              >
                {b.title}
              </div>
            ))}
          </div>
        ) : null}

        {design.kind === "list" ? (
          <div className="mt-2 border-t border-charcoal/10 pt-2">
            <div className="rounded-md bg-white/50 py-1.5 text-center text-xs font-medium text-[#075e54]">
              ≡ {design.listButtonLabel || "Options"}
            </div>
            <div className="mt-2 space-y-1.5 rounded-md bg-white/40 p-2">
              {design.listSections.flatMap((s) =>
                s.rows.slice(0, 4).map((r) => (
                  <div key={r.id} className="text-xs">
                    <p className="font-medium">{r.title}</p>
                    {r.description ? (
                      <p className="text-[10px] text-charcoal/55">{r.description}</p>
                    ) : null}
                  </div>
                )),
              )}
            </div>
          </div>
        ) : null}
      </Bubble>
    </PhoneShell>
  );
}
