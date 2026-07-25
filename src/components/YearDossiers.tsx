import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { INDICATOR_BY_KEY, TRACK_META } from "../sim/data";
import type { Decision } from "../sim/types";
import { actions, useStore } from "../store/store";
import { INDICATOR_COLORVAR } from "../lib/colors";
import { fmtSigned } from "../lib/format";

/**
 * Dossiers de l'annee, en modale. NEXUS soumet chaque annee un jeu
 * d'arbitrages ; en rendre un relance le temps. Volontairement laconique :
 * une phrase par dossier, effets bruts, aucun plaidoyer. Les consequences
 * differees ne sont pas annoncees.
 */
export function YearDossiers() {
  const state = useStore();
  const ref = useRef<HTMLDivElement>(null);
  const offers = actions.currentOffers();

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>(".dossier-go")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") actions.dismissDossiers();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <motion.div
      className="drawer-scrim dossiers-scrim"
      onClick={(e) => e.target === e.currentTarget && actions.dismissDossiers()}
      initial={state.reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
    >
      <motion.div
        className="dossiers-modal"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={`Dossiers soumis pour ${state.currentYear}`}
        initial={state.reducedMotion ? false : { opacity: 0, y: 26, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={state.reducedMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.99 }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      >
        <header className="dm-head">
          <div className="dm-title">
            <span className="num dm-year">{state.currentYear}</span>
            <div className="dm-titles">
              <span className="label">Conseil métropolitain · ordre du jour</span>
              <h2 className="dm-h2">Dossiers soumis</h2>
            </div>
          </div>
          <span className="dm-lock" aria-hidden="true">
            arbitrage requis
          </span>
        </header>

        {offers.length === 0 ? (
          <p className="dossiers-empty label">Aucun dossier en instance.</p>
        ) : (
          <ul className="dm-list">
            {offers.map((d) => (
              <DossierCard key={d.id} decision={d} />
            ))}
          </ul>
        )}

        <footer className="dm-foot">
          <button className="btn" onClick={() => actions.dismissDossiers()}>
            Examiner la ville d'abord
          </button>
          <span className="label dm-hint">
            un arbitrage relance la projection · <kbd>Échap</kbd> pour différer
          </span>
        </footer>
      </motion.div>
    </motion.div>
  );
}

function DossierCard({ decision }: { decision: Decision }) {
  const effects = Object.entries(decision.immediate).filter(([, v]) => v !== 0);
  return (
    <li className="dm-card" data-track={decision.track}>
      <div className="dm-card-top">
        <span className="label-strong dossier-ref" data-track={decision.track}>
          {decision.ref}
        </span>
        <span className="label">{TRACK_META[decision.track].code}</span>
      </div>
      <h3 className="dm-card-title">{decision.title}</h3>
      <p className="dm-card-line">{decision.line}</p>

      <div className="dm-cost">
        <span className="num dm-cost-num">−{decision.upfront}</span>
        <span className="label">M cr</span>
        {decision.recurring !== 0 && (
          <span
            className={`num dm-rec ${decision.recurring > 0 ? "good" : "bad"}`}
          >
            {fmtSigned(decision.recurring, 0)}/an
          </span>
        )}
      </div>

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

      <button
        className="btn dossier-go dm-go"
        onClick={() => actions.enactDecision(decision.id)}
      >
        Arbitrer
      </button>
    </li>
  );
}
