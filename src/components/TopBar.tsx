import { INDICATORS } from "../sim/data";
import { normIndicator } from "../lib/format";
import { actions, useStore } from "../store/store";

interface Props {
  onOpenDecisions: () => void;
  onOpenPalette: () => void;
  onOpenHelp: () => void;
}

export function TopBar({ onOpenDecisions, onOpenPalette, onOpenHelp }: Props) {
  const state = useStore();
  const ys = state.projection.byYear[state.currentYear];

  // indice de sante urbaine composite (0-100)
  const health = Math.round(
    (INDICATORS.filter((m) => m.key !== "budget").reduce((acc, m) => {
      return acc + normIndicator(ys.indicators[m.key], m.min, m.max, m.higherBetter);
    }, 0) /
      6) *
      100,
  );
  const healthTone = health >= 66 ? "ok" : health >= 45 ? "warn" : "crit";

  return (
    <header className="topbar">
      <div className="tb-brand">
        <div className="tb-mark" aria-hidden="true">
          <span className="tb-mark-dot" />
        </div>
        <div className="tb-title">
          <span className="tb-nexus">NEXUS 2049</span>
          <span className="label tb-sub">Meridienne · OS urbain</span>
        </div>
      </div>

      <div className="tb-status" aria-label={`Indice de sante urbaine ${health} sur 100`}>
        <div className={`tb-health tone-${healthTone}`}>
          <svg viewBox="0 0 40 40" width="36" height="36" aria-hidden="true">
            <circle cx="20" cy="20" r="16" fill="none" stroke="var(--line)" strokeWidth="3" />
            <circle
              cx="20"
              cy="20"
              r="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${(health / 100) * 100.5} 100.5`}
              transform="rotate(-90 20 20)"
            />
          </svg>
          <span className="num tb-health-num">{health}</span>
        </div>
        <div className="tb-status-txt">
          <span className="label">Sante urbaine</span>
          <span className="tb-status-state">
            {healthTone === "ok"
              ? "systeme stable"
              : healthTone === "warn"
                ? "sous tension"
                : "etat critique"}
          </span>
        </div>
      </div>

      <div className="tb-clock">
        <span className="num tb-clock-year">{state.currentYear}</span>
        <span className="label">
          {state.playing ? `lecture ×${state.speed}` : "arret sur annee"}
        </span>
      </div>

      <nav className="tb-actions" aria-label="Actions principales">
        <button
          className={`btn ${state.mode === "ops" ? "is-active" : ""}`}
          onClick={() => actions.setMode("ops")}
          aria-pressed={state.mode === "ops"}
        >
          Operationnel
        </button>
        <button
          className={`btn ${state.mode === "archive" ? "is-active" : ""}`}
          onClick={() => actions.setMode("archive")}
          aria-pressed={state.mode === "archive"}
        >
          Archives
        </button>
        <span className="tb-sep" aria-hidden="true" />
        <button className="btn btn-icon" onClick={() => actions.undo()} aria-label="Annuler" title="Annuler (Ctrl+Z)">
          ⟲
        </button>
        <button className="btn btn-icon" onClick={() => actions.redo()} aria-label="Retablir" title="Retablir (Ctrl+Y)">
          ⟳
        </button>
        <button
          className={`btn btn-icon ${state.soundOn ? "is-active" : ""}`}
          onClick={() => actions.toggleSound()}
          aria-label={state.soundOn ? "Couper le son" : "Activer le son"}
          aria-pressed={state.soundOn}
          title="Ambiance sonore (M)"
        >
          {state.soundOn ? "♪" : "♪̷"}
        </button>
        <button className="btn tb-palette" onClick={onOpenPalette} aria-label="Palette de commandes">
          <kbd>⌘K</kbd>
        </button>
        <button className="btn btn-icon" onClick={onOpenHelp} aria-label="Aide et raccourcis" title="Aide (?)">
          ?
        </button>
        <button className="btn" onClick={onOpenDecisions}>
          Registre
        </button>
        <button
          className={`btn tb-decide ${actions.blocked() ? "is-urgent" : ""}`}
          onClick={() => actions.openDossiers()}
        >
          Dossiers {state.currentYear}
        </button>
      </nav>
    </header>
  );
}
