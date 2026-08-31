"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

export function PasswordField({
  id = "password",
  name = "password",
  placeholder = "••••••••",
  autoComplete = "current-password",
  minLength,
  required = true,
}: {
  id?: string;
  name?: string;
  placeholder?: string;
  autoComplete?: string;
  minLength?: number;
  required?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Lock
        aria-hidden
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        strokeWidth={1.75}
      />
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="h-12 w-full rounded-xl bg-[#F7F1E8] pl-11 pr-11 text-sm text-foreground outline-none ring-1 ring-transparent transition placeholder:text-muted/70 focus:bg-white focus:ring-merlot/25"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted transition hover:text-foreground"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
