"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Catalog, Title } from "@/lib/types";
import { SERVICES, serviceLabel } from "@/lib/services";
import { runtimeLabel, TYPE_LABEL } from "@/lib/recommend";
import { useStored } from "@/lib/useStored";
import Poster, { fallbackBg } from "./Poster";

type Answers = { who: string | null; format: string | null; time: string | null; mood: string[]; adv: string | null; svc: string[] };

const MOODS: Record<string, { label: string; d: string; tags: string[]; g: string[] }> = {
  cozy: { label: "Cozy & warm", d: "Comfort, laughs, a blanket", tags: ["cozy", "feel-good", "whimsical"], g: ["comedy", "family"] },
  tense: { label: "Dark & tense", d: "Crime, suspense, edge of your seat", tags: ["dark crime", "intense", "twisty", "dark"], g: ["thriller", "crime"] },
  mind: { label: "Mind-bending", d: "Twists that stay with you", tags: ["mind-bending", "twisty", "slow-burn"], g: ["scifi", "mystery"] },
  epic: { label: "Big & epic", d: "Spectacle, worlds, adrenaline", tags: ["epic", "intense", "stylish"], g: ["action", "adventure", "war"] },
  heart: { label: "Make me feel", d: "Love, loss, a good cry", tags: ["emotional", "bittersweet", "romantic"], g: ["romance", "drama"] },
  real: { label: "True stories", d: "Real people, real places", tags: ["true story", "nature", "sports", "food"], g: ["documentary"] },
  mexican: { label: "Hecho en México", d: "Mexican stories and settings", tags: ["mexican"], g: [] },
  scary: { label: "Scare me", d: "Lights off, volume up", tags: ["dark"], g: ["horror"] },
};

type Q = { id: keyof Answers; title: string; sub: string; multi?: number; opts?: { v: string; ic: string; b: string; d: string }[] };
const QUESTIONS: Q[] = [
  { id: "who", title: "Who's watching tonight?", sub: "So we get the vibe of the room right.", opts: [
    { v: "solo", ic: "1", b: "Just me", d: "My night, my pick" },
    { v: "partner", ic: "2", b: "Me and my partner", d: "Something we'll both enjoy" },
    { v: "friends", ic: "4+", b: "A group of friends", d: "Fun to watch together" },
    { v: "family", ic: "✦", b: "Family, kids included", d: "Nothing too dark or scary" }] },
  { id: "format", title: "Movie or series?", sub: "Or let us decide.", opts: [
    { v: "movie", ic: "▶", b: "A movie", d: "One story, start to finish" },
    { v: "series", ic: "≡", b: "A series", d: "Something to come back to" },
    { v: "doc", ic: "◎", b: "A documentary", d: "Learn something true" },
    { v: "any", ic: "?", b: "Surprise me", d: "Whatever fits best" }] },
  { id: "time", title: "How much time do you have?", sub: "For series, think one or two episodes.", opts: [
    { v: "short", ic: "90′", b: "About an hour and a half", d: "Short and sweet" },
    { v: "mid", ic: "2h", b: "Around two hours", d: "A regular movie night" },
    { v: "long", ic: "∞", b: "All night", d: "Bring on the epic" },
    { v: "ep", ic: "30′", b: "Just half an hour", d: "A quick episode" }] },
  { id: "mood", title: "What are you in the mood for?", sub: "Pick up to two.", multi: 2 },
  { id: "adv", title: "Familiar or something new?", sub: "How adventurous are you feeling?", opts: [
    { v: "safe", ic: "★", b: "A crowd-pleaser", d: "Popular and widely loved" },
    { v: "mix", ic: "½", b: "Somewhere in between", d: "Good, not necessarily famous" },
    { v: "gem", ic: "◆", b: "A hidden gem", d: "Highly rated, less known" }] },
  { id: "svc", title: "Where can you watch?", sub: "Pick every service you pay for.", multi: 99 },
];

