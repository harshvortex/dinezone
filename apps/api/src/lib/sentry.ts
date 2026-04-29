import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { prisma } from "./prisma";

export function initSentry() {
  if (!process.env["SENTRY_DSN"]) return;

  Sentry.init({
    dsn:         process.env["SENTRY_DSN"],
    environment: process.env["NODE_ENV"] ?? "development",
    release:     `dinespot-api@${process.env["npm_package_version"] ?? "1.0.0"}`,

    integrations: [
      nodeProfilingIntegration(),
      Sentry.prismaIntegration(),
    ],

    // Traces — sample 20% in prod, 100% in dev
    tracesSampleRate:   process.env["NODE_ENV"] === "production" ? 0.2 : 1.0,
    profilesSampleRate: 0.1,

    // Capture slow API routes (>2s)
    beforeSend(event) {
      // Scrub sensitive fields
      if (event.request?.data) {
        const data = event.request.data as Record<string, unknown>;
        ["password","token","secret","cardNumber"].forEach(k => { if (k in data) data[k] = "[REDACTED]"; });
      }
      return event;
    },
  });
}

// Sentry Fastify error handler
export function sentryErrorHandler(error: Error, context: Record<string, unknown> = {}) {
  Sentry.withScope(scope => {
    scope.setExtras(context);
    Sentry.captureException(error);
  });
}

// Track slow queries (call this in Fastify onResponse hook)
export function trackSlowRoute(routeUrl: string, durationMs: number) {
  if (durationMs > 2000) {
    Sentry.addBreadcrumb({
      category: "slow-route",
      message:  `${routeUrl} took ${durationMs}ms`,
      level:    "warning",
    });
    Sentry.captureMessage(`Slow API route: ${routeUrl} (${durationMs}ms)`, "warning");
  }
}
