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

export const DECISIONS: Decision[] = [
  // —— AXE ENERGIE : souverainete energetique ————————————————————
  {
    id: "nrg-offshore",
    track: "energie",
    ref: "NRG-01",
    title: "Champ eolien estuarien",
    summary:
      "Deployer 1,2 GW d'eolien flottant au large de l'estuaire et raccorder Quai-Nord au reseau decarbone.",
    upfront: 240,
    recurring: 5,
    immediate: { energy: 4, trust: 3 },
    ongoing: { energy: 2.6, carbon: -0.7 },
    districtOngoing: { target: "portuaire", energyUse: -2.2, pollution: -1.4 },
    delayed: [
      {
        delay: 4,
        indicators: { energy: 8, carbon: -2.1, budget: 90 },
        narrative:
          "Le champ estuarien atteint sa pleine puissance : Quai-Nord exporte de l'electricite et les contrats d'achat renflouent la collectivite.",
        tone: "positif",
      },
      {
        delay: 2,
        indicators: { biodiversity: -3 },
        districts: { target: "humide", greenery: -2 },
        narrative:
          "L'office de la faune signale une perturbation des couloirs migratoires au large du Bas-Marais.",
        tone: "negatif",
      },
    ],
    risk: "Impact sur les couloirs migratoires ; dependance au calendrier de raccordement.",
    benefit: "Autonomie electrique et recettes d'exportation des 2053.",
    costLabel: "240 M cr · rentable ~2053",
  },
  {
    id: "nrg-retrofit",
    track: "energie",
    ref: "NRG-02",
    title: "Renovation thermique massive",
    summary:
      "Programme obligatoire d'isolation sur 180 000 logements, prioritairement a Verrieres.",
    upfront: 150,
    recurring: 4,
    immediate: { energy: 3, qol: 2, trust: -2 },
    ongoing: { energy: 1.4, carbon: -0.5, qol: 0.6 },
    districtOngoing: { target: "residentiel", energyUse: -2.8, satisfaction: 0.8 },
    delayed: [
      {
        delay: 3,
        indicators: { qol: 6, trust: 5, carbon: -1.4, budget: 45 },
        narrative:
          "Les factures d'energie chutent a Verrieres : la baisse des aides a la precarite allege le budget social.",
        tone: "positif",
      },
    ],
    risk: "Chantiers longs, nuisances, defiance initiale des coproprietes.",
    benefit: "Baisse durable de la demande et precarite energetique reduite.",
    costLabel: "150 M cr · economies sociales",
  },
  {
    id: "nrg-nuclear",
    track: "energie",
    ref: "NRG-03",
    title: "Micro-reacteurs modulaires",
    summary:
      "Installer deux SMR de 150 MW sur la friche de Ferronnerie pour une base decarbonee pilotable.",
    upfront: 320,
    recurring: 8,
    immediate: { energy: 6, trust: -6 },
    ongoing: { energy: 3.2, carbon: -1.1 },
    districtOngoing: { target: "affaires", energyUse: -1.6 },
    delayed: [
      {
        delay: 5,
        indicators: { energy: 12, carbon: -3.4, trust: 4, budget: 70 },
        narrative:
          "Les micro-reacteurs entrent en service : la vente de chaleur fatale aux industriels de Ferronnerie devient une recette stable.",
        tone: "positif",
      },
      {
        delay: 1,
        indicators: { trust: -4 },
        narrative:
          "Un collectif riverain conteste l'implantation ; la contestation gagne Ferronnerie.",
        tone: "alerte",
      },
    ],
    risk: "Acceptabilite sociale faible, calendrier reglementaire incertain.",
    benefit: "Socle decarbone pilotable, insensible a la meteo, revente de chaleur.",
    costLabel: "320 M cr · recettes chaleur",
  },

  // —— AXE MOBILITE : ville sans voiture ————————————————————————
  {
    id: "mob-lrt",
    track: "mobilite",
    ref: "MOB-01",
    title: "Rocade tram-express",
    summary:
      "Boucler une ligne de tram a haut niveau de service reliant Quai-Nord, Ferronnerie et Verrieres.",
    upfront: 200,
    recurring: -3,
    immediate: { mobility: 5, trust: 3 },
    ongoing: { mobility: 2.4, carbon: -0.4, qol: 0.5 },
    districtOngoing: { target: "residentiel", satisfaction: 0.9 },
    delayed: [
      {
        delay: 3,
        indicators: { mobility: 10, carbon: -1.6, qol: 4, budget: 40 },
        narrative:
          "La rocade tram franchit les 300 000 validations quotidiennes ; recettes tarifaires et valorisation fonciere depassent l'exploitation.",
        tone: "positif",
      },
    ],
    risk: "Travaux pluriannuels, report modal incertain sans mesures d'accompagnement.",
    benefit: "Colonne vertebrale de transport structurante et sobre.",
    costLabel: "200 M cr · exploitation legere",
  },
  {
    id: "mob-carfree",
    track: "mobilite",
    ref: "MOB-02",
    title: "Coeur historique apaise",
    summary:
      "Interdire la voiture individuelle a Halage et redistribuer la voirie aux pietons et vegetaux.",
    upfront: 60,
    recurring: 4,
    immediate: { mobility: -3, trust: -5, qol: 3, biodiversity: 2 },
    ongoing: { qol: 1.1, biodiversity: 0.7, carbon: -0.3 },
    districtOngoing: { target: "historique", greenery: 1.6, pollution: -1.8, satisfaction: 0.6 },
    delayed: [
      {
        delay: 2,
        indicators: { qol: 6, trust: 4, biodiversity: 4, budget: 28 },
        narrative:
          "Halage devient la vitrine de la ville apaisee : la frequentation commerciale et les recettes de terrasses grimpent malgre les craintes initiales.",
        tone: "positif",
      },
      {
        delay: 1,
        indicators: { trust: -3 },
        districts: { target: "historique", satisfaction: -2 },
        narrative:
          "Les commercants de Halage denoncent une chute de chiffre d'affaires pendant la transition.",
        tone: "negatif",
      },
    ],
    risk: "Colere des riverains et commercants a court terme, report de trafic peripherique.",
    benefit: "Espace public reconquis, pollution locale effondree, commerce revalorise.",
    costLabel: "60 M cr · rentable rapidement",
    requires: "mob-lrt",
  },
  {
    id: "mob-logistics",
    track: "mobilite",
    ref: "MOB-03",
    title: "Logistique fluviale du dernier km",
    summary:
      "Basculer le fret urbain sur barges electriques depuis Quai-Nord avec micro-hubs de quartier.",
    upfront: 110,
    recurring: 3,
    immediate: { mobility: 2, carbon: -0.5 },
    ongoing: { carbon: -0.6, mobility: 0.8 },
    districtOngoing: { target: "portuaire", pollution: -1.2 },
    delayed: [
      {
        delay: 3,
        indicators: { carbon: -1.4, mobility: 5, qol: 3, budget: 22 },
        narrative:
          "La logistique fluviale retire 4 000 camions/jour des quais : redevances des hubs et air de Quai-Nord s'ameliorent nettement.",
        tone: "positif",
      },
    ],
    risk: "Investissement en hubs, coordination avec les transporteurs prives.",
    benefit: "Decongestion, qualite de l'air et redevances logistiques.",
    costLabel: "110 M cr · redevances hubs",
  },

  // —— AXE CLIMAT : densification climatique ————————————————————
  {
    id: "cli-density",
    track: "climat",
    ref: "CLI-01",
    title: "Densification de Solferine",
    summary:
      "Construire 24 000 logements bas-carbone en bois-beton a Solferine plutot qu'en periphérie.",
    upfront: 180,
    recurring: 16,
    immediate: { trust: -3, mobility: 2 },
    ongoing: { qol: 0.4, carbon: -0.2 },
    districtOngoing: { target: "mixte", density: 2.4, population: 4200, energyUse: 0.6 },
    delayed: [
      {
        delay: 4,
        indicators: { budget: 150, mobility: 5, qol: 3 },
        narrative:
          "Solferine accueille 60 000 habitants : la base fiscale s'elargit fortement et la vie de quartier s'installe.",
        tone: "positif",
      },
      {
        delay: 2,
        indicators: { trust: -4, qol: -2 },
        districts: { target: "mixte", satisfaction: -3 },
        narrative:
          "La pression immobiliere a Solferine ravive les tensions sur les loyers.",
        tone: "alerte",
      },
    ],
    risk: "Tensions sur le logement, saturation des reseaux si la mobilite ne suit pas.",
    benefit: "Sobriete fonciere et fort retour fiscal a moyen terme.",
    costLabel: "180 M cr · fort retour fiscal",
  },
  {
    id: "cli-marais",
    track: "climat",
    ref: "CLI-02",
    title: "Renaturation du Bas-Marais",
    summary:
      "Restaurer 900 ha de zones humides comme tampon aux submersions et reservoir de biodiversite.",
    upfront: 90,
    recurring: -1,
    immediate: { biodiversity: 6, qol: 2, trust: 2 },
    ongoing: { biodiversity: 1.8, carbon: -0.3, qol: 0.4 },
    districtOngoing: { target: "humide", greenery: 2.2, pollution: -1, satisfaction: 0.7 },
    delayed: [
      {
        delay: 3,
        indicators: { biodiversity: 9, qol: 4, carbon: -0.8, budget: 45 },
        narrative:
          "Les marais restaures absorbent la crue centennale de 2055 : les degats evites economisent des dizaines de millions.",
        tone: "positif",
        districts: { target: "humide", greenery: 4 },
      },
    ],
    risk: "Immobilise du foncier constructible, benefices surtout differes.",
    benefit: "Protection anti-submersion, puits de carbone, degats evites.",
    costLabel: "90 M cr · degats evites",
  },
  {
    id: "cli-canopy",
    track: "climat",
    ref: "CLI-03",
    title: "Canopee des ilots de chaleur",
    summary:
      "Planter 120 000 arbres et desimpermeabiliser les cours d'ecole sur les ilots de chaleur de Ferronnerie et Verrieres.",
    upfront: 80,
    recurring: -2,
    immediate: { qol: 3, biodiversity: 4, trust: 3 },
    ongoing: { qol: 0.7, biodiversity: 1.2 },
    districtOngoing: { target: "all", greenery: 0.9, pollution: -0.6 },
    delayed: [
      {
        delay: 5,
        indicators: { qol: 5, biodiversity: 6, trust: 4, budget: 20 },
        narrative:
          "La canopee arrivee a maturite abaisse de 3 C les pics de chaleur : les depenses sanitaires estivales refluent.",
        tone: "positif",
      },
    ],
    risk: "Benefices lents (maturite des arbres), entretien pendant les secheresses.",
    benefit: "Confort thermique estival, trame verte, depenses de sante evitees.",
    costLabel: "80 M cr · sante evitee",
  },
];

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