const ROOM: Record<string, { tags: string[]; base: number; label: string }> = {
  solo: { tags: ["slow-burn", "mind-bending", "bittersweet", "emotional"], base: 0.5, label: "Great for a night on your own" },
  partner: { tags: ["romantic", "bittersweet", "emotional", "feel-good", "twisty"], base: 0.3, label: "Works for two" },
  friends: { tags: ["twisty", "feel-good", "intense", "dark", "stylish"], base: 0.3, label: "Fun to watch as a group" },
  family: { tags: ["family", "animation", "whimsical", "feel-good", "nature", "cozy"], base: 0.2, label: "Safe for the whole family" },
};

type Relax = { time?: boolean; svc?: boolean; format?: boolean };

function fits(t: Title, a: Answers, rel: Relax) {
  if (!rel.format && a.format && a.format !== "any" && t.type !== a.format) return false;
  if (!rel.time) {
    if (a.time === "short" && (t.type === "series" ? t.runtime > 45 : t.runtime > 100)) return false;
    if (a.time === "mid" && t.type !== "series" && t.runtime > 135) return false;
    if (a.time === "ep" && (t.type === "movie" || t.runtime > 35)) return false;
  }
  if (a.who === "family" && (t.genres.includes("horror") || t.genres.includes("crime") || t.tags.includes("dark") || t.tags.includes("dark crime"))) return false;
  if (!rel.svc && a.svc.length && !t.providers.some((p) => a.svc.includes(p))) return false;
  return true;
}

function score(t: Title, a: Answers) {
  const f = new Set([...t.tags, ...t.genres]);
  let mood = 0.5;
  if (a.mood.length) {
    mood = a.mood.reduce((s, m) => {
      const M = MOODS[m];
      const hits = M.tags.filter((x) => f.has(x)).length + M.g.filter((x) => f.has(x)).length * 1.2;
      return s + Math.min(1, hits / 2);
    }, 0) / a.mood.length;
  }
  const R = a.who ? ROOM[a.who] : null;
  let room = R ? (R.tags.some((x) => f.has(x)) ? 1 : R.base) : 0.5;
  if (a.time === "long" && t.type === "movie" && t.runtime >= 140) room += 0.2;
  const quality = t.score / 100;
  const adv = a.adv === "safe" ? t.pop * 0.7 + quality * 0.3 : a.adv === "gem" ? Math.min(1, quality * 0.8 + (1 - t.pop) * 0.5 - (t.trending ? 0.2 : 0)) : quality;
  return 0.5 * mood + 0.15 * room + 0.2 * quality + 0.15 * adv;
}

const pct = (s: number) => Math.min(99, Math.round(52 + s * 50));

