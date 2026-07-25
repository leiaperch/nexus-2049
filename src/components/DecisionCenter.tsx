import { useEffect, useMemo, useRef, useState } from "react";
import { DECISIONS, INDICATOR_BY_KEY, TRACK_META } from "../sim/data";
import type { Decision, Track } from "../sim/types";
import { actions, useStore } from "../store/store";
import { INDICATOR_COLORVAR } from "../lib/colors";
import { fmtSigned } from "../lib/format";

const TRACKS: Track[] = ["energie", "mobilite", "climat"];

/**
 * Registre des politiques. Vue de consultation : on n'y promulgue que ce
 * que NEXUS a soumis pour l'annee courante — le reste est consultable
 * mais verrouille, pour que l'arbitrage reste annuel.
 */
export function DecisionCenter({ onClose }: { onClose: () => void }) {
  const state = useStore();
  const ref = useRef<HTMLDivElement>(null);
  const [track, setTrack] = useState<Track>("energie");

  const offered = useMemo(
    () => new Set(actions.currentOffers().map((d) => d.id)),
    [state.currentYear, state.enacted],
  );
  const enacted = useMemo(
    () => new Set(state.enacted.map((e) => e.decisionId)),
    [state.enacted],
  );

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("button, [tabindex]")?.focus();
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
        aria-label="Registre des politiques"
      >
        <header className="drawer-head">
          <div>
            <span className="label">NEXUS · registre</span>
            <h2 className="drawer-title">Politiques</h2>
          </div>
          <button className="btn btn-icon" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </header>

        <p className="drawer-intro">
          Seuls les dossiers soumis en{" "}
          <strong className="num">{state.currentYear}</strong> sont arbitrables.
          Les autres restent consultables.
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

        <ul className="reg-list" role="tabpanel">
          {list.map((d) => (
            <RegRow
              key={d.id}
              decision={d}
              enacted={enacted.has(d.id)}
              offered={offered.has(d.id)}
            />
          ))}
        </ul>
      </aside>
    </div>
  );
}

function RegRow({
  decision,
  enacted,
  offered,
}: {
  decision: Decision;
  enacted: boolean;
  offered: boolean;
}) {
  const effects = Object.entries(decision.immediate).filter(([, v]) => v !== 0);
  return (
    <li className={`reg-row ${enacted ? "is-enacted" : ""}`}>
      <div className="reg-main">
        <div className="reg-top">
          <span className="label-strong reg-ref" data-track={decision.track}>
            {decision.ref}
          </span>
          <span className="reg-title">{decision.title}</span>
          <span className="num reg-cost">−{decision.upfront} M</span>
        </div>
        <p className="reg-line">{decision.line}</p>
        <div className="dossier-chips">
          {effects.slice(0, 4).map(([k, v]) => {
            const meta = INDICATOR_BY_KEY[k];
            if (!meta) return null;
            const good = meta.higherBetter ? v > 0 : v < 0;
            return (
              <span key={k} className={`dossier-chip ${good ? "good" : "bad"}`}>
                <span
                  className="dossier-chip-dot"
                  style={{ background: INDICATOR_COLORVAR[k] }}
                />
                {meta.short} {fmtSigned(v, 1)}
              </span>
            );
          })}
        </div>
      </div>
      <div className="reg-action">
        {enacted ? (
          <span className="dc-badge on">EN VIGUEUR</span>
        ) : offered ? (
          <button
            className="btn dossier-go"
            onClick={() => actions.enactDecision(decision.id)}
          >
            Arbitrer
          </button>
        ) : (
          <span className="reg-locked label">non soumis</span>
        )}
      </div>
    </li>
  );
}
