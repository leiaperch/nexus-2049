import { useSelector } from "../store/store";
import type { YearState } from "../sim/types";

/** Etat de la ville a l'annee courante de l'horloge. */
export function useCurrentYearState(): YearState {
  return useSelector((s) => s.projection.byYear[s.currentYear]);
}

/** Serie temporelle d'un indicateur sur toute la projection. */
export function useSeries(key: keyof YearState["indicators"]): number[] {
  return useSelector((s) => s.projection.timeline.map((y) => y.indicators[key]));
}
