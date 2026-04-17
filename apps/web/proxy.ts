import { type NextRequest, NextResponse } from "next/server";

const AUTH_PROVIDER = process.env.AUTH_PROVIDER ?? "clerk";

const PUBLIC_PATHS = [
  "/",
  "/faq",
  "/sign-in",
  "/api/health",
  "/api/trpc/health.ping",
  "/api/uploadthing",
  "/api/cron",
  "/api/e2e",
  "/api/webhooks",
  "/api/auth",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

async function clerkMiddleware(request: NextRequest) {
  const { clerkMiddleware: clerk, createRouteMatcher } = await import("@clerk/nextjs/server");
  const isPublicRoute = createRouteMatcher([
    "/",
    "/faq",
    "/sign-in",
    "/api/health(.*)",
    "/api/trpc/health.ping(.*)",
    "/api/uploadthing(.*)",
    "/api/cron(.*)",
    "/api/e2e(.*)",
    "/api/webhooks(.*)",
    "/api/auth(.*)",
  ]);

  return clerk(async (auth, req) => {
    if (!isPublicRoute(req)) {
      await auth.protect();
    }
  })(request, {} as never);
}

async function entraIdMiddleware(request: NextRequest) {
  if (isPublicPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const { auth } = await import("@workspace/auth/entra-config");
  const session = await auth();
  if (!session) {
    return NextResponse.redirect(new URL("/api/auth/signin", request.url));
  }
  return NextResponse.next();
}

export default async function middleware(request: NextRequest) {
  if (AUTH_PROVIDER === "test") {
    return NextResponse.next();
  }

  if (AUTH_PROVIDER === "entra-id") {
    return entraIdMiddleware(request);
  }

  return clerkMiddleware(request);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
