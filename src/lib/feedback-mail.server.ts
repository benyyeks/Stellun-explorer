// Server-only: relays a feedback submission to the STELLUN team inbox through
// the linked Resend connection. Failures are reported to the caller but never
// block the stored feedback row.

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const ADMIN_INBOX = "noreplyobitex@gmail.com";
const FROM_ADDRESS = "STELLUN <onboarding@resend.dev>";

const TYPE_LABEL: Record<string, string> = {
  suggestion: "Feature suggestion",
  bug: "Something is not working",
  data: "Data accuracy concern",
  other: "Other",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendFeedbackEmail(input: {
  name: string;
  email: string;
  type: string;
  message: string;
}): Promise<{ sent: boolean; reason: string | null }> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const resendKey = process.env["RESEND_API_KEY"];
  if (!lovableKey || !resendKey) {
    return { sent: false, reason: "Email delivery is not configured." };
  }

  const label = TYPE_LABEL[input.type] ?? "Feedback";
  const from = input.name || "Anonymous visitor";
  const reply = input.email || "not provided";
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#1f2430;line-height:1.55">
      <h2 style="margin:0 0 12px">New STELLUN feedback</h2>
      <p style="margin:0 0 4px"><strong>Type:</strong> ${escapeHtml(label)}</p>
      <p style="margin:0 0 4px"><strong>From:</strong> ${escapeHtml(from)}</p>
      <p style="margin:0 0 16px"><strong>Reply to:</strong> ${escapeHtml(reply)}</p>
      <div style="padding:14px 16px;background:#f4f6fa;border-radius:8px;white-space:pre-wrap">${escapeHtml(
        input.message
      )}</div>
    </div>
  `;

  try {
    const response = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": resendKey,
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [ADMIN_INBOX],
        subject: `STELLUN feedback: ${label}`,
        html,
        ...(input.email ? { reply_to: input.email } : {}),
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      console.error(`Feedback email failed [${response.status}]: ${body}`);
      return { sent: false, reason: `Email provider refused the message (${response.status}).` };
    }
    return { sent: true, reason: null };
  } catch (err) {
    console.error("Feedback email failed:", err);
    return { sent: false, reason: "Email provider could not be reached." };
  }
}
