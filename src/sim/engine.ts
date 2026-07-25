import {
  DECISION_BY_ID,
  DECISIONS,
  INITIAL_DISTRICTS,
  INITIAL_INDICATORS,
} from "./data";
import { CRISES, CRISIS_BY_ID } from "./crises";
import {
  END_YEAR,
  SCALE_BY_KEY,
  SCALES,
  START_YEAR,
  type Decision,
  type DistrictState,
  type EnactedDecision,
  type Indicators,
  type NarrativeEvent,
  type Scale,
  type ScaleSpec,
  type YearState,
} from "./types";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function cloneDistricts(ds: DistrictState[]): DistrictState[] {
  return ds.map((d) => ({ ...d, poly: d.poly, center: d.center }));
}

/** Indices bornes 0-100 ou chaque point supplementaire coute plus cher. */
const BOUNDED: (keyof Indicators)[] = [
  "qol",
  "energy",
  "mobility",
  "biodiversity",
  "trust",
];

/**
 * Applique un jeu d'effets avec rendements decroissants.
 *
 * Sans cela, les effets continus s'additionnent lineairement annee apres
 * annee et tous les indices finissent colles a 100 : la ville devient
 * parfaite quoi qu'on fasse. Ici, gagner un point devient d'autant plus
 * difficile que le niveau est deja haut — et symetriquement, les
 * dernieres tonnes de carbone sont les plus dures a supprimer.
 */
function addIndicators(target: Indicators, delta: Partial<Indicators>) {
  for (const k in delta) {
    const key = k as keyof Indicators;
    let v = delta[key] as number;
    if (v > 0 && BOUNDED.includes(key)) {
      const t = clamp(target[key] / 100, 0, 1);
      v *= Math.max(0.05, 1 - t * t);
    } else if (v < 0 && key === "carbon") {
      const t = clamp(target.carbon / 18.4, 0, 1);
      v *= Math.max(0.08, t * t);
    }
    target[key] += v;
  }
}

function clampIndicators(ind: Indicators) {
  ind.carbon = clamp(ind.carbon, 0, 30);
  ind.qol = clamp(ind.qol, 0, 100);
  // budget non borne (dette possible) mais plancher de securite
  ind.budget = clamp(ind.budget, -1200, 4000);
  ind.capital = clamp(ind.capital, 0, 120);
  ind.energy = clamp(ind.energy, 0, 100);
  ind.mobility = clamp(ind.mobility, 0, 100);
  ind.biodiversity = clamp(ind.biodiversity, 0, 100);
  ind.trust = clamp(ind.trust, 0, 100);
}

function applyDistrictDelta(
  districts: DistrictState[],
  target: DistrictState["fn"] | "all",
  deltas: Partial<Record<keyof DistrictState, number>>,
) {
  for (const d of districts) {
    if (target !== "all" && d.fn !== target) continue;
    if (deltas.density != null) d.density = clamp(d.density + deltas.density, 0, 100);
    if (deltas.pollution != null) d.pollution = clamp(d.pollution + deltas.pollution, 0, 100);
    if (deltas.energyUse != null) d.energyUse = clamp(d.energyUse + deltas.energyUse, 0, 100);
    if (deltas.population != null) d.population = Math.max(0, d.population + deltas.population);
    if (deltas.satisfaction != null)
      d.satisfaction = clamp(d.satisfaction + deltas.satisfaction, 0, 100);
    if (deltas.greenery != null) d.greenery = clamp(d.greenery + deltas.greenery, 0, 100);
  }
}

// Etat de reference : sert a rapporter la densite a l'occupation reelle.
const POP0: Record<string, number> = Object.fromEntries(
  INITIAL_DISTRICTS.map((d) => [d.id, d.population]),
);
const DENS0: Record<string, number> = Object.fromEntries(
  INITIAL_DISTRICTS.map((d) => [d.id, d.density]),
);

/**
 * Dynamique de peuplement. La metropole croit ou decroit selon sa qualite
 * de vie et la confiance ; a l'interieur, les menages arbitrent entre
 * quartiers selon la satisfaction, le verdissement, la saturation et la
 * pollution. La densite bâtie suit ensuite l'occupation reelle du sol.
 */
