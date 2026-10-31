import type { Title } from "@/lib/types";
import { TYPE_LABEL } from "@/lib/recommend";

function hue(id: string) {
  let h = 7;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

/** Gradient used when a title has no poster (and behind posters while they load) */
export function fallbackBg(id: string) {
  const h = hue(id);
  return `linear-gradient(165deg,hsl(${h} 50% 40%) 0%,hsl(${(h + 35) % 360} 55% 20%) 55%,hsl(${(h + 60) % 360} 45% 9%) 100%)`;
}

export default function Poster({ t, className = "", eager = false }: { t: Title; className?: string; eager?: boolean }) {
  return (
    <div className={`poster ${className}`} style={{ background: fallbackBg(t.id) }}>
      {t.poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={t.poster} alt={`Poster for ${t.title}`} loading={eager ? "eager" : "lazy"} />
      ) : (
        <div className="poster-fallback">
          <span className="yr">
            {TYPE_LABEL[t.type]} · {t.year}
          </span>
          <span className="nm">{t.title}</span>
        </div>
      )}
    </div>
  );
}
