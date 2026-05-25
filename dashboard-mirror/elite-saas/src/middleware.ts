import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/magic-sent",
  "/api/auth/google",
  "/api/auth/google/callback",
  "/api/auth/dev-login",
  "/api/auth/logout",
  "/_next",
  "/favicon.ico",
];

// Admin dashboard: never indexable. Stamp X-Robots-Tag on every response
// (covers pages, API, redirects — stronger than the meta tag alone).
function noIndex(res: NextResponse): NextResponse {
  res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  return res;
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Cutover redirect: when CUTOVER_REDIRECT_HOST is set on the worker (IT-side
  // post-M6), 301 every request to the new hostname preserving path + query.
  // EN deploy doesn't set this var, so it's a no-op there.
  const cutoverHost = process.env.CUTOVER_REDIRECT_HOST;
  if (cutoverHost) {
    const target = `https://${cutoverHost}${pathname}${search}`;
    return noIndex(NextResponse.redirect(target, 301));
  }

  // Allow public paths and static assets
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return noIndex(NextResponse.next());
  }

  // For everything else, require the session cookie to exist (presence check only;
  // server components/API routes do the actual verification via getCurrentUser()).
  const cookie = req.cookies.get("pm_session");
  if (!cookie?.value) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("returnTo", pathname);
    return noIndex(NextResponse.redirect(url));
  }

  return noIndex(NextResponse.next());
}

export const config = {
  matcher: [
    // Match everything except static files
    "/((?!api/secrets|_next/static|_next/image|favicon.ico).*)",
  ],
};
