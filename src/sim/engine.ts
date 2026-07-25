import {
  DECISION_BY_ID,
  INITIAL_DISTRICTS,
  INITIAL_INDICATORS,
} from "./data";
import {
  END_YEAR,
  START_YEAR,
  type Decision,
  type DistrictState,
  type EnactedDecision,
  type Indicators,
  type NarrativeEvent,
  type YearState,
} from "./types";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function cloneDistricts(ds: DistrictState[]): DistrictState[] {
  return ds.map((d) => ({ ...d, poly: d.poly, center: d.center }));
}

function addIndicators(target: Indicators, delta: Partial<Indicators>) {
  for (const k in delta) {
    const key = k as keyof Indicators;
    target[key] += delta[key] as number;
  }
}

function clampIndicators(ind: Indicators) {
  ind.carbon = clamp(ind.carbon, 0, 30);
  ind.qol = clamp(ind.qol, 0, 100);
  // budget non borne (dette possible) mais plancher de securite
  ind.budget = clamp(ind.budget, -1200, 4000);
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
  // pression climatique et croissance tendancielle
  addIndicators(ind, {
    carbon: 0.18, // le fil de l'eau reste emetteur
    qol: -0.25,
    biodiversity: -0.4,
    trust: -0.3,
    mobility: -0.2,
  });
  // energie decarbonee progresse lentement toute seule (marche)
  ind.energy += 0.4;
  // choc climatique tendanciel plus fort apres 2060
  if (year >= 2060) ind.carbon += 0.12;

  // — Modele budgetaire courant —
  // Recettes fiscales : socle + sensibilite a l'attractivite (QDV) et au
  // civisme fiscal (confiance). Charges : fonctionnement + adaptation
  // climatique croissante. La ville degage un excedent courant modere,
  // qui finance l'investissement sans le rendre indolore.
  const revenue = 30 + (ind.qol - 58) * 0.5 + (ind.trust - 55) * 0.35;
  const charges = 20 + (year >= 2060 ? 6 : 0) + Math.max(0, ind.carbon - 12) * 0.4;
  ind.budget += revenue - charges;
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
  const decisionsByYear = new Map<number, Decision[]>();
  for (const e of enacted) {
    const d = DECISION_BY_ID[e.decisionId];
    if (!d) continue;
    const arr = decisionsByYear.get(e.year) ?? [];
    arr.push(d);
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
  const activeDecisions: Decision[] = [];
  const firedThresholds = new Set<string>();
  const timeline: YearState[] = [];
  const byYear: Record<number, YearState> = {};

  for (let year = START_YEAR; year <= END_YEAR; year++) {
    const events: NarrativeEvent[] = [];

    // 1. derive tendancielle (sauf annee initiale : etat de reference)
    if (year > START_YEAR) baselineDrift(ind, year);

    // 2. nouvelles decisions promulguees cette annee
    const fresh = decisionsByYear.get(year) ?? [];
    for (const d of fresh) {
      activeDecisions.push(d);
      addIndicators(ind, d.immediate);
      ind.budget -= d.upfront;
      events.push({
        year,
        tone: "neutre",
        source: "Conseil metropolitain",
        title: `Deliberation ${d.ref} adoptee`,
        body: `${d.title} — ${d.summary}`,
        cause: d.id,
      });
      // programmer les effets differes
      for (const de of d.delayed) {
        scheduleEffect(year + de.delay, de, d.id);
      }
    }

    // 3. effets recurrents des decisions actives
    for (const d of activeDecisions) {
      addIndicators(ind, d.ongoing);
      ind.budget += d.recurring;
      if (d.districtOngoing) {
        const { target, ...rest } = d.districtOngoing;
        applyDistrictDelta(districts, target, rest);
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

    // 5. dynamique lente des quartiers
    relaxDistricts(districts, ind.trust);

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
    active: activeDecisions.map((d) => d.id),
  };
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
