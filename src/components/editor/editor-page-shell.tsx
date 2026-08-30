import Link from "next/link";
import { cn } from "@/lib/utils";

/** Full-viewport chrome for design editors — compact header, editor fills the rest. */
export function EditorPageShell({
  backHref,
  backLabel,
  title,
  meta,
  actions,
  children,
  bodyClassName,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  bodyClassName?: string;
}) {
  return (
    <div className="-mx-4 -my-5 flex h-[calc(100dvh-3.5rem)] flex-col sm:-mx-5 sm:-my-6 md:-mx-8">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 sm:px-5 md:px-8">
        <div className="min-w-0">
          <Link
            href={backHref}
            className="text-xs text-muted hover:text-foreground"
          >
            ← {backLabel}
          </Link>
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h1 className="truncate text-base font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            {meta ? (
              <div className="min-w-0 truncate text-xs text-muted">{meta}</div>
            ) : null}
          </div>
        </div>
        {actions}
      </div>
      <div
        className={cn(
          "min-h-0 flex-1 px-4 pb-3 sm:px-5 md:px-8",
          bodyClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
