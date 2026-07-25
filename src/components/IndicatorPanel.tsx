import { INDICATORS } from "../sim/data";
import type { IndicatorKey } from "../sim/types";
import { INDICATOR_COLORVAR } from "../lib/colors";
import { fmtIndicator, fmtSigned, normIndicator } from "../lib/format";
import { useSelector, useStore } from "../store/store";
import { Sparkline } from "./Sparkline";
import { Tooltip } from "./Tooltip";

function Meter({ t, color }: { t: number; color: string }) {
  // Jauge segmentee non conventionnelle : 24 traits, remplis selon t (0..1).
  const segs = 24;
  const filled = Math.round(t * segs);
  return (
    <div className="meter" aria-hidden="true">
      {Array.from({ length: segs }).map((_, i) => (
        <span
          key={i}
          className="meter-seg"
          style={{
            background: i < filled ? color : "var(--line)",
            opacity: i < filled ? 0.35 + 0.65 * (i / segs) : 1,
          }}
        />
      ))}
    </div>
  );
}

function IndicatorRow({ ikey }: { ikey: IndicatorKey }) {
  const meta = INDICATORS.find((m) => m.key === ikey)!;
  const state = useStore();
  const { projection, currentYear } = state;
  const idx = currentYear - projection.timeline[0].year;
  const series = projection.timeline.map((y) => y.indicators[ikey]);
  const value = series[idx];
  const prev = idx > 0 ? series[idx - 1] : value;
  const delta = value - prev;
  const color = INDICATOR_COLORVAR[ikey];
  const norm = normIndicator(value, meta.min, meta.max, meta.higherBetter);

  const good = meta.higherBetter ? delta >= 0 : delta <= 0;
  const deltaClass =
    Math.abs(delta) < 0.05 ? "flat" : good ? "up-good" : "up-bad";

  return (
    <li className="ind-row">
      <div className="ind-head">
        <Tooltip content={meta.hint}>
          <span className="ind-label label-strong" tabIndex={0}>
            <span className="ind-dot" style={{ background: color }} />
            {meta.label}
          </span>
        </Tooltip>
        <span className={`ind-delta num ${deltaClass}`}>
          {delta > 0 ? "▲" : delta < 0 ? "▼" : "■"}{" "}
          {fmtSigned(delta, ikey === "budget" ? 0 : 1)}
        </span>
      </div>
      <div className="ind-value-line">
        <span className="ind-value num" style={{ color }}>
          {fmtIndicator(ikey, value)}
        </span>
        <span className="ind-unit label">{meta.unit}</span>
      </div>
      <Meter t={norm} color={color} />
      <div className="ind-spark">
        <Sparkline
          values={series}
          min={meta.min}
          max={meta.max}
          color={color}
          cursor={idx}
          compare={state.compareYear != null ? state.compareYear - projection.timeline[0].year : null}
        />
      </div>
    </li>
  );
}

export function IndicatorPanel() {
  const order: IndicatorKey[] = [
    "carbon",
    "qol",
    "trust",
    "budget",
    "capital",
    "energy",
    "mobility",
    "biodiversity",
  ];
  const compareYear = useSelector((s) => s.compareYear);
  return (
    <section className="panel indicators" aria-label="Indicateurs de la metropole">
      <header className="panel-head">
        <h2 className="panel-title">Indicateurs</h2>
        <span className="label">
          {compareYear ? `Δ vs ${compareYear}` : "temps reel"}
        </span>
      </header>
      <ul className="ind-list">
        {order.map((k) => (
          <IndicatorRow key={k} ikey={k} />
        ))}
      </ul>
    </section>
  );
}
