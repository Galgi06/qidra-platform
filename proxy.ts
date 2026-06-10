import { NextResponse, type NextRequest } from "next/server";

const mutatingMethods = new Set(["DELETE", "PATCH", "POST", "PUT"]);

export function proxy(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return redirectToPreferredLocale(request);
  }

  if (!mutatingMethods.has(request.method)) {
    return NextResponse.next();
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  if (origin && !isSameHost(origin, request)) {
    return forbidden();
  }

  if (!origin && referer && !isSameHost(referer, request)) {
    return forbidden();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/((?!_next/static|_next/image|favicon.ico|assets|.*\\..*).*)"]
};

function redirectToPreferredLocale(request: NextRequest) {
  if (request.method !== "GET" || request.nextUrl.searchParams.has("lang")) {
    return NextResponse.next();
  }

  const accept = request.headers.get("accept-language") ?? "";
  const preferredLanguage = accept.split(",")[0]?.trim().toLowerCase();
  const locale = preferredLanguage?.startsWith("en") ? "en" : "ru";
  const url = request.nextUrl.clone();
  url.searchParams.set("lang", locale);

  return NextResponse.redirect(url);
}

function isSameHost(value: string, request: NextRequest) {
  try {
    const url = new URL(value);
    const requestHost = request.headers.get("host");
    return url.host === request.nextUrl.host || Boolean(requestHost && url.host === requestHost);
  } catch {
    return false;
  }
}

function forbidden() {
  return NextResponse.json(
    {
      title: "Cross-site request blocked",
      message: "This API accepts browser requests only from the Qidra origin."
    },
    { status: 403 }
  );
}
