import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Pathless layout for app pages.
 *
 * Public tools (launches, tracker, sky, weather, etc.) do not require an account.
 * Sign-in is required only where data is personal or admin-only:
 * Academy, Settings, Stellun AI history, Admin.
 */
const AUTH_REQUIRED_PREFIXES = ["/academy", "/settings", "/ask", "/admin"] as const;

function requiresAuth(pathname: string): boolean {
  return AUTH_REQUIRED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    if (!requiresAuth(location.pathname)) {
      return { user: null as null };
    }

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({
        to: "/auth",
        search: { redirect: location.href },
      });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
