import { motion } from "framer-motion";
import { actions, useStore } from "../store/store";

/**
 * Invite a deliberer. Rien ne s'ouvre de force : tant que l'annee n'est
 * pas arbitree, une pastille discrete signale qu'une decision est due et
 * laisse l'utilisateur examiner la ville aussi longtemps qu'il veut.
 */
export function DecisionPrompt() {
  const state = useStore();
  const reduced = state.reducedMotion;
  const offers = actions.currentOffers().length;

  return (
    <motion.div
      className="prompt-wrap"
      initial={reduced ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
    >
      <button
        className="prompt"
        onClick={() => actions.openDossiers()}
        aria-label={`Prendre une décision pour ${state.currentYear}, ${offers} dossiers soumis`}
      >
        <span className="prompt-pulse" aria-hidden="true" />
        <span className="prompt-label">Prendre une décision</span>
        <span className="num prompt-year">{state.currentYear}</span>
        <span className="prompt-count label" aria-hidden="true">
          {offers} dossiers
        </span>
      </button>
    </motion.div>
  );
}
