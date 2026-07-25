// NEXUS 2049 — modele de simulation de la metropole de Meridienne.
// La ville est projetee de 2049 a 2069. Une projection complete est une fonction
// pure des decisions promulguees : timeline = f(decisions). Le passe est fige,
// le futur est recalcule a chaque nouvelle decision.

export const START_YEAR = 2049;
export const END_YEAR = 2069;
export const YEARS = END_YEAR - START_YEAR + 1;

/** Les sept indicateurs pilotes par NEXUS. */
export type IndicatorKey =
  | "carbon" // emissions nettes (MtCO2/an) — plus bas = mieux
  | "qol" // qualite de vie (indice 0-100)
  | "budget" // tresorerie publique (M credits, peut etre negative)
  | "energy" // part d'energie decarbonee (%)
  | "mobility" // accessibilite moyenne (indice 0-100)
  | "biodiversity" // indice de biodiversite (0-100)
  | "trust"; // confiance de la population (0-100)

export interface IndicatorMeta {
  key: IndicatorKey;
  label: string;
  short: string;
  unit: string;
  /** true si une valeur haute est souhaitable. */
  higherBetter: boolean;
  /** bornes d'affichage pour les jauges. */
  min: number;
  max: number;
  hint: string;
}

export type Indicators = Record<IndicatorKey, number>;

export type DistrictFunction =
  | "portuaire"
  | "residentiel"
  | "historique"
  | "affaires"
  | "humide"
  | "mixte";

export interface DistrictState {
  id: string;
  name: string;
  fn: DistrictFunction;
  /** polygone en espace normalise 0..1 (coordonnees cartographiques). */
  poly: [number, number][];
  /** centroide en 0..1, pre-calcule. */
  center: [number, number];
  density: number; // 0-100
  pollution: number; // 0-100
  energyUse: number; // 0-100 (intensite)
  population: number; // habitants
  satisfaction: number; // 0-100
  greenery: number; // 0-100 couverture vegetale
}

export type Track = "energie" | "mobilite" | "climat";

export interface DelayedEffect {
  /** annees apres promulgation avant declenchement. */
  delay: number;
  indicators?: Partial<Indicators>;
  /** effet applique aux quartiers (par fonction, ou "all"). */
  districts?: Partial<Record<keyof DistrictDeltas, number>> & {
    target?: DistrictFunction | "all";
  };
  /** message narratif emis a l'annee de declenchement. */
  narrative?: string;
  tone?: EventTone;
}

export interface DistrictDeltas {
  density: number;
  pollution: number;
  energyUse: number;
  population: number;
  satisfaction: number;
  greenery: number;
}

export interface Decision {
  id: string;
  track: Track;
  title: string;
  /** intitule court pour l'historique. */
  ref: string;
  /** UNE phrase : le seul texte explicatif montre au joueur. */
  line: string;
  /** annee minimale d'apparition dans les dossiers. */
  minYear?: number;
  summary?: string;
  /** cout initial en M credits (positif = depense). */
  upfront: number;
  /** cout/gain recurrent annuel en M credits. */
  recurring: number;
  /** effet immediat sur les indicateurs (applique l'annee de promulgation). */
  immediate: Partial<Indicators>;
  /** modificateurs annuels appliques tant que la decision est active. */
  ongoing: Partial<Indicators>;
  /** effet par fonction de quartier, applique en continu (par an). */
  districtOngoing?: Partial<DistrictDeltas> & { target: DistrictFunction | "all" };
  /** consequences differees, potentiellement incertaines. */
  delayed: DelayedEffect[];
  /** champs longs historiques, desormais optionnels (non affiches). */
  risk?: string;
  benefit?: string;
  costLabel?: string;
  /** decisions exclusives (ne peuvent coexister). */
  excludes?: string[];
  /** id requis prealable. */
  requires?: string;
}

export type EventTone = "positif" | "negatif" | "neutre" | "alerte";

export interface NarrativeEvent {
  year: number;
  tone: EventTone;
  source: string; // institution / organe emetteur
  title: string;
  body: string;
  /** decision a l'origine, si applicable. */
  cause?: string;
}

/** Etat complet d'une annee de la projection. */
export interface YearState {
  year: number;
  indicators: Indicators;
  districts: DistrictState[];
  events: NarrativeEvent[];
}

/** Une decision promulguee, horodatee. */
export interface EnactedDecision {
  decisionId: string;
  year: number;
}
