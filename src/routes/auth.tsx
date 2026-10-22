// Account page: sign in, create an account, or manage the signed-in session.
// An STELLUN account is required for every page except the landing page, and
// it keeps the reading list, saved satellites, and observing location in sync.
import { useEffect, useRef, useState, type FormEvent } from "react";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/lib/profile";
import { PRESET_AVATARS } from "@/lib/preset-avatars";

// Only same-origin paths are ever followed after sign-in. Anything else, an
// absolute URL or a protocol-relative path, falls back to the landing page.
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
      { title: "Sign in - STELLUN" },
      {
        name: "description",
        content:
          "Sign in to STELLUN to open the live tracking, mission, and study tools, and to sync your reading list and saved objects across devices.",
      },
      { property: "og:title", content: "Sign in - STELLUN" },
      {
        property: "og:description",
        content:
          "An STELLUN account unlocks the dashboard and keeps your reading list, saved satellites, and observing location in sync.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});


// Professional copy only: no provider jargon, no internal detail, and nothing
// that reveals whether an account exists for a given address.
function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Too many attempts in a short time. Please wait a moment and try again.";
  }
  if (m.includes("password") && m.includes("6")) {
    return "Passwords need at least 6 characters.";
  }
  if (m.includes("confirm")) {
    return "Please confirm your email address first, then sign in.";
  }
  return "Those details did not work. Please check them and try again.";
}

function AuthPage() {
  const { user, loading } = useAuth();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const target = safePath(search.redirect);

  useEffect(() => {
    if (!loading && user && target !== "/") {
      void navigate({ to: target, replace: true });
    }
  }, [loading, user, target, navigate]);

  if (loading) {
    return (
      <main className="container page-scaffold">
        <section className="page-hero">
          <h1>Account</h1>
          <p className="tagline">Checking your session.</p>
        </section>
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
          <button
            type="button"
            className="btn btn-ghost"
            onClick={signOut}
            disabled={busy}
          >
            {busy ? "Signing out..." : "Sign out"}
          </button>
          <Link to="/" className="btn btn-primary">
            Back to STELLUN
          </Link>
        </div>
      </section>
    </>
  );
}

function SignInView({ gated }: { gated: boolean }) {
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha | null>(null);

  const siteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY as string | undefined;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setStatus(null);

    const cleanEmail = email.trim().toLowerCase().slice(0, 254);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
      setStatus({ kind: "error", text: "Please enter a valid email address." });
      return;
    }

    // Forgot password: email only + captcha
    if (mode === "reset") {
      if (siteKey && !captchaToken) {
        setStatus({ kind: "error", text: "Please complete the captcha." });
        return;
      }
      setBusy(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/auth`,
          captchaToken: captchaToken ?? undefined,
        });
        if (error) {
          setStatus({ kind: "error", text: friendlyError(error.message) });
        } else {
          setStatus({
            kind: "success",
            text: "If an account exists for that email, a reset link is on its way. Check your inbox.",
          });
        }
      } catch {
        setStatus({ kind: "error", text: "The connection failed. Please try again." });
      } finally {
        setBusy(false);
        setCaptchaToken(null);
        captchaRef.current?.resetCaptcha();
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
          options: { captchaToken: captchaToken ?? undefined },
        });
        if (error) setStatus({ kind: "error", text: friendlyError(error.message) });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            captchaToken: captchaToken ?? undefined,
          },
        });
        if (error) {
          setStatus({ kind: "error", text: friendlyError(error.message) });
        } else if (!data.session) {
          setStatus({
            kind: "success",
            text: "Check your inbox for a confirmation link to finish signing in.",
          });
        }
      }
    } catch {
      setStatus({ kind: "error", text: "The connection failed. Please try again." });
    } finally {
      setBusy(false);
      setCaptchaToken(null);
      captchaRef.current?.resetCaptcha();
    }
  };
  
  return (
    <>
      <section className="page-hero">
        <h1>{mode === "signin" ? "Sign in" : "Create your account"}</h1>
        <p className="tagline">
          {gated
            ? "That page is part of the STELLUN dashboard. Sign in to continue, and you will be taken straight there."
            : "An STELLUN account opens the live tracking, mission, and study tools, and keeps your reading list, saved objects, and observing location in sync across devices."}
        </p>
      </section>

      <section className="glass glass-card auth-card">
        <div className="auth-tabs" role="tablist" aria-label="Sign in or create an account">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signin"}
            className={mode === "signin" ? "active" : ""}
            onClick={() => {
              setMode("signin");
              setStatus(null);
              
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            className={mode === "signup" ? "active" : ""}
            onClick={() => {
              setMode("signup");
              setStatus(null);
            }}
          >
            Create account
          </button>
        </div>
        <form onSubmit={submit} noValidate={false}>
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
            <p style={{ margin: "0 0 12px", fontSize: "0.9rem" }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ padding: 0, textDecoration: "underline" }}
                onClick={() => {
                  setMode("reset");
                  setStatus(null);
                  setPassword("");
                  setCaptchaToken(null);
                  captchaRef.current?.resetCaptcha();
                }}
              >
                Forgot password?
              </button>
            </p>
          ) : null}

          {mode === "reset" ? (
            <p className="text-muted" style={{ fontSize: "0.9rem", marginBottom: 12 }}>
              Enter your email and we will send a reset link if an account exists.
              {" "}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ padding: 0, textDecoration: "underline" }}
                onClick={() => {
                  setMode("signin");
                  setStatus(null);
                  setCaptchaToken(null);
                  captchaRef.current?.resetCaptcha();
                }}
              >
                Back to sign in
              </button>
            </p>
          ) : null}

          {siteKey ? (
            <div className="form-row" style={{ display: "flex", justifyContent: "center" }}>
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
          ) : null}

          <button type="submit" className="btn btn-primary auth-submit" disabled={busy}>
            {busy
              ? "One moment..."
              : mode === "signin"
                ? "Sign in"
                : mode === "reset"
                  ? "Send reset link"
                  : "Create account"}
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
    <section className="glass glass-card auth-card profile-card">
      <h2>Profile</h2>
      <div className="profile-row">
        <div className="profile-photo" aria-hidden="true">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" />
          ) : (
            <span>{(name || "?").charAt(0).toUpperCase()}</span>
          )}
        </div>
        <label className="btn btn-ghost">
          {busy ? "Uploading..." : "Upload photo"}
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
          const src = `data:image/svg+xml;utf8,${encodeURIComponent(a.svg)}`;
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
