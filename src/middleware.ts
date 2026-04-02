import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// ── Public routes that DON'T require authentication ──
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/',
  '/api/(.*)',                // All API routes are public at middleware level
                              // (individual API routes handle their own auth)
])

// ── Protected routes that REQUIRE authentication ──
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/workspace(.*)',
  '/clients(.*)',
  '/intel(.*)',
  '/matches(.*)',
  '/recommendations(.*)',
  '/reports(.*)',
  '/relationships(.*)',
  '/predictions(.*)',
  '/properties(.*)',
  '/conversations(.*)',
  '/corrections(.*)',
  '/insights(.*)',
  '/leads(.*)',
  '/performance(.*)',
  '/profile(.*)',
  '/settings(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  // Only protect explicitly listed page routes
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals, static files, and the Clerk proxy route
    '/((?!_next|api/clerk-proxy|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes (except clerk-proxy)
    '/(api(?!/clerk-proxy)|trpc)(.*)',
  ],
}
