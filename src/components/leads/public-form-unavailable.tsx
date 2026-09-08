import { BrandMark } from "@/components/brand-mark";

export function PublicFormUnavailable({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(111,44,63,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(180,158,142,0.25),_transparent_50%)]"
      />
      <div className="relative mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-10">
        <div className="rounded-[20px] border border-border bg-surface p-6 text-center shadow-[0_12px_40px_rgba(45,43,42,0.10)] sm:p-8">
          <div className="mb-5 flex justify-center">
            <BrandMark size={40} />
          </div>
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          <p className="mt-2 text-sm text-muted">{body}</p>
        </div>
      </div>
    </div>
  );
}
