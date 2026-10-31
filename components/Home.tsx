"use client";
import Link from "next/link";
import { useMemo, useRef, useState, useEffect } from "react";
import type { Catalog, Rating, RatingEntry, Title, TitleType } from "@/lib/types";
import { SERVICES, serviceLabel } from "@/lib/services";
import { VIBES } from "@/lib/tags";
import { cosine, features, matchPct, rank, runtimeLabel, tasteSummary, TYPE_LABEL, type Scored } from "@/lib/recommend";
import { useStored } from "@/lib/useStored";
import Poster from "./Poster";

const Icon = {
  heart: <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.1 4.3 2.4h2c.7-1.3 2.2-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" /></svg>,
  up: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 10v11H3V10h4zM7 10l4-8a3 3 0 0 1 3 3v4h5.5a2 2 0 0 1 2 2.3l-1.4 8A2 2 0 0 1 18.1 21H7" /></svg>,
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>,
  skip: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 5l9 7-9 7V5zM19 5v14" /></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>,
  out: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>,
};

const entryFor = (t: Title, r: Rating): RatingEntry => ({ r, title: t.title, type: t.type, genres: t.genres, tags: t.tags });

export default function Home({ catalog }: { catalog: Catalog }) {
  const [services, setServices, ready] = useStored<string[]>("butaca.services", []);
  const [vibes, setVibes] = useStored<string[]>("butaca.vibes", []);
  const [ratings, setRatings] = useStored<Record<string, RatingEntry>>("butaca.ratings", {});
  const [type, setType] = useState<"all" | TitleType>("all");
  const [spotId, setSpotId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [leaving, setLeaving] = useState<Rating | null>(null);
  const firstVisit = ready && services.length === 0 && Object.keys(ratings).length === 0;
  const opened = useRef(false);

  // On a first visit, open the services panel so people start by picking what they pay for
  useEffect(() => {
    if (firstVisit && !opened.current) {
      opened.current = true;
      setSheetOpen(true);
    }
  }, [firstVisit]);

  const byId = useMemo(() => Object.fromEntries(catalog.titles.map((t) => [t.id, t])), [catalog]);
  const list = useMemo(() => rank(catalog.titles, ratings, vibes, { services, type }), [catalog, ratings, vibes, services, type]);
  const spot = list.find((s) => s.title.id === spotId) ?? list[0];
  const rest = list.filter((s) => s !== spot);

  const rate = (t: Title, r: Rating) => {
    setRatings((prev) => ({ ...prev, [t.id]: entryFor(t, r) }));
    if (spotId === t.id) setSpotId(null);
  };

  const deckLeft = catalog.deck.filter((id) => byId[id] && !ratings[id]);
  const deckDone = catalog.deck.length - deckLeft.length;
  const front = deckLeft[0] ? byId[deckLeft[0]] : null;
  const rateFront = (r: Rating) => {
    if (!front || leaving) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return rate(front, r);
    setLeaving(r);
    setTimeout(() => {
      rate(front, r);
      setLeaving(null);
    }, 260);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea,select")) return;
      const r = ({ "1": "loved", "2": "liked", "3": "disliked", "4": "unseen" } as Record<string, Rating>)[e.key];
      if (r) rateFront(r);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const showSpot = (id: string) => {
    setSpotId(id);
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  const lovedIds = Object.entries(ratings).filter(([, e]) => e.r === "loved").map(([id]) => id);
  const anchorId = lovedIds[lovedIds.length - 1];
  const anchor = anchorId ? ratings[anchorId] : null;
  const becauseRow = anchor
    ? rest.map((s) => ({ s, sim: cosine(features(anchor), features(s.title)) })).filter((x) => x.sim > 0.3).sort((a, b) => b.sim - a.sim).slice(0, 12).map((x) => x.s)
    : [];
  const taste = tasteSummary(ratings, vibes);

  return (
    <>
      <header className="top">
        <div className="in">
          <Link href="/" className="logo">butaca<span>.</span></Link>
          <nav className="nav" aria-label="Main">
            <Link href="/quiz" className="pill gold">Recommend me a movie</Link>
            <button className="pill" type="button" aria-expanded={sheetOpen} onClick={() => setSheetOpen((o) => !o)}>
              {services.length ? `${services.length} service${services.length > 1 ? "s" : ""} · vibes` : "Your services"}
            </button>
          </nav>
        </div>
      </header>

      {sheetOpen && (
        <div className="sheet">
          <div className="in">
            {firstVisit && <p className="welcome">Welcome! Start by telling us which services you pay for.</p>}
            <div>
              <h3>Services you pay for</h3>
              <p className="hint">We'll only suggest titles you can watch on these in Mexico.</p>
              <div className="chips">
                {Object.entries(SERVICES).map(([k, s]) => (
                  <button key={k} type="button" className="chip" aria-pressed={services.includes(k)} onClick={() => setServices(toggle(services, k))}>{s.label}</button>
                ))}
              </div>
            </div>
            <div>
              <h3>What are you in the mood for?</h3>
              <p className="hint">Optional. Nudges your picks.</p>
              <div className="chips">
                {VIBES.map((v) => (
                  <button key={v} type="button" className="chip" aria-pressed={vibes.includes(v)} onClick={() => setVibes(toggle(vibes, v))}>{v}</button>
                ))}
              </div>
            </div>
            <div><button className="btn gold" type="button" onClick={() => setSheetOpen(false)}>Done</button></div>
          </div>
        </div>
      )}

      <Spotlight s={spot} services={services} isTop={spot === list[0]} onRate={rate} />

      <div className="in">
        <div className="tabs" role="group" aria-label="Show">
          {(["all", "movie", "series", "doc"] as const).map((v) => (
            <button key={v} type="button" className="tab" aria-pressed={type === v} onClick={() => { setType(v); setSpotId(null); }}>
              {v === "all" ? "Everything" : v === "doc" ? "Docs" : TYPE_LABEL[v] + (v === "movie" ? "s" : "")}
            </button>
          ))}
        </div>
        {catalog.source === "sample" && <div className="notice">{catalog.note} Availability and scores here are illustrative.</div>}
        {ready && services.length === 0 && (
          <div className="notice">Showing everything on any service. <button className="link" type="button" onClick={() => setSheetOpen(true)}>Pick your services</button> to see only what you can watch.</div>
        )}
      </div>

      <Row title={anchor ? <>Because you loved <em>{anchor.title}</em></> : null} sub="Same feeling, different story." items={becauseRow} services={services} onOpen={showSpot} />
      <Row title="Picked for you" sub="Ranked by how well each one fits your taste." items={rest.slice(0, 14)} services={services} onOpen={showSpot} badge={(s) => (s.title.trending ? "POPULAR" : null)} />
      <Row title="Highly rated" sub="Scored 80% or more by TMDB users." items={[...rest].filter((s) => s.title.score >= 80).sort((a, b) => b.title.score - a.title.score).slice(0, 14)} services={services} onOpen={showSpot} />
      <Row title="Hidden gems" sub="Loved by those who found them, less known by everyone else." items={rest.filter((s) => s.title.score >= 74 && s.title.pop < 0.4).slice(0, 14)} services={services} onOpen={showSpot} />
      <Row title="Hecho en México" sub="Mexican stories and productions." items={rest.filter((s) => s.title.tags.includes("mexican")).slice(0, 14)} services={services} onOpen={showSpot} />
      <Row title="Short on time?" sub="Movies under 1 h 45, or series with half-hour episodes." items={rest.filter((s) => (s.title.type === "series" ? s.title.runtime <= 35 : s.title.runtime <= 105)).slice(0, 14)} services={services} onOpen={showSpot} />
      {list.length === 0 && <div className="in"><div className="empty">Nothing matches on your services. Add a service or switch to “Everything”.</div></div>}

      <section className="quizcall">
        <div className="in">
          <div className="box">
            <div>
              <div className="eyebrow">Can't decide?</div>
              <h2>Answer six questions, get one pick.</h2>
              <p>Who's watching, how much time you have, your mood. We do the rest.</p>
            </div>
            <Link href="/quiz" className="btn gold big">Recommend me a movie</Link>
          </div>
        </div>
      </section>

      <section className="booth" aria-label="Rate titles">
        <div className="in">
          <div>
            <div className="eyebrow">Sharpen your picks</div>
            <h2>Seen these? Tell us how they landed.</h2>
            <p>Every rating reshapes your picks instantly. Skip anything you haven't watched. Keys 1 to 4 work too.</p>
            <div className="taste">
              <small>{taste.length ? "Your taste so far" : "Your taste"}</small>
              <div className="tl">
                {taste.length ? (
                  <>You're {taste.map((t, i) => (
                    <span key={t.tag}>{i > 0 && (i === taste.length - 1 ? " and " : ", ")}<em>{t.pct}% {t.tag}</em></span>
                  ))}.</>
                ) : "Still a mystery. For now, picks lean on ratings and what's popular."}
              </div>
            </div>
          </div>
          <div>
            {front ? (
              <>
                <div className="stack">
                  {deckLeft[2] && <Poster t={byId[deckLeft[2]]} className="b2" />}
                  {deckLeft[1] && <Poster t={byId[deckLeft[1]]} className="b1" />}
                  <div
                    className={`front-wrap ${leaving ? "" : ""}`}
                    style={{ position: "absolute", inset: 0 }}
                  >
                    <div
                      className={`poster-holder front ${leaving ? "go" : ""}`}
                      style={{
                        position: "absolute", inset: 0,
                        ["--dx" as string]: leaving === "liked" ? "160px" : leaving === "disliked" ? "-160px" : "0px",
                        ["--rot" as string]: leaving === "liked" ? "14deg" : leaving === "disliked" ? "-14deg" : "0deg",
                      }}
                    >
                      <Poster key={front.id} t={front} eager />
                    </div>
                  </div>
                </div>
                <div className="stack-title">{front.title}<span>{TYPE_LABEL[front.type]} · {front.year}</span></div>
                <div className="votes" role="group" aria-label={`Rate ${front.title}`}>
                  <button className="vote" type="button" onClick={() => rateFront("disliked")}><span className="o">{Icon.x}</span>Not for me<kbd>3</kbd></button>
                  <button className="vote love" type="button" onClick={() => rateFront("loved")}><span className="o">{Icon.heart}</span>Loved it<kbd>1</kbd></button>
                  <button className="vote like" type="button" onClick={() => rateFront("liked")}><span className="o">{Icon.up}</span>Liked it<kbd>2</kbd></button>
                  <button className="vote" type="button" onClick={() => rateFront("unseen")}><span className="o">{Icon.skip}</span>Haven't seen<kbd>4</kbd></button>
                </div>
                <div className="count">{deckDone} of {catalog.deck.length} rated</div>
              </>
            ) : (
              <div className="finished"><strong>That's a wrap.</strong>Your picks are tuned. Keep teaching Butaca from the spotlight above.</div>
            )}
            {Object.keys(ratings).length > 0 && (
              <p className="hint" style={{ textAlign: "center", marginTop: 14 }}>
                <button className="link" type="button" onClick={() => setRatings({})}>Clear my ratings</button>
              </p>
            )}
          </div>
        </div>
      </section>
    </>
  );

}