export default function Quiz({ catalog }: { catalog: Catalog }) {
  const [savedSvc, setSavedSvc] = useStored<string[]>("butaca.services", []);
  const [view, setView] = useState<"start" | "quiz" | "leader" | "result">("start");
  const [step, setStep] = useState(0);
  const [ans, setAns] = useState<Answers>({ who: null, format: null, time: null, mood: [], adv: null, svc: [] });
  const [shown, setShown] = useState(0);
  const [count, setCount] = useState(3);
  const [sweep, setSweep] = useState(0);
  const [locked, setLocked] = useState(false);
  const raf = useRef<number | null>(null);

  // Posters for the mood tiles: the most popular title in each mood
  const moodArt = useMemo(() => {
    const out: Record<string, Title | undefined> = {};
    for (const [k, M] of Object.entries(MOODS)) {
      out[k] = [...catalog.titles]
        .filter((t) => M.tags.some((x) => t.tags.includes(x)) || M.g.some((g) => t.genres.includes(g)))
        .filter((t) => !Object.values(out).includes(t))
        .sort((a, b) => b.pop - a.pop)[0];
    }
    return out;
  }, [catalog]);

  const { ranked, relaxed } = useMemo(() => {
    const tries: Relax[] = [{}, { time: true }, { time: true, svc: true }, { time: true, svc: true, format: true }];
    for (const rel of tries) {
      const list = catalog.titles.filter((t) => fits(t, ans, rel)).map((t) => ({ t, s: score(t, ans) })).sort((a, b) => b.s - a.s);
      if (list.length) return { ranked: list.slice(0, 10), relaxed: rel };
    }
    return { ranked: [] as { t: Title; s: number }[], relaxed: {} as Relax };
  }, [catalog, ans]);

  const q = QUESTIONS[step];
  const value = ans[q.id];
  const canNext = Array.isArray(value) ? value.length > 0 : value !== null;
  const reduce = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const start = () => {
    setAns({ who: null, format: null, time: null, mood: [], adv: null, svc: savedSvc.length ? savedSvc : [] });
    setStep(0); setShown(0); setLocked(false); setView("quiz");
  };
  const next = () => {
    if (step < QUESTIONS.length - 1) setStep(step + 1);
    else finish();
  };
  const back = () => (step === 0 ? setView("start") : setStep(step - 1));

  const pick = (v: string) => {
    if (q.multi) {
      const arr = ans[q.id] as string[];
      let nextArr: string[];
      if (arr.includes(v)) nextArr = arr.filter((x) => x !== v);
      else if (arr.length < q.multi) nextArr = [...arr, v];
      else nextArr = [arr[arr.length - 1], v];
      setAns({ ...ans, [q.id]: nextArr });
    } else {
      setAns({ ...ans, [q.id]: v });
      setTimeout(() => setStep((s) => (s === step && step < QUESTIONS.length - 1 ? s + 1 : s)), reduce() ? 0 : 220);
    }
  };

  const finish = () => {
    if (ans.svc.length) setSavedSvc(ans.svc);
    setShown(0);
    if (reduce()) return setView("result");
    setView("leader");
    const t0 = performance.now(), dur = 2100;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      setCount(Math.max(1, 3 - Math.floor(p * 3)));
      setSweep(((p * 3) % 1) * 360);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else setView("result");
    };
    raf.current = requestAnimationFrame(tick);
  };
  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);

  useEffect(() => {
    if (view !== "quiz") return;
    const onKey = (e: KeyboardEvent) => {
      const n = parseInt(e.key, 10);
      const opts = q.id === "mood" ? Object.keys(MOODS) : q.id === "svc" ? Object.keys(SERVICES) : q.opts!.map((o) => o.v);
      if (n >= 1 && n <= opts.length) pick(opts[n - 1]);
      else if (e.key === "Enter" && q.multi && canNext && !(e.target as HTMLElement).closest(".opt")) next();
      else if (e.key === "Escape") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => { window.scrollTo({ top: 0 }); }, [view]);

  const fan = useMemo(() => [...catalog.titles].sort((a, b) => b.pop - a.pop).filter((t) => t.poster || catalog.source === "sample").slice(0, 3), [catalog]);

  return (
    <>
      <header className="top">
        <div className="in">
          <Link href="/" className="logo">butaca<span>.</span></Link>
          <nav className="nav"><Link href="/" className="pill">Back to my picks</Link></nav>
        </div>
      </header>

      <main className="qwrap">
        {view === "start" && (
          <section className="qhero">
            <div>
              <div className="eyebrow">Can't decide?</div>
              <h1>Let us pick tonight's movie.</h1>
              <p>Answer six quick questions about your night. We'll find one title that fits, on a service you already pay for.</p>
              <button className="btn gold big" type="button" onClick={start}>Recommend me a movie</button>
              <div className="steps-preview">{["Who's watching", "Format", "Time", "Mood", "Familiar or new", "Services"].map((s) => <span key={s}>{s}</span>)}</div>
            </div>
            <div className="fan" aria-hidden="true">
              {fan.map((t) => <Poster key={t.id} t={t} eager />)}
              <div className="q">?</div>
            </div>
          </section>
        )}

        {view === "quiz" && (
          <section className="quiz" aria-live="polite">
            <div className="strip" aria-hidden="true">
              {QUESTIONS.map((_, i) => <i key={i} className={i < step ? "done" : i === step ? "now" : ""} />)}
            </div>
            <div className="qhead enter" key={step}>
              <span className="qnum">Question {step + 1} of {QUESTIONS.length}</span>
              <h2>{q.title}</h2>
              <p>{q.sub}</p>
            </div>

            {q.id === "mood" ? (
              <div className="opts moods">
                {Object.entries(MOODS).map(([k, m], i) => {
                  const t = moodArt[k];
                  return (
                    <button key={k} type="button" className="opt mood" aria-pressed={ans.mood.includes(k)} onClick={() => pick(k)}>
                      {t?.poster ? <img src={t.poster} alt="" /> : <span className="mbg" style={{ background: fallbackBg("mood-" + k) }} />}
                      <span className="lab"><b>{m.label}</b><span>{m.d}</span></span>
                      <kbd>{i + 1}</kbd>
                    </button>
                  );
                })}
              </div>
            ) : q.id === "svc" ? (
              <div className="opts">
                {Object.entries(SERVICES).map(([k, s], i) => (
                  <button key={k} type="button" className="opt" aria-pressed={ans.svc.includes(k)} onClick={() => pick(k)}>
                    <b>{s.label}</b>
                    <span className="d">{catalog.titles.filter((t) => t.providers.includes(k)).length} titles we track</span>
                    <kbd>{i + 1}</kbd>
                  </button>
                ))}
              </div>
            ) : (
              <div className="opts">
                {q.opts!.map((o, i) => (
                  <button key={o.v} type="button" className="opt" aria-pressed={ans[q.id] === o.v} onClick={() => pick(o.v)}>
                    <span className="ic">{o.ic}</span><b>{o.b}</b><span className="d">{o.d}</span><kbd>{i + 1}</kbd>
                  </button>
                ))}
              </div>
            )}

            <div className="qnav">
              <button className="btn ghost" type="button" onClick={back}>{step === 0 ? "Cancel" : "Back"}</button>
              <span className="hint">
                {q.multi ? (q.multi < 9 ? `${(value as string[]).length} of ${q.multi} picked` : `${(value as string[]).length} selected`) : "Tap an answer to continue"}
              </span>
              {q.multi ? (
                <button className="btn gold" type="button" disabled={!canNext} onClick={next}>{step === QUESTIONS.length - 1 ? "Find my pick" : "Next"}</button>
              ) : <span />}
            </div>
          </section>
        )}

        {view === "leader" && (
          <section className="leader" aria-label="Finding your pick">
            <div className="cross" />
            <div className="ring" style={{ ["--p" as string]: `${sweep}deg` }}><span className="n">{count}</span></div>
            <div className="msg">{["Checking your services…", "Matching your mood…", `Checking ${catalog.titles.length} titles against your night…`][count - 1]}</div>
          </section>
        )}

        {view === "result" && <Result />}
      </main>
    </>
  );

  function Result() {
    if (!ranked.length) {
      return (
        <section className="result"><div className="rin"><div>
          <div className="eyebrow">No match</div><h2>Nothing fits all that</h2><p>Try a different mood or add a service.</p>
          <div className="cta"><button className="btn gold" type="button" onClick={start}>Start over</button></div>
        </div></div></section>
      );
    }
    const { t, s } = ranked[shown];
    const f = new Set([...t.tags, ...t.genres]);
    const checks: string[] = [];
    const hit = ans.mood.filter((m) => MOODS[m].tags.some((x) => f.has(x)) || MOODS[m].g.some((g) => f.has(g)));
    if (hit.length) checks.push(`${hit.map((m) => MOODS[m].label).join(" and ")}, like you asked`);
    if (!relaxed.time) {
      if (ans.time === "short") checks.push(t.type === "series" ? `Short episodes, about ${t.runtime} min each` : `Fits your evening at ${runtimeLabel(t)}`);
      if (ans.time === "mid") checks.push(t.type === "series" ? `Two episodes in about ${t.runtime * 2} min` : `Fits your evening at ${runtimeLabel(t)}`);
      if (ans.time === "long") checks.push(t.type === "series" ? "Perfect for a binge" : `A proper night in at ${runtimeLabel(t)}`);
      if (ans.time === "ep") checks.push(`One episode is about ${t.runtime} min`);
    }
    if (ans.who) checks.push(ROOM[ans.who].label);
    if (ans.adv === "gem" && t.pop < 0.5) checks.push(`Rated ${t.score}% but flies under the radar`);
    else checks.push(`Rated ${t.score}% by TMDB users`);
    const on = t.providers.filter((p) => ans.svc.includes(p));
    if (on.length) checks.push(`On ${on.map(serviceLabel).join(" and ")}, which you already have`);
    const warns: string[] = [];
    if (relaxed.svc && !on.length) warns.push(`Not on your services. It's on ${t.providers.map(serviceLabel).join(", ")}`);
    if (relaxed.time) warns.push("A bit longer than you wanted. Nothing shorter matched");
    if (relaxed.format) warns.push("A different format than you picked. Nothing else matched");
    const alts = ranked.map((r, i) => ({ ...r, i })).filter((r) => r.i !== shown).slice(0, 3);
    const labels = [
      QUESTIONS[0].opts!.find((o) => o.v === ans.who)?.b, QUESTIONS[1].opts!.find((o) => o.v === ans.format)?.b,
      QUESTIONS[2].opts!.find((o) => o.v === ans.time)?.b, ...ans.mood.map((m) => MOODS[m].label), QUESTIONS[4].opts!.find((o) => o.v === ans.adv)?.b,
    ].filter(Boolean) as string[];
    return (
      <section className="result">
        {t.backdrop && <div className="rbg" style={{ backgroundImage: `url(${t.backdrop})` }} />}
        <div className="rshade" />
        <div className="rin enter" key={t.id}>
          <div>
            <div className="eyebrow">{shown === 0 ? "Your pick for tonight" : `Another option · ${shown + 1} of ${ranked.length}`}</div>
            <h2>{t.title}</h2>
            <div className="facts"><span className="match">{pct(s)}% fit</span><span>{t.year}</span><span>{TYPE_LABEL[t.type]}</span><span>{runtimeLabel(t)}</span></div>
            {t.overview && <p className="overview">{t.overview}</p>}
            <ul className="checks">
              {checks.slice(0, 5).map((c) => <li key={c}>{c}</li>)}
              {warns.map((w) => <li key={w} className="warn">{w}</li>)}
            </ul>
            <div className="where"><span>Stream it on</span>{t.providers.map((p) => <span key={p} className={`svc ${ans.svc.includes(p) ? "yes" : ""}`}>{serviceLabel(p)}</span>)}</div>
            <div className="cta">
              {t.watchLink
                ? <a className="btn gold" href={t.watchLink} target="_blank" rel="noreferrer">Where to watch</a>
                : <button className="btn gold" type="button" disabled={locked} onClick={() => setLocked(true)}>{locked ? "Enjoy the show!" : "Let's watch this"}</button>}
              <button className="btn ghost" type="button" disabled={shown >= ranked.length - 1} onClick={() => setShown(shown + 1)}>Not feeling it, show another</button>
              <button className="btn ghost" type="button" onClick={start}>Start over</button>
            </div>
            <div className="answers">{labels.map((l) => <span key={l}>{l}</span>)}</div>
          </div>
          <Poster t={t} className="rposter" eager />
        </div>
        {alts.length > 0 && (
          <div className="alts">
            <h3>Also a good fit</h3>
            <div className="alt-row">
              {alts.map((a) => (
                <button key={a.t.id} type="button" className="alt" onClick={() => setShown(a.i)}>
                  <Poster t={a.t} />
                  <div><b>{a.t.title}</b><span><span className="m">{pct(a.s)}%</span> · {TYPE_LABEL[a.t.type]} · {runtimeLabel(a.t)}</span></div>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    );
  }
}
