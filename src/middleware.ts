import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const DEMO_COOKIE = "merlot_demo_user";

/** Public QR / lead form host — customers never see portal routes here. */
const FORM_HOSTS = new Set(
  (process.env.PUBLIC_FORM_HOSTS ?? "join.aerisbeaute.com")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean),
);

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/auth/callback",
  "/api/webhooks",
  "/api/public",
  "/daftar",
  "/checkout",
];

const FORM_ALLOWED_PREFIXES = ["/daftar", "/checkout", "/api/public"];

function isFormHost(host: string): boolean {
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  return FORM_HOSTS.has(hostname);
}

function isFormAllowedPath(pathname: string): boolean {
  return FORM_ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") ?? "";

  // Customer-facing form domain: only /daftar (+ thank-you) and the leads API.
  if (isFormHost(host)) {
    if (pathname === "/" || pathname === "") {
      return NextResponse.redirect(new URL("/daftar", request.url));
    }
    if (!isFormAllowedPath(pathname)) {
      return NextResponse.redirect(new URL("/daftar", request.url));
    }
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Demo mode (no Supabase): gate on the demo cookie only.
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    const hasDemo = request.cookies.get(DEMO_COOKIE);
    if (!hasDemo && !isPublic) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // Supabase mode: refresh the session cookie and gate protected routes.
  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
