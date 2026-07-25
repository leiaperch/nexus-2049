import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "../store/store";

const LINES = [
  "METROPOLE DE MERIDIENNE",
  "4,07 millions d'habitants · estuaire · strate critique",
  "Apres le Grand Decrochage climatique de 2041,",
  "la ville confie sa conduite a un systeme d'exploitation urbain.",
];

/** Sequence d'ouverture < 15 s. Peut etre passee a tout moment. */
export function Intro({ onDone }: { onDone: () => void }) {
  const reduced = useStore().reducedMotion;
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduced) return;
    if (step >= LINES.length + 1) {
      const t = window.setTimeout(onDone, 900);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setStep((s) => s + 1), step === 0 ? 700 : 1600);
    return () => window.clearTimeout(t);
  }, [step, reduced, onDone]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "Escape" || e.key === " ") onDone();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDone]);

  return (
    <motion.div
      className="intro"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      role="dialog"
      aria-label="Sequence d'introduction"
    >
      <div className="intro-grid" aria-hidden="true" />
      <div className="intro-scan" aria-hidden="true" />
      <div className="intro-body">
        <div className="intro-boot label">
          <span>NEXUS</span>
          <span>v20.49</span>
          <span className="intro-blink">initialisation</span>
        </div>
        <div className="intro-wordmark">
          <span className="intro-nexus">NEXUS</span>
          <span className="intro-year num">2049</span>
        </div>
        <div className="intro-lines">
          {LINES.map((l, i) => (
            <AnimatePresence key={i}>
              {(reduced || step > i) && (
                <motion.p
                  className={`intro-line ${i === 0 ? "lead" : ""}`}
                  initial={reduced ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  {l}
                </motion.p>
              )}
            </AnimatePresence>
          ))}
        </div>
        <button className="intro-enter btn" onClick={onDone} autoFocus>
          Prendre les commandes →
        </button>
        <p className="intro-skip label">Entree / Echap pour entrer</p>
      </div>
    </motion.div>
  );
}
