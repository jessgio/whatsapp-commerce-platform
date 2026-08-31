import type { ReactNode } from "react";
import Image from "next/image";
import {
  Megaphone,
  MessagesSquare,
  ShoppingBag,
  Tags,
  Warehouse,
} from "lucide-react";

const FEATURES = [
  { label: "Inbox", Icon: MessagesSquare },
  { label: "Orders", Icon: ShoppingBag },
  { label: "Warehouse", Icon: Warehouse },
  { label: "Catalog", Icon: Tags },
  { label: "Campaigns", Icon: Megaphone },
] as const;

const LOGO_SRC = "/brand/Aeris new logo-01.png";

function greetingLabel(now = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function BrandGlow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute -left-28 -top-32 h-[32rem] w-[32rem] rounded-full bg-[#6f2c3f]/55 blur-[110px]" />
      <div className="absolute -bottom-36 -right-20 h-[30rem] w-[30rem] rounded-full bg-[#2c4a3d]/50 blur-[120px]" />
    </div>
  );
}

export function AuthBrandLockup() {
  return (
    <Image
      src={LOGO_SRC}
      alt="Aeris · WhatsApp Commerce"
      width={800}
      height={450}
      priority
      className="h-12 w-[200px] object-contain object-left lg:h-[72px] lg:w-[280px]"
    />
  );
}

export function AuthSplitShell({
  headline,
  description,
  children,
}: {
  headline: string;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col lg:grid lg:grid-cols-2">
      <aside className="relative flex-1 overflow-hidden bg-[#121110] px-6 pb-14 pt-[max(1.75rem,env(safe-area-inset-top))] text-white lg:flex lg:min-h-dvh lg:flex-none lg:flex-col lg:px-12 lg:py-10 xl:px-16">
        <BrandGlow />
        <div className="relative flex flex-col gap-8 lg:h-full lg:min-h-dvh lg:justify-between lg:gap-0">
          <AuthBrandLockup />

          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-white/40">
              {greetingLabel()}
            </p>
            <h1 className="mt-3 max-w-lg text-[28px] font-semibold leading-[1.15] tracking-tight lg:mt-4 lg:text-[42px] lg:leading-[1.12]">
              {headline}
            </h1>
            <p className="mt-5 hidden max-w-md text-[15px] leading-relaxed text-white/65 lg:block">
              {description}
            </p>
            <div className="mt-7 flex gap-2.5 lg:mt-10 lg:flex-wrap">
              {FEATURES.map(({ label, Icon }) => (
                <span
                  key={label}
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.06] backdrop-blur-sm lg:gap-2 lg:px-3.5 lg:py-2"
                >
                  <span className="flex h-11 w-11 items-center justify-center lg:h-auto lg:w-auto">
                    <Icon className="h-4 w-4 opacity-80 lg:h-3.5 lg:w-3.5" strokeWidth={1.75} />
                  </span>
                  <span className="hidden text-[13px] text-white/90 lg:inline">{label}</span>
                </span>
              ))}
            </div>
          </div>

          <p className="hidden text-[12px] text-white/35 lg:block">WhatsApp Commerce</p>
        </div>
      </aside>

      <section className="relative z-10 -mt-8 flex flex-col rounded-t-[28px] bg-[#F9F6F1] px-5 pb-5 pt-3 lg:mt-0 lg:min-h-dvh lg:flex-1 lg:items-center lg:justify-center lg:rounded-none lg:px-4 lg:py-10">
        <div
          aria-hidden
          className="mx-auto mb-5 h-1 w-10 rounded-full bg-black/12 lg:hidden"
        />
        <div className="mx-auto w-full max-w-[420px] lg:rounded-[22px] lg:bg-white lg:px-8 lg:py-9 lg:shadow-[0_18px_50px_rgba(45,43,42,0.08)]">
          {children}
        </div>
      </section>
    </div>
  );
}
