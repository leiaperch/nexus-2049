import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { INDICATOR_BY_KEY, TRACK_META } from "../sim/data";
import {
  anyAffordable,
  DEBT_CEILING,
  financialCost,
  politicalCost,
} from "../sim/engine";
import { SCALES, SCALE_BY_KEY, type Decision, type Scale } from "../sim/types";
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
  // aucun dossier finançable : le conseil ne peut que constater sa carence
  const ind = state.projection.byYear[state.currentYear].indicators;
  const impasse = offers.length > 0 && !anyAffordable(offers, ind);

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
          {impasse ? (
            <button
              className="btn dm-carence"
              onClick={() => {
                actions.dismissDossiers();
                actions.stepYear(1);
              }}
            >
              Constater la carence et passer l'année →
            </button>
          ) : (
            <span className="label dm-hint">
              un arbitrage relance la projection · <kbd>Échap</kbd> pour différer
            </span>
          )}
        </footer>
      </motion.div>
    </motion.div>
  );
}

function DossierCard({ decision }: { decision: Decision }) {
  const state = useStore();
  const [scale, setScale] = useState<Scale>("mesure");
  const spec = SCALE_BY_KEY[scale];
  const ind = state.projection.byYear[state.currentYear].indicators;

  const cost = financialCost(decision, scale);
  const pol = politicalCost(decision, scale);
  const recurring = Math.round(decision.recurring * spec.cost);
  const effects = Object.entries(decision.immediate).filter(([, v]) => v !== 0);

  const tooPoor = ind.budget - cost < DEBT_CEILING;
  // une crise doit toujours pouvoir recevoir une reponse : elle echappe
  // a la contrainte de capital politique
  const tooWeak = decision.kind !== "crise" && ind.capital < pol;
  const blocked = tooPoor || tooWeak;

  return (
    <li className={`dm-card ${decision.kind === "crise" ? "is-crisis" : ""}`} data-track={decision.track}>
      <div className="dm-card-top">
        <span className="label-strong dossier-ref" data-track={decision.track}>
          {decision.ref}
        </span>
        <span className="label">
          {decision.kind === "crise" ? "IMPOSÉ" : TRACK_META[decision.track].code}
        </span>
      </div>
      <h3 className="dm-card-title">{decision.title}</h3>
      <p className="dm-card-line">{decision.line}</p>

      {/* Ampleur : le meme dossier, conduit a trois niveaux d'engagement. */}
      <div className="dm-scales" role="radiogroup" aria-label="Ampleur de la mesure">
        {SCALES.map((s) => (
          <button
            key={s.key}
            role="radio"
            aria-checked={scale === s.key}
            className={`dm-scale ${scale === s.key ? "is-active" : ""}`}
            onClick={() => setScale(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="dm-cost">
        <span className="num dm-cost-num">−{cost}</span>
        <span className="label">M cr</span>
        <span className={`num dm-pol ${tooWeak ? "bad" : ""}`}>−{pol} pol</span>
        {recurring !== 0 && (
          <span className={`num dm-rec ${recurring > 0 ? "good" : "bad"}`}>
            {fmtSigned(recurring, 0)}/an
          </span>
        )}
      </div>

      <div className="dossier-chips">
        {effects.slice(0, 4).map(([k, v]) => {
          const meta = INDICATOR_BY_KEY[k];
          if (!meta) return null;
          const val = v * spec.effect + (k === "trust" ? spec.trustBias : 0);
          const good = meta.higherBetter ? val > 0 : val < 0;
          return (
            <span key={k} className={`dossier-chip ${good ? "good" : "bad"}`}>
              <span
                className="dossier-chip-dot"
                style={{ background: INDICATOR_COLORVAR[k] }}
              />
              {meta.short} {fmtSigned(val, 1)}
            </span>
          );
        })}
      </div>

      <button
        className="btn dossier-go dm-go"
        disabled={blocked}
        onClick={() => actions.enactDecision(decision.id, scale)}
      >
        {tooPoor
          ? "Financement indisponible"
          : tooWeak
            ? "Capital politique insuffisant"
            : "Arbitrer"}
      </button>
    </li>
  );
}
