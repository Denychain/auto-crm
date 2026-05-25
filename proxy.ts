/**
 * proxy.ts — захист CRM-зони (Edge-сумісний, без Prisma)
 *
 * НЕ імпортуємо `auth` з "@/auth" — auth.ts тягне Prisma,
 * яка не працює в Edge runtime і спричиняє redirect-loop на Vercel.
 *
 * Стратегія: middleware лише перевіряє НАЯВНІСТЬ JWT-cookie.
 * Повна верифікація сесії (підпис JWT, БД) відбувається у
 * Server Components / Server Actions через requireAuth().
 */
import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/orders",
  "/clients",
  "/vehicles",
  "/finance",
  "/backlog",
  "/shopping",
  "/settings",
];

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (!isProtected) return NextResponse.next();

  // next-auth v5 використовує різні назви cookie залежно від NODE_ENV:
  // - development:  authjs.session-token
  // - production:   __Secure-authjs.session-token
  const token =
    req.cookies.get("authjs.session-token")?.value ??
    req.cookies.get("__Secure-authjs.session-token")?.value;

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/orders/:path*",
    "/clients/:path*",
    "/vehicles/:path*",
    "/finance/:path*",
    "/backlog/:path*",
    "/shopping/:path*",
    "/settings/:path*",
  ],
};
