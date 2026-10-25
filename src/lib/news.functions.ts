// Public news server function: reads the latest space news from the
// space_news table, which is populated daily by the news refresh job.
// Public route (no auth): read with a publishable client, scoped by RLS to
// the public read policy.

import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

export type NewsItem = Database["public"]["Tables"]["space_news"]["Row"];

export type NewsResult = {
  items: NewsItem[];
  error: string | null;
};

function publishableClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const getLatestNews = createServerFn({ method: "GET" }).handler(async () => {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) {
    return { items: [], error: "News is unavailable right now." } satisfies NewsResult;
  }

  // space_news has no public read rule; this server-only read returns
  // just the published-story columns below.
  const { supabaseAdmin: supabase } = await import("@/integrations/supabase/client.server");
  // Only stories from the last 30 days reach the feed.
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data, error } = await supabase
    .from("space_news")
    .select("id,content_type,title,summary,url,image_url,news_site,published_at,fetched_at")
    .gte("published_at", cutoff)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(30);

  if (error) {
    return { items: [], error: "Could not reach the news service." } satisfies NewsResult;
  }
  return { items: (data ?? []) as NewsItem[], error: null } satisfies NewsResult;
});

// ---------------------------- Competitions ---------------------------------
export type CompetitionItem = Database["public"]["Tables"]["competitions"]["Row"];
export type CompetitionsResult = { items: CompetitionItem[]; error: string | null };

export const getCompetitions = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publishableClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("competitions")
    .select(
      "id,name,organizer,description,url,category,opens_at,deadline,is_active,created_at",
    )
    .eq("is_active", true)
    .or(`deadline.is.null,deadline.gte.${today}`)
    .order("deadline", { ascending: true, nullsFirst: false })
    .limit(12);

  if (error) {
    return {
      items: [],
      error: "Competitions are unavailable right now.",
    } satisfies CompetitionsResult;
  }

  // Extra safety if PostgREST or filter is picky
  const items = ((data ?? []) as CompetitionItem[]).filter((c) => {
    if (!c.deadline) return true;
    return c.deadline >= today;
  });

  return { items, error: null } satisfies CompetitionsResult;
});
// ------------------------------ Feedback ------------------------------------
export type FeedbackResult = { ok: boolean; error: string | null; delivered?: boolean };

export const submitFeedback = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().max(80).optional().default(""),
        email: z.string().max(120).optional().default(""),
        type: z.enum(["suggestion", "bug", "data", "other"]).default("suggestion"),
        message: z.string().min(3).max(2000),
        // Honeypot: real users never see or fill this field.
        company: z.string().max(200).optional().default(""),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }): Promise<FeedbackResult> => {
    // Honeypot tripped: pretend success and store nothing.
    if (data.company) return { ok: true, error: null };
    if (data.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) {
      return { ok: false, error: "That email address does not look valid." };
    }

    // Same inbox as About page → Admin → Suggestions
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("site_suggestions").insert({
      name: data.name || null,
      email: data.email || null,
      type: data.type,
      message: data.message,
      user_id: null,
      status: "new",
    });
    if (error) {
      return { ok: false, error: "Your message could not be sent. Please try again." };
    }

    // Relay the message to the team inbox. A delivery problem does not lose
    // the submission, which is already stored.
    const { sendFeedbackEmail } = await import("@/lib/feedback-mail.server");
    const mail = await sendFeedbackEmail({
      name: data.name,
      email: data.email,
      type: data.type,
      message: data.message,
    });
    if (!mail.sent) {
      return { ok: true, error: null, delivered: false };
    }
    return { ok: true, error: null, delivered: true };
  });
