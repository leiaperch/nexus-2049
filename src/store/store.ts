import { useSyncExternalStore } from "react";
import { DECISION_BY_ID } from "../sim/data";
import { canEnact, project, type Projection } from "../sim/engine";
import {
  END_YEAR,
  START_YEAR,
  type EnactedDecision,
} from "../sim/types";

export type Mode = "ops" | "archive";
export type Speed = 0.5 | 1 | 2 | 4;

export interface AppState {
  enacted: EnactedDecision[];
  projection: Projection;
  currentYear: number;
  playing: boolean;
  speed: Speed;
  selectedDistrict: string | null;
  compareYear: number | null;
  mode: Mode;
  soundOn: boolean;
  reducedMotion: boolean;
  /** metrique cartographiee sur la ville. */
  mapMetric: "greenery" | "pollution" | "density" | "energyUse" | "satisfaction";
  /** notification ephemere. */
  toast: { id: number; text: string; tone: "ok" | "warn" | "info" } | null;
}

interface HistoryFrame {
  enacted: EnactedDecision[];
}

const prefersReduced =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

let state: AppState = {
  enacted: [],
  projection: project([]),
  currentYear: START_YEAR,
  playing: false,
  speed: 1,
  selectedDistrict: null,
  compareYear: null,
  mode: "ops",
  soundOn: false,
  reducedMotion: !!prefersReduced,
  mapMetric: "greenery",
  toast: null,
};

const past: HistoryFrame[] = [];
const future: HistoryFrame[] = [];

const listeners = new Set<() => void>();
let toastSeq = 0;

function emit() {
  for (const l of listeners) l();
}

function set(patch: Partial<AppState>) {
  state = { ...state, ...patch };
  emit();
}

function pushHistory() {
  past.push({ enacted: state.enacted });
  if (past.length > 100) past.shift();
  future.length = 0;
}

function reproject(enacted: EnactedDecision[]) {
  return project(enacted);
}

function toast(text: string, tone: "ok" | "warn" | "info" = "info") {
  const id = ++toastSeq;
  set({ toast: { id, text, tone } });
  window.setTimeout(() => {
    if (state.toast?.id === id) set({ toast: null });
  }, 4200);
}

// ————————————————————————————————————————————————————————————————
// Actions
// ————————————————————————————————————————————————————————————————

export const actions = {
  enactDecision(decisionId: string): boolean {
    const decision = DECISION_BY_ID[decisionId];
    if (!decision) return false;
    const check = canEnact(decision, state.enacted, state.currentYear);
    if (!check.ok) {
      toast(`Refuse : ${check.reason}`, "warn");
      return false;
    }
    pushHistory();
    const enacted = [
      ...state.enacted,
      { decisionId, year: state.currentYear },
    ];
    set({ enacted, projection: reproject(enacted) });
    toast(`${decision.ref} promulguee en ${state.currentYear}`, "ok");
    return true;
  },

  repealDecision(decisionId: string) {
    if (!state.enacted.some((e) => e.decisionId === decisionId)) return;
    pushHistory();
    const enacted = state.enacted.filter((e) => e.decisionId !== decisionId);
    set({ enacted, projection: reproject(enacted) });
    toast(`${DECISION_BY_ID[decisionId]?.ref ?? decisionId} abrogee`, "info");
  },

  undo() {
    const frame = past.pop();
    if (!frame) {
      toast("Rien a annuler", "info");
      return;
    }
    future.push({ enacted: state.enacted });
    set({ enacted: frame.enacted, projection: reproject(frame.enacted) });
    toast("Decision annulee", "info");
  },

  redo() {
    const frame = future.pop();
    if (!frame) {
      toast("Rien a retablir", "info");
      return;
    }
    past.push({ enacted: state.enacted });
    set({ enacted: frame.enacted, projection: reproject(frame.enacted) });
    toast("Decision retablie", "info");
  },

  setYear(year: number) {
    const y = Math.round(Math.min(END_YEAR, Math.max(START_YEAR, year)));
    if (y !== state.currentYear) set({ currentYear: y });
  },

  stepYear(delta: number) {
    actions.setYear(state.currentYear + delta);
  },

  play() {
    if (state.currentYear >= END_YEAR) actions.setYear(START_YEAR);
    set({ playing: true });
  },
  pause() {
    set({ playing: false });
  },
  togglePlay() {
    state.playing ? actions.pause() : actions.play();
  },
  setSpeed(speed: Speed) {
    set({ speed });
  },
  cycleSpeed() {
    const order: Speed[] = [0.5, 1, 2, 4];
    const next = order[(order.indexOf(state.speed) + 1) % order.length];
    set({ speed: next });
  },
  /** avance interne de l'horloge (appelee par la boucle d'animation). */
  tickForward() {
    if (state.currentYear >= END_YEAR) {
      set({ playing: false });
      return;
    }
    set({ currentYear: state.currentYear + 1 });
  },

  selectDistrict(id: string | null) {
    set({ selectedDistrict: state.selectedDistrict === id ? null : id });
  },
  setCompareYear(year: number | null) {
    set({ compareYear: year });
  },
  setMode(mode: Mode) {
    set({ mode });
  },
  toggleMode() {
    set({ mode: state.mode === "ops" ? "archive" : "ops" });
  },
  toggleSound() {
    set({ soundOn: !state.soundOn });
    toast(state.soundOn ? "Son coupe" : "Ambiance sonore active", "info");
  },
  setMapMetric(m: AppState["mapMetric"]) {
    set({ mapMetric: m });
  },
  reset() {
    pushHistory();
    set({
      enacted: [],
      projection: project([]),
      currentYear: START_YEAR,
      selectedDistrict: null,
      compareYear: null,
      playing: false,
    });
    toast("Trajectoire reinitialisee", "info");
  },
  toast,
};

// ————————————————————————————————————————————————————————————————
// Hooks
// ————————————————————————————————————————————————————————————————

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function getSnapshot() {
  return state;
}

export function useStore(): AppState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useSelector<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state),
  );
}

export function getState() {
  return state;
}

export const canUndo = () => past.length > 0;
export const canRedo = () => future.length > 0;