function evolvePopulation(districts: DistrictState[], ind: Indicators) {
  const cityRate =
    0.0035 + (ind.qol - 58) * 0.00018 + (ind.trust - 55) * 0.0001;
  for (const d of districts) {
    const attract =
      (d.satisfaction - 52) * 0.0014 +
      (d.greenery - 30) * 0.0005 -
      Math.max(0, d.density - 86) * 0.0025 -
      Math.max(0, d.pollution - 60) * 0.0009;
    const rate = clamp(cityRate + attract, -0.028, 0.035);
    d.population = Math.max(1500, Math.round(d.population * (1 + rate)));
    // la densite bâtie rejoint lentement l'occupation constatee
    const target = (DENS0[d.id] ?? d.density) * (d.population / (POP0[d.id] || 1));
    d.density = clamp(d.density + (target - d.density) * 0.12, 0, 100);
  }
}

/**
 * Derive la satisfaction de quartier vers un equilibre dependant de
 * la pollution, du verdissement et de la densite. Modele lent (inertie).
 */
function relaxDistricts(districts: DistrictState[], globalTrust: number) {
  for (const d of districts) {
    const target =
      50 +
      (d.greenery - 30) * 0.35 -
      (d.pollution - 40) * 0.4 -
      Math.max(0, d.density - 82) * 0.6 +
      (globalTrust - 55) * 0.25;
    d.satisfaction = clamp(d.satisfaction + (target - d.satisfaction) * 0.18, 0, 100);
    // legere derive de pollution vers la baisse si verdissement fort
    if (d.greenery > 45) d.pollution = clamp(d.pollution - 0.3, 0, 100);
  }
}

/** Derive de fond du territoire (business as usual), appliquee chaque annee. */
function baselineDrift(ind: Indicators, year: number) {
  // Pression climatique et usure. L'entretien coute d'autant plus cher
  // que le niveau atteint est eleve : sans effort continu, un territoire
  // tres bien dote redescend. C'est ce qui empeche les indicateurs de se
  // figer au plafond une fois quelques politiques votees.
  addIndicators(ind, {
    carbon: 0.18, // le fil de l'eau reste emetteur
    qol: -0.25 - Math.max(0, ind.qol - 60) * 0.035,
    biodiversity: -0.4 - Math.max(0, ind.biodiversity - 55) * 0.03,
    mobility: -0.2 - Math.max(0, ind.mobility - 58) * 0.03,
  });
  // La confiance derive vers la qualite de vie percue : une ville ou l'on
  // vit bien pardonne les arbitrages impopulaires, et inversement.
  ind.trust += (ind.qol - ind.trust) * 0.045 - 0.2;
  // energie decarbonee : le marche fait le debut du chemin, pas la fin
  ind.energy += 0.5 * (1 - ind.energy / 100);
  // choc climatique tendanciel plus fort apres 2060
  if (year >= 2060) ind.carbon += 0.12;

  // — Modele budgetaire courant —
  // Recettes fiscales : socle + sensibilite a l'attractivite (QDV) et au
  // civisme fiscal (confiance). Charges : fonctionnement + adaptation
  // climatique croissante. Le socle est calibre pour financer environ un
  // arbitrage par an : bien choisir laisse une marge, empiler les gros
  // investissements creuse la dette.
  const debt = Math.max(0, -ind.budget);
  // Degradation de la signature : plus la dette est lourde, plus les
  // recettes se contractent (perte de base fiscale, mise sous tutelle
  // des investissements, prets a taux punitif).
  const downgrade = Math.min(0.45, debt / 2200);
  const revenue =
    (76 + (ind.qol - 58) * 0.45 + (ind.trust - 55) * 0.45) * (1 - downgrade);
  const debtService = debt * 0.075;
  const charges =
    24 + (year >= 2060 ? 8 : 0) + Math.max(0, ind.carbon - 12) * 0.6 + debtService;
  ind.budget += revenue - charges;

  // — Austerite —
  // Passe un certain endettement, la collectivite coupe dans le service
  // rendu : la population le voit, la confiance decroche, et le credit
  // politique se tarit. C'est le mecanisme qui rend la faillite
  // auto-entretenue plutot que simplement genante.
  const austerity = debt > 150;
  if (austerity) {
    ind.trust -= 1.4 + Math.min(2.5, debt / 400);
    ind.qol -= 0.5 + Math.min(1.5, debt / 700);
  }

  // — Capital politique —
  // Se reconstitue chaque annee, d'autant plus vite que la population
  // adhere. Une ville defiante ne renouvelle presque plus le credit de
  // son executif : les arbitrages contestes deviennent impossibles.
  ind.capital += (12 + (ind.trust - 55) * 0.16) * (austerity ? 0.45 : 1);
}

