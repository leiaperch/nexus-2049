import { useMemo } from "react";
import { START_YEAR } from "../sim/types";

interface Props {
  values: number[];
  min: number;
  max: number;
  color: string;
  /** index (0-based) de l'annee courante. */
  cursor: number;
  /** index optionnel a comparer. */
  compare?: number | null;
  width?: number;
  height?: number;
  /** dessine l'aire sous la courbe passee (jusqu'au curseur). */
  area?: boolean;
}

/**
 * Courbe temporelle sobre : trace complet en filigrane, portion passee
 * en plein, curseur d'annee, marqueur de comparaison. SVG pur.
 */
export function Sparkline({
  values,
  min,
  max,
  color,
  cursor,
  compare,
  width = 220,
  height = 44,
  area = true,
}: Props) {
  const pad = 3;
  const n = values.length;
  const pts = useMemo(() => {
    const span = max - min || 1;
    return values.map((v, i) => {
      const x = pad + (i / (n - 1)) * (width - pad * 2);
      const y =
        height - pad - ((Math.min(max, Math.max(min, v)) - min) / span) * (height - pad * 2);
      return [x, y] as const;
    });
  }, [values, min, max, width, height, n]);

  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const pastLine = pts
    .slice(0, cursor + 1)
    .map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
    .join(" ");
  const areaPath =
    cursor > 0
      ? `${pastLine} L${pts[cursor][0].toFixed(1)},${height - pad} L${pts[0][0].toFixed(
          1,
        )},${height - pad} Z`
      : "";

  const cur = pts[Math.min(cursor, n - 1)];
  const cmp = compare != null ? pts[Math.min(compare, n - 1)] : null;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      role="presentation"
      style={{ display: "block", overflow: "visible" }}
    >
      {/* ligne de reference mediane */}
      <line
        x1={pad}
        x2={width - pad}
        y1={height / 2}
        y2={height / 2}
        stroke="var(--line-soft)"
        strokeDasharray="2 3"
      />
      {area && cursor > 0 && (
        <path d={areaPath} fill={color} opacity={0.1} />
      )}
      {/* trace futur (filigrane) */}
      <path d={line} fill="none" stroke={color} strokeWidth={1} opacity={0.28} />
      {/* trace passe (plein) */}
      <path
        d={pastLine}
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {cmp && (
        <g>
          <line
            x1={cmp[0]}
            x2={cmp[0]}
            y1={pad}
            y2={height - pad}
            stroke="var(--paper-ghost)"
            strokeDasharray="2 2"
          />
          <circle cx={cmp[0]} cy={cmp[1]} r={2.4} fill="var(--paper-ghost)" />
        </g>
      )}
      {/* curseur */}
      <line
        x1={cur[0]}
        x2={cur[0]}
        y1={pad}
        y2={height - pad}
        stroke={color}
        strokeWidth={1}
        opacity={0.5}
      />
      <circle cx={cur[0]} cy={cur[1]} r={2.8} fill={color} />
      <circle cx={cur[0]} cy={cur[1]} r={5} fill="none" stroke={color} opacity={0.4} />
    </svg>
  );
}

export function yearOfIndex(i: number): number {
  return START_YEAR + i;
}
