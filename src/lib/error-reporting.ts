/**
 * STELLUN in-house error reporter.
 * Used by the root error boundary only.
 * Does not talk to any third-party service.
 * Client errors that should reach admins already go through ErrorReporter + reportClientError.
 */

export type ReportOptions = {
  boundary?: string;
  handled?: boolean;
};

/**
 * Log a boundary-caught error. Safe to call from any environment.
 * Never throws. Never blocks the UI.
 */
export function reportError(
  error: unknown,
  context: Record<string, unknown> = {},
  options: ReportOptions = {},
): void {
  if (typeof window === "undefined") return;

  let message: string;
  if (error instanceof Response) {
    message = "Response " + error.status;
    if (error.url) {
      message += " at " + error.url;
    }
  } else if (error instanceof Error) {
    message = error.message;
  } else {
    message = String(error);
  }

  const stack = error instanceof Error ? error.stack : undefined;

  // Structured console output for production debugging
  console.error("[STELLUN]", {
    message,
    stack,
    boundary: options.boundary ?? "unknown",
    handled: options.handled ?? false,
    path: window.location.pathname,
    ...context,
  });
}
