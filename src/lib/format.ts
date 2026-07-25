import type { IndicatorKey } from "../sim/types";

export function fmtNumber(v: number, digits = 0): string {
  return v.toLocaleString("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtIndicator(key: IndicatorKey, v: number): string {
  switch (key) {
    case "carbon":
      return v.toFixed(1);
    case "budget":
      return (v >= 0 ? "+" : "") + fmtNumber(v);
    default:
      return Math.round(v).toString();
  }
}

export function fmtSigned(v: number, digits = 1): string {
  const s = v.toFixed(digits);
  return v > 0 ? `+${s}` : s;
}

export function fmtPop(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 100000 ? 0 : 1)} k`;
  return fmtNumber(v);
}

/** Normalise une valeur d'indicateur en 0..1 selon ses bornes et son sens. */
export function normIndicator(
  v: number,
  min: number,
  max: number,
  higherBetter: boolean,
): number {
  const t = (v - min) / (max - min);
  const c = Math.min(1, Math.max(0, t));
  return higherBetter ? c : 1 - c;
}
