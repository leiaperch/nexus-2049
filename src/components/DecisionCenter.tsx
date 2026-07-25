import { useEffect, useRef, useState } from "react";
import { DECISIONS, INDICATOR_BY_KEY, TRACK_META } from "../sim/data";
import { canEnact } from "../sim/engine";
import type { Decision, Track } from "../sim/types";
import { actions, useStore } from "../store/store";
import { INDICATOR_COLORVAR } from "../lib/colors";
import { fmtSigned } from "../lib/format";

const TRACKS: Track[] = ["energie", "mobilite", "climat"];

export function DecisionCenter({ onClose }: { onClose: () => void }) {
  const state = useStore();
  const ref = useRef<HTMLDivElement>(null);
  const [track, setTrack] = useState<Track>("energie");

  useEffect(() => {
    const el = ref.current;
    el?.querySelector<HTMLElement>("button, [tabindex]")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const list = DECISIONS.filter((d) => d.track === track);

  return (
    <div
      className="drawer-scrim"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <aside
        className="drawer decision-center"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Centre de decision"
      >
        <header className="drawer-head">
          <div>
            <span className="label">NEXUS · module de gouvernance</span>
            <h2 className="drawer-title">Centre de decision</h2>
          </div>
          <button className="btn btn-icon" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </header>

        <p className="drawer-intro">
          Chaque deliberation engage la collectivite pour la duree de la
          projection. Les effets immediats sont connus ; les consequences
          differees se revelent avec le temps. Annee de promulgation :{" "}
          <strong className="num">{state.currentYear}</strong>.
        </p>

        <div className="track-tabs" role="tablist" aria-label="Axes strategiques">
          {TRACKS.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={track === t}
              className={`track-tab ${track === t ? "is-active" : ""}`}
              onClick={() => setTrack(t)}
            >
              <span className="label">{TRACK_META[t].code}</span>
              <span className="track-tab-name">{TRACK_META[t].label}</span>
            </button>
          ))}
        </div>
        <p className="track-brief">{TRACK_META[track].brief}</p>

        <div className="decision-grid" role="tabpanel">
          {list.map((d) => (
            <DecisionCard key={d.id} decision={d} />
          ))}
        </div>
      </aside>
    </div>
  );
}

function DecisionCard({ decision }: { decision: Decision }) {
  const state = useStore();
  const enacted = state.enacted.some((e) => e.decisionId === decision.id);
  const check = canEnact(decision, state.enacted, state.currentYear);
  const [revealed, setRevealed] = useState(false);

  const immediate = Object.entries(decision.immediate).filter(([, v]) => v !== 0);

  return (
    <article className={`decision-card ${enacted ? "is-enacted" : ""}`}>
      <div className="dc-top">
        <span className="label-strong dc-ref">{decision.ref}</span>
        {enacted ? (
          <span className="dc-badge on">EN VIGUEUR</span>
        ) : (
          <span className="dc-cost num">{decision.costLabel}</span>
        )}
      </div>
      <h3 className="dc-title">{decision.title}</h3>
      <p className="dc-summary">{decision.summary}</p>

      <dl className="dc-facts">
        <div className="dc-fact">
          <dt className="label">Benefice</dt>
          <dd>{decision.benefit}</dd>
        </div>
        <div className="dc-fact risk">
          <dt className="label">Risque</dt>
          <dd>{decision.risk}</dd>
        </div>
      </dl>

      {immediate.length > 0 && (
        <div className="dc-impacts" aria-label="Impacts immediats">
          <span className="label">impact immediat</span>
          <div className="dc-chips">
            {immediate.map(([k, v]) => {
              const meta = INDICATOR_BY_KEY[k];
              const good = meta.higherBetter ? v > 0 : v < 0;
              return (
                <span
                  key={k}
                  className={`dc-chip ${good ? "good" : "bad"}`}
                  style={{ borderColor: INDICATOR_COLORVAR[k] }}
                >
                  <span
                    className="dc-chip-dot"
                    style={{ background: INDICATOR_COLORVAR[k] }}
                  />
                  {meta.short} {fmtSigned(v, k === "budget" ? 0 : 1)}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <button
        className="dc-reveal"
        aria-expanded={revealed}
        onClick={() => setRevealed((r) => !r)}
      >
        {revealed ? "▾" : "▸"} {decision.delayed.length} consequence
        {decision.delayed.length > 1 ? "s" : ""} differee
        {decision.delayed.length > 1 ? "s" : ""}
        {!revealed && " · non revelee" + (decision.delayed.length > 1 ? "s" : "")}
      </button>
      {revealed && (
        <ul className="dc-delayed">
          {decision.delayed.map((de, i) => (
            <li key={i} className={`dc-delayed-item tone-${de.tone ?? "neutre"}`}>
              <span className="num dc-delay-t">+{de.delay} ans</span>
              <span>{de.narrative ?? "Effet non narratif sur les indicateurs."}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="dc-action">
        {enacted ? (
          <button className="btn" onClick={() => actions.repealDecision(decision.id)}>
            Abroger
          </button>
        ) : (
          <button
            className="btn dc-enact"
            disabled={!check.ok}
            onClick={() => actions.enactDecision(decision.id)}
            title={check.reason}
          >
            {check.ok ? "Promulguer" : check.reason}
          </button>
        )}
      </div>
    </article>
  );
}
