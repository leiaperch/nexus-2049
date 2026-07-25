import { useEffect } from "react";
import { actions, useSelector } from "../store/store";
import { sfx } from "../lib/audio";

/**
 * Boucle d'horloge : quand la lecture est active, avance d'une annee
 * toutes les (2000 / vitesse) ms. Independante du rendu React.
 */
export function useClock() {
  const playing = useSelector((s) => s.playing);
  const speed = useSelector((s) => s.speed);

  useEffect(() => {
    if (!playing) return;
    const interval = 1900 / speed;
    const id = window.setInterval(() => {
      actions.tickForward();
      sfx.year();
    }, interval);
    return () => window.clearInterval(id);
  }, [playing, speed]);
}