/** Evenements de fond declenches par franchissement de seuils. */
function thresholdEvents(
  ind: Indicators,
  year: number,
  fired: Set<string>,
): NarrativeEvent[] {
  const out: NarrativeEvent[] = [];
  const once = (id: string, ev: Omit<NarrativeEvent, "year">) => {
    if (fired.has(id)) return;
    fired.add(id);
    out.push({ year, ...ev });
  };

  if (ind.budget < 0)
    once("budget-debt", {
      tone: "alerte",
      source: "Direction des finances",
      title: "La collectivite bascule en deficit",
      body: "La tresorerie passe sous zero. L'agence de notation place Meridienne sous surveillance ; le cout de la dette augmente.",
    });
  if (ind.trust < 35)
    once("trust-low", {
      tone: "alerte",
      source: "Observatoire citoyen",
      title: "Defiance civique aigue",
      body: "La confiance chute sous le seuil critique. Les concertations sont boycottees et la mise en oeuvre des politiques ralentit.",
    });
  if (ind.carbon < 9)
    once("carbon-goal", {
      tone: "positif",
      source: "Agence climat regionale",
      title: "Trajectoire 1,5 C tenue",
      body: "Les emissions nettes passent sous 9 Mt/an : Meridienne rejoint le club des metropoles alignees sur l'accord climatique.",
    });
  if (ind.biodiversity > 70)
    once("bio-high", {
      tone: "positif",
      source: "Office de la biodiversite",
      title: "Trame verte reconstituee",
      body: "La continuite ecologique est retablie du Bas-Marais a Solferine : retour d'especes disparues depuis 2030.",
    });
  if (ind.qol > 78)
    once("qol-high", {
      tone: "positif",
      source: "Institut de veille urbaine",
      title: "Qualite de vie de reference",
      body: "Meridienne se classe premiere de sa strate pour la qualite de vie percue.",
    });
  return out;
}

/** Multiplie un jeu d'effets par le facteur d'ampleur retenu. */
function scaled(part: Partial<Indicators> | undefined, k: number): Partial<Indicators> {
  const out: Partial<Indicators> = {};
  if (!part) return out;
  for (const key in part) {
    const kk = key as keyof Indicators;
    out[kk] = (part[kk] as number) * k;
  }
  return out;
}

/**
 * Cout politique d'un arbitrage. Une mesure impopulaire, couteuse ou
 * conduite avec ampleur consomme davantage de credit au conseil.
 */
export function politicalCost(d: Decision, scale: Scale): number {
  const s = SCALE_BY_KEY[scale];
  const contested = Math.max(0, -(d.immediate.trust ?? 0));
  const base = 6 + contested * 2.2 + d.upfront * 0.035;
  return Math.round(base * s.political);
}

/** Cout financier initial d'un arbitrage, ampleur comprise. */
export function financialCost(d: Decision, scale: Scale): number {
  return Math.round(d.upfront * SCALE_BY_KEY[scale].cost);
}

export interface Projection {
  timeline: YearState[];
  /** index par annee pour acces direct. */
  byYear: Record<number, YearState>;
  /** ids des decisions actives a la fin de la periode. */
  active: string[];
}

/**
 * Recalcule toute la trajectoire 2049 -> 2069 a partir de l'ensemble
 * des decisions promulguees. Fonction pure et deterministe.
 */
