import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,

  beforeSend(event) {
    const ssnPattern = /\d{6}-?\d{7}/g;
    if (event.message) {
      event.message = event.message.replace(ssnPattern, "[REDACTED_SSN]");
    }
    return event;
  },
});
