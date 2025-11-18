import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();
  const isAuthed = !!data.user;

  const path = req.nextUrl.pathname;
  const isAuthRoute = path === "/login" || path === "/register";
  const protectedPrefixes = [
    "/budget",
    "/courses",
    "/taches",
    "/profile",
    "/cloud",
  ];
  const isProtected = protectedPrefixes.some((p) => path.startsWith(p));

  // If not authenticated and hitting a protected route, go to login
  if (!isAuthed && isProtected && !isAuthRoute) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set(
      "redirectTo",
      req.nextUrl.pathname + req.nextUrl.search
    );
    return NextResponse.redirect(redirectUrl);
  }

  // If authenticated and trying to access auth routes, send to destination or home
  if (isAuthed && isAuthRoute) {
    const redirectTarget = req.nextUrl.searchParams.get("redirectTo") || "/";
    const nextUrl = req.nextUrl.clone();
    nextUrl.pathname = redirectTarget;
    nextUrl.search = "";
    return NextResponse.redirect(nextUrl);
  }

  return res;
}

export const config = {
  matcher: [
    // Run on all routes except static assets
    "/((?!_next/static|_next/image|favicon.ico|icons|.*\\.png$|.*\\.svg$).*)",
  ],
};
