import { CATALOGUE } from "./catalogue";
import type {
  Decision,
  DistrictState,
  IndicatorMeta,
  Indicators,
} from "./types";

// ————————————————————————————————————————————————————————————————
// Indicateurs
// ————————————————————————————————————————————————————————————————

export const INDICATORS: IndicatorMeta[] = [
  {
    key: "carbon",
    label: "Emissions nettes",
    short: "CO2",
    unit: "Mt/an",
    higherBetter: false,
    min: 0,
    max: 24,
    hint: "Bilan carbone territorial net, industrie et mobilite comprises.",
  },
  {
    key: "qol",
    label: "Qualite de vie",
    short: "QDV",
    unit: "idx",
    higherBetter: true,
    min: 0,
    max: 100,
    hint: "Indice composite : air, bruit, acces aux services, espaces publics.",
  },
  {
    key: "budget",
    label: "Tresorerie",
    short: "BUD",
    unit: "M cr",
    higherBetter: true,
    min: -600,
    max: 1400,
    hint: "Solde budgetaire cumule de la collectivite. Sous zero = endettement.",
  },
  {
    key: "energy",
    label: "Energie decarbonee",
    short: "NRG",
    unit: "%",
    higherBetter: true,
    min: 0,
    max: 100,
    hint: "Part de la consommation couverte par des sources bas-carbone.",
  },
  {
    key: "mobility",
    label: "Accessibilite",
    short: "MOB",
    unit: "idx",
    higherBetter: true,
    min: 0,
    max: 100,
    hint: "Temps d'acces moyen aux emplois et services, tous modes.",
  },
  {
    key: "biodiversity",
    label: "Biodiversite",
    short: "BIO",
    unit: "idx",
    higherBetter: true,
    min: 0,
    max: 100,
    hint: "Continuite ecologique, canopee, zones humides fonctionnelles.",
  },
  {
    key: "trust",
    label: "Confiance",
    short: "CONF",
    unit: "idx",
    higherBetter: true,
    min: 0,
    max: 100,
    hint: "Adhesion de la population aux politiques de la collectivite.",
  },
];

export const INDICATOR_BY_KEY = Object.fromEntries(
  INDICATORS.map((i) => [i.key, i]),
) as Record<string, IndicatorMeta>;

export const INITIAL_INDICATORS: Indicators = {
  carbon: 18.4,
  qol: 58,
  budget: 620,
  energy: 34,
  mobility: 52,
  biodiversity: 41,
  trust: 55,
};

// ————————————————————————————————————————————————————————————————
// Quartiers de Meridienne
// Coordonnees en espace normalise 0..1. La ville epouse un estuaire :
// le fleuve descend du nord-ouest vers le sud-est.
// ————————————————————————————————————————————————————————————————

function centroid(poly: [number, number][]): [number, number] {
  let x = 0;
  let y = 0;
  for (const [px, py] of poly) {
    x += px;
    y += py;
  }
  return [x / poly.length, y / poly.length];
}

interface RawDistrict extends Omit<DistrictState, "center"> {}

const RAW: RawDistrict[] = [
  {
    id: "quai-nord",
    name: "Quai-Nord",
    fn: "portuaire",
    poly: [
      [0.04, 0.08],
      [0.34, 0.05],
      [0.4, 0.28],
      [0.18, 0.34],
      [0.05, 0.24],
    ],
    density: 38,
    pollution: 78,
    energyUse: 88,
    population: 61000,
    satisfaction: 44,
    greenery: 12,
  },
  {
    id: "ferronnerie",
    name: "Ferronnerie",
    fn: "affaires",
    poly: [
      [0.4, 0.28],
      [0.68, 0.2],
      [0.74, 0.44],
      [0.5, 0.5],
      [0.36, 0.42],
    ],
    density: 84,
    pollution: 52,
    energyUse: 74,
    population: 88000,
    satisfaction: 57,
    greenery: 18,
  },
  {
    id: "verrieres",
    name: "Verrieres",
    fn: "residentiel",
    poly: [
      [0.05, 0.36],
      [0.36, 0.44],
      [0.34, 0.7],
      [0.1, 0.74],
      [0.03, 0.52],
    ],
    density: 76,
    pollution: 46,
    energyUse: 58,
    population: 142000,
    satisfaction: 51,
    greenery: 22,
  },
  {
    id: "halage",
    name: "Halage",
    fn: "historique",
    poly: [
      [0.5, 0.5],
      [0.74, 0.46],
      [0.78, 0.66],
      [0.56, 0.72],
      [0.4, 0.64],
    ],
    density: 63,
    pollution: 40,
    energyUse: 49,
    population: 54000,
    satisfaction: 66,
    greenery: 27,
  },
  {
    id: "solferine",
    name: "Solferine",
    fn: "mixte",
    poly: [
      [0.74, 0.2],
      [0.96, 0.26],
      [0.98, 0.5],
      [0.76, 0.5],
    ],
    density: 44,
    pollution: 34,
    energyUse: 46,
    population: 39000,
    satisfaction: 60,
    greenery: 33,
  },
  {
    id: "bas-marais",
    name: "Bas-Marais",
    fn: "humide",
    poly: [
      [0.36, 0.7],
      [0.78, 0.68],
      [0.94, 0.9],
      [0.5, 0.96],
      [0.28, 0.86],
    ],
    density: 19,
    pollution: 28,
    energyUse: 26,
    population: 23000,
    satisfaction: 63,
    greenery: 64,
  },
];

export const INITIAL_DISTRICTS: DistrictState[] = RAW.map((d) => ({
  ...d,
  center: centroid(d.poly),
}));

export const DISTRICT_FN_LABEL: Record<DistrictState["fn"], string> = {
  portuaire: "Port & industrie",
  residentiel: "Residentiel dense",
  historique: "Centre historique",
  affaires: "Affaires & tech",
  humide: "Zone humide",
  mixte: "Quartier mixte",
};

// ————————————————————————————————————————————————————————————————
// Catalogue des decisions — trois axes strategiques
//
// Economie : la collectivite degage un excedent courant modere (cf. engine).
// Les investissements sont finançables et la plupart deviennent rentables
// grace a des recettes recurrentes et des retours fiscaux differes. Un
// programme d'investissement mal sequence reste capable de creuser la dette.
// ————————————————————————————————————————————————————————————————

// Le catalogue complet (48 politiques) vit dans catalogue.ts.
export const DECISIONS: Decision[] = CATALOGUE;

export const DECISION_BY_ID = Object.fromEntries(
  DECISIONS.map((d) => [d.id, d]),
) as Record<string, Decision>;

export const TRACK_META: Record<
  Decision["track"],
  { label: string; code: string; brief: string }
> = {
  energie: {
    label: "Souverainete energetique",
    code: "AXE-E",
    brief:
      "Reduire la dependance aux importations et decarboner la production locale.",
  },
  mobilite: {
    label: "Ville sans voiture",
    code: "AXE-M",
    brief: "Restructurer les deplacements autour des modes actifs et partages.",
  },
  climat: {
    label: "Densification climatique",
    code: "AXE-C",
    brief: "Concentrer l'urbain, liberer et renaturer les sols vulnerables.",
  },
};
