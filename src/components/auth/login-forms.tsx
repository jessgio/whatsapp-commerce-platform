"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Mail } from "lucide-react";
import { STAFF_EMAIL_DOMAIN } from "@/lib/auth-policy";
import { GoogleIcon } from "@/components/google-icon";
import { PasswordField } from "@/components/auth/password-field";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { signInWithGoogle, signInWithPassword } from "@/app/auth-actions";

export function LoginForms() {
  const [token, setToken] = useState("");

  return (
    <>
      <form action={signInWithPassword} className="mt-4 space-y-3">
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Email
          </label>
          <div className="relative">
            <Mail
              aria-hidden
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              strokeWidth={1.75}
            />
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder={`you@${STAFF_EMAIL_DOMAIN}`}
              className="h-12 w-full rounded-xl bg-[#F7F1E8] pl-11 pr-3 text-sm text-foreground outline-none ring-1 ring-transparent transition placeholder:text-muted/70 focus:bg-white focus:ring-merlot/25"
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Password
          </label>
          <PasswordField />
        </div>
        <TurnstileWidget onToken={(t) => setToken(t ?? "")} />
        <input type="hidden" name="turnstileToken" value={token} />
        <button
          type="submit"
          disabled={!token}
          className="flex h-12 w-full items-center justify-center gap-1 rounded-full bg-[#8B4455] text-sm font-medium text-white transition hover:bg-[#7a3b4b] disabled:opacity-50"
        >
          Sign In
          <ChevronRight className="h-4 w-4" strokeWidth={2.2} />
        </button>
      </form>

      <div className="my-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
          Or continue with
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form action={signInWithGoogle}>
        <input type="hidden" name="turnstileToken" value={token} />
        <button
          type="submit"
          disabled={!token}
          className="flex h-12 w-full items-center justify-center gap-2.5 rounded-full border border-[#E6DCD0] bg-white text-sm font-medium text-foreground transition hover:bg-[#F9F6F1] disabled:opacity-50"
        >
          <GoogleIcon className="h-[18px] w-[18px]" />
          Sign in with Google
        </button>
      </form>
      <p className="mt-2.5 text-center text-xs text-muted">
        Use your{" "}
        <span className="font-medium text-foreground">@{STAFF_EMAIL_DOMAIN}</span>{" "}
        Google account.
      </p>
      <p className="mt-2.5 text-center text-sm text-muted">
        New team member?{" "}
        <Link href="/signup" className="font-medium text-merlot hover:underline">
          Create account
        </Link>
      </p>
    </>
  );
}