export function project(enacted: EnactedDecision[]): Projection {
  // chaque arbitrage porte l'ampleur retenue : elle module cout et portee
  type Enacted = { d: Decision; s: ScaleSpec };
  const decisionsByYear = new Map<number, Enacted[]>();
  for (const e of enacted) {
    const d = lookupDecision(e.decisionId);
    if (!d) continue;
    const arr = decisionsByYear.get(e.year) ?? [];
    arr.push({ d, s: SCALE_BY_KEY[e.scale] ?? SCALE_BY_KEY.mesure });
    decisionsByYear.set(e.year, arr);
  }

  // effets differes planifies : annee -> effets a appliquer
  const scheduled = new Map<number, { effect: any; cause: string }[]>();
  const scheduleEffect = (year: number, effect: any, cause: string) => {
    if (year > END_YEAR) return;
    const arr = scheduled.get(year) ?? [];
    arr.push({ effect, cause });
    scheduled.set(year, arr);
  };

  const ind: Indicators = { ...INITIAL_INDICATORS };
  let districts = cloneDistricts(INITIAL_DISTRICTS);
  const activeDecisions: Enacted[] = [];
  const firedThresholds = new Set<string>();
  const timeline: YearState[] = [];
  const byYear: Record<number, YearState> = {};

  for (let year = START_YEAR; year <= END_YEAR; year++) {
    const events: NarrativeEvent[] = [];

    // 1. derive tendancielle (sauf annee initiale : etat de reference)
    if (year > START_YEAR) baselineDrift(ind, year);

    // 2. nouvelles decisions promulguees cette annee
    const fresh = decisionsByYear.get(year) ?? [];
    for (const { d, s } of fresh) {
      activeDecisions.push({ d, s });
      addIndicators(ind, scaled(d.immediate, s.effect));
      ind.trust += s.trustBias;
      ind.budget -= d.upfront * s.cost;
      ind.capital -= politicalCost(d, s.key);
      events.push({
        year,
        tone: d.kind === "crise" ? "alerte" : "neutre",
        source: d.kind === "crise" ? "Cellule de crise" : "Conseil metropolitain",
        title:
          d.kind === "crise"
            ? `${d.ref} — réponse ${s.label.toLowerCase()}`
            : `Deliberation ${d.ref} adoptee (${s.label.toLowerCase()})`,
        body: `${d.title} — ${d.line}`,
        cause: d.id,
      });
      // programmer les effets differes, mis a l'echelle
      for (const de of d.delayed) {
        scheduleEffect(
          year + de.delay,
          { ...de, indicators: scaled(de.indicators, s.effect) },
          d.id,
        );
      }

      // — Sequelles d'une reponse sous-dimensionnee —
      // Repondre au rabais coute moins cher tout de suite et laisse le
      // probleme entier. Rien n'est annonce : le joueur decouvre la note
      // plus tard, ce qui rend le choix du minimal reellement risque.
      const shortfall = Math.max(0, 1 - s.effect);
      if (shortfall > 0.05) {
        const k = d.kind === "crise" ? shortfall : shortfall * 0.45;
        scheduleEffect(
          year + (d.kind === "crise" ? 2 : 4),
          {
            delay: 0,
            indicators: {
              qol: -7 * k,
              trust: -8 * k,
              budget: -120 * k,
            },
            tone: "negatif",
            narrative:
              d.kind === "crise"
                ? `Les suites de ${d.ref} n'ont jamais été traitées au fond : reprise en urgence des ouvrages provisoires, aux frais de la collectivité.`
                : `${d.ref} conduite au strict minimum : la mesure doit être reprise, et son coût différé s'ajoute au budget.`,
          },
          d.id,
        );
      }
      // Une reponse ample laisse au contraire un acquis durable.
      if (s.effect > 1.3 && d.kind === "crise") {
        scheduleEffect(
          year + 3,
          {
            delay: 0,
            indicators: { qol: 3, trust: 4, biodiversity: 1.5 },
            tone: "positif",
            narrative: `La réponse ample apportée à ${d.ref} laisse des ouvrages surdimensionnés : le territoire encaisse les chocs suivants sans dommage.`,
          },
          d.id,
        );
      }
    }

    // 3. effets recurrents des decisions actives
    for (const { d, s } of activeDecisions) {
      addIndicators(ind, scaled(d.ongoing, s.effect));
      ind.budget += d.recurring * s.cost;
      if (d.districtOngoing) {
        const { target, ...rest } = d.districtOngoing;
        const k = s.effect;
        const scaledRest: Record<string, number> = {};
        for (const key in rest)
          scaledRest[key] = (rest as Record<string, number>)[key] * k;
        applyDistrictDelta(districts, target, scaledRest);
      }
    }

    // 4. effets differes arrivant a echeance
    const due = scheduled.get(year) ?? [];
    for (const { effect, cause } of due) {
      if (effect.indicators) addIndicators(ind, effect.indicators);
      if (effect.districts) {
        const { target = "all", ...rest } = effect.districts;
        applyDistrictDelta(districts, target, rest);
      }
      if (effect.narrative) {
        events.push({
          year,
          tone: effect.tone ?? "neutre",
          source: "NEXUS — suivi d'impact",
          title: "Consequence differee",
          body: effect.narrative,
          cause,
        });
      }
    }

    clampIndicators(ind);

    // 5. dynamique lente des quartiers : satisfaction, puis peuplement
    relaxDistricts(districts, ind.trust);
    if (year > START_YEAR) evolvePopulation(districts, ind);

    // 6. evenements de seuil
    events.push(...thresholdEvents(ind, year, firedThresholds));

    const snapshot: YearState = {
      year,
      indicators: { ...ind },
      districts: cloneDistricts(districts),
      events,
    };
    timeline.push(snapshot);
    byYear[year] = snapshot;
  }

  return {
    timeline,
    byYear,
    active: activeDecisions.map((e) => e.d.id),
  };
}

