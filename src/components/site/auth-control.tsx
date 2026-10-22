// Small header control: "Sign in" or avatar. Always matches SSR first paint
// (placeholder), then fills in after mount — avoids React #418 hydration text mismatch.
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/lib/profile";

export function AuthControl() {
  const { user, loading } = useAuth();
  const { profile } = useProfile();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  // Same empty slot on server and on the client's first paint
  if (!ready || loading) {
    return <span className="auth-control-placeholder" aria-hidden="true" />;
  }

  if (!user) {
    return (
      <Link to="/auth" className="auth-link">
        Sign in
      </Link>
    );
  }

  const label = profile.displayName ?? user.email ?? "Account";
  return (
    <Link
      to="/auth"
      className="auth-avatar"
      aria-label={`Account, signed in as ${label}`}
      title={label}
    >
      {profile.avatarUrl ? (
        <img src={profile.avatarUrl} alt="" className="auth-avatar-img" />
      ) : (
        <span suppressHydrationWarning>{label.charAt(0).toUpperCase()}</span>
      )}
    </Link>
  );
}
