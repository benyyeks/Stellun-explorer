// Roman mission coverage. Data arrives through the cached server function, so
// nothing here calls the upstream feed from the browser.
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getRomanNews } from "@/lib/stellun-data.functions";
import { FeedStatus } from "@/components/site/feed-status";
import { SkeletonImage } from "@/components/site/skeleton-image";

type NewsItem = {
  id?: number | string;
  title?: string;
  url?: string;
  summary?: string;
  image_url?: string;
  news_site?: string;
  published_at?: string;
};

function formatDate(iso?: string): string {
  if (!iso) return "Date not stated";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Date not stated";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function RomanNews() {
  const fetchNews = useServerFn(getRomanNews);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["roman-news"],
    queryFn: () => fetchNews(),
    staleTime: 15 * 60 * 1000,
  });

  const items: NewsItem[] = (data?.data?.items ?? []) as NewsItem[];
  const state = isLoading
    ? "loading"
    : isError
      ? "unavailable"
      : data?.isStale
        ? "delayed"
        : "live";

  return (
    <section className="container roman-section" id="updates">
      <header className="section-head">
        <h2>Mission updates</h2>
        <p>
          Published coverage of the observatory, newest first. Each card links to the
          original article.
        </p>
      </header>

      <FeedStatus
        label="Mission coverage"
        source="Spaceflight News API"
        state={state}
        fetchedAt={data?.fetchedAt}
      />

      {isLoading ? (
        <div className="roman-news-grid">
          {[0, 1, 2].map((i) => (
            <article className="roman-news-card glass" key={i}>
              <div className="skeleton skeleton-media" />
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line short" />
            </article>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="glass glass-card scaffold-card">
          <h3>No recent coverage</h3>
          <p>
            Nothing about the observatory has been published in the current feed window.
            This view fills in as new articles appear.
          </p>
        </div>
      ) : (
        <div className="roman-news-grid">
          {items.map((item) => (
            <article className="roman-news-card glass" key={item.url ?? String(item.id)}>
              {item.image_url && (
                <SkeletonImage
                  src={item.image_url}
                  alt={item.title ?? "Mission coverage image"}
                  className="roman-news-media"
                />
              )}
              <div className="roman-news-body">
                <p className="roman-news-meta mono">
                  {formatDate(item.published_at)}
                  {item.news_site ? ` · ${item.news_site}` : ""}
                </p>
                <h3>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent"
                  >
                    {item.title ?? "Untitled article"}
                  </a>
                </h3>
                {item.summary && <p className="roman-news-summary">{item.summary}</p>}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
