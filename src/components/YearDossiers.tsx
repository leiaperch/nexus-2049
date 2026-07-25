import { INDICATOR_BY_KEY, TRACK_META } from "../sim/data";
import type { Decision } from "../sim/types";
import { actions, useStore } from "../store/store";
import { INDICATOR_COLORVAR } from "../lib/colors";
import { fmtSigned } from "../lib/format";

/**
 * Dossiers de l'annee. NEXUS soumet chaque annee un jeu d'arbitrages ;
 * tant qu'aucun n'est rendu, la projection ne peut pas avancer.
 * Volontairement laconique : une ligne par dossier, effets bruts, pas de
 * plaidoyer. Les consequences differees ne sont pas annoncees.
 */
export function YearDossiers() {
  const state = useStore();
  const offers = actions.currentOffers();
  const resolved = actions.currentResolved();
  const blocked = actions.blocked();

  if (offers.length === 0 && resolved) return null;

  return (
    <section
      className={`dossiers ${blocked ? "is-blocked" : ""}`}
      aria-label={`Dossiers soumis pour ${state.currentYear}`}
    >
      <header className="dossiers-head">
        <div className="dossiers-title">
          <span className="num dossiers-year">{state.currentYear}</span>
          <span className="label">
            {blocked
              ? "arbitrage requis pour avancer"
              : resolved
                ? "annee arbitree"
                : "dossiers soumis"}
          </span>
        </div>
        {blocked && <span className="dossiers-lock" aria-hidden="true">VERROU</span>}
      </header>

      {offers.length === 0 ? (
        <p className="dossiers-empty label">Aucun dossier en instance.</p>
      ) : (
        <ul className="dossiers-list">
          {offers.map((d) => (
            <DossierRow key={d.id} decision={d} />
          ))}
        </ul>
      )}
    </section>
  );
}

function DossierRow({ decision }: { decision: Decision }) {
  const effects = Object.entries(decision.immediate).filter(([, v]) => v !== 0);
  return (
    <li className="dossier">
      <div className="dossier-main">
        <div className="dossier-top">
          <span className="label-strong dossier-ref" data-track={decision.track}>
            {decision.ref}
          </span>
          <span className="dossier-track label">{TRACK_META[decision.track].code}</span>
          <span className="num dossier-cost">−{decision.upfront} M</span>
        </div>
        <h3 className="dossier-title">{decision.title}</h3>
        <p className="dossier-line">{decision.line}</p>
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
          {decision.recurring !== 0 && (
            <span className={`dossier-chip ${decision.recurring > 0 ? "good" : "bad"}`}>
              <span className="dossier-chip-dot" style={{ background: "var(--paper)" }} />
              BUD {fmtSigned(decision.recurring, 0)}/an
            </span>
          )}
        </div>
      </div>
      <button
        className="btn dossier-go"
        onClick={() => actions.enactDecision(decision.id)}
      >
        Arbitrer
      </button>
    </li>
  );
}
