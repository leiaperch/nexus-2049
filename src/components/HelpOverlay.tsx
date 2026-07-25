import { useEffect } from "react";

const SHORTCUTS: { keys: string[]; desc: string }[] = [
  { keys: ["Espace"], desc: "Lancer / mettre en pause la simulation" },
  { keys: ["←", "→"], desc: "Reculer / avancer d'une annee" },
  { keys: ["⇧", "←/→"], desc: "Sauter de cinq ans" },
  { keys: ["Home", "End"], desc: "Aller a 2049 / 2069" },
  { keys: ["S"], desc: "Changer la vitesse de simulation" },
  { keys: ["D"], desc: "Ouvrir le centre de decision" },
  { keys: ["V"], desc: "Basculer Operationnel / Archives" },
  { keys: ["M"], desc: "Activer / couper l'ambiance sonore" },
  { keys: ["1", "…", "5"], desc: "Changer la couche cartographiee" },
  { keys: ["Ctrl", "Z"], desc: "Annuler la derniere decision" },
  { keys: ["Ctrl", "Y"], desc: "Retablir" },
  { keys: ["⌘/Ctrl", "K"], desc: "Palette de commandes" },
  { keys: ["?"], desc: "Afficher cette aide" },
  { keys: ["Echap"], desc: "Fermer les panneaux" },
];

export function HelpOverlay({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="drawer-scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="help" role="dialog" aria-modal="true" aria-label="Raccourcis clavier">
        <header className="help-head">
          <h2 className="drawer-title">Raccourcis clavier</h2>
          <button className="btn btn-icon" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </header>
        <ul className="help-list">
          {SHORTCUTS.map((s, i) => (
            <li key={i} className="help-item">
              <span className="help-keys">
                {s.keys.map((k, j) => (
                  <kbd key={j}>{k}</kbd>
                ))}
              </span>
              <span className="help-desc">{s.desc}</span>
            </li>
          ))}
        </ul>
        <p className="help-foot label">
          Toutes les actions sont accessibles au clavier et via la palette ⌘K.
        </p>
      </div>
    </div>
  );
}
