import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "../store/store";

export function Toast() {
  const toast = useStore().toast;
  const reduced = useStore().reducedMotion;
  return (
    <div className="toast-region" aria-live="assertive" aria-atomic="true">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            className={`toast tone-${toast.tone}`}
            initial={reduced ? false : { opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            role="status"
          >
            <span className="toast-mark" aria-hidden="true" />
            <span className="toast-text">{toast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
