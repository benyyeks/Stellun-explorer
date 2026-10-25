import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getAPOD } from "@/lib/stellun-data.functions";
import { EmptyState } from "@/components/site/data-state";

const apodQueryOptions = queryOptions({
  queryKey: ["stellun", "apod"],
  queryFn: () => getAPOD(),
  staleTime: 60 * 60_000,
});

type Apod = {
  title?: string;
  explanation?: string;
  url?: string | null;
  hdurl?: string | null;
  date?: string | null;
  copyright?: string;
  media_type?: string;
};

export const Route = createFileRoute("/apod")({
  loader: async ({ context }) => {
    const result = await context.queryClient.ensureQueryData(apodQueryOptions);
    const apod = (result as { data?: Apod } | undefined)?.data;
    return { apod };
  },
  head: ({ loaderData }) => {
    const apod = loaderData?.apod;
    const img = apod?.hdurl || apod?.url || "";
    const title = apod?.title
      ? `${apod.title} · STELLUN`
      : "Astronomy Picture of the Day · STELLUN";
    const desc = (apod?.explanation || "NASA’s Astronomy Picture of the Day on STELLUN.").slice(0, 200);
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        {
          property: "og:url",
          content: "https://stellun-explorer.noreplyobitex.workers.dev/apod",
        },
        ...(img
          ? [
              { property: "og:image", content: img },
              { name: "twitter:card", content: "summary_large_image" },
              { name: "twitter:image", content: img },
            ]
          : [{ name: "twitter:card", content: "summary_large_image" }]),
      ],
    };
  },
  component: ApodPage,
});

function ApodPage() {
  const { data } = useSuspenseQuery(apodQueryOptions);
  const apod = data?.data as Apod | undefined;
  const img = apod?.hdurl || apod?.url || "";
  const title = apod?.title || "Astronomy Picture of the Day";
  const explanation = (apod?.explanation || "").trim();

  // Dynamic document meta for crawlers that execute limited JS is weak;
  // inject tags when we have data (helps some in-app browsers).
  if (typeof document !== "undefined" && img) {
    const setMeta = (property: string, content: string, isName = false) => {
      const sel = isName ? `meta[name="\( {property}"]` : `meta[property=" \){property}"]`;
      let el = document.head.querySelector(sel) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        if (isName) el.setAttribute("name", property);
        else el.setAttribute("property", property);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    setMeta("og:title", `${title} · STELLUN`);
    setMeta("og:description", explanation.slice(0, 200) || "NASA APOD on STELLUN");
    setMeta("og:image", img);
    setMeta("og:url", "https://stellun-explorer.noreplyobitex.workers.dev/apod");
    setMeta("og:type", "website");
    setMeta("twitter:card", "summary_large_image", true);
    setMeta("twitter:image", img, true);
    document.title = `${title} · STELLUN`;
  }

  if (!img) {
    return (
      <main className="page-main">
        <section className="tight">
          <div className="container">
            <EmptyState
              title="Picture of the Day unavailable"
              message="Check back soon — the daily NASA image will appear here."
            />
            <p style={{ marginTop: 16 }}>
              <Link to="/">← Back to STELLUN</Link>
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page-main">
      <section id="apod">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">NASA · Daily · STELLUN</span>
            <h1>Astronomy Picture of the Day</h1>
          </div>
          <article className="glass glass-card apod-card">
            <div className="apod-media">
              <img
                src={img}
                alt={title}
                className="apod-img"
                loading="eager"
                decoding="async"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="apod-body">
              <h2>{title}</h2>
              {apod?.date ? (
                <p className="text-muted mono" style={{ fontSize: "0.85rem" }}>
                  {apod.date}
                </p>
              ) : null}
              {explanation ? <p className="apod-expl">{explanation}</p> : null}
              {apod?.copyright ? (
                <p className="text-muted" style={{ fontSize: "0.8rem", marginTop: 8 }}>
                  Credit: {apod.copyright}
                </p>
              ) : null}
              <p style={{ marginTop: 16 }}>
                <Link to="/" className="btn btn-primary btn-sm">
                  Open STELLUN
                </Link>
              </p>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
