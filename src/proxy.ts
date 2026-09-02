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
  "/api/staff",
  "/daftar",
  "/checkout",
];

/**
 * Routes with no signed-in user to speak of. Skipping the Supabase call here
 * takes a network roundtrip off every request to the customer funnel, which is
 * the highest-volume traffic the app sees. The staff-facing public routes
 * (/login, /signup, /auth/callback) still refresh so an expired-but-renewable
 * session lands you on your dashboard instead of the login form.
 */
const ANONYMOUS_PATHS = [
  "/api/webhooks",
  "/api/public",
  "/api/staff",
  "/daftar",
  "/checkout",
];

const FORM_ALLOWED_PREFIXES = ["/daftar", "/checkout", "/api/public"];

function isFormHost(host: string): boolean {
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  return FORM_HOSTS.has(hostname);
}

/** Exact match or a full path segment, so /loginhack is not treated as /login. */
function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isFormAllowedPath(pathname: string): boolean {
  return matchesPrefix(pathname, FORM_ALLOWED_PREFIXES);
}

export async function proxy(request: NextRequest) {
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

  const isPublic = matchesPrefix(pathname, PUBLIC_PATHS);
  const skipSessionRefresh = matchesPrefix(pathname, ANONYMOUS_PATHS);

  // Demo mode (no Supabase): gate on the demo cookie only.
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    const hasDemo = request.cookies.get(DEMO_COOKIE);
    if (!hasDemo && !isPublic) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  if (skipSessionRefresh) {
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
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
