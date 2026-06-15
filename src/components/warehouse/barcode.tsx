"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

export function Barcode({
  value,
  height = 60,
  width = 2,
  displayValue = true,
}: {
  value: string;
  height?: number;
  width?: number;
  displayValue?: boolean;
}) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    try {
      JsBarcode(ref.current, value, {
        format: "CODE128",
        height,
        width,
        displayValue,
        fontSize: 13,
        margin: 6,
        background: "#ffffff",
        lineColor: "#2d2b2a",
      });
    } catch {
      // invalid value — leave svg empty
    }
  }, [value, height, width, displayValue]);

  return <svg ref={ref} role="img" aria-label={`Barcode ${value}`} />;
}
