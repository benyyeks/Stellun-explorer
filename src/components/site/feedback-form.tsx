// Signed-in feedback form. Submissions go to site_suggestions and the admin inbox.
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { submitSuggestion } from "@/lib/admin.functions";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "@tanstack/react-router";

type FeedbackType = "suggestion" | "bug" | "data" | "other";

export function FeedbackForm() {
  const { user } = useAuth();
  const submitFn = useServerFn(submitSuggestion);
  const [type, setType] = useState<FeedbackType>("suggestion");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      submitFn({
        data: {
          type,
          message: message.trim(),
          name: name.trim() || undefined,
          email: user?.email ?? undefined,
        },
      }),
    onSuccess: () => {
      setDone(true);
      setMessage("");
    },
  });

  if (!user) {
    return (
      <div className="glass glass-card scaffold-card">
        <h2>Send feedback</h2>
        <p className="text-muted">
          <Link to="/auth" className="text-accent">
            Sign in
          </Link>{" "}
          to send a feature suggestion or report a problem to the STELLUN admin.
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="glass glass-card scaffold-card">
        <h2>Send feedback</h2>
        <p className="text-muted" style={{ marginBottom: 12 }}>
          Thank you. Your message is in the admin inbox.
        </p>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDone(false)}>
          Send another
        </button>
      </div>
    );
  }

  return (
    <div className="glass glass-card scaffold-card">
      <h2>Send feedback</h2>
      <p className="text-muted">
        Feature ideas, bugs, or data concerns. Messages go to the site administrator.
      </p>
      <form
        className="feedback-form"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <label className="field-label" htmlFor="fb-type">
          Type
        </label>
        <select
          id="fb-type"
          className="input"
          value={type}
          onChange={(e) => setType(e.target.value as FeedbackType)}
        >
          <option value="suggestion">Feature suggestion</option>
          <option value="bug">Something is not working</option>
          <option value="data">Data accuracy concern</option>
          <option value="other">Other</option>
        </select>

        <label className="field-label" htmlFor="fb-name">
          Name (optional)
        </label>
        <input
          id="fb-name"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          autoComplete="name"
        />

        <label className="field-label" htmlFor="fb-message">
          Message
        </label>
        <textarea
          id="fb-message"
          className="input"
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={4000}
          required
          minLength={8}
          placeholder="What should change, and where did you see it?"
        />

        {mutation.isError && (
          <p className="form-status error" role="alert">
            {(mutation.error as Error).message || "Could not send. Try again."}
          </p>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={mutation.isPending || message.trim().length < 8}
        >
          {mutation.isPending ? "Sending…" : "Send to admin"}
        </button>
      </form>
    </div>
  );
}
