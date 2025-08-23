// Simple analytics abstraction for Mockly
// Replace internals with Segment/PostHog/GA/etc.

type AnalyticsPayload = Record<string, any>;

interface AnalyticsProvider {
  track: (event: string, payload?: AnalyticsPayload) => void;
  identify?: (userId: string, traits?: AnalyticsPayload) => void;
  page?: (name?: string, props?: AnalyticsPayload) => void;
}

class ConsoleProvider implements AnalyticsProvider {
  track(event: string, payload?: AnalyticsPayload) {
    // eslint-disable-next-line no-console
    console.log(`[analytics] ${event}`, payload || {});
  }
  identify(userId: string, traits?: AnalyticsPayload) {
    // eslint-disable-next-line no-console
    console.log(`[analytics] identify ${userId}`, traits || {});
  }
  page(name?: string, props?: AnalyticsPayload) {
    // eslint-disable-next-line no-console
    console.log(`[analytics] page ${name || 'unknown'}`, props || {});
  }
}

let provider: AnalyticsProvider = new ConsoleProvider();

export function setAnalyticsProvider(p: AnalyticsProvider) {
  provider = p;
}

export function track(event: string, payload?: AnalyticsPayload) {
  try {
    provider.track(event, { ts: Date.now(), ...payload });
  } catch (e) {
    // swallow errors to avoid breaking UX
  }
}

export function identify(userId: string, traits?: AnalyticsPayload) {
  try {
    provider.identify?.(userId, traits);
  } catch {}
}

export function page(name?: string, props?: AnalyticsPayload) {
  try {
    provider.page?.(name, props);
  } catch {}
}

// Helper to wrap click handlers
export function withTrack<T extends (...args: any[]) => any>(event: string, fn?: T, payload?: AnalyticsPayload) {
  return (...args: Parameters<T>) => {
    track(event, payload);
    return fn?.(...args);
  };
}
