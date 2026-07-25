import { AnimatePresence, motion } from "framer-motion";
import { DISTRICT_FN_LABEL } from "../sim/data";
import { actions, useStore } from "../store/store";
import { fmtPop } from "../lib/format";
import { MAP_METRIC_LABEL } from "../lib/colors";
import type { DistrictState } from "../sim/types";

const ROWS: { key: keyof DistrictState; label: string; suffix?: string }[] = [
  { key: "density", label: "Densite", suffix: "/100" },
  { key: "pollution", label: "Pollution", suffix: "/100" },
  { key: "energyUse", label: "Intensite energetique", suffix: "/100" },
  { key: "greenery", label: "Vegetation", suffix: "/100" },
  { key: "satisfaction", label: "Satisfaction", suffix: "/100" },
];

export function DistrictInspector() {
  const state = useStore();
  const id = state.selectedDistrict;
  const reduced = state.reducedMotion;
  const ys = state.projection.byYear[state.currentYear];
  const district = id ? ys.districts.find((d) => d.id === id) : null;

  // valeurs de reference (2049) pour la comparaison avant/apres
  const base = id
    ? state.projection.timeline[0].districts.find((d) => d.id === id)
    : null;

  return (
    <AnimatePresence>
      {district && (
        <motion.aside
          className="inspector"
          role="dialog"
          aria-label={`Inspecteur du quartier ${district.name}`}
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          <header className="insp-head">
            <div>
              <span className="label">{DISTRICT_FN_LABEL[district.fn]}</span>
              <h3 className="insp-name">{district.name}</h3>
            </div>
            <button
              className="btn btn-icon"
              onClick={() => actions.selectDistrict(null)}
              aria-label="Fermer l'inspecteur"
            >
              ✕
            </button>
          </header>

          <div className="insp-pop">
            <span className="num insp-pop-num">{fmtPop(district.population)}</span>
            <span className="label">habitants en {state.currentYear}</span>
          </div>

          <dl className="insp-rows">
            {ROWS.map((r) => {
              const v = district[r.key] as number;
              const b = base ? (base[r.key] as number) : v;
              const diff = v - b;
              return (
                <div key={r.key} className="insp-row">
                  <dt className="label">{r.label}</dt>
                  <dd className="insp-vals">
                    <div className="insp-bar">
                      <span
                        className="insp-bar-base"
                        style={{ width: `${b}%` }}
                        aria-hidden="true"
                      />
                      <span
                        className="insp-bar-fill"
                        style={{ width: `${v}%` }}
                        aria-hidden="true"
                      />
                    </div>
                    <span className="num insp-num">{Math.round(v)}</span>
                    {Math.abs(diff) >= 1 && (
                      <span
                        className={`num insp-diff ${diff > 0 ? "pos" : "neg"}`}
                        title={`Depuis 2049`}
                      >
                        {diff > 0 ? "+" : ""}
                        {Math.round(diff)}
                      </span>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
          <p className="insp-foot label">
            barre pleine : {state.currentYear} · trait : reference 2049 ·{" "}
            couche active {MAP_METRIC_LABEL[state.mapMetric].toLowerCase()}
          </p>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
