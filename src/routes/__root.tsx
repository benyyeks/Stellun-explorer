import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { AskWidget } from "@/components/site/ask-widget";
import { ErrorReporter } from "@/components/site/error-reporter";
import { migrateLegacyStorage } from "@/lib/storage-migrate";

migrateLegacyStorage();

function NotFoundComponent() {
  return (
    <main className="container error-page">
      <span className="badge badge-amber">404</span>
      <h1>Page not found</h1>
      <p>
        The page you're looking for doesn't exist or has drifted off orbit. Let's
        get you back to known space.
      </p>
      <Link to="/" className="btn btn-primary">
        Return home
      </Link>
    </main>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <main className="container error-page">
      <span className="badge badge-amber">Signal lost</span>
      <h1>This page didn't load</h1>
      <p>
        Something went wrong on our end. You can try re-establishing the link or
        head back to home base.
      </p>
      <div className="error-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            router.invalidate();
            reset();
          }}
        >
          Try again
        </button>
        <Link to="/" className="btn btn-ghost">
          Go home
        </Link>
      </div>
    </main>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "STELLUN - Space Intelligence Dashboard" },
      {
        name: "description",
        content:
          "An independent space intelligence dashboard. Live data from NASA, NOAA, CelesTrak, and JPL, with nothing invented.",
      },
      { name: "author", content: "STELLUN" },
      { name: "theme-color", content: "#f2f0ea", media: "(prefers-color-scheme: light)" },
      { name: "theme-color", content: "#16140f", media: "(prefers-color-scheme: dark)" },
      { property: "og:title", content: "STELLUN - Space Intelligence Dashboard" },
      {
        property: "og:description",
        content:
          "Live data from NASA, NOAA, CelesTrak, and JPL, with nothing invented.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Lora:wght@600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <SiteHeader />
      <Outlet />
      <ErrorReporter />
      <SiteFooter />
      <AskWidget />
    </QueryClientProvider>
  );
}
