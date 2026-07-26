import Image from "next/image";
import { cn } from "@/lib/utils";

/** Aeris stylized mark — used on public form pages and branding chips. */
export function BrandMark({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/brand/aeris-mark-chip.png"
      alt="Aeris Beauté"
      width={size}
      height={size}
      className={cn("shrink-0 rounded-lg", className)}
      priority
    />
  );
}
