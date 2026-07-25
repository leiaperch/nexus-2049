import { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { DECISION_BY_ID, INDICATORS, TRACK_META } from "../sim/data";
import { END_YEAR, START_YEAR, type IndicatorKey } from "../sim/types";
import { actions, useStore } from "../store/store";
import { INDICATOR_COLORVAR } from "../lib/colors";
import { fmtIndicator, fmtPop, fmtSigned, normIndicator } from "../lib/format";
import { Sparkline } from "./Sparkline";

const ORDER: IndicatorKey[] = [
  "carbon",
  "qol",
  "trust",
  "budget",
  "energy",
  "mobility",
  "biodiversity",
];

interface Verdict {
  code: string;
  title: string;
  body: string;
  tone: "ok" | "mixed" | "bad";
}

/** Jugement de la chambre regionale des comptes, du plus severe au plus favorable. */
function verdictFor(score: number, budget: number, carbon: number, trust: number): Verdict {
  if (budget < 0)
    return {
      code: "VERDICT 05",
      title: "Mandat placé sous tutelle",
      body: "La collectivité s'achève en déficit. Les engagements pris dépassent la capacité de financement du territoire : la chambre saisit le préfet et suspend les programmes non engagés.",
      tone: "bad",
    };
  if (trust < 35)
    return {
      code: "VERDICT 04",
      title: "Rupture du lien civique",
      body: "Les objectifs matériels ont été tenus, mais sans la population. La défiance atteint un seuil qui rend inapplicables les politiques votées : la prochaine mandature héritera d'un territoire ingouvernable.",
      tone: "bad",
    };
  if (score >= 80 && carbon < 9)
    return {
      code: "VERDICT 01",
      title: "Transition accomplie",
      body: "Méridienne sort du mandat alignée sur l'accord climatique, solvable et avec l'adhésion de ses habitants. La chambre relève une conduite exemplaire et recommande la diffusion du modèle aux métropoles de même strate.",
      tone: "ok",
    };
  if (score >= 68)
    return {
      code: "VERDICT 02",
      title: "Trajectoire tenue",
      body: "Les grands équilibres sont respectés et la ville a changé de visage. Des angles morts subsistent, mais la mandature transmet un territoire en meilleur état qu'elle ne l'a reçu.",
      tone: "ok",
    };
  if (score >= 52)
    return {
      code: "VERDICT 03",
      title: "Transition inachevée",
      body: "Les arbitrages ont été rendus, sans jamais atteindre la masse critique. Le territoire n'a ni décroché ni basculé : l'essentiel de l'effort reste devant.",
      tone: "mixed",
    };
  return {
    code: "VERDICT 04",
    title: "Territoire dégradé",
    body: "Vingt ans de mandat n'ont pas enrayé la dégradation. La chambre constate une accumulation de décisions sans cohérence d'ensemble et une perte nette de qualité de vie.",
    tone: "bad",
  };
}

/** Bilan de fin de mandat, presente a l'arrivee en 2069. */
export function Epilogue() {
  const state = useStore();
  const ref = useRef<HTMLDivElement>(null);
  const { projection, enacted, reducedMotion } = state;
  const first = projection.timeline[0];
  const last = projection.timeline[projection.timeline.length - 1];

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") actions.closeEpilogue();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const score = useMemo(() => {
    const six = INDICATORS.filter((m) => m.key !== "budget");
    const s = six.reduce(
      (acc, m) =>
        acc + normIndicator(last.indicators[m.key], m.min, m.max, m.higherBetter),
      0,
    );
    return Math.round((s / six.length) * 100);
  }, [last]);

  const verdict = verdictFor(
    score,
    last.indicators.budget,
    last.indicators.carbon,
    last.indicators.trust,
  );

  const byTrack = useMemo(() => {
    const t: Record<string, number> = { energie: 0, mobilite: 0, climat: 0 };
    for (const e of enacted) {
      const d = DECISION_BY_ID[e.decisionId];
      if (d) t[d.track] = (t[d.track] ?? 0) + 1;
    }
    return t;
  }, [enacted]);

  const marquantes = useMemo(
    () =>
      projection.timeline
        .flatMap((y) => y.events)
        .filter((e) => e.tone === "positif" || e.tone === "alerte" || e.tone === "negatif")
        .slice(-6)
        .reverse(),
    [projection],
  );

  const popStart = first.districts.reduce((a, d) => a + d.population, 0);
  const popEnd = last.districts.reduce((a, d) => a + d.population, 0);
  const greenStart =
    first.districts.reduce((a, d) => a + d.greenery, 0) / first.districts.length;
  const greenEnd =
    last.districts.reduce((a, d) => a + d.greenery, 0) / last.districts.length;

  return (
    <div className="drawer-scrim epilogue-scrim">
      <motion.div
        className="epilogue"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Bilan de fin de mandat"
        initial={reducedMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <header className="epi-head">
          <div>
            <span className="label">
              Chambre régionale des comptes · Méridienne
            </span>
            <h2 className="epi-title">
              Bilan de mandat <span className="num">{START_YEAR}–{END_YEAR}</span>
            </h2>
          </div>
          <button
            className="btn btn-icon"
            onClick={() => actions.closeEpilogue()}
            aria-label="Fermer le bilan"
          >
            ✕
          </button>
        </header>

        <div className={`epi-verdict tone-${verdict.tone}`}>
          <div className="epi-score">
            <span className="num epi-score-num">{score}</span>
            <span className="label">indice final</span>
          </div>
          <div className="epi-verdict-txt">
            <span className="label">{verdict.code}</span>
            <h3 className="epi-verdict-title">{verdict.title}</h3>
            <p className="epi-verdict-body">{verdict.body}</p>
          </div>
        </div>

        <div className="epi-cols">
          <section className="epi-block" aria-label="Indicateurs comparés">
            <h4 className="epi-block-title">Indicateurs · 2049 → 2069</h4>
            <table className="epi-table">
              <thead>
                <tr>
                  <th scope="col" className="label">indicateur</th>
                  <th scope="col" className="label">2049</th>
                  <th scope="col" className="label">2069</th>
                  <th scope="col" className="label">Δ</th>
                  <th scope="col" className="label">trajectoire</th>
                </tr>
              </thead>
              <tbody>
                {ORDER.map((k) => {
                  const meta = INDICATORS.find((m) => m.key === k)!;
                  const a = first.indicators[k];
                  const b = last.indicators[k];
                  const diff = b - a;
                  const good = meta.higherBetter ? diff > 0 : diff < 0;
                  const cls =
                    Math.abs(diff) < 0.05 ? "flat" : good ? "pos" : "neg";
                  return (
                    <tr key={k}>
                      <th scope="row" className="epi-ind">
                        <span
                          className="cmp-dot"
                          style={{ background: INDICATOR_COLORVAR[k] }}
                        />
                        {meta.label}
                      </th>
                      <td className="num">{fmtIndicator(k, a)}</td>
                      <td className="num epi-final">{fmtIndicator(k, b)}</td>
                      <td className={`num cmp-delta ${cls}`}>
                        {fmtSigned(diff, k === "budget" ? 0 : 1)}
                      </td>
                      <td className="epi-spark">
                        <Sparkline
                          values={projection.timeline.map((y) => y.indicators[k])}
                          min={meta.min}
                          max={meta.max}
                          color={INDICATOR_COLORVAR[k]}
                          cursor={projection.timeline.length - 1}
                          width={120}
                          height={26}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <div className="epi-side">
            <section className="epi-block" aria-label="Arbitrages rendus">
              <h4 className="epi-block-title">Arbitrages</h4>
              <div className="epi-stat">
                <span className="num epi-stat-num">{enacted.length}</span>
                <span className="label">politiques promulguées</span>
              </div>
              <ul className="epi-tracks">
                {(["energie", "mobilite", "climat"] as const).map((t) => (
                  <li key={t}>
                    <span className="label">{TRACK_META[t].code}</span>
                    <span className="epi-track-bar" aria-hidden="true">
                      <span
                        style={{
                          width: `${(byTrack[t] / Math.max(1, enacted.length)) * 100}%`,
                        }}
                        data-track={t}
                      />
                    </span>
                    <span className="num">{byTrack[t]}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="epi-block" aria-label="Territoire">
              <h4 className="epi-block-title">Territoire</h4>
              <dl className="epi-facts">
                <div>
                  <dt className="label">Population</dt>
                  <dd className="num">
                    {fmtPop(popStart)} → <strong>{fmtPop(popEnd)}</strong>
                  </dd>
                </div>
                <div>
                  <dt className="label">Couverture végétale moyenne</dt>
                  <dd className="num">
                    {Math.round(greenStart)} → <strong>{Math.round(greenEnd)}</strong> /100
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        </div>

        {marquantes.length > 0 && (
          <section className="epi-block" aria-label="Faits marquants">
            <h4 className="epi-block-title">Faits marquants du mandat</h4>
            <ul className="epi-events">
              {marquantes.map((e, i) => (
                <li key={i} className={`epi-event tone-${e.tone}`}>
                  <span className="num epi-event-year">{e.year}</span>
                  <span className="epi-event-body">{e.body}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="epi-actions">
          <button className="btn" onClick={() => actions.closeEpilogue()}>
            Consulter les archives
          </button>
          <button
            className="btn epi-restart"
            onClick={() => {
              actions.closeEpilogue();
              actions.reset();
            }}
          >
            Nouveau mandat
          </button>
        </footer>
      </motion.div>
    </div>
  );
}