function Spotlight({ s, services, isTop, onRate }: { s?: Scored; services: string[]; isTop: boolean; onRate: (t: Title, r: Rating) => void }) {
  if (!s) {
    return (
      <section className="spot" aria-label="Tonight's pick">
        <div className="spot-bg" style={{ background: "var(--bg-2)" }} />
        <div className="in"><div><div className="eyebrow">Tonight's pick</div><h1>Nothing to show yet</h1><p className="why">Add a streaming service to see what's waiting for you.</p></div></div>
      </section>
    );
  }
  const t = s.title;
  return (
    <section className="spot" aria-label="Tonight's pick">
      <div className={`spot-bg ${t.backdrop ? "" : "blur"}`} style={t.backdrop ? { backgroundImage: `url(${t.backdrop})` } : { background: "var(--card)" }} />
      <div className="spot-shade" />
      <div className="in">
        <div>
          <div className="eyebrow">{isTop ? "Tonight's pick for you" : "In the spotlight"}</div>
          <h1>{t.title}</h1>
          <div className="facts">
            <span className="match">{matchPct(s.total)}% match</span>
            <span>{t.year}</span><span>{TYPE_LABEL[t.type]}</span><span>{runtimeLabel(t)}</span><span>TMDB {t.score}%</span>
          </div>
          <p className="why">{s.why}.</p>
          {t.overview && <p className="overview">{t.overview}</p>}
          <div className="where">
            <span>Stream it on</span>
            {t.providers.map((p) => <span key={p} className={`svc ${services.includes(p) ? "yes" : ""}`}>{serviceLabel(p)}</span>)}
          </div>
          <div className="cta">
            {t.watchLink && <a className="btn gold" href={t.watchLink} target="_blank" rel="noreferrer">{Icon.out}Where to watch</a>}
            <button className="btn ghost" type="button" onClick={() => onRate(t, "liked")}>{Icon.check}Seen it, liked it</button>
            <button className="btn ghost" type="button" onClick={() => onRate(t, "disliked")}>{Icon.x}Not for me</button>
          </div>
        </div>
        <Poster t={t} className="spot-poster" eager />
      </div>
    </section>
  );
}

function Row({ title, sub, items, services, onOpen, badge }: {
  title: React.ReactNode; sub?: string; items: Scored[]; services: string[]; onOpen: (id: string) => void; badge?: (s: Scored) => string | null;
}) {
  if (!title || !items.length) return null;
  return (
    <section className="row">
      <div className="in"><h2>{title}</h2>{sub && <p className="sub">{sub}</p>}</div>
      <div className="rail-wrap">
        <div className="rail">
          {items.map((s) => {
            const t = s.title;
            const mine = t.providers.filter((p) => services.includes(p));
            const b = badge?.(s);
            return (
              <div className="card" key={t.id}>
                <button type="button" onClick={() => onOpen(t.id)} aria-label={`Spotlight ${t.title}`}>
                  {b && <span className="badge">{b}</span>}
                  <Poster t={t} />
                </button>
                <div className="ct">{t.title}</div>
                <div className="cm"><span className="m">{matchPct(s.total)}%</span><span>{(mine.length ? mine : t.providers).slice(0, 2).map(serviceLabel).join(" · ")}</span></div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
