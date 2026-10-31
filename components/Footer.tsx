import type { Catalog } from "@/lib/types";

export default function Footer({ catalog }: { catalog: Catalog }) {
  const updated = new Date(catalog.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  return (
    <footer className="footer">
      <div className="in">
        <div className="logo small">
          butaca<span>.</span>
        </div>
        <p>
          Title data and images from <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">TMDB</a>. This
          product uses the TMDB API but is not endorsed or certified by TMDB. Streaming availability for Mexico is
          provided by <a href="https://www.justwatch.com" target="_blank" rel="noreferrer">JustWatch</a>.
        </p>
        <p className="dim">
          {catalog.source === "tmdb" ? `Catalog of ${catalog.titles.length} titles, refreshed ${updated}.` : "Running on the built-in sample catalog."}{" "}
          Your ratings are saved only in this browser.
        </p>
      </div>
    </footer>
  );
}
