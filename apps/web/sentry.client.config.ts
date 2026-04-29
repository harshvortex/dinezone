import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn:         process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release:     `dinespot-web@${process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0"}`,

  tracesSampleRate:   process.env.NODE_ENV === "production" ? 0.2 : 1.0,
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText:   false,
      blockAllMedia: false,
    }),
  ],

  beforeSend(event: any) {
    // Ignore benign errors
    const msg = event.exception?.values?.[0]?.value ?? "";
    if (msg.includes("ResizeObserver") || msg.includes("Non-Error exception captured")) return null;
    return event;
  },
});