// ————————————————————————————————————————————————————————————————
// Dossiers de l'annee : NEXUS soumet chaque annee un jeu de dossiers
// tires de maniere deterministe. Le joueur doit en arbitrer au moins
// un pour que la projection avance.
// ————————————————————————————————————————————————————————————————

/** Une decision, qu'elle vienne du catalogue ordinaire ou des crises. */
export function lookupDecision(id: string): Decision | undefined {
  return DECISION_BY_ID[id] ?? CRISIS_BY_ID[id];
}

/**
 * Crise imposee cette annee, s'il y en a une. Deterministe : les chocs
 * frappent aux memes annees pour tout le monde, seule la reponse varie.
 */
export function crisisForYear(
  year: number,
  enacted: EnactedDecision[],
): Decision | null {
  if (year < 2052) return null;
  // environ une annee sur quatre, jamais deux de suite
  if ((year * 2654435761) % 4 !== 1) return null;
  const taken = new Set(enacted.map((e) => e.decisionId));
  const pool = CRISES.filter(
    (c) => !taken.has(c.id) && (c.minYear == null || year >= c.minYear),
  );
  if (pool.length === 0) return null;
  const sorted = [...pool].sort((a, b) => hash2(year, a.id) - hash2(year, b.id));
  return sorted[0];
}

