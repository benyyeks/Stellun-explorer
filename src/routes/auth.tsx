// STELLUN account: sign in, create account, forgot password, set new password,
// and manage profile when signed in. Professional, recovery-aware flow.
import { useEffect, useRef, useState, type FormEvent } from "react";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/lib/profile";
import { PRESET_AVATARS } from "@/lib/preset-avatars";

type AuthMode = "signin" | "signup" | "reset" | "newpassword";

function safePath(raw: unknown): string {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 300) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return "/";
  if (raw.startsWith("/auth")) return "/";
  return raw;
}

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const target = safePath(search["redirect"]);
    return target === "/" ? {} : { redirect: target };
  },
  head: () => ({
    meta: [
      { title: "Sign in · STELLUN" },
      {
        name: "description",
        content:
          "Sign in to STELLUN to open live tracking, missions, and study tools, and sync your reading list across devices.",
      },
      { property: "og:title", content: "Sign in · STELLUN" },
      {
        property: "og:description",
        content: "An STELLUN account unlocks the dashboard and keeps your data in sync.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("captcha") || m.includes("verification")) {
    return "Please complete the captcha and try again.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (m.includes("password") && (m.includes("6") || m.includes("least"))) {
    return "Passwords need at least 6 characters.";
  }
  if (m.includes("confirm") || m.includes("not confirmed")) {
    return "Please confirm your email first, then sign in.";
  }
  if (m.includes("invalid login") || m.includes("invalid credentials")) {
    return "Email or password is incorrect.";
  }
  if (m.includes("already registered") || m.includes("already been registered")) {
    return "That email already has an account. Sign in instead.";
  }
  return "Those details did not work. Please check them and try again.";
}

function AuthPage() {
  const { user, loading } = useAuth();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const target = safePath(search.redirect);
  const [recoveryMode, setRecoveryMode] = useState(false);

  // Detect password-recovery session from the email link (hash or auth event).
  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (hash.includes("type=recovery") || hash.includes("type%3Drecovery")) {
      setRecoveryMode(true);
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // After normal sign-in (not recovery), optional redirect.
    if (!loading && user && target !== "/" && !recoveryMode) {
      void navigate({ to: target, replace: true });
    }
  }, [loading, user, target, navigate, recoveryMode]);

  if (loading) {
    return (
      <main className="container page-scaffold">
        <section className="page-hero">
          <h1>Account</h1>
          <p className="tagline">Checking your session…</p>
        </section>
      </main>
    );
  }

  // Recovery link lands with a session but user must set a new password first.
  if (recoveryMode) {
    return (
      <main className="container page-scaffold">
        <NewPasswordView
          onDone={() => {
            setRecoveryMode(false);
            // Clear recovery hash so refresh does not re-enter this mode.
            if (typeof window !== "undefined" && window.location.hash) {
              window.history.replaceState(null, "", window.location.pathname + window.location.search);
            }
          }}
        />
      </main>
    );
  }

  return (
    <main className="container page-scaffold">
      {user ? (
        <AccountView email={user.email ?? ""} />
      ) : (
        <SignInView gated={target !== "/"} />
      )}
    </main>
  );
}

/** Shown when the user opens the reset link from email. */
function NewPasswordView({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setStatus(null);

    if (password.length < 6 || password.length > 128) {
      setStatus({ kind: "error", text: "Passwords need between 6 and 128 characters." });
      return;
    }
    if (password !== confirm) {
      setStatus({ kind: "error", text: "Passwords do not match." });
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setStatus({ kind: "error", text: friendlyError(error.message) });
      } else {
        setStatus({
          kind: "success",
          text: "Password updated. You are signed in.",
        });
        window.setTimeout(() => onDone(), 1200);
      }
    } catch {
      setStatus({ kind: "error", text: "The connection failed. Please try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section className="page-hero">
        <span className="eyebrow">Security</span>
        <h1>Choose a new password</h1>
        <p className="tagline">
          Enter a new password for your STELLUN account. Use something unique that
          you do not reuse on other sites.
        </p>
      </section>

      <section className="glass glass-card auth-card">
        <form onSubmit={submit} noValidate>
          <div className="form-row">
            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </div>
          <div className="form-row">
            <label htmlFor="confirm-password">Confirm new password</label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              maxLength={128}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Type it again"
            />
          </div>
          <button type="submit" className="btn btn-primary auth-submit" disabled={busy}>
            {busy ? "Saving…" : "Save new password"}
          </button>
          <p
            className={`form-status${status ? ` ${status.kind}` : ""}`}
            role={status?.kind === "error" ? "alert" : undefined}
          >
            {status?.text ?? ""}
          </p>
        </form>
      </section>
    </>
  );
}

function SignInView({ gated }: { gated: boolean }) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const captchaRef = useRef<HCaptcha | null>(null);

  const siteKey = (import.meta.env.VITE_HCAPTCHA_SITE_KEY as string | undefined)?.trim() || "";

  const resetCaptcha = () => {
    setCaptchaToken(null);
    captchaRef.current?.resetCaptcha();
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setStatus(null);
    setPassword("");
    setAcceptedTerms(false);
    resetCaptcha();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setStatus(null);

    const cleanEmail = email.trim().toLowerCase().slice(0, 254);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
      setStatus({ kind: "error", text: "Please enter a valid email address." });
      return;
    }

    if (mode === "reset") {
      if (mode === "signup" && !acceptedTerms) {
      setStatus({
        kind: "error",
        text: "Please confirm that you agree to the Terms of Service and Privacy policy.",
      });
      return;
    }

    if (siteKey && !captchaToken) {
      setStatus({ kind: "error", text: "Please complete the captcha." });
      return;
    }

    setBusy(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/auth`,
          captchaToken: captchaToken || undefined,
        });
        if (error) {
          setStatus({ kind: "error", text: friendlyError(error.message) });
        } else {
          setStatus({
            kind: "success",
            text: "If an account exists for that email, a reset link is on its way. Open the link on this device to choose a new password.",
          });
        }
      } catch {
        setStatus({ kind: "error", text: "The connection failed. Please try again." });
      } finally {
        setBusy(false);
        resetCaptcha();
      }
      return;
    }

    if (password.length < 6 || password.length > 128) {
      setStatus({ kind: "error", text: "Passwords need between 6 and 128 characters." });
      return;
    }

    if (siteKey && !captchaToken) {
      setStatus({ kind: "error", text: "Please complete the captcha." });
      return;
    }

    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
          options: { captchaToken: captchaToken || undefined },
        });
        if (error) setStatus({ kind: "error", text: friendlyError(error.message) });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            captchaToken: captchaToken || undefined,
          },
        });
        if (error) {
          setStatus({ kind: "error", text: friendlyError(error.message) });
        } else if (!data.session) {
          setStatus({
            kind: "success",
            text: "Check your inbox for a confirmation link to finish creating your account.",
          });
        }
      }
    } catch {
      setStatus({ kind: "error", text: "The connection failed. Please try again." });
    } finally {
      setBusy(false);
      resetCaptcha();
    }
  };

  const title =
    mode === "signin"
      ? "Sign in"
      : mode === "signup"
        ? "Create your account"
        : "Reset password";

  const subtitle =
    mode === "reset"
      ? "Enter the email for your STELLUN account. We will send a link to choose a new password."
      : gated
        ? "That page is part of the STELLUN dashboard. Sign in to continue."
        : "An STELLUN account opens live tracking, missions, and study tools, and keeps your reading list in sync.";

  return (
    <>
      <section className="page-hero">
        <h1>{title}</h1>
        <p className="tagline">{subtitle}</p>
      </section>

      <section className="glass glass-card auth-card">
        {mode !== "reset" ? (
          <div className="auth-mode-block">
            <p className="auth-mode-hint">
              {mode === "signin"
                ? "Welcome back, let's see what space has in store for you today"
                : "New here? You are welcome; let's get to know you."}
            </p>
            <div className="auth-tabs" role="tablist" aria-label="Sign in or create account">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "signin"}
                className={`auth-tab${mode === "signin" ? " is-active" : ""}`}
                onClick={() => switchMode("signin")}
              >
                Sign in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "signup"}
                className={`auth-tab${mode === "signup" ? " is-active" : ""}`}
                onClick={() => switchMode("signup")}
              >
                Create account
              </button>
            </div>
          </div>
        ) : null}
        <form onSubmit={submit} noValidate>
          <div className="form-row">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={254}
              placeholder="you@example.com"
            />
          </div>

          {mode !== "reset" ? (
            <div className="form-row">
              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                required
                minLength={6}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </div>
          ) : null}

          {mode === "signin" ? (
            <p style={{ margin: "0 0 14px", fontSize: "0.9rem" }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ padding: 0, textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}
                onClick={() => switchMode("reset")}
              >
                Forgot password?
              </button>
            </p>
          ) : null}

        
{mode === "signup" ? (
            <label
              className="form-row"
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                marginBottom: 12,
                fontSize: "0.9rem",
                lineHeight: 1.4,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                style={{ marginTop: 3 }}
              />
              <span>
                I am at least 16 years old and I agree to the{" "}
                <Link to="/terms" target="_blank">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link to="/privacy" target="_blank">
                  Privacy policy
                </Link>
                .
              </span>
            </label>
          ) : null}
          
          {siteKey ? (
            <div className="form-row" style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
              <HCaptcha
                ref={captchaRef}
                sitekey={siteKey}
                onVerify={(token) => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken(null)}
                onError={() => {
                  setCaptchaToken(null);
                  setStatus({
                    kind: "error",
                    text: "Captcha failed to load. Check your connection and try again.",
                  });
                }}
              />
            </div>
          ) : (
            <p className="text-faint" style={{ fontSize: "0.8rem", marginBottom: 12, textAlign: "center" }}>
              Captcha is not configured on this build. Sign-in may fail until{" "}
              <span className="mono">VITE_HCAPTCHA_SITE_KEY</span> is set.
            </p>
          )}

          <button type="submit" className="btn btn-primary auth-submit" disabled={busy}>
            {busy
              ? "One moment…"
              : mode === "signin"
                ? "Sign in"
                : mode === "reset"
                  ? "Send reset link"
                  : "Create account"}
          </button>

          {mode === "signin" || mode === "signup" ? (
            <p className="auth-switch-line">
              {mode === "signin" ? (
                <>
                  Don’t have an account?{" "}
                  <button type="button" className="auth-switch-link" onClick={() => switchMode("signup")}>
                    Create account
                  </button>
                </>
              ) : (
                <>
                  Already registered?{" "}
                  <button type="button" className="auth-switch-link" onClick={() => switchMode("signin")}>
                    Sign in
                  </button>
                </>
              )}
            </p>
          ) : null}

          <p
            className={`form-status${status ? ` ${status.kind}` : ""}`}
            role={status?.kind === "error" ? "alert" : undefined}
          >
            {status?.text ?? ""}
          </p>
        </form>
      </section>

      <p className="text-faint" style={{ marginTop: 24, fontSize: "0.85rem", textAlign: "center" }}>
        <Link to="/terms">Terms</Link>
        {" & "}
        <Link to="/privacy">Privacy</Link>
      </p>
    </>
  );
}

function AccountView({ email }: { email: string }) {
  const [busy, setBusy] = useState(false);

  const signOut = async () => {
    setBusy(true);
    await supabase.auth.signOut().catch(() => {});
    setBusy(false);
  };

  return (
    <>
      <section className="page-hero">
        <span className="badge badge-success">Signed in</span>
        <h1>Your account</h1>
        <p className="tagline">{email}</p>
      </section>
      <ProfileCard />
      <section className="glass glass-card auth-card">
        <h2>What syncs to this account</h2>
        <ul className="feature-list">
          <li>Your textbook reading list from the resources shelf</li>
          <li>Saved satellites in the Orbit Tracker</li>
          <li>Your observing location for sky and pass predictions</li>
        </ul>
        <p className="auth-note">
          Your account details are never used by the STELLUN assistant, and it has
          no access to accounts, saved lists, or notes.
        </p>
        <div className="auth-actions">
          <button type="button" className="btn btn-ghost" onClick={signOut} disabled={busy}>
            {busy ? "Signing out…" : "Sign out"}
          </button>
          <Link to="/" className="btn btn-primary">
            Back to STELLUN
          </Link>
        </div>
      </section>
    </>
  );
}

function ProfileCard() {
  const { profile, uploadAvatar, selectPreset, saveName } = useProfile();
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => setName(profile.displayName ?? ""), [profile.displayName]);

  const selectedPreset =
    profile.avatarPath && profile.avatarPath.startsWith("preset:")
      ? profile.avatarPath.slice("preset:".length)
      : null;

  return (
    <section className="glass glass-card auth-card" style={{ marginBottom: 20 }}>
      <h2>Profile</h2>
      <div className="profile-avatar-row">
        <div className="profile-avatar-preview" aria-hidden>
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" />
          ) : (
            <span>{(name || "?").charAt(0).toUpperCase()}</span>
          )}
        </div>
        <label className="btn btn-ghost">
          {busy ? "Uploading…" : "Upload photo"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            disabled={busy}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setBusy(true);
              const err = await uploadAvatar(f);
              setBusy(false);
              setMsg(err ?? "Photo updated.");
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <p className="avatar-preset-label">Or choose a STELLUN avatar</p>
      <div className="avatar-preset-grid" role="listbox" aria-label="Preset avatars">
        {PRESET_AVATARS.map((a) => {
          const src = a.src;
          const selected = selectedPreset === a.id;
          return (
            <button
              key={a.id}
              type="button"
              role="option"
              aria-selected={selected}
              className={`avatar-preset-btn${selected ? " is-selected" : ""}`}
              title={a.label}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const err = await selectPreset(a.id);
                setBusy(false);
                setMsg(err ?? `Avatar set to ${a.label}.`);
              }}
            >
              <img src={src} alt={a.label} />
            </button>
          );
        })}
      </div>

      <form
        className="form-row"
        onSubmit={async (e) => {
          e.preventDefault();
          const err = await saveName(name);
          setMsg(err ?? "Name saved.");
        }}
      >
        <label htmlFor="profile-name">Display name</label>
        <div className="profile-name-row">
          <input
            id="profile-name"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
          <button type="submit" className="btn btn-primary">
            Save
          </button>
        </div>
      </form>
      {msg ? (
        <p className="auth-note" role="status">
          {msg}
        </p>
      ) : null}
    </section>
  );
}
