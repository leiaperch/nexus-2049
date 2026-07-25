import type { AppState } from "../store/store";
import type { DistrictState } from "../sim/types";

export const INDICATOR_COLORVAR: Record<string, string> = {
  carbon: "var(--c-carbon)",
  qol: "var(--c-qol)",
  budget: "var(--c-budget)",
  energy: "var(--c-energy)",
  mobility: "var(--c-mobility)",
  biodiversity: "var(--c-biodiversity)",
  trust: "var(--c-trust)",
};

// Rampes de couleur pour la cartographie (echelle 0..1).
// Rendues en rgb pour usage direct dans canvas.
type Stop = [number, [number, number, number]];

const RAMPS: Record<AppState["mapMetric"], Stop[]> = {
  // pollution : sain -> critique
  pollution: [
    [0, [90, 130, 118]],
    [0.5, [198, 150, 70]],
    [1, [200, 66, 40]],
  ],
  greenery: [
    [0, [70, 82, 84]],
    [0.5, [110, 140, 96]],
    [1, [131, 168, 106]],
  ],
  density: [
    [0, [40, 54, 62]],
    [0.5, [120, 132, 168]],
    [1, [180, 150, 200]],
  ],
  energyUse: [
    [0, [90, 130, 118]],
    [0.5, [198, 160, 80]],
    [1, [214, 120, 58]],
  ],
  satisfaction: [
    [0, [200, 80, 55]],
    [0.5, [200, 165, 85]],
    [1, [120, 168, 120]],
  ],
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function rampColor(metric: AppState["mapMetric"], t: number): string {
  const stops = RAMPS[metric];
  const x = Math.min(1, Math.max(0, t));
  for (let i = 0; i < stops.length - 1; i++) {
    const [p0, c0] = stops[i];
    const [p1, c1] = stops[i + 1];
    if (x >= p0 && x <= p1) {
      const u = (x - p0) / (p1 - p0 || 1);
      const r = Math.round(lerp(c0[0], c1[0], u));
      const g = Math.round(lerp(c0[1], c1[1], u));
      const b = Math.round(lerp(c0[2], c1[2], u));
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  const last = stops[stops.length - 1][1];
  return `rgb(${last[0]}, ${last[1]}, ${last[2]})`;
}

/** Valeur 0..1 de la metrique cartographiee pour un quartier. */
export function metricValue(
  d: DistrictState,
  metric: AppState["mapMetric"],
): number {
  switch (metric) {
    case "pollution":
      return d.pollution / 100;
    case "greenery":
      return d.greenery / 100;
    case "density":
      return d.density / 100;
    case "energyUse":
      return d.energyUse / 100;
    case "satisfaction":
      return d.satisfaction / 100;
  }
}

export const MAP_METRIC_LABEL: Record<AppState["mapMetric"], string> = {
  pollution: "Pollution",
  greenery: "Vegetation",
  density: "Densite",
  energyUse: "Intensite energetique",
  satisfaction: "Satisfaction",
};
