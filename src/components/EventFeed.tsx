import { useMemo } from "react";
import { useStore } from "../store/store";
import type { NarrativeEvent } from "../sim/types";

const TONE_MARK: Record<NarrativeEvent["tone"], string> = {
  positif: "+",
  negatif: "−",
  alerte: "!",
  neutre: "·",
};

export function EventFeed() {
  const state = useStore();
  const { projection, currentYear } = state;

  const events = useMemo(() => {
    const out: NarrativeEvent[] = [];
    for (const ys of projection.timeline) {
      if (ys.year > currentYear) break;
      out.push(...ys.events);
    }
    return out.reverse();
  }, [projection, currentYear]);

  return (
    <section className="panel eventfeed" aria-label="Journal des evenements">
      <header className="panel-head">
        <h2 className="panel-title">Depeche NEXUS</h2>
        <span className="label">{events.length} entrees</span>
      </header>
      <ol className="feed-list" aria-live="polite">
        {events.length === 0 && (
          <li className="feed-empty label">
            Aucun evenement. Promulguez une deliberation ou avancez le temps.
          </li>
        )}
        {events.map((ev, i) => (
          <li key={`${ev.year}-${i}`} className={`feed-item tone-${ev.tone}`}>
            <div className="feed-meta">
              <span className={`feed-mark tone-${ev.tone}`} aria-hidden="true">
                {TONE_MARK[ev.tone]}
              </span>
              <span className="num feed-year">{ev.year}</span>
              <span className="label feed-source">{ev.source}</span>
            </div>
            <h3 className="feed-title">{ev.title}</h3>
            <p className="feed-body">{ev.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
