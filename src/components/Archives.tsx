import { useState } from "react";
import { DECISION_BY_ID, INDICATORS, TRACK_META } from "../sim/data";
import { START_YEAR, YEARS, type IndicatorKey } from "../sim/types";
import { useStore } from "../store/store";
import { INDICATOR_COLORVAR } from "../lib/colors";
import { fmtIndicator, fmtSigned } from "../lib/format";

export function Archives() {
  const state = useStore();
  return (
    <section className="archives" aria-label="Archives et analyse">
      <div className="archives-grid">
        <DecisionLog />
        <CausalGraph />
        <CompareBlock />
      </div>
    </section>
  );
}

function DecisionLog() {
  const state = useStore();
  const log = [...state.enacted].sort((a, b) => a.year - b.year);
  return (
    <div className="panel arch-log">
      <header className="panel-head">
        <h2 className="panel-title">Registre des deliberations</h2>
        <span className="label">{log.length}</span>
      </header>
      {log.length === 0 ? (
        <p className="feed-empty label">Aucune deliberation promulguee.</p>
      ) : (
        <ol className="log-list">
          {log.map((e) => {
            const d = DECISION_BY_ID[e.decisionId];
            return (
              <li key={e.decisionId} className="log-item">
                <span className="num log-year">{e.year}</span>
                <span className="log-track" data-track={d.track}>
                  {TRACK_META[d.track].code}
                </span>
                <div className="log-body">
                  <span className="label-strong">{d.ref}</span>
                  <span className="log-title">{d.title}</span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

/** Relations de cause a effet : deliberations -> indicateurs impactes. */
function CausalGraph() {
  const state = useStore();
  const active = state.enacted.map((e) => DECISION_BY_ID[e.decisionId]);
  const [hover, setHover] = useState<string | null>(null);

  // aggregation : pour chaque indicateur, quelles decisions y contribuent
  const linksByIndicator: Record<string, { id: string; dir: number }[]> = {};
  for (const d of active) {
    const contrib: Record<string, number> = {};
    for (const [k, v] of Object.entries(d.immediate)) contrib[k] = (contrib[k] ?? 0) + (v as number);
    for (const [k, v] of Object.entries(d.ongoing)) contrib[k] = (contrib[k] ?? 0) + (v as number) * 6;
    for (const de of d.delayed)
      for (const [k, v] of Object.entries(de.indicators ?? {}))
        contrib[k] = (contrib[k] ?? 0) + (v as number);
    for (const [k, tot] of Object.entries(contrib)) {
      if (Math.abs(tot) < 0.2) continue;
      (linksByIndicator[k] ??= []).push({ id: d.id, dir: Math.sign(tot) });
    }
  }

  return (
    <div className="panel arch-causal">
      <header className="panel-head">
        <h2 className="panel-title">Relations de cause a effet</h2>
        <span className="label">chaine d'impact</span>
      </header>
      {active.length === 0 ? (
        <p className="feed-empty label">
          Promulguez des deliberations pour tracer leurs chaines d'impact.
        </p>
      ) : (
        <div className="causal">
          <ul className="causal-col causes">
            {active.map((d) => (
              <li
                key={d.id}
                className={`causal-node ${hover === d.id ? "hot" : ""}`}
                onMouseEnter={() => setHover(d.id)}
                onMouseLeave={() => setHover(null)}
                tabIndex={0}
                onFocus={() => setHover(d.id)}
                onBlur={() => setHover(null)}
              >
                <span className="label-strong">{d.ref}</span>
                <span className="causal-node-t">{d.title}</span>
              </li>
            ))}
          </ul>
          <ul className="causal-col effects">
            {INDICATORS.map((meta) => {
              const links = linksByIndicator[meta.key] ?? [];
              if (links.length === 0) return null;
              const related = hover ? links.some((l) => l.id === hover) : true;
              const net = links.reduce((a, l) => a + l.dir, 0);
              return (
                <li
                  key={meta.key}
                  className={`causal-node effect ${related ? "" : "dim"}`}
                  style={{ borderColor: INDICATOR_COLORVAR[meta.key] }}
                >
                  <span
                    className="causal-dot"
                    style={{ background: INDICATOR_COLORVAR[meta.key] }}
                  />
                  <span className="causal-node-t">{meta.label}</span>
                  <span className={`causal-arrow ${net >= 0 ? "up" : "down"}`}>
                    {net >= 0 ? "▲" : "▼"} {links.length}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <p className="causal-hint label">
        survolez une deliberation pour isoler les indicateurs qu'elle influence.
      </p>
    </div>
  );
}

function CompareBlock() {
  const state = useStore();
  const [a, setA] = useState(START_YEAR);
  const [b, setB] = useState(state.currentYear);
  const ya = state.projection.byYear[a];
  const yb = state.projection.byYear[b];
  const order: IndicatorKey[] = [
    "carbon",
    "qol",
    "trust",
    "budget",
    "energy",
    "mobility",
    "biodiversity",
  ];

  return (
    <div className="panel arch-compare">
      <header className="panel-head">
        <h2 className="panel-title">Comparaison temporelle</h2>
        <div className="cmp-selects">
          <YearSelect value={a} onChange={setA} label="Annee A" />
          <span className="label">→</span>
          <YearSelect value={b} onChange={setB} label="Annee B" />
        </div>
      </header>
      <table className="cmp-table">
        <thead>
          <tr>
            <th scope="col" className="label">
              indicateur
            </th>
            <th scope="col" className="num">
              {a}
            </th>
            <th scope="col" className="num">
              {b}
            </th>
            <th scope="col" className="num">
              Δ
            </th>
          </tr>
        </thead>
        <tbody>
          {order.map((k) => {
            const meta = INDICATORS.find((m) => m.key === k)!;
            const va = ya.indicators[k];
            const vb = yb.indicators[k];
            const diff = vb - va;
            const good = meta.higherBetter ? diff > 0 : diff < 0;
            const cls = Math.abs(diff) < 0.05 ? "flat" : good ? "pos" : "neg";
            return (
              <tr key={k}>
                <th scope="row" className="cmp-ind">
                  <span
                    className="cmp-dot"
                    style={{ background: INDICATOR_COLORVAR[k] }}
                  />
                  {meta.label}
                </th>
                <td className="num">{fmtIndicator(k, va)}</td>
                <td className="num">{fmtIndicator(k, vb)}</td>
                <td className={`num cmp-delta ${cls}`}>
                  {fmtSigned(diff, k === "budget" ? 0 : 1)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function YearSelect({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (y: number) => void;
  label: string;
}) {
  return (
    <label className="cmp-year">
      <span className="sr-only">{label}</span>
      <select
        className="tl-select mono"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {Array.from({ length: YEARS }, (_, i) => START_YEAR + i).map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </label>
  );
}
