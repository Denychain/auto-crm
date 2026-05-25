import { auth } from "@/auth";
import { NextResponse } from "next/server";

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

export default auth((req) => {
  const { nextUrl } = req;
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    nextUrl.pathname.startsWith(prefix)
  );

  if (isProtected && !req.auth) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

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
