let initialized = false;
let sentryModulePromise = null;
let posthogModulePromise = null;
let sentryInitStarted = false;
let posthogInitStarted = false;

function canUseSentry() {
  return typeof window !== "undefined" && Boolean(process.env.REACT_APP_SENTRY_DSN);
}

function canUsePostHog() {
  return (
    typeof window !== "undefined"
    && Boolean(process.env.REACT_APP_POSTHOG_KEY)
    && Boolean(process.env.REACT_APP_POSTHOG_HOST)
  );
}

function loadSentry() {
  if (!canUseSentry()) return Promise.resolve(null);
  if (!sentryModulePromise) {
    sentryModulePromise = import("@sentry/react")
      .then((module) => module)
      .catch(() => null);
  }
  return sentryModulePromise;
}

function loadPostHog() {
  if (!canUsePostHog()) return Promise.resolve(null);
  if (!posthogModulePromise) {
    posthogModulePromise = import("posthog-js")
      .then((module) => module.default || module)
      .catch(() => null);
  }
  return posthogModulePromise;
}

export function initializeObservability() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  if (canUseSentry() && !sentryInitStarted) {
    sentryInitStarted = true;
    loadSentry().then((Sentry) => {
      if (!Sentry) return;
      Sentry.init({
        dsn: process.env.REACT_APP_SENTRY_DSN,
        environment: process.env.REACT_APP_ENVIRONMENT || process.env.NODE_ENV,
        release: process.env.REACT_APP_RELEASE || "corechestra-web",
        tracesSampleRate: Number(process.env.REACT_APP_SENTRY_TRACES_SAMPLE_RATE || 0),
      });
    });
  }

  if (canUsePostHog() && !posthogInitStarted) {
    posthogInitStarted = true;
    loadPostHog().then((posthog) => {
      if (!posthog) return;
      posthog.init(process.env.REACT_APP_POSTHOG_KEY, {
        api_host: process.env.REACT_APP_POSTHOG_HOST,
        capture_pageview: false,
        capture_pageleave: true,
        persistence: "localStorage+cookie",
        autocapture: false,
      });
    });
  }
}

export function captureException(error, context) {
  if (!canUseSentry()) return;
  loadSentry().then((Sentry) => {
    if (!Sentry) return;
    Sentry.captureException(error, context ? { extra: context } : undefined);
  });
}

export function identifyUser(user) {
  if (!user) return;

  if (canUseSentry()) {
    loadSentry().then((Sentry) => {
      if (!Sentry) return;
      Sentry.setUser({
        id: user.uid || user.id || user.email,
        email: user.email,
        username: user.username,
      });
    });
  }

  if (canUsePostHog()) {
    loadPostHog().then((posthog) => {
      if (!posthog) return;
      posthog.identify(user.uid || user.id || user.email, {
        email: user.email,
        role: user.role,
        name: user.fullName || user.name,
      });
    });
  }
}

export function trackEvent(name, properties = {}) {
  if (!canUsePostHog()) return;
  loadPostHog().then((posthog) => {
    if (!posthog) return;
    posthog.capture(name, properties);
  });
}
