import type { Decision } from "./types";

/**
 * Crises conjoncturelles. Certaines annees, le conseil ne choisit plus ce
 * qu'il veut entreprendre mais comment il encaisse un choc : ces dossiers
 * remplacent l'ordre du jour ordinaire et n'offrent aucune option confortable.
 * Seule l'ampleur de la reponse reste a arbitrer.
 */
export const CRISES: Decision[] = [
  {
    id: "cri-canicule",
    track: "climat",
    kind: "crise",
    ref: "CRISE-01",
    title: "Canicule prolongée",
    line: "Trente-huit jours au-dessus de 35 °C : le plan d'urgence sanitaire doit être financé.",
    minYear: 2052,
    upfront: 70,
    recurring: -3,
    immediate: { qol: -6, trust: -4 },
    ongoing: { qol: 0.3 },
    districtOngoing: { target: "residentiel", satisfaction: -0.4 },
    delayed: [
      {
        delay: 1,
        indicators: { qol: 3, trust: 3 },
        narrative:
          "Le réseau de lieux rafraîchis ouvert dans l'urgence est pérennisé : la surmortalité estivale revient sous la moyenne nationale.",
        tone: "positif",
      },
      {
        delay: 2,
        indicators: { budget: -25 },
        narrative:
          "Les surcoûts hospitaliers de la canicule sont refacturés à la collectivité.",
        tone: "negatif",
      },
    ],
  },
  {
    id: "cri-crue",
    track: "climat",
    kind: "crise",
    ref: "CRISE-02",
    title: "Crue majeure de l'estuaire",
    line: "L'eau atteint les quais : évacuations, pompage et remise en état des réseaux.",
    minYear: 2054,
    upfront: 110,
    recurring: -4,
    immediate: { qol: -7, trust: -5, biodiversity: -2 },
    ongoing: { qol: 0.4 },
    districtOngoing: { target: "portuaire", satisfaction: -0.6, pollution: 0.5 },
    delayed: [
      {
        delay: 2,
        indicators: { qol: 4, biodiversity: 3, trust: 2 },
        narrative:
          "Les ouvrages de ressuyage posés après la crue protègent désormais Quai-Nord et le Bas-Marais.",
        tone: "positif",
      },
      {
        delay: 1,
        districts: { target: "humide", greenery: -3 },
        narrative:
          "Les dépôts de crue étouffent une partie des roselières restaurées.",
        tone: "negatif",
      },
    ],
  },
  {
    id: "cri-operateur",
    track: "mobilite",
    kind: "crise",
    ref: "CRISE-03",
    title: "Défaillance de l'exploitant de transport",
    line: "L'opérateur du réseau dépose le bilan : reprise en régie ou interruption du service.",
    minYear: 2055,
    upfront: 130,
    recurring: -6,
    immediate: { mobility: -8, trust: -6 },
    ongoing: { mobility: 0.8 },
    delayed: [
      {
        delay: 2,
        indicators: { mobility: 6, budget: 30, trust: 3 },
        narrative:
          "La reprise en régie stabilise le réseau et supprime la marge versée au délégataire.",
        tone: "positif",
      },
    ],
  },
  {
    id: "cri-penurie",
    track: "energie",
    kind: "crise",
    ref: "CRISE-04",
    title: "Rupture d'approvisionnement énergétique",
    line: "Le contrat d'importation est rompu en plein hiver : délestages ou achat au prix fort.",
    minYear: 2053,
    upfront: 95,
    recurring: -2,
    immediate: { energy: -5, qol: -5, trust: -5 },
    ongoing: { energy: 0.6 },
    districtOngoing: { target: "residentiel", satisfaction: -0.5 },
    delayed: [
      {
        delay: 2,
        indicators: { energy: 6, trust: 3, budget: 20 },
        narrative:
          "La crise accélère les contrats d'achat direct : la facture énergétique de la ville se stabilise durablement.",
        tone: "positif",
      },
    ],
  },
  {
    id: "cri-friche",
    track: "climat",
    kind: "crise",
    ref: "CRISE-05",
    title: "Pollution des sols de Ferronnerie",
    line: "Des solvants anciens remontent sous un groupe scolaire : dépollution imposée par l'État.",
    minYear: 2057,
    upfront: 120,
    recurring: -3,
    immediate: { qol: -5, trust: -7, biodiversity: -3 },
    ongoing: { biodiversity: 0.5, qol: 0.3 },
    districtOngoing: { target: "affaires", pollution: -0.8 },
    delayed: [
      {
        delay: 3,
        indicators: { qol: 5, biodiversity: 5, trust: 4 },
        narrative:
          "La dépollution achevée libère un foncier assaini au coeur de Ferronnerie.",
        tone: "positif",
      },
    ],
  },
  {
    id: "cri-social",
    track: "mobilite",
    kind: "crise",
    ref: "CRISE-06",
    title: "Blocage social des dépôts",
    line: "Six semaines de conflit sur les salaires paralysent le réseau : négocier ou tenir.",
    minYear: 2059,
    upfront: 60,
    recurring: -7,
    immediate: { mobility: -7, trust: -6, qol: -3 },
    ongoing: { mobility: 0.6 },
    delayed: [
      {
        delay: 1,
        indicators: { trust: 5, mobility: 4 },
        narrative:
          "L'accord salarial rétablit le service et referme durablement le conflit.",
        tone: "positif",
      },
      {
        delay: 3,
        indicators: { budget: -30 },
        narrative:
          "La revalorisation négociée pèse sur la masse salariale de l'exploitant public.",
        tone: "negatif",
      },
    ],
  },
  {
    id: "cri-submersion",
    track: "climat",
    kind: "crise",
    ref: "CRISE-07",
    title: "Submersion du Bas-Marais",
    line: "Une surcote centennale noie les habitations basses : relogement et digues d'urgence.",
    minYear: 2062,
    upfront: 140,
    recurring: -4,
    immediate: { qol: -6, trust: -5, biodiversity: -2 },
    ongoing: { biodiversity: 0.7 },
    districtOngoing: { target: "humide", satisfaction: -0.8, population: -260 },
    delayed: [
      {
        delay: 2,
        indicators: { biodiversity: 6, qol: 3, trust: 2 },
        narrative:
          "Le repli organisé de l'habitat le plus exposé rend au marais son rôle d'amortisseur.",
        tone: "positif",
      },
    ],
  },
  {
    id: "cri-cyber",
    track: "energie",
    kind: "crise",
    ref: "CRISE-08",
    title: "Attaque sur le réseau intelligent",
    line: "Les compteurs et la conduite du réseau sont hors service : sécuriser toute la chaîne.",
    minYear: 2060,
    upfront: 100,
    recurring: -3,
    immediate: { energy: -4, trust: -6, qol: -3 },
    ongoing: { energy: 0.5 },
    delayed: [
      {
        delay: 2,
        indicators: { energy: 5, trust: 4 },
        narrative:
          "Le réseau reconstruit en architecture segmentée résiste aux intrusions suivantes.",
        tone: "positif",
      },
    ],
  },
];

export const CRISIS_BY_ID = Object.fromEntries(
  CRISES.map((c) => [c.id, c]),
) as Record<string, Decision>;
