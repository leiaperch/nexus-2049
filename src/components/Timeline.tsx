import { useRef } from "react";
import { END_YEAR, START_YEAR, YEARS } from "../sim/types";
import { actions, useStore } from "../store/store";

const SPEEDS = [0.5, 1, 2, 4] as const;

export function Timeline() {
  const state = useStore();
  const { currentYear, playing, speed, projection, compareYear } = state;
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const blocked = actions.blocked();
  const frontier = actions.frontier();

  const pct = ((currentYear - START_YEAR) / (YEARS - 1)) * 100;
  const frontierPct = ((frontier - START_YEAR) / (YEARS - 1)) * 100;

  const yearFromClientX = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return currentYear;
    const rect = track.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.round(START_YEAR + t * (YEARS - 1));
  };

  const startDrag = (clientX: number) => {
    draggingRef.current = true;
    actions.pause();
    actions.setYear(yearFromClientX(clientX));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    startDrag(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    actions.setYear(yearFromClientX(e.clientX));
  };
  const endDrag = () => {
    draggingRef.current = false;
  };

  // evenements marquants (hors deliberations neutres et suivi) pour reperes
  const markers = projection.timeline.flatMap((ys) =>
    ys.events
      .filter((ev) => ev.tone === "positif" || ev.tone === "negatif" || ev.tone === "alerte")
      .map((ev) => ({ year: ys.year, tone: ev.tone })),
  );

  // decisions promulguees, reperees sur l'axe
  const decisionMarks = state.enacted.map((e) => e.year);

  return (
    <section className="timeline" aria-label="Ligne temporelle 2049-2069">
      <div className="tl-controls">
        <button
          className={`btn btn-icon ${blocked ? "is-locked" : ""}`}
          onClick={() => actions.togglePlay()}
          aria-label={
            blocked
              ? "Lecture bloquee : arbitrez un dossier"
              : playing
                ? "Mettre en pause"
                : "Lancer la simulation"
          }
          aria-pressed={playing}
        >
          {blocked ? "⊘" : playing ? "❚❚" : "▶"}
        </button>
        <button
          className="btn btn-icon"
          onClick={() => actions.stepYear(-1)}
          aria-label="Annee precedente"
        >
          ◄
        </button>
        <button
          className="btn btn-icon"
          onClick={() => actions.stepYear(1)}
          aria-label="Annee suivante"
        >
          ►
        </button>
        <button
          className="btn"
          onClick={() => actions.cycleSpeed()}
          aria-label={`Vitesse ${speed} fois. Cliquer pour changer.`}
        >
          ×{speed}
        </button>
        <div className="tl-speedbar" role="group" aria-label="Vitesse de simulation">
          {SPEEDS.map((sp) => (
            <button
              key={sp}
              className={`tl-speed ${speed === sp ? "is-active" : ""}`}
              onClick={() => actions.setSpeed(sp)}
              aria-pressed={speed === sp}
              aria-label={`Vitesse ${sp}x`}
            >
              {sp}
            </button>
          ))}
        </div>
        <div className="tl-year">
          <span className="tl-year-num num">{currentYear}</span>
          <span className="label">annee de reference</span>
        </div>
        <div className="tl-compare">
          <label className="label" htmlFor="cmp">
            comparer
          </label>
          <select
            id="cmp"
            className="tl-select mono"
            value={compareYear ?? ""}
            onChange={(e) =>
              actions.setCompareYear(e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="">—</option>
            {Array.from({ length: YEARS }, (_, i) => START_YEAR + i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        className="tl-track-wrap"
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {/* graduations decennales */}
        <div className="tl-ticks" aria-hidden="true">
          {Array.from({ length: YEARS }, (_, i) => START_YEAR + i).map((y) => (
            <span
              key={y}
              className={`tl-tick ${y % 5 === 0 ? "major" : ""}`}
              style={{ left: `${((y - START_YEAR) / (YEARS - 1)) * 100}%` }}
            >
              {y % 5 === 0 && <em className="tl-tick-label num">{y}</em>}
            </span>
          ))}
        </div>

        {/* marqueurs d'evenements */}
        {markers.map((mk, i) => (
          <span
            key={`m${i}`}
            className={`tl-event tone-${mk.tone}`}
            style={{ left: `${((mk.year - START_YEAR) / (YEARS - 1)) * 100}%` }}
            aria-hidden="true"
          />
        ))}
        {/* marqueurs de decisions */}
        {decisionMarks.map((y, i) => (
          <span
            key={`d${i}`}
            className="tl-decision"
            style={{ left: `${((y - START_YEAR) / (YEARS - 1)) * 100}%` }}
            aria-hidden="true"
          />
        ))}

        {/* horizon verrouille : au-dela, la projection n'est pas ouverte */}
        <div
          className="tl-locked"
          style={{ left: `${frontierPct}%` }}
          aria-hidden="true"
        />
        {/* zone parcourue */}
        <div className="tl-progress" style={{ width: `${pct}%` }} aria-hidden="true" />

        {/* repere de comparaison */}
        {compareYear != null && (
          <div
            className="tl-cmp-line"
            style={{ left: `${((compareYear - START_YEAR) / (YEARS - 1)) * 100}%` }}
            aria-hidden="true"
          />
        )}

        {/* curseur (slider accessible) */}
        <div
          className="tl-handle"
          style={{ left: `${pct}%` }}
          role="slider"
          tabIndex={0}
          aria-label="Annee de la simulation"
          aria-valuemin={START_YEAR}
          aria-valuemax={END_YEAR}
          aria-valuenow={currentYear}
          aria-valuetext={`Annee ${currentYear}`}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
              e.preventDefault();
              actions.stepYear(-1);
            } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
              e.preventDefault();
              actions.stepYear(1);
            } else if (e.key === "Home") {
              e.preventDefault();
              actions.setYear(START_YEAR);
            } else if (e.key === "End") {
              e.preventDefault();
              actions.setYear(END_YEAR);
            }
          }}
        >
          <span className="tl-handle-flag num">{currentYear}</span>
        </div>
      </div>
    </section>
  );
}