function hash2(year: number, id: string): number {
  let h = (2166136261 ^ year) >>> 0;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

/** Une decision est-elle recevable a cette annee ? */
function eligible(d: Decision, taken: Set<string>, year: number): boolean {
  if (taken.has(d.id)) return false;
  if (d.minYear != null && year < d.minYear) return false;
  if (d.requires && !taken.has(d.requires)) return false;
  if (d.excludes?.some((x) => taken.has(x))) return false;
  return true;
}

/**
 * Dossiers soumis au conseil pour une annee donnee. Tirage deterministe,
 * equilibre entre les trois axes tant que possible.
 */
export function offersForYear(
  year: number,
  enacted: EnactedDecision[],
  count = 3,
): Decision[] {
  // Une crise confisque l'ordre du jour : le conseil n'a plus le choix
  // de l'objet, seulement celui de l'ampleur de sa reponse.
  const crisis = crisisForYear(year, enacted);
  if (crisis) return [crisis];

  const taken = new Set(enacted.map((e) => e.decisionId));
  const pool = DECISIONS.filter((d) => eligible(d, taken, year));
  if (pool.length === 0) return [];

  const byTrack = new Map<string, Decision[]>();
  for (const d of pool) {
    const arr = byTrack.get(d.track) ?? [];
    arr.push(d);
    byTrack.set(d.track, arr);
  }
  for (const arr of byTrack.values())
    arr.sort((a, b) => hash2(year, a.id) - hash2(year, b.id));

  // tirage a tour de role sur les axes -> dossiers contrastes
  const tracks = [...byTrack.keys()].sort(
    (a, b) => hash2(year, a) - hash2(year, b),
  );
  const picked: Decision[] = [];
  let round = 0;
  while (picked.length < count && round < 8) {
    for (const t of tracks) {
      const arr = byTrack.get(t)!;
      if (arr.length > round) picked.push(arr[round]);
      if (picked.length >= count) break;
    }
    round++;
  }
  return picked;
}

/** L'annee a-t-elle recu au moins un arbitrage ? */
export function isYearResolved(
  enacted: EnactedDecision[],
  year: number,
): boolean {
  return enacted.some((e) => e.year === year);
}

/**
 * Plafond d'endettement. Volontairement lointain : la collectivite doit
 * pouvoir s'engager au-dela du raisonnable. Un plafond serre empecherait
 * la faute plutot que de la sanctionner, et il n'y aurait jamais de
 * scenario catastrophe.
 */
export const DEBT_CEILING = -1000;

/**
 * Un dossier peut-il etre arbitre compte tenu des ressources ?
 * Une crise echappe a la contrainte politique : le conseil n'a pas le
 * loisir de ne pas repondre a un choc, seulement celui d'y mettre les
 * moyens ou non.
 */
export function affordable(
  d: Decision,
  scale: Scale,
  ind: Indicators,
): boolean {
  if (ind.budget - financialCost(d, scale) < DEBT_CEILING) return false;
  if (d.kind !== "crise" && ind.capital < politicalCost(d, scale)) return false;
  return true;
}

/** Existe-t-il au moins un arbitrage possible cette annee ? */
export function anyAffordable(
  offers: Decision[],
  ind: Indicators,
): boolean {
  return offers.some((d) => SCALES.some((s) => affordable(d, s.key, ind)));
}

/**
 * Peut-on depasser cette annee ? Oui si elle a ete arbitree, si NEXUS
 * n'avait aucun dossier a soumettre, ou si aucun dossier n'etait
 * finançable — dans ce dernier cas le conseil constate sa carence et
 * l'annee passe sans decision, ce qui coute en confiance.
 */
export function canPassYear(
  enacted: EnactedDecision[],
  year: number,
  ind?: Indicators,
): boolean {
  if (year >= END_YEAR) return false;
  if (isYearResolved(enacted, year)) return true;
  const offers = offersForYear(year, enacted);
  if (offers.length === 0) return true;
  if (ind && !anyAffordable(offers, ind)) return true;
  return false;
}

/** Verifie si une decision peut etre promulguee a une annee donnee. */
export function canEnact(
  decision: Decision,
  enacted: EnactedDecision[],
  year: number,
): { ok: boolean; reason?: string } {
  if (enacted.some((e) => e.decisionId === decision.id))
    return { ok: false, reason: "Deja promulguee" };
  if (decision.requires && !enacted.some((e) => e.decisionId === decision.requires))
    return {
      ok: false,
      reason: `Prerequis : ${DECISION_BY_ID[decision.requires]?.ref ?? decision.requires}`,
    };
  if (decision.excludes) {
    for (const ex of decision.excludes) {
      if (enacted.some((e) => e.decisionId === ex))
        return { ok: false, reason: `Incompatible avec ${DECISION_BY_ID[ex]?.ref}` };
    }
  }
  return { ok: true };
}
